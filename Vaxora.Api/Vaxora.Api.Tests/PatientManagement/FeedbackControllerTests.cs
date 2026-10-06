using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;
using Vaxora.Api.Controllers;
using Vaxora.Api.Data;
using Vaxora.Api.Dtos;
using Vaxora.Api.Models;
using Vaxora.Api.Services;

namespace Vaxora.Api.Tests.PatientManagement;

public class FeedbackControllerTests
{
    private static (FeedbackController controller, FeedbackService service, ApplicationDbContext context) CreateController()
    {
        var context = TestDb.CreateContext();
        var service = new FeedbackService(context, NullLogger<FeedbackService>.Instance);
        var controller = new FeedbackController(service, NullLogger<FeedbackController>.Instance);
        return (controller, service, context);
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

    private static User AddPatient(
        ApplicationDbContext context,
        string email = "patient@example.com",
        string registrationNumber = "VAX-P-8001")
    {
        var patient = new User
        {
            Email = email,
            PasswordHash = "test-hash",
            Role = UserRole.PATIENT,
            Status = UserStatus.Active,
            RegistrationNumber = registrationNumber,
            PatientProfile = new PatientProfile
            {
                FullName = "Test Patient",
                NicNumber = $"NIC-{Guid.NewGuid():N}"[..12]
            }
        };
        context.Users.Add(patient);
        return patient;
    }

    [Fact]
    public async Task Create_returns_200_OK_with_valid_payload()
    {
        var (controller, _, context) = CreateController();
        var patient = AddPatient(context);
        await context.SaveChangesAsync();
        SetUserContext(controller, patient.Id, "PATIENT", patient.Email);

        var actionResult = await controller.Create(new CreateFeedbackDto
        {
            Message = "Great experience",
            Rating = 5,
            IsAnonymous = false,
            SubmitterName = "Test Patient",
            SubmitterEmail = patient.Email,
            SubmitterPhone = "0770000000"
        });

        var ok = Assert.IsType<OkObjectResult>(actionResult);
        Assert.Equal(StatusCodes.Status200OK, ok.StatusCode);
        var dto = Assert.IsType<FeedbackDto>(ok.Value);
        Assert.Equal("New", dto.Status);
        Assert.Equal(5, dto.Rating);
    }

    [Fact]
    public async Task Create_returns_401_when_user_claim_missing()
    {
        var (controller, _, _) = CreateController();

        // Simulate an authenticated request with an empty identity (no NameIdentifier claim).
        // MVC always populates ControllerContext before invoking an action, so we must do the
        // same in the test — otherwise ControllerBase.User itself would throw.
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity())
            }
        };

        var result = await controller.Create(new CreateFeedbackDto
        {
            Message = "x",
            Rating = 5
        });

        var unauthorized = Assert.IsType<UnauthorizedObjectResult>(result);
        Assert.Equal(StatusCodes.Status401Unauthorized, unauthorized.StatusCode);
    }

    [Fact]
    public async Task GetMy_returns_200_with_only_own_items()
    {
        var (controller, service, context) = CreateController();
        var patient = AddPatient(context);
        var other = AddPatient(context, "other@example.com", "VAX-P-8002");
        await context.SaveChangesAsync();

        await service.CreateAsync(patient.Id, new CreateFeedbackDto { Message = "Mine", Rating = 5 });
        await service.CreateAsync(other.Id, new CreateFeedbackDto { Message = "Theirs", Rating = 5 });

        SetUserContext(controller, patient.Id, "PATIENT", patient.Email);
        var result = await controller.GetMy();

        var ok = Assert.IsType<OkObjectResult>(result);
        var list = Assert.IsAssignableFrom<List<FeedbackDto>>(ok.Value);
        Assert.Single(list);
        Assert.Equal("Mine", list[0].Message);
    }

    [Fact]
    public async Task Update_returns_404_when_id_unknown()
    {
        var (controller, _, context) = CreateController();
        var patient = AddPatient(context);
        await context.SaveChangesAsync();
        SetUserContext(controller, patient.Id, "PATIENT", patient.Email);

        var result = await controller.Update(Guid.NewGuid(), new UpdateFeedbackDto
        {
            Message = "y",
            Rating = 5
        });

        var notFound = Assert.IsType<NotFoundObjectResult>(result);
        Assert.Equal(StatusCodes.Status404NotFound, notFound.StatusCode);
    }

    [Fact]
    public async Task Update_returns_403_for_non_owner()
    {
        var (controller, service, context) = CreateController();
        var owner = AddPatient(context, "owner@example.com", "VAX-P-8001");
        var other = AddPatient(context, "other@example.com", "VAX-P-8002");
        await context.SaveChangesAsync();
        var created = await service.CreateAsync(owner.Id, new CreateFeedbackDto
        {
            Message = "Mine",
            Rating = 5
        });

        SetUserContext(controller, other.Id, "PATIENT", other.Email);
        var result = await controller.Update(created.Id, new UpdateFeedbackDto
        {
            Message = "Theirs",
            Rating = 1
        });

        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task GetAll_returns_200_with_all_submissions()
    {
        var (controller, service, context) = CreateController();
        var patient = AddPatient(context);
        await context.SaveChangesAsync();
        await service.CreateAsync(patient.Id, new CreateFeedbackDto { Message = "x", Rating = 4 });

        SetUserContext(controller, Guid.NewGuid(), "ADMIN", "admin@vaxora.lk");
        var result = await controller.GetAll();

        var ok = Assert.IsType<OkObjectResult>(result);
        var list = Assert.IsAssignableFrom<List<FeedbackDto>>(ok.Value);
        Assert.Single(list);
        Assert.Equal("PATIENT", list[0].UserRole);
    }

    [Fact]
    public async Task Resolve_returns_200_and_persists_changes()
    {
        var (controller, service, context) = CreateController();
        var patient = AddPatient(context);
        await context.SaveChangesAsync();
        var created = await service.CreateAsync(patient.Id, new CreateFeedbackDto
        {
            Message = "Please fix",
            Rating = 3
        });

        SetUserContext(controller, Guid.NewGuid(), "ADMIN", "admin@vaxora.lk");
        var result = await controller.Resolve(created.Id, new FeedbackResolutionDto
        {
            Status = "Resolved",
            AdminResponse = "Fixed!"
        });

        var ok = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<FeedbackDto>(ok.Value);
        Assert.Equal("Resolved", dto.Status);
        Assert.Equal("Fixed!", dto.AdminResponse);
    }

    [Fact]
    public async Task Resolve_returns_400_for_invalid_status()
    {
        var (controller, service, context) = CreateController();
        var patient = AddPatient(context);
        await context.SaveChangesAsync();
        var created = await service.CreateAsync(patient.Id, new CreateFeedbackDto
        {
            Message = "x",
            Rating = 3
        });

        SetUserContext(controller, Guid.NewGuid(), "ADMIN", "admin@vaxora.lk");
        var result = await controller.Resolve(created.Id, new FeedbackResolutionDto
        {
            Status = "Garbage"
        });

        var bad = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, bad.StatusCode);
    }

    [Fact]
    public async Task GetPublicRandom_returns_200_without_authentication()
    {
        var (controller, service, context) = CreateController();
        var patient = AddPatient(context);
        await context.SaveChangesAsync();
        await service.CreateAsync(patient.Id, new CreateFeedbackDto
        {
            Message = "Loved it",
            Rating = 5
        });

        // No SetUserContext → an anonymous caller
        var result = await controller.GetPublicRandom(5);

        var ok = Assert.IsType<OkObjectResult>(result);
        var list = Assert.IsAssignableFrom<List<PublicFeedbackDto>>(ok.Value);
        Assert.Single(list);
        Assert.Equal(5, list[0].Rating);
    }
}
