using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using System.Text.Json;
using Xunit;
using Vaxora.Api.Data;
using Vaxora.Api.Dtos;
using Vaxora.Api.Models;
using Vaxora.Api.Services;

namespace Vaxora.Api.Tests.StaffManagement;

public class StaffManagementServiceTests
{
    [Fact]
    public async Task InviteStaffAsync_creates_pending_affiliation_for_active_doctor()
    {
        await using var context = CreateContext();
        var hospital = AddHospital(context);
        var doctor = AddDoctor(context, "doctor@example.com", "VAX-D-1001");
        await context.SaveChangesAsync();
        var service = CreateService(context);

        var result = await service.InviteStaffAsync(
            hospital.Id,
            new InviteStaffDto { RegistrationNumber = "vax-d-1001" });

        Assert.Equal(AffiliationStatus.Pending.ToString(), result.Status);
        Assert.Equal(doctor.Id, result.StaffUserId);
        Assert.Equal(1, await context.StaffAffiliations.CountAsync());
    }

    [Fact]
    public async Task InviteStaffAsync_rejects_nurse_with_existing_pending_affiliation()
    {
        await using var context = CreateContext();
        var hospital = AddHospital(context);
        var otherHospital = AddHospital(context, "other-hospital@example.com", "VAX-H-1002");
        var nurse = AddNurse(context, "nurse@example.com", "VAX-N-1001");
        context.StaffAffiliations.Add(new StaffAffiliation
        {
            HospitalUserId = otherHospital.Id,
            StaffUserId = nurse.Id,
            StaffRole = UserRole.NURSE,
            Status = AffiliationStatus.Pending,
            InvitedByUserId = otherHospital.Id
        });
        await context.SaveChangesAsync();
        var service = CreateService(context);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.InviteStaffAsync(
                hospital.Id,
                new InviteStaffDto { RegistrationNumber = nurse.RegistrationNumber! }));

        Assert.Contains("one hospital", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateShiftAsync_rejects_overlapping_shift_for_same_staff_member()
    {
        await using var context = CreateContext();
        var hospital = AddHospital(context);
        var doctor = AddDoctor(context, "doctor@example.com", "VAX-D-1001");
        var affiliation = AddActiveAffiliation(context, hospital, doctor);
        await context.SaveChangesAsync();
        var service = CreateService(context);
        var shiftDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(2));

        await service.CreateShiftAsync(hospital.Id, new CreateStaffShiftDto
        {
            AffiliationId = affiliation.Id,
            ShiftDate = shiftDate,
            StartTime = new TimeOnly(8, 0),
            EndTime = new TimeOnly(12, 0)
        });

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateShiftAsync(hospital.Id, new CreateStaffShiftDto
            {
                AffiliationId = affiliation.Id,
                ShiftDate = shiftDate,
                StartTime = new TimeOnly(11, 30),
                EndTime = new TimeOnly(15, 0)
            }));

        Assert.Contains("already unavailable", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateShiftAsync_rejects_shift_longer_than_twelve_hours()
    {
        await using var context = CreateContext();
        var hospital = AddHospital(context);
        var doctor = AddDoctor(context, "doctor@example.com", "VAX-D-1001");
        var affiliation = AddActiveAffiliation(context, hospital, doctor);
        await context.SaveChangesAsync();
        var service = CreateService(context);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateShiftAsync(hospital.Id, new CreateStaffShiftDto
            {
                AffiliationId = affiliation.Id,
                ShiftDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(2)),
                StartTime = new TimeOnly(7, 0),
                EndTime = new TimeOnly(20, 0)
            }));

        Assert.Contains("12 hours", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task GetCoverageReportAsync_marks_day_low_when_a_role_has_no_shift()
    {
        await using var context = CreateContext();
        var hospital = AddHospital(context);
        var doctor = AddDoctor(context, "doctor@example.com", "VAX-D-1001");
        var nurse = AddNurse(context, "nurse@example.com", "VAX-N-1001");
        var doctorAffiliation = AddActiveAffiliation(context, hospital, doctor);
        AddActiveAffiliation(context, hospital, nurse);
        var date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(2));
        context.StaffShifts.Add(new StaffShift
        {
            AffiliationId = doctorAffiliation.Id,
            ShiftDate = date,
            StartTime = new TimeOnly(8, 0),
            EndTime = new TimeOnly(16, 0),
            CreatedByUserId = hospital.Id
        });
        await context.SaveChangesAsync();
        var service = CreateService(context);

        var report = await service.GetCoverageReportAsync(hospital.Id, date, date);

        var day = Assert.Single(report.Days);
        Assert.Equal(1, report.ActiveDoctors);
        Assert.Equal(1, report.ActiveNurses);
        Assert.Equal("Low", day.CoverageLevel);
        Assert.Equal(1, report.DaysWithLowCoverage);
    }

