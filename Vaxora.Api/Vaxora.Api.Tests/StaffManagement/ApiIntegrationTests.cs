using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
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
/// Staff Management — real HTTP pipeline tests (mirrors BookingManagement/ApiIntegrationTests).
/// </summary>
public class ApiIntegrationTests : IDisposable
{
    private const string JwtSecret = "VaxoraTestPlatformSecretKeyLongEnoughForHmacSha256!2026";
    private readonly TestServer _server;
    private readonly HttpClient _client;
    private readonly string _databaseName = Guid.NewGuid().ToString();

    public ApiIntegrationTests()
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
                    options.UseInMemoryDatabase(_databaseName));

                services.AddScoped<IPasswordHasher, PasswordHasher>();
                services.AddScoped<ITokenService, TokenService>();
                services.AddScoped<IR2StorageService, FakeR2StorageService>();
                services.AddScoped<IRegistrationNumberService, FakeRegistrationNumberService>();
                services.AddScoped<IVaccinationCardService, FakeVaccinationCardService>();
                services.AddScoped<IEmailService, FakeEmailService>();
                services.AddScoped<IAuthService, AuthService>();
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
                app.UseEndpoints(endpoints =>
                {
                    endpoints.MapGet("/api/health", () => Results.Ok(new { status = "healthy", service = "Vaxora.Api" }));
                    endpoints.MapControllers();
                });
            });

        _server = new TestServer(builder);
        _client = _server.CreateClient();
    }

    public void Dispose()
    {
        _client.Dispose();
        _server.Dispose();
    }

    private ApplicationDbContext GetDbContext()
    {
        var scope = _server.Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    }

    private string TokenFor(User user, string displayName)
    {
        var tokenService = _server.Services.GetRequiredService<ITokenService>();
        return tokenService.GenerateAccessToken(user, displayName);
    }

    [Fact]
    public async Task GetStaffHospital_without_token_returns_401()
    {
        var response = await _client.GetAsync("/api/staff/hospital");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task PostStaffInvite_patient_token_returns_403()
    {
        var patientId = Guid.NewGuid();
        await using (var context = GetDbContext())
        {
            context.Users.Add(new User
            {
                Id = patientId,
                Email = "staff.patient@vaxora.lk",
                PasswordHash = "hash",
                Role = UserRole.PATIENT,
                Status = UserStatus.Active,
                RegistrationNumber = "VAX-P-8811",
                PatientProfile = new PatientProfile { FullName = "Patient", NicNumber = "991122334V" }
            });
            await context.SaveChangesAsync();
        }

        var token = TokenFor(new User
        {
            Id = patientId,
            Email = "staff.patient@vaxora.lk",
            Role = UserRole.PATIENT,
            Status = UserStatus.Active
        }, "Patient");

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/staff/invite");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Content = JsonContent.Create(new InviteStaffDto { RegistrationNumber = "VAX-D-8811" });

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Staff_invite_accept_shift_complete_http_flow()
    {
        var hospitalId = Guid.NewGuid();
        var doctorId = Guid.NewGuid();
        const string doctorReg = "VAX-D-8822";
        var shiftDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(4));

        await using (var context = GetDbContext())
        {
            context.Users.Add(new User
            {
                Id = hospitalId,
                Email = "staff.hospital@vaxora.lk",
                PasswordHash = "hash",
                Role = UserRole.HOSPITAL,
                Status = UserStatus.Active,
                RegistrationNumber = "VAX-H-8822",
                HospitalProfile = new HospitalProfile
                {
                    HospitalName = "Integration Staff Hospital",
                    RegistrationNumber = "HOSP-8822"
                }
            });
            context.Users.Add(new User
            {
                Id = doctorId,
                Email = "staff.doctor@vaxora.lk",
                PasswordHash = "hash",
                Role = UserRole.DOCTOR,
                Status = UserStatus.Active,
                RegistrationNumber = doctorReg,
                DoctorProfile = new DoctorProfile
                {
                    FullName = "Dr Integration",
                    SlmcNumber = "SLMC-8822",
                    VerificationStatus = VerificationStatus.Approved
                }
            });
            await context.SaveChangesAsync();
        }

        var hospitalToken = TokenFor(new User
        {
            Id = hospitalId,
            Email = "staff.hospital@vaxora.lk",
            Role = UserRole.HOSPITAL,
            Status = UserStatus.Active
        }, "Integration Staff Hospital");

        var doctorToken = TokenFor(new User
        {
            Id = doctorId,
            Email = "staff.doctor@vaxora.lk",
            Role = UserRole.DOCTOR,
            Status = UserStatus.Active
        }, "Dr Integration");

        // 1. Hospital invites doctor
        using var inviteRequest = new HttpRequestMessage(HttpMethod.Post, "/api/staff/invite");
        inviteRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", hospitalToken);
        inviteRequest.Content = JsonContent.Create(new InviteStaffDto { RegistrationNumber = doctorReg });

        var inviteResponse = await _client.SendAsync(inviteRequest);
        Assert.Equal(HttpStatusCode.OK, inviteResponse.StatusCode);

        var affiliation = await inviteResponse.Content.ReadFromJsonAsync<StaffAffiliationDto>();
        Assert.NotNull(affiliation);
        Assert.Equal("Pending", affiliation.Status);
        Assert.Equal(doctorId, affiliation.StaffUserId);

        // 2. Doctor accepts invitation
        using var respondRequest = new HttpRequestMessage(
            HttpMethod.Post,
            $"/api/staff/invitations/{affiliation.AffiliationId}/respond");
        respondRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", doctorToken);
        respondRequest.Content = JsonContent.Create(new AffiliationDecisionDto { Decision = "Accept" });

        var respondResponse = await _client.SendAsync(respondRequest);
        Assert.Equal(HttpStatusCode.OK, respondResponse.StatusCode);

        var accepted = await respondResponse.Content.ReadFromJsonAsync<StaffAffiliationDto>();
        Assert.NotNull(accepted);
        Assert.Equal("Active", accepted.Status);

        // 3. Hospital creates a shift
        using var shiftRequest = new HttpRequestMessage(HttpMethod.Post, "/api/staff/shifts");
        shiftRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", hospitalToken);
        shiftRequest.Content = JsonContent.Create(new CreateStaffShiftDto
        {
            AffiliationId = affiliation.AffiliationId,
            ShiftDate = shiftDate,
            StartTime = new TimeOnly(9, 0),
            EndTime = new TimeOnly(13, 0),
            BoothOrStation = "Booth A"
        });

        var shiftResponse = await _client.SendAsync(shiftRequest);
        Assert.Equal(HttpStatusCode.OK, shiftResponse.StatusCode);

        var shift = await shiftResponse.Content.ReadFromJsonAsync<StaffShiftDto>();
        Assert.NotNull(shift);
        Assert.Equal(affiliation.AffiliationId, shift.AffiliationId);

        // 4. Doctor lists own shifts
        using var mineRequest = new HttpRequestMessage(
            HttpMethod.Get,
            $"/api/staff/shifts/mine?from={shiftDate:yyyy-MM-dd}&to={shiftDate:yyyy-MM-dd}");
        mineRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", doctorToken);

        var mineResponse = await _client.SendAsync(mineRequest);
        Assert.Equal(HttpStatusCode.OK, mineResponse.StatusCode);

        var mineShifts = await mineResponse.Content.ReadFromJsonAsync<List<StaffShiftDto>>();
        Assert.NotNull(mineShifts);
        Assert.Contains(mineShifts, s => s.ShiftId == shift.ShiftId);

        // 5. DB integrity
        await using (var verify = GetDbContext())
        {
            var savedAffiliation = await verify.StaffAffiliations
                .Include(a => a.Shifts)
                .SingleAsync(a => a.Id == affiliation.AffiliationId);
            Assert.Equal(AffiliationStatus.Active, savedAffiliation.Status);
            Assert.Contains(savedAffiliation.Shifts, s => s.Id == shift.ShiftId);
        }
    }

    [Fact]
    public async Task PostAgentChat_StaffSchedulingAgent_hospital_persists_workflow()
    {
        var hospitalId = Guid.NewGuid();
        await using (var context = GetDbContext())
        {
            context.Users.Add(new User
            {
                Id = hospitalId,
                Email = "agent.hospital@vaxora.lk",
                PasswordHash = "hash",
                Role = UserRole.HOSPITAL,
                Status = UserStatus.Active,
                RegistrationNumber = "VAX-H-8833",
                HospitalProfile = new HospitalProfile
                {
                    HospitalName = "Agent Hospital",
                    RegistrationNumber = "HOSP-8833"
                }
            });
            await context.SaveChangesAsync();
        }

        var token = TokenFor(new User
        {
            Id = hospitalId,
            Email = "agent.hospital@vaxora.lk",
            Role = UserRole.HOSPITAL,
            Status = UserStatus.Active
        }, "Agent Hospital");

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/agent/chat");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Content = JsonContent.Create(new AgentChatRequestDto
        {
            TargetAgent = "StaffSchedulingAgent",
            Messages = new List<AgentMessageDto>
            {
                new() { Role = "user", Content = "Staff the rest of the week" }
            }
        });

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadFromJsonAsync<JsonObject>();
        Assert.NotNull(json);

        await using (var verify = GetDbContext())
        {
            var workflow = await verify.AgentWorkflows.SingleOrDefaultAsync(w => w.UserId == hospitalId);
            Assert.NotNull(workflow);
            Assert.Equal("StaffSchedulingAgent", workflow.AgentName);
        }
    }

    [Fact]
    public async Task PostAgentChat_StaffSchedulingAgent_doctor_returns_403()
    {
        var doctorId = Guid.NewGuid();
        await using (var context = GetDbContext())
        {
            context.Users.Add(new User
            {
                Id = doctorId,
                Email = "agent.doctor@vaxora.lk",
                PasswordHash = "hash",
                Role = UserRole.DOCTOR,
                Status = UserStatus.Active,
                RegistrationNumber = "VAX-D-8833",
                DoctorProfile = new DoctorProfile
                {
                    FullName = "Dr Blocked",
                    SlmcNumber = "SLMC-8833",
                    VerificationStatus = VerificationStatus.Approved
                }
            });
            await context.SaveChangesAsync();
        }

        var token = TokenFor(new User
        {
            Id = doctorId,
            Email = "agent.doctor@vaxora.lk",
            Role = UserRole.DOCTOR,
            Status = UserStatus.Active
        }, "Dr Blocked");

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/agent/chat");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Content = JsonContent.Create(new AgentChatRequestDto
        {
            TargetAgent = "StaffSchedulingAgent",
            Messages = new List<AgentMessageDto>
            {
                new() { Role = "user", Content = "Should be forbidden" }
            }
        });

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
