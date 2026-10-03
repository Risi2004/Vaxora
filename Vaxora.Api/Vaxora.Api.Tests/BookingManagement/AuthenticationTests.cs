using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;
using Vaxora.Api.Data;
using Vaxora.Api.Dtos;
using Vaxora.Api.Models;
using Vaxora.Api.Services;

namespace Vaxora.Api.Tests.BookingManagement;

public class AuthenticationTests
{
    private static IConfiguration CreateConfiguration() =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SecretKey"] = "VaxoraTestPlatformSecretKeyLongEnoughForHmacSha256!2026",
                ["Jwt:Issuer"] = "Vaxora.Api",
                ["Jwt:Audience"] = "Vaxora.Client",
                ["Jwt:ExpiryInMinutes"] = "60"
            })
            .Build();

    private static (AuthService service, ApplicationDbContext context, ITokenService tokenService, IPasswordHasher hasher) CreateAuthService()
    {
        var context = TestDb.CreateContext();
        var config = CreateConfiguration();
        var tokenService = new TokenService(config);
        var hasher = new PasswordHasher();
        var service = new AuthService(
            context,
            hasher,
            tokenService,
            new FakeR2StorageService(),
            new FakeRegistrationNumberService(),
            new FakeVaccinationCardService(),
            new FakeEmailService(),
            config,
            NullLogger<AuthService>.Instance);

        return (service, context, tokenService, hasher);
    }

    [Fact]
    public async Task LoginAsync_valid_credentials_returns_jwt_and_user_dto()
    {
        var (service, context, _, hasher) = CreateAuthService();
        var password = "SecurePassword#2026";
        var user = new User
        {
            Email = "patient.login@vaxora.lk",
            PasswordHash = hasher.HashPassword(password),
            Role = UserRole.PATIENT,
            Status = UserStatus.Active,
            RegistrationNumber = "VAX-P-8801",
            PatientProfile = new PatientProfile
            {
                FullName = "Kasun Perera",
                NicNumber = "931234567V",
                DateOfBirth = new DateTime(1993, 2, 10, 0, 0, 0, DateTimeKind.Utc)
            }
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var response = await service.LoginAsync(new LoginDto
        {
            Email = "patient.login@vaxora.lk",
            Password = password
        });

        Assert.NotNull(response.Token);
        Assert.NotNull(response.RefreshToken);
        Assert.Equal("patient.login@vaxora.lk", response.User.Email);
        Assert.Equal("PATIENT", response.User.Role);
        Assert.Equal("Kasun Perera", response.User.Name);

        // Verify audit log recorded
        var audit = await context.AuditLogs.SingleOrDefaultAsync(a => a.UserId == user.Id && a.Action == "LOGIN_SUCCESS");
        Assert.NotNull(audit);
    }

    [Fact]
    public async Task LoginAsync_wrong_password_throws_UnauthorizedAccessException()
    {
        var (service, context, _, hasher) = CreateAuthService();
        var user = new User
        {
            Email = "patient.wrongpass@vaxora.lk",
            PasswordHash = hasher.HashPassword("CorrectPassword123!"),
            Role = UserRole.PATIENT,
            Status = UserStatus.Active,
            RegistrationNumber = "VAX-P-8802"
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.LoginAsync(new LoginDto
            {
                Email = "patient.wrongpass@vaxora.lk",
                Password = "WrongPassword999!"
            }));

        Assert.Contains("Invalid email address or password", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task LoginAsync_non_existent_email_throws_UnauthorizedAccessException()
    {
        var (service, _, _, _) = CreateAuthService();

        var ex = await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.LoginAsync(new LoginDto
            {
                Email = "nonexistent.user@vaxora.lk",
                Password = "AnyPassword123!"
            }));

        Assert.Contains("Invalid email address or password", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task LoginAsync_suspended_account_throws_InvalidOperationException()
    {
        var (service, context, _, hasher) = CreateAuthService();
        var password = "Password123!";
        var user = new User
        {
            Email = "suspended@vaxora.lk",
            PasswordHash = hasher.HashPassword(password),
            Role = UserRole.PATIENT,
            Status = UserStatus.Suspended,
            RegistrationNumber = "VAX-P-8803"
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.LoginAsync(new LoginDto
            {
                Email = "suspended@vaxora.lk",
                Password = password
            }));

        Assert.Contains("suspended", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task LoginAsync_pending_account_throws_InvalidOperationException()
    {
        var (service, context, _, hasher) = CreateAuthService();
        var password = "Password123!";
        var doctor = new User
        {
            Email = "pending.doctor@vaxora.lk",
            PasswordHash = hasher.HashPassword(password),
            Role = UserRole.DOCTOR,
            Status = UserStatus.Pending,
            RegistrationNumber = "VAX-D-8804",
            DoctorProfile = new DoctorProfile
            {
                FullName = "Dr. Pending",
                SlmcNumber = "SLMC-9999",
                VerificationStatus = VerificationStatus.Pending
            }
        };
        context.Users.Add(doctor);
        await context.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.LoginAsync(new LoginDto
            {
                Email = "pending.doctor@vaxora.lk",
                Password = password
            }));

        Assert.Contains("verification", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void TokenService_GenerateAccessToken_includes_role_and_identity_claims()
    {
        var config = CreateConfiguration();
        var tokenService = new TokenService(config);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "doctor.token@vaxora.lk",
            Role = UserRole.DOCTOR,
            Status = UserStatus.Active
        };

        var jwtString = tokenService.GenerateAccessToken(user, "Dr. Nimal Fernando");

        Assert.NotNull(jwtString);
        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(jwtString);

        Assert.Equal("Vaxora.Api", jwt.Issuer);
        Assert.Contains(jwt.Claims, c => (c.Type == "role" || c.Type == ClaimTypes.Role) && c.Value == "DOCTOR");
        Assert.Contains(jwt.Claims, c => (c.Type == "email" || c.Type == ClaimTypes.Email) && c.Value == "doctor.token@vaxora.lk");
        Assert.Contains(jwt.Claims, c => (c.Type == "nameid" || c.Type == "sub" || c.Type == ClaimTypes.NameIdentifier) && c.Value == user.Id.ToString());
    }

    [Fact]
    public void TokenService_GetPrincipalFromExpiredToken_validates_signature_and_extracts_principal()
    {
        var config = CreateConfiguration();
        var tokenService = new TokenService(config);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "nurse.token@vaxora.lk",
            Role = UserRole.NURSE,
            Status = UserStatus.Active
        };

        var jwtString = tokenService.GenerateAccessToken(user, "Nurse Kumari");
        var principal = tokenService.GetPrincipalFromExpiredToken(jwtString);

        Assert.NotNull(principal);
        Assert.Equal(user.Id.ToString(), principal.FindFirst(ClaimTypes.NameIdentifier)?.Value);
        Assert.Equal("NURSE", principal.FindFirst(ClaimTypes.Role)?.Value);
    }

    [Fact]
    public void TokenService_GetPrincipalFromExpiredToken_returns_null_for_tampered_token()
    {
        var config = CreateConfiguration();
        var tokenService = new TokenService(config);

        var principal = tokenService.GetPrincipalFromExpiredToken("this.is.a.tampered.token");
        Assert.Null(principal);
    }
}
