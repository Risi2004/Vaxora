using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;
using Vaxora.Api.Dtos;
using Vaxora.Api.Models;
using Vaxora.Api.Services;

namespace Vaxora.Api.Tests;

public class ShiftSwapServiceTests
{
    [Fact]
    public async Task GetQuotaAsync_returns_limits_and_utc_safe_month_window()
    {
        await using var context = TestDb.CreateContext();
        var hospital = TestDb.AddHospital(context);
        var doctor = TestDb.AddDoctor(context, "doctor@example.com", "VAX-D-2001");
        var affiliation = TestDb.AddActiveAffiliation(context, hospital, doctor);
        var shift = TestDb.AddFutureShift(context, affiliation, hospital, daysAhead: 5);
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var quota = await service.GetQuotaAsync(doctor.Id, shift.Id);

        Assert.True(quota.CanRequest);
        Assert.Equal(0, quota.UsedThisMonth);
        Assert.Equal(3, quota.MonthlyLimit);
        Assert.Equal(1, quota.UrgentLimit);
        Assert.Equal(5, quota.DaysUntilShift);
        Assert.False(quota.IsUrgent);
        Assert.False(quota.ReasonRequired);
    }

    [Fact]
    public async Task GetQuotaAsync_marks_short_notice_as_urgent_and_requires_reason()
    {
        await using var context = TestDb.CreateContext();
        var hospital = TestDb.AddHospital(context);
        var doctor = TestDb.AddDoctor(context, "doctor@example.com", "VAX-D-2002");
        var affiliation = TestDb.AddActiveAffiliation(context, hospital, doctor);
        var shift = TestDb.AddFutureShift(context, affiliation, hospital, daysAhead: 1);
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var quota = await service.GetQuotaAsync(doctor.Id, shift.Id);

        Assert.True(quota.CanRequest);
        Assert.True(quota.IsUrgent);
        Assert.True(quota.ReasonRequired);
        Assert.Equal(1, quota.DaysUntilShift);
    }

