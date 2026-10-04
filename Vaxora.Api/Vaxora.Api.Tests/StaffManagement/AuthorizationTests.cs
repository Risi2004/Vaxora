using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Reflection;
using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Xunit;
using Vaxora.Api.Controllers;
using Vaxora.Api.Data;
using Vaxora.Api.Dtos;
using Vaxora.Api.Models;
using Vaxora.Api.Services;

namespace Vaxora.Api.Tests.StaffManagement;

/// <summary>
/// Staff Management — attribute + real JWT HTTP authorization checks.
/// </summary>
public class AuthorizationTests
{
    private const string JwtSecret = "VaxoraTestPlatformSecretKeyLongEnoughForHmacSha256!2026";

    private static AuthorizeAttribute? ClassAuth(Type t) =>
        t.GetCustomAttribute<AuthorizeAttribute>();

    private static AuthorizeAttribute? MethodAuth(Type t, string method) =>
        t.GetMethod(method)?.GetCustomAttribute<AuthorizeAttribute>();

    [Fact]
    public void StaffManagementController_requires_authentication()
    {
        Assert.NotNull(ClassAuth(typeof(StaffManagementController)));
    }

    [Fact]
    public void StaffManagementController_hospital_endpoints_are_hospital_role_gated()
    {
        var invite = MethodAuth(typeof(StaffManagementController), "InviteStaff");
        Assert.NotNull(invite);
        Assert.Contains("HOSPITAL", invite!.Roles ?? string.Empty, StringComparison.OrdinalIgnoreCase);

        var createShift = MethodAuth(typeof(StaffManagementController), "CreateShift");
        Assert.NotNull(createShift);
        Assert.Contains("HOSPITAL", createShift!.Roles ?? string.Empty, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void StaffManagementController_staff_response_endpoints_are_doctor_or_nurse_gated()
    {
        var respond = MethodAuth(typeof(StaffManagementController), "RespondToInvitation");
        Assert.NotNull(respond);
        var roles = respond!.Roles ?? string.Empty;
        Assert.Contains("DOCTOR", roles, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("NURSE", roles, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ShiftSwapController_role_gates_match_ownership()
    {
        Assert.NotNull(ClassAuth(typeof(ShiftSwapController)));

        var create = MethodAuth(typeof(ShiftSwapController), "Create");
        Assert.NotNull(create);
        Assert.Contains("DOCTOR", create!.Roles ?? string.Empty, StringComparison.OrdinalIgnoreCase);

        var hospitalList = MethodAuth(typeof(ShiftSwapController), "ListForHospital");
        Assert.NotNull(hospitalList);
        Assert.Contains("HOSPITAL", hospitalList!.Roles ?? string.Empty, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void AgentController_chat_requires_authentication()
    {
        Assert.NotNull(ClassAuth(typeof(AgentController)));
        Assert.NotNull(typeof(AgentController).GetMethod("Chat")?.GetCustomAttribute<HttpPostAttribute>());
    }

    [Fact]
    public async Task ApiAuth_StaffHospital_without_token_returns_401()
    {
        using var host = CreateAuthHost();
        var response = await host.Client.GetAsync("/api/staff/hospital");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ApiAuth_StaffHospital_patient_returns_403()
    {
        using var host = CreateAuthHost();
        var patientId = Guid.NewGuid();
        await using (var context = host.GetDb())
        {
            context.Users.Add(new User
            {
                Id = patientId,
                Email = "auth.patient@vaxora.lk",
                PasswordHash = "hash",
                Role = UserRole.PATIENT,
                Status = UserStatus.Active,
                RegistrationNumber = "VAX-P-6601",
                PatientProfile = new PatientProfile { FullName = "Auth Patient", NicNumber = "990011223V" }
            });
            await context.SaveChangesAsync();
        }

        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/staff/hospital");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", GenerateJwt(patientId, "PATIENT", "auth.patient@vaxora.lk"));
        var response = await host.Client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task ApiAuth_StaffHospital_hospital_returns_200()
    {
        using var host = CreateAuthHost();
        var hospitalId = Guid.NewGuid();
        await using (var context = host.GetDb())
        {
            context.Users.Add(new User
            {
                Id = hospitalId,
                Email = "auth.hospital@vaxora.lk",
                PasswordHash = "hash",
                Role = UserRole.HOSPITAL,
                Status = UserStatus.Active,
                RegistrationNumber = "VAX-H-6601",
                HospitalProfile = new HospitalProfile
                {
                    HospitalName = "Auth Hospital",
                    RegistrationNumber = "HOSP-6601"
                }
            });
            await context.SaveChangesAsync();
        }

        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/staff/hospital");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", GenerateJwt(hospitalId, "HOSPITAL", "auth.hospital@vaxora.lk"));
        var response = await host.Client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task ApiAuth_AgentChat_StaffScheduling_doctor_returns_403()
    {
        using var host = CreateAuthHost();
        var doctorId = Guid.NewGuid();
        await using (var context = host.GetDb())
        {
            context.Users.Add(new User
            {
                Id = doctorId,
                Email = "auth.doctor@vaxora.lk",
                PasswordHash = "hash",
                Role = UserRole.DOCTOR,
                Status = UserStatus.Active,
                RegistrationNumber = "VAX-D-6601",
                DoctorProfile = new DoctorProfile
                {
                    FullName = "Auth Doctor",
                    SlmcNumber = "SLMC-6601",
                    VerificationStatus = VerificationStatus.Approved
                }
            });
            await context.SaveChangesAsync();
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/agent/chat");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", GenerateJwt(doctorId, "DOCTOR", "auth.doctor@vaxora.lk"));
        request.Content = JsonContent.Create(new AgentChatRequestDto
        {
            TargetAgent = "StaffSchedulingAgent",
            Messages = new List<AgentMessageDto> { new() { Role = "user", Content = "No" } }
        });

        var response = await host.Client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private static string GenerateJwt(Guid userId, string role, string email)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtSecret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: "Vaxora.Api",
            audience: "Vaxora.Client",
            claims: new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim(ClaimTypes.Email, email),
                new Claim(ClaimTypes.Role, role)
            },
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: credentials);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static AuthHost CreateAuthHost()
    {
        var dbName = Guid.NewGuid().ToString();
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
                    .AddJsonOptions(o => o.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles);
                services.AddDbContext<ApplicationDbContext>(o => o.UseInMemoryDatabase(dbName));
                services.AddScoped<IStaffManagementService, StaffManagementService>();
                services.AddScoped<IShiftSwapService, ShiftSwapService>();
                services.AddScoped<IAgentGatewayService, FakeAgentGateway>();
                services.AddScoped<IAgentWorkflowService, AgentWorkflowService>();
                services.AddRouting();
            })
            .Configure(app =>
            {
                app.UseRouting();
                app.UseAuthentication();
                app.UseAuthorization();
                app.UseEndpoints(e => e.MapControllers());
            });

        var server = new TestServer(builder);
        return new AuthHost(server, server.CreateClient());
    }

    private sealed class AuthHost : IDisposable
    {
        private readonly TestServer _server;
        public HttpClient Client { get; }

        public AuthHost(TestServer server, HttpClient client)
        {
            _server = server;
            Client = client;
        }

        public ApplicationDbContext GetDb() =>
            _server.Services.CreateScope().ServiceProvider.GetRequiredService<ApplicationDbContext>();

        public void Dispose()
        {
            Client.Dispose();
            _server.Dispose();
        }
    }
}
