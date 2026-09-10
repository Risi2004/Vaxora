using Microsoft.EntityFrameworkCore;
using Vaxora.Api.Data;
using Vaxora.Api.Dtos;
using Vaxora.Api.Models;

namespace Vaxora.Api.Services;

public interface IAdminService
{
    Task<List<PendingVerificationUserDto>> GetPendingVerificationsAsync();
    Task<bool> ProcessVerificationDecisionAsync(Guid adminId, Guid targetUserId, VerificationDecisionDto dto);
    Task<bool> UpdateUserStatusAsync(Guid adminId, Guid targetUserId, UserStatusUpdateDto dto);
    Task<List<AuditLog>> GetAuditLogsAsync(int limit = 100);
    Task<List<AdminUserItemDto>> GetAllUsersAsync(string? role = null, string? status = null, string? search = null);
}

public class AdminService : IAdminService
{
    private readonly ApplicationDbContext _context;
    private readonly IR2StorageService _r2Service;
    private readonly IEmailService _emailService;
    private readonly ILogger<AdminService> _logger;

    public AdminService(
        ApplicationDbContext context,
        IR2StorageService r2Service,
        IEmailService emailService,
        ILogger<AdminService> logger)
    {
        _context = context;
        _r2Service = r2Service;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task<List<PendingVerificationUserDto>> GetPendingVerificationsAsync()
    {
        var pendingUsers = await _context.Users
            .Include(u => u.DoctorProfile)
            .Include(u => u.NurseProfile)
            .Include(u => u.HospitalProfile)
            .Where(u => u.Status == UserStatus.Pending && u.Role != UserRole.PATIENT && u.Role != UserRole.ADMIN)
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync();

        var result = new List<PendingVerificationUserDto>();

        foreach (var user in pendingUsers)
        {
            var item = new PendingVerificationUserDto
            {
                UserId = user.Id,
                Email = user.Email,
                Role = user.Role.ToString(),
                Status = user.Status.ToString(),
                PhoneNumber = user.PhoneNumber,
                RegistrationNumber = user.RegistrationNumber,
                CreatedAt = user.CreatedAt
            };

            if (user.Role == UserRole.DOCTOR && user.DoctorProfile != null)
            {
                item.Name = $"Dr. {user.DoctorProfile.FullName}";
                item.LicenseOrRegNumber = user.DoctorProfile.SlmcNumber;
                item.HospitalAffiliationOrType = user.DoctorProfile.Specialization ?? "General Practitioner";
                item.ProfilePhotoOrLogoUrl = user.DoctorProfile.ProfilePhotoUrl;
                item.PrimaryDocUrl = !string.IsNullOrEmpty(user.DoctorProfile.SlmcCardDocKey) 
                    ? await _r2Service.GetPresignedUrlAsync(user.DoctorProfile.SlmcCardDocKey) 
                    : null;
                item.SupportingDocUrl = !string.IsNullOrEmpty(user.DoctorProfile.SupportingDocKey) 
                    ? await _r2Service.GetPresignedUrlAsync(user.DoctorProfile.SupportingDocKey) 
                    : null;
            }
            else if (user.Role == UserRole.NURSE && user.NurseProfile != null)
            {
                item.Name = $"Nurse {user.NurseProfile.FullName}";
                item.LicenseOrRegNumber = user.NurseProfile.SlncNumber;
                item.HospitalAffiliationOrType = "Nursing Staff";
                item.ProfilePhotoOrLogoUrl = user.NurseProfile.ProfilePhotoUrl;
                item.PrimaryDocUrl = !string.IsNullOrEmpty(user.NurseProfile.SlncCardDocKey) 
                    ? await _r2Service.GetPresignedUrlAsync(user.NurseProfile.SlncCardDocKey) 
                    : null;
                item.SupportingDocUrl = !string.IsNullOrEmpty(user.NurseProfile.SupportingDocKey) 
                    ? await _r2Service.GetPresignedUrlAsync(user.NurseProfile.SupportingDocKey) 
                    : null;
            }
            else if (user.Role == UserRole.HOSPITAL && user.HospitalProfile != null)
            {
                item.Name = user.HospitalProfile.HospitalName;
                item.LicenseOrRegNumber = user.HospitalProfile.RegistrationNumber;
                item.HospitalAffiliationOrType = $"{user.HospitalProfile.HospitalType ?? "Hospital"} • {user.HospitalProfile.District ?? "Sri Lanka"}";
                item.ProfilePhotoOrLogoUrl = user.HospitalProfile.LogoUrl;
                item.PrimaryDocUrl = !string.IsNullOrEmpty(user.HospitalProfile.RegistrationDocKey) 
                    ? await _r2Service.GetPresignedUrlAsync(user.HospitalProfile.RegistrationDocKey) 
                    : null;
                item.SupportingDocUrl = !string.IsNullOrEmpty(user.HospitalProfile.MohDocKey) 
                    ? await _r2Service.GetPresignedUrlAsync(user.HospitalProfile.MohDocKey) 
                    : null;
            }

            result.Add(item);
        }

        return result;
    }

    public async Task<bool> ProcessVerificationDecisionAsync(Guid adminId, Guid targetUserId, VerificationDecisionDto dto)
    {
        var targetUser = await _context.Users
            .Include(u => u.DoctorProfile)
            .Include(u => u.NurseProfile)
            .Include(u => u.HospitalProfile)
            .FirstOrDefaultAsync(u => u.Id == targetUserId);

        if (targetUser == null)
        {
            throw new KeyNotFoundException("User not found.");
        }

        var isApprove = string.Equals(dto.Decision, "Approve", StringComparison.OrdinalIgnoreCase);
        var regNumber = targetUser.RegistrationNumber ?? "N/A";
        string recipientName;
        string roleTitle;

        if (targetUser.Role == UserRole.DOCTOR)
        {
            recipientName = $"Dr. {targetUser.DoctorProfile?.FullName ?? "Doctor"}";
            roleTitle = "Doctor";
        }
        else if (targetUser.Role == UserRole.NURSE)
        {
            recipientName = $"Nurse {targetUser.NurseProfile?.FullName ?? "Nurse"}";
            roleTitle = "Nurse";
        }
        else if (targetUser.Role == UserRole.HOSPITAL)
        {
            recipientName = targetUser.HospitalProfile?.HospitalName ?? "Hospital Facility";
            roleTitle = "Hospital Facility";
        }
        else
        {
            recipientName = "Healthcare Professional";
            roleTitle = targetUser.Role.ToString();
        }

        if (isApprove)
        {
            targetUser.Status = UserStatus.Active;
            if (targetUser.DoctorProfile != null)
            {
                targetUser.DoctorProfile.VerificationStatus = VerificationStatus.Approved;
                targetUser.DoctorProfile.VerifiedAt = DateTime.UtcNow;
                targetUser.DoctorProfile.VerifiedByAdminId = adminId;
                targetUser.DoctorProfile.RejectionReason = null;
            }
            else if (targetUser.NurseProfile != null)
            {
                targetUser.NurseProfile.VerificationStatus = VerificationStatus.Approved;
                targetUser.NurseProfile.VerifiedAt = DateTime.UtcNow;
                targetUser.NurseProfile.VerifiedByAdminId = adminId;
                targetUser.NurseProfile.RejectionReason = null;
            }
            else if (targetUser.HospitalProfile != null)
            {
                targetUser.HospitalProfile.VerificationStatus = VerificationStatus.Approved;
                targetUser.HospitalProfile.VerifiedAt = DateTime.UtcNow;
                targetUser.HospitalProfile.VerifiedByAdminId = adminId;
                targetUser.HospitalProfile.RejectionReason = null;
            }

            _context.AuditLogs.Add(new AuditLog
            {
                UserId = adminId,
                Role = "ADMIN",
                Action = "VERIFICATION_APPROVED",
                Details = $"Admin approved registration for user {targetUser.Email} (Role: {targetUser.Role}, Reg #{regNumber})",
                Timestamp = DateTime.UtcNow
            });

            // Dispatch Account Approved email in background
            _ = Task.Run(async () =>
            {
                try
                {
                    await _emailService.SendApprovalEmailAsync(
                        targetUser.Email,
                        recipientName,
                        regNumber,
                        roleTitle);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Background error dispatching approval email to {Email}", targetUser.Email);
                }
            });
        }
        else
        {
            targetUser.Status = UserStatus.Rejected;
            var reason = dto.Reason ?? "Documentation criteria not met.";
            if (targetUser.DoctorProfile != null)
            {
                targetUser.DoctorProfile.VerificationStatus = VerificationStatus.Rejected;
                targetUser.DoctorProfile.RejectionReason = reason;
                targetUser.DoctorProfile.VerifiedByAdminId = adminId;
            }
            else if (targetUser.NurseProfile != null)
            {
                targetUser.NurseProfile.VerificationStatus = VerificationStatus.Rejected;
                targetUser.NurseProfile.RejectionReason = reason;
                targetUser.NurseProfile.VerifiedByAdminId = adminId;
            }
            else if (targetUser.HospitalProfile != null)
            {
                targetUser.HospitalProfile.VerificationStatus = VerificationStatus.Rejected;
                targetUser.HospitalProfile.RejectionReason = reason;
                targetUser.HospitalProfile.VerifiedByAdminId = adminId;
            }

            _context.AuditLogs.Add(new AuditLog
            {
                UserId = adminId,
                Role = "ADMIN",
                Action = "VERIFICATION_REJECTED",
                Details = $"Admin rejected registration for user {targetUser.Email} (Role: {targetUser.Role}, Reg #{regNumber}). Reason: {reason}",
                Timestamp = DateTime.UtcNow
            });

            // Dispatch Account Rejected email in background
            _ = Task.Run(async () =>
            {
                try
                {
                    await _emailService.SendRejectionEmailAsync(
                        targetUser.Email,
                        recipientName,
                        regNumber,
                        roleTitle,
                        reason);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Background error dispatching rejection email to {Email}", targetUser.Email);
                }
            });
        }

        targetUser.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UpdateUserStatusAsync(Guid adminId, Guid targetUserId, UserStatusUpdateDto dto)
    {
        var targetUser = await _context.Users.FindAsync(targetUserId);
        if (targetUser == null)
        {
            throw new KeyNotFoundException("User not found.");
        }

        if (targetUser.Role == UserRole.ADMIN)
        {
            throw new InvalidOperationException("Cannot modify primary administrator account status.");
        }

        if (Enum.TryParse<UserStatus>(dto.Status, true, out var newStatus))
        {
            targetUser.Status = newStatus;
            targetUser.UpdatedAt = DateTime.UtcNow;

            _context.AuditLogs.Add(new AuditLog
            {
                UserId = adminId,
                Role = "ADMIN",
                Action = "USER_STATUS_UPDATE",
                Details = $"Admin changed status of {targetUser.Email} to {newStatus}",
                Timestamp = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            return true;
        }

        throw new ArgumentException($"Invalid status value: {dto.Status}");
    }

    public async Task<List<AuditLog>> GetAuditLogsAsync(int limit = 100)
    {
        return await _context.AuditLogs
            .OrderByDescending(a => a.Timestamp)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<List<AdminUserItemDto>> GetAllUsersAsync(string? role = null, string? status = null, string? search = null)
    {
        var query = _context.Users
            .Include(u => u.PatientProfile)
            .Include(u => u.DoctorProfile)
            .Include(u => u.NurseProfile)
            .Include(u => u.HospitalProfile)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(role) && !string.Equals(role, "all", StringComparison.OrdinalIgnoreCase) && Enum.TryParse<UserRole>(role, true, out var roleEnum))
        {
            query = query.Where(u => u.Role == roleEnum);
        }

        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "all", StringComparison.OrdinalIgnoreCase) && Enum.TryParse<UserStatus>(status, true, out var statusEnum))
        {
            query = query.Where(u => u.Status == statusEnum);
        }

        var users = await query.OrderByDescending(u => u.CreatedAt).ToListAsync();

        var result = new List<AdminUserItemDto>();
        foreach (var u in users)
        {
            string name = u.Role switch
            {
                UserRole.PATIENT => u.PatientProfile?.FullName ?? "Citizen",
                UserRole.DOCTOR => $"Dr. {u.DoctorProfile?.FullName ?? "Doctor"}",
                UserRole.NURSE => $"Nurse {u.NurseProfile?.FullName ?? "Nurse"}",
                UserRole.HOSPITAL => u.HospitalProfile?.HospitalName ?? "Hospital",
                UserRole.ADMIN => "System Administrator",
                _ => "User"
            };

            string identifier = u.Role switch
            {
                UserRole.PATIENT => !string.IsNullOrEmpty(u.PatientProfile?.NicNumber) ? $"NIC: {u.PatientProfile.NicNumber}" : "N/A",
                UserRole.DOCTOR => u.DoctorProfile?.SlmcNumber ?? "N/A",
                UserRole.NURSE => u.NurseProfile?.SlncNumber ?? "N/A",
                UserRole.HOSPITAL => u.HospitalProfile?.RegistrationNumber ?? "N/A",
                UserRole.ADMIN => "MOH-ROOT-ADMIN",
                _ => "N/A"
            };

            string facilityOrDetails = u.Role switch
            {
                UserRole.PATIENT => "Registered Citizen Record",
                UserRole.DOCTOR => u.DoctorProfile?.Specialization ?? "General Practitioner",
                UserRole.NURSE => "Nursing Staff",
                UserRole.HOSPITAL => $"{u.HospitalProfile?.HospitalType ?? "Hospital"} • {u.HospitalProfile?.District ?? "Sri Lanka"}",
                UserRole.ADMIN => "Ministry of Health System Admin",
                _ => "N/A"
            };

            result.Add(new AdminUserItemDto
            {
                Id = u.Id,
                Email = u.Email,
                Role = u.Role.ToString().ToLowerInvariant(),
                Status = u.Status.ToString().ToLowerInvariant(),
                Name = name,
                PhoneNumber = u.PhoneNumber,
                RegistrationNumber = u.RegistrationNumber,
                Identifier = identifier,
                FacilityOrDetails = facilityOrDetails,
                CreatedAt = u.CreatedAt,
                LastLoginAt = u.LastLoginAt,
                Profile = u.Role switch
                {
                    UserRole.PATIENT => u.PatientProfile,
                    UserRole.DOCTOR => u.DoctorProfile,
                    UserRole.NURSE => u.NurseProfile,
                    UserRole.HOSPITAL => u.HospitalProfile,
                    _ => null
                }
            });
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLowerInvariant();
            result = result.Where(r =>
                r.Name.ToLowerInvariant().Contains(s) ||
                r.Email.ToLowerInvariant().Contains(s) ||
                r.Identifier.ToLowerInvariant().Contains(s) ||
                (r.RegistrationNumber != null && r.RegistrationNumber.ToLowerInvariant().Contains(s)) ||
                r.FacilityOrDetails.ToLowerInvariant().Contains(s) ||
                (r.PhoneNumber != null && r.PhoneNumber.Contains(s))
            ).ToList();
        }

        return result;
    }
}