    [Fact]
    public async Task GetQuotaAsync_blocks_finished_shift()
    {
        await using var context = TestDb.CreateContext();
        var hospital = TestDb.AddHospital(context);
        var doctor = TestDb.AddDoctor(context, "doctor@example.com", "VAX-D-2003");
        var affiliation = TestDb.AddActiveAffiliation(context, hospital, doctor);
        var past = new StaffShift
        {
            AffiliationId = affiliation.Id,
            Affiliation = affiliation,
            ShiftDate = StaffDutyHelper.HospitalToday().AddDays(-1),
            StartTime = new TimeOnly(9, 0),
            EndTime = new TimeOnly(12, 0),
            CreatedByUserId = hospital.Id
        };
        context.StaffShifts.Add(past);
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var quota = await service.GetQuotaAsync(doctor.Id, past.Id);

        Assert.False(quota.CanRequest);
        Assert.Contains("finished", quota.BlockReason ?? string.Empty, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateAsync_blocks_when_monthly_cover_limit_reached()
    {
        await using var context = TestDb.CreateContext();
        var hospital = TestDb.AddHospital(context);
        var doctor = TestDb.AddDoctor(context, "doctor@example.com", "VAX-D-2004");
        var affiliation = TestDb.AddActiveAffiliation(context, hospital, doctor);
        var target = TestDb.AddFutureShift(context, affiliation, hospital, daysAhead: 5);

        for (var i = 0; i < 3; i++)
        {
            var usedShift = TestDb.AddFutureShift(context, affiliation, hospital, daysAhead: 6 + i);
            context.ShiftSwapRequests.Add(new ShiftSwapRequest
            {
                ShiftId = usedShift.Id,
                HospitalUserId = hospital.Id,
                RequesterUserId = doctor.Id,
                ShiftDate = usedShift.ShiftDate,
                ShiftWindow = "09:00–12:00",
                Status = ShiftSwapStatus.Approved,
                CreatedAt = DateTime.UtcNow.AddDays(-i),
                UpdatedAt = DateTime.UtcNow.AddDays(-i)
            });
        }

        await context.SaveChangesAsync();
        var service = CreateService(context);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateAsync(doctor.Id, new CreateShiftSwapRequestDto
            {
                ShiftId = target.Id,
                Reason = "Family emergency"
            }));

        Assert.Contains("3 covers", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateAsync_requires_reason_for_short_notice_cover()
    {
        await using var context = TestDb.CreateContext();
        var hospital = TestDb.AddHospital(context);
        var doctor = TestDb.AddDoctor(context, "doctor@example.com", "VAX-D-2005");
        var affiliation = TestDb.AddActiveAffiliation(context, hospital, doctor);
        var shift = TestDb.AddFutureShift(context, affiliation, hospital, daysAhead: 1);
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateAsync(doctor.Id, new CreateShiftSwapRequestDto
            {
                ShiftId = shift.Id
            }));

        Assert.Contains("reason", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateAsync_stores_pending_cover_request_for_own_future_shift()
    {
        await using var context = TestDb.CreateContext();
        var hospital = TestDb.AddHospital(context);
        var doctor = TestDb.AddDoctor(context, "doctor@example.com", "VAX-D-2006");
        var affiliation = TestDb.AddActiveAffiliation(context, hospital, doctor);
        var shift = TestDb.AddFutureShift(context, affiliation, hospital, daysAhead: 4);
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var created = await service.CreateAsync(doctor.Id, new CreateShiftSwapRequestDto
        {
            ShiftId = shift.Id,
            Reason = "Clinic clash"
        });

        Assert.Equal("Pending", created.Status);
        Assert.Equal(shift.Id, created.ShiftId);
        Assert.Equal(1, await context.ShiftSwapRequests.CountAsync());
    }

    [Fact]
    public async Task DecideAsync_reassigns_shift_and_returns_approved_status_to_both_staff_members()
    {
        await using var context = TestDb.CreateContext();
        var hospital = TestDb.AddHospital(context);
        var requester = TestDb.AddDoctor(context, "requester@example.com", "VAX-D-2010");
        var replacement = TestDb.AddDoctor(context, "replacement@example.com", "VAX-D-2011");
        var requesterAffiliation = TestDb.AddActiveAffiliation(context, hospital, requester);
        var replacementAffiliation = TestDb.AddActiveAffiliation(context, hospital, replacement);
        var shift = TestDb.AddFutureShift(context, requesterAffiliation, hospital);
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var request = await service.CreateAsync(requester.Id, new CreateShiftSwapRequestDto
        {
            ShiftId = shift.Id,
            Reason = "Clinic conflict"
        });

        var decided = await service.DecideAsync(hospital.Id, request.Id, new ShiftSwapDecisionDto
        {
            Approved = true,
            ReplacementAffiliationId = replacementAffiliation.Id
        });

        var updatedShift = await context.StaffShifts.SingleAsync(s => s.Id == shift.Id);
        var requesterHistory = Assert.Single(await service.ListForStaffAsync(requester.Id));
        var replacementHistory = Assert.Single(await service.ListForStaffAsync(replacement.Id));

        Assert.Equal("Approved", decided.Status);
        Assert.Equal(replacementAffiliation.Id, updatedShift.AffiliationId);
        Assert.Equal("Approved", requesterHistory.Status);
        Assert.Equal("Outgoing", requesterHistory.Direction);
        Assert.Equal($"Dr. {replacement.DoctorProfile!.FullName}", requesterHistory.ReplacementName);
        Assert.Equal("Incoming", replacementHistory.Direction);
        Assert.Equal(requester.Id, replacementHistory.RequesterUserId);
    }

    private static ShiftSwapService CreateService(Vaxora.Api.Data.ApplicationDbContext context) =>
        new(context, new FakeAgentGateway(), NullLogger<ShiftSwapService>.Instance);
}