    [Fact]
    public async Task AgentWorkflowService_persists_structured_execution_evidence()
    {
        await using var context = CreateContext();
        var hospital = AddHospital(context);
        await context.SaveChangesAsync();
        var service = new AgentWorkflowService(
            context,
            NullLogger<AgentWorkflowService>.Instance);

        var workflow = await service.RecordChatAsync(
            hospital.Id,
            new AgentChatRequestDto
            {
                TargetAgent = "StaffSchedulingAgent",
                Messages = new List<AgentMessageDto>
                {
                    new() { Role = "user", Content = "Staff the rest of the week" }
                }
            },
            AgentGatewayResult.Ok("""
                {
                  "agent": "StaffSchedulingAgent",
                  "content": "I prepared shift suggestions.",
                  "plan": {"steps": ["analyze", "validate", "propose"]},
                  "completedSteps": ["analyze", "validate"],
                  "toolResults": [{"tool": "get_coverage", "success": true}],
                  "validation": {"businessRulesPassed": true},
                  "proposals": [{"affiliationId": "staff-1"}]
                }
                """));

        var stored = await context.AgentWorkflows.SingleAsync();
        using var plan = JsonDocument.Parse(stored.PlanJson);
        Assert.Equal(3, plan.RootElement.GetProperty("steps").GetArrayLength());
        using var validation = JsonDocument.Parse(stored.ValidationResultsJson);
        Assert.True(validation.RootElement.GetProperty("businessRulesPassed").GetBoolean());
        Assert.Equal("AwaitingApproval", stored.FinalOutcome);
        Assert.Equal("AwaitingApproval", workflow.Status);
    }

    private static StaffManagementService CreateService(ApplicationDbContext context) =>
        new(context, NullLogger<StaffManagementService>.Instance);

    private static ApplicationDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static User AddHospital(
        ApplicationDbContext context,
        string email = "hospital@example.com",
        string registrationNumber = "VAX-H-1001")
    {
        var hospital = new User
        {
            Email = email,
            PasswordHash = "test-hash",
            Role = UserRole.HOSPITAL,
            Status = UserStatus.Active,
            RegistrationNumber = registrationNumber,
            HospitalProfile = new HospitalProfile
            {
                HospitalName = "Test Hospital",
                RegistrationNumber = $"HP-{Guid.NewGuid():N}"[..12]
            }
        };
        context.Users.Add(hospital);
        return hospital;
    }

    private static User AddDoctor(ApplicationDbContext context, string email, string registrationNumber)
    {
        var doctor = new User
        {
            Email = email,
            PasswordHash = "test-hash",
            Role = UserRole.DOCTOR,
            Status = UserStatus.Active,
            RegistrationNumber = registrationNumber,
            DoctorProfile = new DoctorProfile
            {
                FullName = "Test Doctor",
                SlmcNumber = $"SLMC-{Guid.NewGuid():N}"[..12],
                VerificationStatus = VerificationStatus.Approved
            }
        };
        context.Users.Add(doctor);
        return doctor;
    }

    private static User AddNurse(ApplicationDbContext context, string email, string registrationNumber)
    {
        var nurse = new User
        {
            Email = email,
            PasswordHash = "test-hash",
            Role = UserRole.NURSE,
            Status = UserStatus.Active,
            RegistrationNumber = registrationNumber,
            NurseProfile = new NurseProfile
            {
                FullName = "Test Nurse",
                SlncNumber = $"SLNC-{Guid.NewGuid():N}"[..12],
                VerificationStatus = VerificationStatus.Approved
            }
        };
        context.Users.Add(nurse);
        return nurse;
    }

    private static StaffAffiliation AddActiveAffiliation(
        ApplicationDbContext context,
        User hospital,
        User staff)
    {
        var affiliation = new StaffAffiliation
        {
            HospitalUserId = hospital.Id,
            HospitalUser = hospital,
            StaffUserId = staff.Id,
            StaffUser = staff,
            StaffRole = staff.Role,
            Status = AffiliationStatus.Active,
            InvitedByUserId = hospital.Id,
            RespondedAt = DateTime.UtcNow
        };
        context.StaffAffiliations.Add(affiliation);
        return affiliation;
    }
}
