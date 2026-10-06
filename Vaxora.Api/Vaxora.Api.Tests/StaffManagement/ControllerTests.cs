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

namespace Vaxora.Api.Tests.StaffManagement;

/// <summary>
/// Staff Management — direct controller unit tests (mirrors BookingManagement/ControllerTests).
/// </summary>
public class ControllerTests
{
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

    private static (StaffManagementController controller, ApplicationDbContext context) CreateStaffController()
    {
        var context = TestDb.CreateContext();
        var service = new StaffManagementService(context, NullLogger<StaffManagementService>.Instance);
        var controller = new StaffManagementController(service, NullLogger<StaffManagementController>.Instance);
        return (controller, context);
    }

    private static (ShiftSwapController controller, ApplicationDbContext context) CreateSwapController()
    {
        var context = TestDb.CreateContext();
        var service = new ShiftSwapService(
            context,
            new FakeAgentGateway(),
            NullLogger<ShiftSwapService>.Instance);
        var controller = new ShiftSwapController(service, NullLogger<ShiftSwapController>.Instance);
        return (controller, context);
    }

    [Fact]
    public async Task StaffManagementController_InviteStaff_returns_401_without_identity()
    {
        var (controller, _) = CreateStaffController();
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity()) }
        };

        var result = await controller.InviteStaff(new InviteStaffDto { RegistrationNumber = "VAX-D-1" });
        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task StaffManagementController_InviteStaff_returns_404_for_unknown_registration()
    {
        var (controller, context) = CreateStaffController();
        var hospital = TestDb.AddHospital(context);
        await context.SaveChangesAsync();
        SetUserContext(controller, hospital.Id, "HOSPITAL", hospital.Email);

        var result = await controller.InviteStaff(new InviteStaffDto { RegistrationNumber = "VAX-D-9999" });
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task StaffManagementController_CreateShift_returns_404_for_unknown_affiliation()
    {
        var (controller, context) = CreateStaffController();
        var hospital = TestDb.AddHospital(context);
        await context.SaveChangesAsync();
        SetUserContext(controller, hospital.Id, "HOSPITAL", hospital.Email);

        var result = await controller.CreateShift(new CreateStaffShiftDto
        {
            AffiliationId = Guid.NewGuid(),
            ShiftDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(3)),
            StartTime = new TimeOnly(9, 0),
            EndTime = new TimeOnly(12, 0)
        });

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task StaffManagementController_InviteStaff_returns_200_for_active_doctor()
    {
        var (controller, context) = CreateStaffController();
        var hospital = TestDb.AddHospital(context);
        var doctor = TestDb.AddDoctor(context, "ctrl.doctor@vaxora.lk", "VAX-D-7701");
        await context.SaveChangesAsync();
        SetUserContext(controller, hospital.Id, "HOSPITAL", hospital.Email);

        var result = await controller.InviteStaff(new InviteStaffDto { RegistrationNumber = doctor.RegistrationNumber! });
        var ok = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<StaffAffiliationDto>(ok.Value);
        Assert.Equal("Pending", dto.Status);
        Assert.Equal(doctor.Id, dto.StaffUserId);
    }

    [Fact]
    public async Task ShiftSwapController_Create_returns_404_for_unknown_shift()
    {
        var (controller, context) = CreateSwapController();
        var hospital = TestDb.AddHospital(context);
        var doctor = TestDb.AddDoctor(context, "swap.doctor@vaxora.lk", "VAX-D-7702");
        TestDb.AddActiveAffiliation(context, hospital, doctor);
        await context.SaveChangesAsync();
        SetUserContext(controller, doctor.Id, "DOCTOR", doctor.Email);

        var result = await controller.Create(new CreateShiftSwapRequestDto { ShiftId = Guid.NewGuid() });
        Assert.IsType<NotFoundObjectResult>(result);
    }
}
