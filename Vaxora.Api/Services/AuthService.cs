using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Vaxora.Api.Data;
using Vaxora.Api.Dtos;
using Vaxora.Api.Models;

namespace Vaxora.Api.Services;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterPatientAsync(PatientSignupDto dto);
    Task<AuthResponseDto> RegisterDoctorAsync(DoctorSignupDto dto);
    Task<AuthResponseDto> RegisterNurseAsync(NurseSignupDto dto);
    Task<AuthResponseDto> RegisterHospitalAsync(HospitalSignupDto dto);
    Task<AuthResponseDto> LoginAsync(LoginDto dto);
    Task<AuthResponseDto> RefreshTokenAsync(RefreshTokenRequestDto dto);
    Task<bool> LogoutAsync(Guid userId);
    Task<UserDto> GetCurrentUserAsync(Guid userId);
    Task<bool> ForgotPasswordAsync(ForgotPasswordDto dto);
    Task<bool> ResetPasswordAsync(ResetPasswordDto dto);
    Task<bool> ChangePasswordAsync(Guid userId, ChangePasswordDto dto);
    Task<UserDto> UpdateProfileAsync(Guid userId, UpdateProfileDto dto);
    Task<bool> DeleteAccountAsync(Guid userId);
}

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;
    private readonly IR2StorageService _r2Service;
    private readonly IRegistrationNumberService _registrationNumberService;
    private readonly IVaccinationCardService _vaccinationCardService;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        ApplicationDbContext context,
        IPasswordHasher passwordHasher,
        ITokenService tokenService,
        IR2StorageService r2Service,
        IRegistrationNumberService registrationNumberService,
        IVaccinationCardService vaccinationCardService,
        IEmailService emailService,
        IConfiguration configuration,
        ILogger<AuthService> logger)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _r2Service = r2Service;
        _registrationNumberService = registrationNumberService;
        _vaccinationCardService = vaccinationCardService;
        _emailService = emailService;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<AuthResponseDto> RegisterPatientAsync(PatientSignupDto dto)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        if (await _context.Users.AnyAsync(u => u.Email == normalizedEmail))
        {
            throw new InvalidOperationException("An account with this email address already exists.");
        }

        if (await _context.PatientProfiles.AnyAsync(p => p.NicNumber == dto.NicNumber.Trim()))
        {
            throw new InvalidOperationException("An account with this National Identity Card (NIC) number already exists.");
        }

        string? photoUrl = null;
        if (dto.ProfilePhoto != null)
        {
            photoUrl = await _r2Service.UploadFileAsync(dto.ProfilePhoto, "patients/photos");
        }

        var regNumber = await _registrationNumberService.GenerateRegistrationNumberAsync(UserRole.PATIENT);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = normalizedEmail,
            PasswordHash = _passwordHasher.HashPassword(dto.Password),
            Role = UserRole.PATIENT,
            Status = UserStatus.Active, // Patients are automatically active
            PhoneNumber = dto.PhoneNumber,
            RegistrationNumber = regNumber,
            CreatedAt = DateTime.UtcNow
        };

        var profile = new PatientProfile
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            FullName = dto.FullName.Trim(),
            NicNumber = dto.NicNumber.Trim(),
            DateOfBirth = dto.DateOfBirth.ToUniversalTime(),
            PhoneNumber = dto.PhoneNumber,
            ProfilePhotoUrl = photoUrl,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        _context.PatientProfiles.Add(profile);

        // Audit Log
        _context.AuditLogs.Add(new AuditLog
        {
            UserId = user.Id,
            UserEmail = user.Email,
            Role = "PATIENT",
            Action = "PATIENT_SIGNUP",
            Details = $"Patient registered with NIC {profile.NicNumber} (Reg #{regNumber})",
            Timestamp = DateTime.UtcNow
        });

        var refreshToken = _tokenService.GenerateRefreshToken();
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);

        await _context.SaveChangesAsync();

        // Generate Digital Vaccination Card & Send Welcome Email in background
        try
        {
            var cardPdf = _vaccinationCardService.GenerateVaccinationCardPdf(
                profile.FullName,
                regNumber,
                profile.NicNumber,
                profile.DateOfBirth,
                profile.PhoneNumber,
                DateTime.UtcNow);

            _ = Task.Run(async () =>
            {
                try
                {
                    await _emailService.SendPatientWelcomeEmailAsync(
                        user.Email,
                        profile.FullName,
                        regNumber,
                        profile.DateOfBirth,
                        cardPdf);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Background error dispatching patient welcome email to {Email}", user.Email);
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate digital vaccination card for patient {Email}", user.Email);
        }

        var token = _tokenService.GenerateAccessToken(user, profile.FullName);

        return new AuthResponseDto
        {
            Token = token,
            RefreshToken = refreshToken,
            ExpiresAt = _tokenService.GetTokenExpiration(),
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                Role = user.Role.ToString(),
                Status = user.Status.ToString(),
                Name = profile.FullName,
                PhoneNumber = user.PhoneNumber,
                RegistrationNumber = user.RegistrationNumber,
                ProfilePhotoUrl = photoUrl,
                ProfileDetails = profile
            },
            Message = "Patient registration successful."
        };
    }

    public async Task<AuthResponseDto> RegisterDoctorAsync(DoctorSignupDto dto)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        if (await _context.Users.AnyAsync(u => u.Email == normalizedEmail))
        {
            throw new InvalidOperationException("An account with this email address already exists.");
        }

        if (await _context.DoctorProfiles.AnyAsync(d => d.SlmcNumber == dto.SlmcNumber.Trim()))
        {
            throw new InvalidOperationException("An account with this SLMC Registration Number already exists.");
        }

        // Upload documents to Cloudflare R2
        string? photoUrl = null;
        string? slmcDocKey = null;
        string? supportingDocKey = null;

        if (dto.ProfilePhoto != null)
        {
            photoUrl = await _r2Service.UploadFileAsync(dto.ProfilePhoto, "doctors/photos");
        }

        if (dto.SlmcCertificate != null)
        {
            slmcDocKey = await _r2Service.UploadFileAsync(dto.SlmcCertificate, "doctors/certificates");
        }

        if (dto.SupportingDocument != null)
        {
            supportingDocKey = await _r2Service.UploadFileAsync(dto.SupportingDocument, "doctors/supporting");
        }

        var regNumber = await _registrationNumberService.GenerateRegistrationNumberAsync(UserRole.DOCTOR);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = normalizedEmail,
            PasswordHash = _passwordHasher.HashPassword(dto.Password),
            Role = UserRole.DOCTOR,
            Status = UserStatus.Pending, // Doctor starts as Pending verification
            PhoneNumber = dto.PhoneNumber,
            RegistrationNumber = regNumber,
            CreatedAt = DateTime.UtcNow
        };

        var profile = new DoctorProfile
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            FullName = dto.FullName.Trim(),
            SlmcNumber = dto.SlmcNumber.Trim(),
            Specialization = dto.Specialization,
            PhoneNumber = dto.PhoneNumber,
            ProfilePhotoUrl = photoUrl,
            SlmcCardDocKey = slmcDocKey,
            SupportingDocKey = supportingDocKey,
            VerificationStatus = VerificationStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        _context.DoctorProfiles.Add(profile);

        _context.AuditLogs.Add(new AuditLog
        {
            UserId = user.Id,
            UserEmail = user.Email,
            Role = "DOCTOR",
            Action = "DOCTOR_SIGNUP",
            Details = $"Doctor applied for registration with SLMC {profile.SlmcNumber} (Reg #{regNumber}, Status: Pending)",
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        // Dispatch "Waiting for Approval" email in background
        _ = Task.Run(async () =>
        {
            try
            {
                await _emailService.SendPendingApprovalEmailAsync(
                    user.Email,
                    $"Dr. {profile.FullName}",
                    regNumber,
                    "Doctor");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Background error dispatching pending approval email to doctor {Email}", user.Email);
            }
        });

        return new AuthResponseDto
        {
            Token = null,
            RefreshToken = null,
            ExpiresAt = null,
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                Role = user.Role.ToString(),
                Status = user.Status.ToString(),
                Name = profile.FullName,
                PhoneNumber = user.PhoneNumber,
                RegistrationNumber = user.RegistrationNumber,
                ProfilePhotoUrl = photoUrl,
                ProfileDetails = profile
            },
            Message = "Doctor registration submitted successfully. Your account is pending administrative verification."
        };
    }

    public async Task<AuthResponseDto> RegisterNurseAsync(NurseSignupDto dto)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        if (await _context.Users.AnyAsync(u => u.Email == normalizedEmail))
        {
            throw new InvalidOperationException("An account with this email address already exists.");
        }

        if (await _context.NurseProfiles.AnyAsync(n => n.SlncNumber == dto.SlncNumber.Trim()))
        {
            throw new InvalidOperationException("An account with this SLNC Registration Number already exists.");
        }

        string? photoUrl = null;
        string? slncDocKey = null;
        string? supportingDocKey = null;

        if (dto.ProfilePhoto != null)
        {
            photoUrl = await _r2Service.UploadFileAsync(dto.ProfilePhoto, "nurses/photos");
        }

        if (dto.SlncCertificate != null)
        {
            slncDocKey = await _r2Service.UploadFileAsync(dto.SlncCertificate, "nurses/certificates");
        }

        if (dto.SupportingDocument != null)
        {
            supportingDocKey = await _r2Service.UploadFileAsync(dto.SupportingDocument, "nurses/supporting");
        }

        var regNumber = await _registrationNumberService.GenerateRegistrationNumberAsync(UserRole.NURSE);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = normalizedEmail,
            PasswordHash = _passwordHasher.HashPassword(dto.Password),
            Role = UserRole.NURSE,
            Status = UserStatus.Pending, // Nurse starts as Pending verification
            PhoneNumber = dto.PhoneNumber,
            RegistrationNumber = regNumber,
            CreatedAt = DateTime.UtcNow
        };

        var profile = new NurseProfile
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            FullName = dto.FullName.Trim(),
            SlncNumber = dto.SlncNumber.Trim(),
            PhoneNumber = dto.PhoneNumber,
            ProfilePhotoUrl = photoUrl,
            SlncCardDocKey = slncDocKey,
            SupportingDocKey = supportingDocKey,
            VerificationStatus = VerificationStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        _context.NurseProfiles.Add(profile);

        _context.AuditLogs.Add(new AuditLog
        {
            UserId = user.Id,
            UserEmail = user.Email,
            Role = "NURSE",
            Action = "NURSE_SIGNUP",
            Details = $"Nurse applied for registration with SLNC {profile.SlncNumber} (Reg #{regNumber}, Status: Pending)",
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        // Dispatch "Waiting for Approval" email in background
        _ = Task.Run(async () =>
        {
            try
            {
                await _emailService.SendPendingApprovalEmailAsync(
                    user.Email,
                    $"Nurse {profile.FullName}",
                    regNumber,
                    "Nurse");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Background error dispatching pending approval email to nurse {Email}", user.Email);
            }
        });

        return new AuthResponseDto
        {
            Token = null,
            RefreshToken = null,
            ExpiresAt = null,
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                Role = user.Role.ToString(),
                Status = user.Status.ToString(),
                Name = profile.FullName,
                PhoneNumber = user.PhoneNumber,
                RegistrationNumber = user.RegistrationNumber,
                ProfilePhotoUrl = photoUrl,
                ProfileDetails = profile
            },
            Message = "Nurse registration submitted successfully. Your account is pending administrative verification."
        };
    }

    public async Task<AuthResponseDto> RegisterHospitalAsync(HospitalSignupDto dto)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        if (await _context.Users.AnyAsync(u => u.Email == normalizedEmail))
        {
            throw new InvalidOperationException("An account with this email address already exists.");
        }

        if (await _context.HospitalProfiles.AnyAsync(h => h.RegistrationNumber == dto.RegistrationNumber.Trim()))
        {
            throw new InvalidOperationException("An account with this Hospital Registration Number already exists.");
        }

        string? logoUrl = null;
        string? regDocKey = null;
        string? mohDocKey = null;

        if (dto.Logo != null)
        {
            logoUrl = await _r2Service.UploadFileAsync(dto.Logo, "hospitals/logos");
        }

        if (dto.RegistrationCertificate != null)
        {
            regDocKey = await _r2Service.UploadFileAsync(dto.RegistrationCertificate, "hospitals/registrations");
        }

        if (dto.MohDocument != null)
        {
            mohDocKey = await _r2Service.UploadFileAsync(dto.MohDocument, "hospitals/moh_documents");
        }

        var regNumber = await _registrationNumberService.GenerateRegistrationNumberAsync(UserRole.HOSPITAL);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = normalizedEmail,
            PasswordHash = _passwordHasher.HashPassword(dto.Password),
            Role = UserRole.HOSPITAL,
            Status = UserStatus.Pending, // Hospital starts as Pending verification
            PhoneNumber = dto.ContactNumber,
            RegistrationNumber = regNumber,
            CreatedAt = DateTime.UtcNow
        };

        var profile = new HospitalProfile
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            HospitalName = dto.HospitalName.Trim(),
            RegistrationNumber = dto.RegistrationNumber.Trim(),
            HospitalType = dto.HospitalType,
            Address = dto.Address ?? string.Empty,
            District = dto.District,
            Province = dto.Province,
            ContactNumber = dto.ContactNumber,
            LogoUrl = logoUrl,
            RegistrationDocKey = regDocKey,
            MohDocKey = mohDocKey,
            VerificationStatus = VerificationStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        _context.HospitalProfiles.Add(profile);

        _context.AuditLogs.Add(new AuditLog
        {
            UserId = user.Id,
            UserEmail = user.Email,
            Role = "HOSPITAL",
            Action = "HOSPITAL_SIGNUP",
            Details = $"Hospital applied for registration: {profile.HospitalName} (Reg #{regNumber}, Lic #{profile.RegistrationNumber})",
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        // Dispatch "Waiting for Approval" email in background
        _ = Task.Run(async () =>
        {
            try
            {
                await _emailService.SendPendingApprovalEmailAsync(
                    user.Email,
                    profile.HospitalName,
                    regNumber,
                    "Hospital Facility");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Background error dispatching pending approval email to hospital {Email}", user.Email);
            }
        });

        return new AuthResponseDto
        {
            Token = null,
            RefreshToken = null,
            ExpiresAt = null,
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                Role = user.Role.ToString(),
                Status = user.Status.ToString(),
                Name = profile.HospitalName,
                PhoneNumber = user.PhoneNumber,
                RegistrationNumber = user.RegistrationNumber,
                ProfilePhotoUrl = logoUrl,
                ProfileDetails = profile
            },
            Message = "Hospital registration submitted successfully. Your account is pending administrative verification."
        };
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var user = await _context.Users
            .Include(u => u.PatientProfile)
            .Include(u => u.DoctorProfile)
            .Include(u => u.NurseProfile)
            .Include(u => u.HospitalProfile)
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        if (user == null || !_passwordHasher.VerifyPassword(dto.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Invalid email address or password.");
        }

        if (user.Status == UserStatus.Pending)
        {
            throw new InvalidOperationException("Your account is currently under administrative verification by the Ministry of Health. Access will be granted once approved by the administrator.");
        }

        if (user.Status == UserStatus.Suspended)
        {
            throw new InvalidOperationException("Your account has been suspended by the platform administrator. Please contact support.");
        }

        if (user.Status == UserStatus.Rejected)
        {
            var reason = user.DoctorProfile?.RejectionReason 
                ?? user.NurseProfile?.RejectionReason 
                ?? user.HospitalProfile?.RejectionReason 
                ?? "Application rejected.";
            throw new InvalidOperationException($"Your registration was not approved: {reason}");
        }

        var displayName = GetUserDisplayName(user);
        var photoUrl = GetUserPhotoUrl(user);

        var token = _tokenService.GenerateAccessToken(user, displayName);
        var refreshToken = _tokenService.GenerateRefreshToken();

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
        user.LastLoginAt = DateTime.UtcNow;

        _context.AuditLogs.Add(new AuditLog
        {
            UserId = user.Id,
            UserEmail = user.Email,
            Role = user.Role.ToString(),
            Action = "LOGIN_SUCCESS",
            Details = $"User logged in successfully with role {user.Role}",
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        return new AuthResponseDto
        {
            Token = token,
            RefreshToken = refreshToken,
            ExpiresAt = _tokenService.GetTokenExpiration(),
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                Role = user.Role.ToString(),
                Status = user.Status.ToString(),
                Name = displayName,
                PhoneNumber = user.PhoneNumber,
                RegistrationNumber = user.RegistrationNumber,
                ProfilePhotoUrl = photoUrl,
                ProfileDetails = GetUserProfileObject(user)
            },
            Message = "Login successful."
        };
    }

    public async Task<AuthResponseDto> RefreshTokenAsync(RefreshTokenRequestDto dto)
    {
        var user = await _context.Users
            .Include(u => u.PatientProfile)
            .Include(u => u.DoctorProfile)
            .Include(u => u.NurseProfile)
            .Include(u => u.HospitalProfile)
            .FirstOrDefaultAsync(u => u.RefreshToken == dto.RefreshToken);

        if (user == null || user.RefreshTokenExpiryTime <= DateTime.UtcNow)
        {
            throw new SecurityException("Invalid or expired refresh token.");
        }

        if (user.Status == UserStatus.Pending)
        {
            throw new InvalidOperationException("Account is pending verification.");
        }

        if (user.Status == UserStatus.Suspended)
        {
            throw new InvalidOperationException("Account is suspended.");
        }

        if (user.Status == UserStatus.Rejected)
        {
            throw new InvalidOperationException("Account registration was rejected.");
        }

        var displayName = GetUserDisplayName(user);
        var newAccessToken = _tokenService.GenerateAccessToken(user, displayName);
        var newRefreshToken = _tokenService.GenerateRefreshToken();

        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
        await _context.SaveChangesAsync();

        return new AuthResponseDto
        {
            Token = newAccessToken,
            RefreshToken = newRefreshToken,
            ExpiresAt = _tokenService.GetTokenExpiration(),
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                Role = user.Role.ToString(),
                Status = user.Status.ToString(),
                Name = displayName,
                PhoneNumber = user.PhoneNumber,
                RegistrationNumber = user.RegistrationNumber,
                ProfilePhotoUrl = GetUserPhotoUrl(user),
                ProfileDetails = GetUserProfileObject(user)
            }
        };
    }

    public async Task<bool> LogoutAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user != null)
        {
            user.RefreshToken = null;
            user.RefreshTokenExpiryTime = null;
            await _context.SaveChangesAsync();
            return true;
        }
        return false;
    }

    public async Task<UserDto> GetCurrentUserAsync(Guid userId)
    {
        var user = await _context.Users
            .Include(u => u.PatientProfile)
            .Include(u => u.DoctorProfile)
            .Include(u => u.NurseProfile)
            .Include(u => u.HospitalProfile)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
        {
            throw new KeyNotFoundException("User not found.");
        }

        return new UserDto
        {
            Id = user.Id,
            Email = user.Email,
            Role = user.Role.ToString(),
            Status = user.Status.ToString(),
            Name = GetUserDisplayName(user),
            PhoneNumber = user.PhoneNumber,
            RegistrationNumber = user.RegistrationNumber,
            ProfilePhotoUrl = GetUserPhotoUrl(user),
            ProfileDetails = GetUserProfileObject(user)
        };
    }

    private static string HashResetToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token.Trim()));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    public async Task<bool> ForgotPasswordAsync(ForgotPasswordDto dto)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var user = await _context.Users
            .Include(u => u.PatientProfile)
            .Include(u => u.DoctorProfile)
            .Include(u => u.NurseProfile)
            .Include(u => u.HospitalProfile)
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        if (user == null)
        {
            // Return generic true for security to prevent email enumeration attacks
            return true;
        }

        // 1. Generate a cryptographically secure 6-digit numeric reset token
        var rawToken = RandomNumberGenerator.GetInt32(100000, 1000000).ToString();

        // 2. Store ONLY the SHA-256 hash of the reset token in the database
        user.ResetPasswordToken = HashResetToken(rawToken);
        user.ResetPasswordExpiryTime = DateTime.UtcNow.AddMinutes(15);
        user.UpdatedAt = DateTime.UtcNow;

        _context.AuditLogs.Add(new AuditLog
        {
            UserId = user.Id,
            UserEmail = user.Email,
            Role = user.Role.ToString(),
            Action = "PASSWORD_RESET_REQUESTED",
            Details = $"Secure password reset link and token generated for {user.Email}",
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        // 3. Build frontend password reset link
        var frontendBaseUrl = _configuration["Frontend:BaseUrl"] 
            ?? Environment.GetEnvironmentVariable("FRONTEND_BASE_URL") 
            ?? "http://localhost:5173";

        var resetLink = $"{frontendBaseUrl.TrimEnd('/')}/reset-password?token={Uri.EscapeDataString(rawToken)}&email={Uri.EscapeDataString(user.Email)}";
        var displayName = GetUserDisplayName(user);

        // 4. Dispatch password reset email via SMTP
        try
        {
            await _emailService.SendPasswordResetEmailAsync(user.Email, displayName, resetLink, rawToken, 15);
            _logger.LogInformation("Password reset email successfully sent to {Email}", user.Email);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to dispatch password reset email to {Email}", user.Email);
        }

        _logger.LogInformation("Password reset token generated and processed for user {Email}", user.Email);
        return true;
    }

    public async Task<bool> ResetPasswordAsync(ResetPasswordDto dto)
    {
        // 1. Validate password constraints
        if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
        {
            throw new InvalidOperationException("Password must be at least 6 characters.");
        }

        if (!string.IsNullOrWhiteSpace(dto.ConfirmPassword) && dto.NewPassword != dto.ConfirmPassword)
        {
            throw new InvalidOperationException("New password and confirm password do not match.");
        }

        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var user = await _context.Users
            .Include(u => u.PatientProfile)
            .Include(u => u.DoctorProfile)
            .Include(u => u.NurseProfile)
            .Include(u => u.HospitalProfile)
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        if (user == null || string.IsNullOrWhiteSpace(user.ResetPasswordToken) || user.ResetPasswordExpiryTime == null || user.ResetPasswordExpiryTime < DateTime.UtcNow)
        {
            throw new InvalidOperationException("Invalid or expired password reset token.");
        }

        // 2. Validate token against stored SHA-256 hash
        var incomingHash = HashResetToken(dto.ResetToken);
        bool isValidToken = string.Equals(user.ResetPasswordToken, incomingHash, StringComparison.OrdinalIgnoreCase)
                         || string.Equals(user.ResetPasswordToken, dto.ResetToken.Trim(), StringComparison.OrdinalIgnoreCase);

        if (!isValidToken)
        {
            throw new InvalidOperationException("Invalid or expired password reset token.");
        }

        // 3. Update password using BCrypt password hasher
        user.PasswordHash = _passwordHasher.HashPassword(dto.NewPassword);

        // 4. Invalidate / clear reset token and expiry
        user.ResetPasswordToken = null;
        user.ResetPasswordExpiryTime = null;

        // 5. Invalidate existing sessions and refresh tokens for security
        user.RefreshToken = null;
        user.RefreshTokenExpiryTime = null;
        user.UpdatedAt = DateTime.UtcNow;

        _context.AuditLogs.Add(new AuditLog
        {
            UserId = user.Id,
            UserEmail = user.Email,
            Role = user.Role.ToString(),
            Action = "PASSWORD_RESET_SUCCESS",
            Details = $"Password was successfully reset for {user.Email}. Active sessions revoked.",
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        // 6. Dispatch password-changed security confirmation email
        var displayName = GetUserDisplayName(user);
        try
        {
            await _emailService.SendPasswordChangedConfirmationEmailAsync(user.Email, displayName);
            _logger.LogInformation("Password-changed confirmation email sent to {Email}", user.Email);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send password-changed confirmation email to {Email}", user.Email);
        }

        _logger.LogInformation("Password successfully reset and sessions revoked for user {Email}", user.Email);
        return true;
    }

    public async Task<bool> ChangePasswordAsync(Guid userId, ChangePasswordDto dto)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            throw new KeyNotFoundException("User not found.");
        }

        if (!_passwordHasher.VerifyPassword(dto.CurrentPassword, user.PasswordHash))
        {
            throw new InvalidOperationException("Current password is incorrect.");
        }

        user.PasswordHash = _passwordHasher.HashPassword(dto.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;

        _context.AuditLogs.Add(new AuditLog
        {
            UserId = user.Id,
            UserEmail = user.Email,
            Role = user.Role.ToString(),
            Action = "PASSWORD_CHANGE",
            Details = "User changed account password",
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<UserDto> UpdateProfileAsync(Guid userId, UpdateProfileDto dto)
    {
        var user = await _context.Users
            .Include(u => u.PatientProfile)
            .Include(u => u.DoctorProfile)
            .Include(u => u.NurseProfile)
            .Include(u => u.HospitalProfile)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
        {
            throw new KeyNotFoundException("User not found.");
        }

        if (!string.IsNullOrWhiteSpace(dto.PhoneNumber))
        {
            user.PhoneNumber = dto.PhoneNumber.Trim();
        }

        switch (user.Role)
        {
            case UserRole.PATIENT:
                if (user.PatientProfile != null)
                {
                    if (!string.IsNullOrWhiteSpace(dto.FullName)) user.PatientProfile.FullName = dto.FullName.Trim();
                    if (!string.IsNullOrWhiteSpace(dto.PhoneNumber)) user.PatientProfile.PhoneNumber = dto.PhoneNumber.Trim();
                    if (dto.DateOfBirth.HasValue) user.PatientProfile.DateOfBirth = dto.DateOfBirth.Value;
                    if (!string.IsNullOrWhiteSpace(dto.ProfilePhotoUrl)) user.PatientProfile.ProfilePhotoUrl = dto.ProfilePhotoUrl;
                }
                break;

            case UserRole.DOCTOR:
                if (user.DoctorProfile != null)
                {
                    if (!string.IsNullOrWhiteSpace(dto.FullName)) user.DoctorProfile.FullName = dto.FullName.Trim();
                    if (!string.IsNullOrWhiteSpace(dto.PhoneNumber)) user.DoctorProfile.PhoneNumber = dto.PhoneNumber.Trim();
                    if (!string.IsNullOrWhiteSpace(dto.Specialization)) user.DoctorProfile.Specialization = dto.Specialization.Trim();
                    if (!string.IsNullOrWhiteSpace(dto.ProfilePhotoUrl)) user.DoctorProfile.ProfilePhotoUrl = dto.ProfilePhotoUrl;
                }
                break;

            case UserRole.NURSE:
                if (user.NurseProfile != null)
                {
                    if (!string.IsNullOrWhiteSpace(dto.FullName)) user.NurseProfile.FullName = dto.FullName.Trim();
                    if (!string.IsNullOrWhiteSpace(dto.PhoneNumber)) user.NurseProfile.PhoneNumber = dto.PhoneNumber.Trim();
                    if (!string.IsNullOrWhiteSpace(dto.ProfilePhotoUrl)) user.NurseProfile.ProfilePhotoUrl = dto.ProfilePhotoUrl;
                }
                break;

            case UserRole.HOSPITAL:
                if (user.HospitalProfile != null)
                {
                    if (!string.IsNullOrWhiteSpace(dto.HospitalName)) user.HospitalProfile.HospitalName = dto.HospitalName.Trim();
                    if (!string.IsNullOrWhiteSpace(dto.PhoneNumber)) user.HospitalProfile.ContactNumber = dto.PhoneNumber.Trim();
                    if (!string.IsNullOrWhiteSpace(dto.HospitalType)) user.HospitalProfile.HospitalType = dto.HospitalType.Trim();
                    if (!string.IsNullOrWhiteSpace(dto.OperatingHours)) user.HospitalProfile.OperatingHours = dto.OperatingHours.Trim();
                    if (!string.IsNullOrWhiteSpace(dto.Address)) user.HospitalProfile.Address = dto.Address.Trim();
                    if (!string.IsNullOrWhiteSpace(dto.District)) user.HospitalProfile.District = dto.District.Trim();
                    if (!string.IsNullOrWhiteSpace(dto.Province)) user.HospitalProfile.Province = dto.Province.Trim();
                    if (!string.IsNullOrWhiteSpace(dto.ProfilePhotoUrl)) user.HospitalProfile.LogoUrl = dto.ProfilePhotoUrl;
                }
                break;
        }

        user.UpdatedAt = DateTime.UtcNow;

        _context.AuditLogs.Add(new AuditLog
        {
            UserId = user.Id,
            UserEmail = user.Email,
            Role = user.Role.ToString(),
            Action = "PROFILE_UPDATED",
            Details = $"User updated profile details ({user.Role})",
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        return new UserDto
        {
            Id = user.Id,
            Email = user.Email,
            Role = user.Role.ToString(),
            Status = user.Status.ToString(),
            Name = GetUserDisplayName(user),
            PhoneNumber = user.PhoneNumber,
            RegistrationNumber = user.RegistrationNumber,
            ProfilePhotoUrl = GetUserPhotoUrl(user),
            ProfileDetails = GetUserProfileObject(user)
        };
    }

    public async Task<bool> DeleteAccountAsync(Guid userId)
    {
        var user = await _context.Users
            .Include(u => u.PatientProfile)
            .Include(u => u.DoctorProfile)
            .Include(u => u.NurseProfile)
            .Include(u => u.HospitalProfile)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
        {
            throw new KeyNotFoundException("User not found.");
        }

        var userEmail = user.Email;
        var displayName = GetUserDisplayName(user);
        var roleName = user.Role.ToString();
        var regNumber = user.RegistrationNumber ?? user.Id.ToString();

        _logger.LogInformation("Permanently deleting account for user {UserId} with role {Role} and email {Email}", user.Id, user.Role, user.Email);

        // Record Audit Log before removing
        _context.AuditLogs.Add(new AuditLog
        {
            UserId = user.Id,
            UserEmail = user.Email,
            Role = user.Role.ToString(),
            Action = "ACCOUNT_DELETED",
            Details = $"User self-deleted their account ({user.Role}) with registration number {user.RegistrationNumber}",
            Timestamp = DateTime.UtcNow
        });

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        // Send confirmation email to user after account deletion
        try
        {
            await _emailService.SendAccountDeletedEmailAsync(userEmail, displayName, regNumber, roleName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send account deletion email to {Email}", userEmail);
        }

        return true;
    }

    private static string GetUserDisplayName(User user)
    {
        return user.Role switch
        {
            UserRole.PATIENT => user.PatientProfile?.FullName ?? "Patient",
            UserRole.DOCTOR => $"Dr. {user.DoctorProfile?.FullName ?? "Doctor"}",
            UserRole.NURSE => $"Nurse {user.NurseProfile?.FullName ?? "Nurse"}",
            UserRole.HOSPITAL => user.HospitalProfile?.HospitalName ?? "Hospital",
            UserRole.ADMIN => "System Administrator",
            _ => "User"
        };
    }

    private static string? GetUserPhotoUrl(User user)
    {
        return user.Role switch
        {
            UserRole.PATIENT => user.PatientProfile?.ProfilePhotoUrl,
            UserRole.DOCTOR => user.DoctorProfile?.ProfilePhotoUrl,
            UserRole.NURSE => user.NurseProfile?.ProfilePhotoUrl,
            UserRole.HOSPITAL => user.HospitalProfile?.LogoUrl,
            _ => null
        };
    }

    private static object? GetUserProfileObject(User user)
    {
        return user.Role switch
        {
            UserRole.PATIENT => user.PatientProfile,
            UserRole.DOCTOR => user.DoctorProfile,
            UserRole.NURSE => user.NurseProfile,
            UserRole.HOSPITAL => user.HospitalProfile,
            _ => null
        };
    }
}
public class SecurityException : Exception
{
    public SecurityException(string message) : base(message) { }
}
