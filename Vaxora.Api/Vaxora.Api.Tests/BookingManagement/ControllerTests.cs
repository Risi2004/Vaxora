using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;
using Vaxora.Api.Controllers;
using Vaxora.Api.Data;
using Vaxora.Api.Dtos;
using Vaxora.Api.Models;
using Vaxora.Api.Services;

namespace Vaxora.Api.Tests.BookingManagement;

public class ControllerTests
{
    private static (AuthController controller, ApplicationDbContext context, IPasswordHasher hasher) CreateAuthController()
    {
        var context = TestDb.CreateContext();
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SecretKey"] = "VaxoraTestPlatformSecretKeyLongEnoughForHmacSha256!2026",
                ["Jwt:Issuer"] = "Vaxora.Api",
                ["Jwt:Audience"] = "Vaxora.Client",
                ["Jwt:ExpiryInMinutes"] = "60"
            })
            .Build();

        var tokenService = new TokenService(config);
        var hasher = new PasswordHasher();
        var authService = new AuthService(
            context,
            hasher,
            tokenService,
            new FakeR2StorageService(),
            new FakeRegistrationNumberService(),
            new FakeVaccinationCardService(),
            new FakeEmailService(),
            config,
            NullLogger<AuthService>.Instance);

        var controller = new AuthController(authService, NullLogger<AuthController>.Instance);
        return (controller, context, hasher);
    }

    private static void SetUserContext(ControllerBase controller, Guid userId, string role, string email)
    {
        var identity = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Role, role),
            new Claim(ClaimTypes.Email, email)
        }, "TestAuth");

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };
    }

    [Fact]
    public async Task AuthController_Login_returns_200_OK_with_token_on_valid_credentials()
    {
        var (controller, context, hasher) = CreateAuthController();
        const string password = "TestPassword#2026";
        var user = new User
        {
            Email = "doctor.ctrl@vaxora.lk",
            PasswordHash = hasher.HashPassword(password),
            Role = UserRole.DOCTOR,
            Status = UserStatus.Active,
            RegistrationNumber = "VAX-D-9901",
            DoctorProfile = new DoctorProfile
            {
                FullName = "Dr. Silva",
                SlmcNumber = "SLMC-1234",
                VerificationStatus = VerificationStatus.Approved
            }
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var actionResult = await controller.Login(new LoginDto
        {
            Email = "doctor.ctrl@vaxora.lk",
            Password = password
        });

        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);

        var response = Assert.IsType<AuthResponseDto>(okResult.Value);
        Assert.NotNull(response.Token);
        Assert.Equal("doctor.ctrl@vaxora.lk", response.User.Email);
    }

    [Fact]
    public async Task AuthController_Login_returns_401_Unauthorized_on_invalid_credentials()
    {
        var (controller, _, _) = CreateAuthController();

        var actionResult = await controller.Login(new LoginDto
        {
            Email = "nonexistent@vaxora.lk",
            Password = "WrongPassword"
        });

        var unauthorizedResult = Assert.IsType<UnauthorizedObjectResult>(actionResult);
        Assert.Equal(StatusCodes.Status401Unauthorized, unauthorizedResult.StatusCode);
    }

    [Fact]
    public async Task AuthController_Login_returns_403_Forbidden_on_suspended_account()
    {
        var (controller, context, hasher) = CreateAuthController();
        const string password = "TestPassword#2026";
        var user = new User
        {
            Email = "suspended.ctrl@vaxora.lk",
            PasswordHash = hasher.HashPassword(password),
            Role = UserRole.PATIENT,
            Status = UserStatus.Suspended,
            RegistrationNumber = "VAX-P-9902"
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var actionResult = await controller.Login(new LoginDto
        {
            Email = "suspended.ctrl@vaxora.lk",
            Password = password
        });

        var objResult = Assert.IsType<ObjectResult>(actionResult);
        Assert.Equal(StatusCodes.Status403Forbidden, objResult.StatusCode);
    }

    [Fact]
    public async Task AuthController_GetCurrentUser_returns_401_when_user_claim_missing()
    {
        var (controller, _, _) = CreateAuthController();
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity()) } // No claims
        };

        var actionResult = await controller.GetCurrentUser();

        var unauthorized = Assert.IsType<UnauthorizedObjectResult>(actionResult);
        Assert.Equal(StatusCodes.Status401Unauthorized, unauthorized.StatusCode);
    }

    [Fact]
    public async Task AuthController_GetCurrentUser_returns_200_OK_when_authenticated()
    {
        var (controller, context, _) = CreateAuthController();
        var user = new User
        {
            Email = "current.user@vaxora.lk",
            PasswordHash = "hash",
            Role = UserRole.PATIENT,
            Status = UserStatus.Active,
            RegistrationNumber = "VAX-P-9903",
            PatientProfile = new PatientProfile
            {
                FullName = "Current Patient",
                NicNumber = "991234567V"
            }
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        SetUserContext(controller, user.Id, "PATIENT", user.Email);

        var actionResult = await controller.GetCurrentUser();

        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);
        var userDto = Assert.IsType<UserDto>(okResult.Value);
        Assert.Equal("current.user@vaxora.lk", userDto.Email);
    }

    [Fact]
    public async Task PaymentController_InitializePayHere_returns_404_when_appointment_not_found()
    {
        await using var context = TestDb.CreateContext();
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["PayHere:MerchantId"] = "121212",
                ["PayHere:MerchantSecret"] = "testSecret456"
            })
            .Build();

        var payHereService = new PayHereService(config, NullLogger<PayHereService>.Instance);
        var appointmentService = new AppointmentService(
            context,
            new FakeEmailService(),
            new FakePasswordHasher(),
            new FakeRegistrationNumberService(),
            NullLogger<AppointmentService>.Instance);

        var controller = new PaymentController(
            context,
            payHereService,
            appointmentService,
            NullLogger<PaymentController>.Instance);

        var patientId = Guid.NewGuid();
        SetUserContext(controller, patientId, "PATIENT", "patient@example.com");

        var result = await controller.InitializePayHere(new PayHereInitRequestDto
        {
            AppointmentId = Guid.NewGuid() // Non-existent
        });

        var notFound = Assert.IsType<NotFoundObjectResult>(result);
        Assert.Equal(StatusCodes.Status404NotFound, notFound.StatusCode);
    }

    [Fact]
    public async Task PaymentController_InitializePayHere_returns_400_when_appointment_is_free()
    {
        await using var context = TestDb.CreateContext();
        var patientId = Guid.NewGuid();
        var hospital = TestDb.AddHospital(context);

        var appointment = new Appointment
        {
            Id = Guid.NewGuid(),
            HospitalUserId = hospital.Id,
            PatientUserId = patientId,
            PatientName = "Free Patient",
            VaccineName = "BCG",
            AppointmentDate = StaffDutyHelper.HospitalToday().AddDays(1),
            TimeSlot = "09:00 AM - 09:20 AM",
            Fee = 0.00m,
            Status = "Confirmed",
            PaymentStatus = "Paid"
        };
        context.Appointments.Add(appointment);
        await context.SaveChangesAsync();

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["PayHere:MerchantId"] = "121212",
                ["PayHere:MerchantSecret"] = "testSecret456"
            })
            .Build();

        var payHereService = new PayHereService(config, NullLogger<PayHereService>.Instance);
        var appointmentService = new AppointmentService(
            context,
            new FakeEmailService(),
            new FakePasswordHasher(),
            new FakeRegistrationNumberService(),
            NullLogger<AppointmentService>.Instance);

        var controller = new PaymentController(
            context,
            payHereService,
            appointmentService,
            NullLogger<PaymentController>.Instance);

        SetUserContext(controller, patientId, "PATIENT", "patient@example.com");

        var result = await controller.InitializePayHere(new PayHereInitRequestDto
        {
            AppointmentId = appointment.Id
        });

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
    }

    [Fact]
    public async Task PaymentController_InitializePayHere_returns_200_OK_with_parameters_for_unpaid_appointment()
    {
        await using var context = TestDb.CreateContext();
        var patientId = Guid.NewGuid();
        var hospital = TestDb.AddHospital(context);

        var appointment = new Appointment
        {
            Id = Guid.NewGuid(),
            HospitalUserId = hospital.Id,
            PatientUserId = patientId,
            PatientName = "Paying Patient",
            PatientEmail = "paying@example.com",
            VaccineName = "Influenza",
            AppointmentDate = StaffDutyHelper.HospitalToday().AddDays(2),
            TimeSlot = "10:00 AM - 10:20 AM",
            Fee = 2000.00m,
            Status = "PendingPayment",
            PaymentStatus = "PendingOnline"
        };
        context.Appointments.Add(appointment);
        await context.SaveChangesAsync();

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["PayHere:MerchantId"] = "121212",
                ["PayHere:MerchantSecret"] = "testSecret456"
            })
            .Build();

        var payHereService = new PayHereService(config, NullLogger<PayHereService>.Instance);
        var appointmentService = new AppointmentService(
            context,
            new FakeEmailService(),
            new FakePasswordHasher(),
            new FakeRegistrationNumberService(),
            NullLogger<AppointmentService>.Instance);

        var controller = new PaymentController(
            context,
            payHereService,
            appointmentService,
            NullLogger<PaymentController>.Instance);

        SetUserContext(controller, patientId, "PATIENT", "paying@example.com");

        var result = await controller.InitializePayHere(new PayHereInitRequestDto
        {
            AppointmentId = appointment.Id
        });

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);

        var payload = Assert.IsType<PayHereInitResponseDto>(okResult.Value);
        Assert.Equal("121212", payload.MerchantId);
        Assert.Equal(2000.00m, payload.Amount);
    }
}
