using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Reflection;
using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Xunit;
using Vaxora.Api.Controllers;
using Vaxora.Api.Data;
using Vaxora.Api.Models;
using Vaxora.Api.Services;

namespace Vaxora.Api.Tests.BookingManagement;

public class AuthorizationTests
{
    private const string JwtSecret = "VaxoraTestPlatformSecretKeyLongEnoughForHmacSha256!2026";

    private static AuthorizeAttribute? GetClassAuthorizeAttribute(Type controllerType) =>
        controllerType.GetCustomAttribute<AuthorizeAttribute>();

    private static AuthorizeAttribute? GetMethodAuthorizeAttribute(Type controllerType, string methodName) =>
        controllerType.GetMethod(methodName)?.GetCustomAttribute<AuthorizeAttribute>();

    private static (TestServer server, HttpClient client) CreateAuthTestServer(string dbName)
    {
        var builder = new WebHostBuilder()
            .ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Jwt:SecretKey"] = JwtSecret,
                    ["Jwt:Issuer"] = "Vaxora.Api",
                    ["Jwt:Audience"] = "Vaxora.Client",
                    ["Jwt:ExpiryInMinutes"] = "60"
                });
            })
            .ConfigureServices(services =>
            {
                services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                })
                .AddJwtBearer(options =>
                {
                    options.RequireHttpsMetadata = false;
                    options.SaveToken = true;
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer = "Vaxora.Api",
                        ValidAudience = "Vaxora.Client",
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtSecret)),
                        ClockSkew = TimeSpan.Zero
                    };
                });

                services.AddAuthorization();

                services.AddControllers()
                    .AddApplicationPart(typeof(AuthController).Assembly)
                    .AddJsonOptions(options =>
                    {
                        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
                    });

                services.AddDbContext<ApplicationDbContext>(options =>
                {
                    options.UseInMemoryDatabase(dbName);
                });

                // Application & Infrastructure Services
                services.AddScoped<IPasswordHasher, PasswordHasher>();
                services.AddScoped<ITokenService, TokenService>();
                services.AddScoped<IR2StorageService, FakeR2StorageService>();
                services.AddScoped<IRegistrationNumberService, FakeRegistrationNumberService>();
                services.AddScoped<IVaccinationCardService, FakeVaccinationCardService>();
                services.AddScoped<IEmailService, FakeEmailService>();
                services.AddScoped<IAuthService, AuthService>();
                services.AddScoped<IAdminService, AdminService>();
                services.AddScoped<IInventoryService, InventoryService>();
                services.AddScoped<IAppointmentService, AppointmentService>();
                services.AddScoped<IPayHereService, PayHereService>();

                services.AddRouting();
            })
            .Configure(app =>
            {
                app.UseRouting();
                app.UseAuthentication();
                app.UseAuthorization();
                app.UseEndpoints(endpoints =>
                {
                    endpoints.MapControllers();
                });
            });

        var server = new TestServer(builder);
        var client = server.CreateClient();
        return (server, client);
    }

    private static string GenerateJwt(Guid userId, string role, string email)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(JwtSecret);
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, email),
                new Claim(ClaimTypes.Email, email),
                new Claim(ClaimTypes.Role, role)
            }),
            Expires = DateTime.UtcNow.AddHours(1),
            Issuer = "Vaxora.Api",
            Audience = "Vaxora.Client",
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    // ==========================================
    // ATTRIBUTE-LEVEL AUTHORIZATION TESTS
    // ==========================================

    [Fact]
    public void AdminVerificationController_is_strictly_restricted_to_ADMIN_role()
    {
        var attr = GetClassAuthorizeAttribute(typeof(AdminVerificationController));
        Assert.NotNull(attr);
        Assert.Equal("ADMIN", attr.Roles);
    }

    [Fact]
    public void ClinicalPatientController_is_restricted_to_DOCTOR_and_NURSE_roles()
    {
        var attr = GetClassAuthorizeAttribute(typeof(ClinicalPatientController));
        Assert.NotNull(attr);
        Assert.Contains("DOCTOR", attr.Roles);
        Assert.Contains("NURSE", attr.Roles);
        Assert.DoesNotContain("PATIENT", attr.Roles);
    }

    [Fact]
    public void InventoryController_excludes_PATIENT_role()
    {
        var attr = GetClassAuthorizeAttribute(typeof(InventoryController));
        Assert.NotNull(attr);
        var roles = attr.Roles?.Split(',') ?? Array.Empty<string>();

        Assert.Contains("HOSPITAL", roles);
        Assert.Contains("ADMIN", roles);
        Assert.Contains("DOCTOR", roles);
        Assert.Contains("NURSE", roles);
        Assert.DoesNotContain("PATIENT", roles);
    }

    [Fact]
    public void ShiftSwapController_Create_is_restricted_to_clinical_staff()
    {
        var methodAttr = GetMethodAuthorizeAttribute(typeof(ShiftSwapController), nameof(ShiftSwapController.Create));
        Assert.NotNull(methodAttr);
        Assert.Contains("DOCTOR", methodAttr.Roles);
        Assert.Contains("NURSE", methodAttr.Roles);
        Assert.DoesNotContain("HOSPITAL", methodAttr.Roles);
    }

    [Fact]
    public void ShiftSwapController_Decide_is_restricted_to_hospital_management()
    {
        var methodAttr = GetMethodAuthorizeAttribute(typeof(ShiftSwapController), nameof(ShiftSwapController.Decide));
        Assert.NotNull(methodAttr);
        Assert.Equal("HOSPITAL", methodAttr.Roles);
    }

    [Theory]
    [InlineData("ADMIN", "ADMIN", true)]
    [InlineData("ADMIN", "PATIENT", false)]
    [InlineData("DOCTOR", "DOCTOR", true)]
    [InlineData("DOCTOR", "ADMIN", false)]
    [InlineData("NURSE", "NURSE", true)]
    [InlineData("PATIENT", "HOSPITAL", false)]
    public void ClaimsPrincipal_role_evaluation_matches_authorization_requirements(
        string userRole, string checkedRole, bool expectedResult)
    {
        var identity = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Role, userRole)
        }, "TestAuthType");

        var principal = new ClaimsPrincipal(identity);

        Assert.True(principal.Identity?.IsAuthenticated);
        Assert.Equal(expectedResult, principal.IsInRole(checkedRole));
    }

    [Fact]
    public void Anonymous_principal_fails_authentication_and_role_checks()
    {
        var anonymous = new ClaimsPrincipal(new ClaimsIdentity());

        Assert.False(anonymous.Identity?.IsAuthenticated);
        Assert.False(anonymous.IsInRole("ADMIN"));
        Assert.False(anonymous.IsInRole("PATIENT"));
    }

    // ==========================================
    // REAL API-LEVEL JWT AUTHORIZATION TESTS (401, 403, 200)
    // ==========================================

    [Fact]
    public async Task ApiAuth_ProtectedEndpoint_without_token_returns_401_Unauthorized()
    {
        var (server, client) = CreateAuthTestServer(Guid.NewGuid().ToString());
        using (server)
        using (client)
        {
            var response = await client.GetAsync("/api/auth/me");
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }
    }

    [Fact]
    public async Task ApiAuth_ProtectedEndpoint_with_invalid_token_returns_401_Unauthorized()
    {
        var (server, client) = CreateAuthTestServer(Guid.NewGuid().ToString());
        using (server)
        using (client)
        {
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "malformed.or.untrusted.token");
            var response = await client.GetAsync("/api/auth/me");
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }
    }

    [Fact]
    public async Task ApiAuth_PatientEndpoint_with_valid_patient_token_returns_200_OK()
    {
        var dbName = Guid.NewGuid().ToString();
        var (server, client) = CreateAuthTestServer(dbName);
        using (server)
        using (client)
        {
            var patientId = Guid.NewGuid();
            using (var scope = server.Services.CreateScope())
            {
                var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                context.Users.Add(new User
                {
                    Id = patientId,
                    Email = "auth.patient@vaxora.lk",
                    PasswordHash = "hash",
                    Role = UserRole.PATIENT,
                    Status = UserStatus.Active,
                    RegistrationNumber = "VAX-P-9001",
                    PatientProfile = new PatientProfile
                    {
                        FullName = "Auth Patient",
                        NicNumber = "990011224V"
                    }
                });
                await context.SaveChangesAsync();
            }

            var token = GenerateJwt(patientId, "PATIENT", "auth.patient@vaxora.lk");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await client.GetAsync("/api/auth/me");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }

    [Fact]
    public async Task ApiAuth_InventoryEndpoint_with_patient_role_returns_403_Forbidden()
    {
        var (server, client) = CreateAuthTestServer(Guid.NewGuid().ToString());
        using (server)
        using (client)
        {
            // Patient tries to access Hospital Inventory endpoint
            var token = GenerateJwt(Guid.NewGuid(), "PATIENT", "patient.denied@vaxora.lk");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await client.GetAsync("/api/inventory/formulary");
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }
    }

    [Fact]
    public async Task ApiAuth_InventoryEndpoint_with_hospital_role_returns_200_OK()
    {
        var dbName = Guid.NewGuid().ToString();
        var (server, client) = CreateAuthTestServer(dbName);
        using (server)
        using (client)
        {
            var hospitalId = Guid.NewGuid();
            using (var scope = server.Services.CreateScope())
            {
                var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                var hospital = new User
                {
                    Id = hospitalId,
                    Email = "auth.hosp@vaxora.lk",
                    PasswordHash = "hash",
                    Role = UserRole.HOSPITAL,
                    Status = UserStatus.Active,
                    RegistrationNumber = "VAX-H-7777",
                    HospitalProfile = new HospitalProfile
                    {
                        HospitalName = "Inventory Test Hospital",
                        RegistrationNumber = "HOSP-INV-1"
                    }
                };
                context.Users.Add(hospital);
                await context.SaveChangesAsync();
            }

            var token = GenerateJwt(hospitalId, "HOSPITAL", "auth.hosp@vaxora.lk");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await client.GetAsync("/api/inventory/formulary");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }

    [Fact]
    public async Task ApiAuth_AdminEndpoint_with_doctor_role_returns_403_Forbidden()
    {
        var (server, client) = CreateAuthTestServer(Guid.NewGuid().ToString());
        using (server)
        using (client)
        {
            // Doctor tries to access Admin Verification Dashboard
            var token = GenerateJwt(Guid.NewGuid(), "DOCTOR", "doctor.denied@vaxora.lk");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await client.GetAsync("/api/admin/verification/dashboard-stats");
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }
    }

    [Fact]
    public async Task ApiAuth_AdminEndpoint_with_admin_role_returns_200_OK()
    {
        var (server, client) = CreateAuthTestServer(Guid.NewGuid().ToString());
        using (server)
        using (client)
        {
            // Admin user calling Admin Verification Dashboard
            var token = GenerateJwt(Guid.NewGuid(), "ADMIN", "admin.allowed@vaxora.lk");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await client.GetAsync("/api/admin/verification/dashboard-stats");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }

    [Fact]
    public async Task ApiAuth_AppointmentEndpoint_without_token_returns_401_Unauthorized()
    {
        var (server, client) = CreateAuthTestServer(Guid.NewGuid().ToString());
        using (server)
        using (client)
        {
            var response = await client.GetAsync("/api/appointments/my");
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }
    }
}
