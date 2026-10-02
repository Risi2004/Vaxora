using Microsoft.EntityFrameworkCore;
using Vaxora.Api.Data;
using Vaxora.Api.Models;

namespace Vaxora.Api.Services;

/// <summary>
/// Shared hospital-local wall-clock and live-shift checks for clinical staff actions.
/// Shift dates/times are hospital wall-clock (+05:30), matching StaffManagementService.
/// </summary>
public static class StaffDutyHelper
{
    private static readonly TimeSpan HospitalUtcOffset = TimeSpan.FromHours(5.5);

    public static DateTime HospitalNow() => DateTime.UtcNow + HospitalUtcOffset;

    public static DateOnly HospitalToday() => DateOnly.FromDateTime(HospitalNow());

    /// <summary>
    /// True when the staff member has an Active affiliation at the hospital with a
    /// shift covering the current hospital-local time.
    /// </summary>
    public static async Task<bool> IsStaffOnDutyAsync(
        ApplicationDbContext context,
        Guid staffUserId,
        Guid hospitalUserId,
        CancellationToken cancellationToken = default)
    {
        var today = HospitalToday();
        var now = TimeOnly.FromDateTime(HospitalNow());

        return await context.StaffShifts
            .AsNoTracking()
            .AnyAsync(s =>
                    s.Affiliation.StaffUserId == staffUserId &&
                    s.Affiliation.HospitalUserId == hospitalUserId &&
                    s.Affiliation.Status == AffiliationStatus.Active &&
                    s.ShiftDate == today &&
                    s.StartTime <= now &&
                    s.EndTime > now,
                cancellationToken);
    }

    public static async Task EnsureStaffOnDutyAsync(
        ApplicationDbContext context,
        Guid staffUserId,
        Guid hospitalUserId,
        CancellationToken cancellationToken = default)
    {
        var onDuty = await IsStaffOnDutyAsync(context, staffUserId, hospitalUserId, cancellationToken);
        if (!onDuty)
        {
            throw new InvalidOperationException(
                "You must have an active shift at this hospital to perform this action.");
        }
    }

    /// <summary>
    /// True when any Active affiliated doctor/nurse has a live shift at the hospital now.
    /// Used so hospital owners cannot advance clinical statuses with an empty booth floor.
    /// </summary>
    public static async Task<bool> HasAnyStaffOnDutyAsync(
        ApplicationDbContext context,
        Guid hospitalUserId,
        CancellationToken cancellationToken = default)
    {
        var today = HospitalToday();
        var now = TimeOnly.FromDateTime(HospitalNow());

        return await context.StaffShifts
            .AsNoTracking()
            .AnyAsync(s =>
                    s.Affiliation.HospitalUserId == hospitalUserId &&
                    s.Affiliation.Status == AffiliationStatus.Active &&
                    s.ShiftDate == today &&
                    s.StartTime <= now &&
                    s.EndTime > now,
                cancellationToken);
    }

    public static async Task EnsureHospitalHasOnDutyStaffAsync(
        ApplicationDbContext context,
        Guid hospitalUserId,
        CancellationToken cancellationToken = default)
    {
        var onDuty = await HasAnyStaffOnDutyAsync(context, hospitalUserId, cancellationToken);
        if (!onDuty)
        {
            throw new InvalidOperationException(
                "At least one affiliated doctor or nurse must be on an active shift before clinical administration.");
        }
    }
}
