using Microsoft.EntityFrameworkCore;
using Vaxora.Api.Data;
using Vaxora.Api.Dtos;
using Vaxora.Api.Models;

namespace Vaxora.Api.Services;

public interface IStaffManagementService
{
    Task<StaffAffiliationDto> InviteStaffAsync(Guid hospitalUserId, InviteStaffDto dto);
    Task<StaffAffiliationDto> RespondToInvitationAsync(Guid staffUserId, Guid affiliationId, AffiliationDecisionDto dto);
    Task<List<StaffAffiliationDto>> GetHospitalStaffAsync(Guid hospitalUserId, string? role = null, string? dutyStatus = null, string? search = null, string? status = null);
    Task<List<StaffAffiliationDto>> GetMyInvitationsAsync(Guid staffUserId);
    Task<List<StaffAffiliationDto>> GetMyAffiliationsAsync(Guid staffUserId);
    Task RemoveAffiliationAsync(Guid hospitalUserId, Guid affiliationId);
    Task<StaffAffiliationDto> UpdateDutyStatusAsync(Guid actorUserId, Guid affiliationId, UpdateDutyStatusDto dto);
    Task<StaffShiftDto> CreateShiftAsync(Guid hospitalUserId, CreateStaffShiftDto dto);
    Task<List<StaffShiftDto>> GetHospitalShiftsAsync(Guid hospitalUserId, DateOnly? from = null, DateOnly? to = null);
    Task<List<StaffShiftDto>> GetMyShiftsAsync(Guid staffUserId, DateOnly? from = null, DateOnly? to = null);
    Task<StaffShiftDto> UpdateShiftAsync(Guid hospitalUserId, Guid shiftId, UpdateStaffShiftDto dto);
    Task DeleteShiftAsync(Guid hospitalUserId, Guid shiftId);
}

public class StaffManagementService : IStaffManagementService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<StaffManagementService> _logger;

    public StaffManagementService(ApplicationDbContext context, ILogger<StaffManagementService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<StaffAffiliationDto> InviteStaffAsync(Guid hospitalUserId, InviteStaffDto dto)
    {
        await EnsureActiveHospitalAsync(hospitalUserId);

        var regNumber = dto.RegistrationNumber.Trim().ToUpperInvariant();
        var staffUser = await _context.Users
            .Include(u => u.DoctorProfile)
            .Include(u => u.NurseProfile)
            .FirstOrDefaultAsync(u => u.RegistrationNumber != null && u.RegistrationNumber.ToUpper() == regNumber);

        if (staffUser == null)
            throw new KeyNotFoundException("No user found with that Vaxora registration number.");

        if (staffUser.Role is not (UserRole.DOCTOR or UserRole.NURSE))
            throw new InvalidOperationException("Only doctors or nurses can be invited as hospital staff.");

        if (staffUser.Status != UserStatus.Active)
            throw new InvalidOperationException("Staff account must be Active (admin-approved) before invitation.");

        var existing = await _context.StaffAffiliations
            .FirstOrDefaultAsync(a =>
                a.HospitalUserId == hospitalUserId &&
                a.StaffUserId == staffUser.Id &&
                (a.Status == AffiliationStatus.Pending || a.Status == AffiliationStatus.Active));

        if (existing != null)
            throw new InvalidOperationException($"An affiliation already exists with status '{existing.Status}'.");

        var hospital = await _context.Users
            .Include(u => u.HospitalProfile)
            .FirstAsync(u => u.Id == hospitalUserId);

        var affiliation = new StaffAffiliation
        {
            HospitalUserId = hospitalUserId,
            StaffUserId = staffUser.Id,
            StaffRole = staffUser.Role,
            Status = AffiliationStatus.Pending,
            DutyStatus = DutyStatus.Off,
            InvitedByUserId = hospitalUserId,
            InvitedAt = DateTime.UtcNow
        };

        _context.StaffAffiliations.Add(affiliation);
        _context.AuditLogs.Add(new AuditLog
        {
            UserId = hospitalUserId,
            UserEmail = hospital.Email,
            Role = "HOSPITAL",
            Action = "STAFF_INVITED",
            Details = $"Hospital invited {staffUser.Role} {staffUser.RegistrationNumber} ({staffUser.Email})"
        });

        await _context.SaveChangesAsync();
        _logger.LogInformation("Hospital {HospitalId} invited staff {StaffId}", hospitalUserId, staffUser.Id);

        return MapAffiliation(affiliation, hospital, staffUser);
    }

    public async Task<StaffAffiliationDto> RespondToInvitationAsync(Guid staffUserId, Guid affiliationId, AffiliationDecisionDto dto)
    {
        var affiliation = await _context.StaffAffiliations
            .Include(a => a.HospitalUser).ThenInclude(h => h.HospitalProfile)
            .Include(a => a.StaffUser).ThenInclude(s => s.DoctorProfile)
            .Include(a => a.StaffUser).ThenInclude(s => s.NurseProfile)
            .FirstOrDefaultAsync(a => a.Id == affiliationId);

        if (affiliation == null)
            throw new KeyNotFoundException("Invitation not found.");

        if (affiliation.StaffUserId != staffUserId)
            throw new UnauthorizedAccessException("You can only respond to your own invitations.");

        if (affiliation.Status != AffiliationStatus.Pending)
            throw new InvalidOperationException("This invitation has already been processed.");

        var decision = dto.Decision.Trim();
        if (decision.Equals("Accept", StringComparison.OrdinalIgnoreCase))
        {
            affiliation.Status = AffiliationStatus.Active;
        }
        else if (decision.Equals("Reject", StringComparison.OrdinalIgnoreCase))
        {
            affiliation.Status = AffiliationStatus.Rejected;
        }
        else
        {
            throw new InvalidOperationException("Decision must be 'Accept' or 'Reject'.");
        }

        affiliation.RespondedAt = DateTime.UtcNow;

        _context.AuditLogs.Add(new AuditLog
        {
            UserId = staffUserId,
            UserEmail = affiliation.StaffUser.Email,
            Role = affiliation.StaffRole.ToString(),
            Action = affiliation.Status == AffiliationStatus.Active ? "STAFF_INVITE_ACCEPTED" : "STAFF_INVITE_REJECTED",
            Details = $"Staff {affiliation.StaffUser.RegistrationNumber} {affiliation.Status.ToString().ToLower()} invitation from hospital user {affiliation.HospitalUserId}"
        });

        await _context.SaveChangesAsync();
        return MapAffiliation(affiliation, affiliation.HospitalUser, affiliation.StaffUser);
    }

    public async Task<List<StaffAffiliationDto>> GetHospitalStaffAsync(
        Guid hospitalUserId,
        string? role = null,
        string? dutyStatus = null,
        string? search = null,
        string? status = null)
    {
        await EnsureActiveHospitalAsync(hospitalUserId);

        var query = _context.StaffAffiliations
            .Include(a => a.HospitalUser).ThenInclude(h => h.HospitalProfile)
            .Include(a => a.StaffUser).ThenInclude(s => s.DoctorProfile)
            .Include(a => a.StaffUser).ThenInclude(s => s.NurseProfile)
            .Where(a => a.HospitalUserId == hospitalUserId)
            .AsQueryable();

        var statusFilter = string.IsNullOrWhiteSpace(status) ? AffiliationStatus.Active.ToString() : status.Trim();
        if (!statusFilter.Equals("All", StringComparison.OrdinalIgnoreCase))
        {
            if (!Enum.TryParse<AffiliationStatus>(statusFilter, true, out var parsedStatus))
                throw new InvalidOperationException("Invalid affiliation status filter.");
            query = query.Where(a => a.Status == parsedStatus);
        }

        if (!string.IsNullOrWhiteSpace(role))
        {
            if (!Enum.TryParse<UserRole>(role.Trim(), true, out var parsedRole) ||
                parsedRole is not (UserRole.DOCTOR or UserRole.NURSE))
                throw new InvalidOperationException("Role filter must be DOCTOR or NURSE.");
            query = query.Where(a => a.StaffRole == parsedRole);
        }

        if (!string.IsNullOrWhiteSpace(dutyStatus))
        {
            if (!Enum.TryParse<DutyStatus>(dutyStatus.Trim(), true, out var parsedDuty))
                throw new InvalidOperationException("Invalid duty status filter.");
            query = query.Where(a => a.DutyStatus == parsedDuty);
        }

        var list = await query.OrderByDescending(a => a.InvitedAt).ToListAsync();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            list = list.Where(a =>
            {
                var name = GetStaffName(a.StaffUser).ToLowerInvariant();
                var reg = (a.StaffUser.RegistrationNumber ?? string.Empty).ToLowerInvariant();
                var email = a.StaffUser.Email.ToLowerInvariant();
                return name.Contains(term) || reg.Contains(term) || email.Contains(term);
            }).ToList();
        }

        return list.Select(a => MapAffiliation(a, a.HospitalUser, a.StaffUser)).ToList();
    }

    public async Task<List<StaffAffiliationDto>> GetMyInvitationsAsync(Guid staffUserId)
    {
        await EnsureActiveStaffAsync(staffUserId);

        var list = await _context.StaffAffiliations
            .Include(a => a.HospitalUser).ThenInclude(h => h.HospitalProfile)
            .Include(a => a.StaffUser).ThenInclude(s => s.DoctorProfile)
            .Include(a => a.StaffUser).ThenInclude(s => s.NurseProfile)
            .Where(a => a.StaffUserId == staffUserId && a.Status == AffiliationStatus.Pending)
            .OrderByDescending(a => a.InvitedAt)
            .ToListAsync();

        return list.Select(a => MapAffiliation(a, a.HospitalUser, a.StaffUser)).ToList();
    }

    public async Task<List<StaffAffiliationDto>> GetMyAffiliationsAsync(Guid staffUserId)
    {
        await EnsureActiveStaffAsync(staffUserId);

        var list = await _context.StaffAffiliations
            .Include(a => a.HospitalUser).ThenInclude(h => h.HospitalProfile)
            .Include(a => a.StaffUser).ThenInclude(s => s.DoctorProfile)
            .Include(a => a.StaffUser).ThenInclude(s => s.NurseProfile)
            .Where(a => a.StaffUserId == staffUserId && a.Status == AffiliationStatus.Active)
            .OrderByDescending(a => a.RespondedAt)
            .ToListAsync();

        return list.Select(a => MapAffiliation(a, a.HospitalUser, a.StaffUser)).ToList();
    }

    public async Task RemoveAffiliationAsync(Guid hospitalUserId, Guid affiliationId)
    {
        await EnsureActiveHospitalAsync(hospitalUserId);

        var affiliation = await _context.StaffAffiliations
            .Include(a => a.StaffUser)
            .FirstOrDefaultAsync(a => a.Id == affiliationId && a.HospitalUserId == hospitalUserId);

        if (affiliation == null)
            throw new KeyNotFoundException("Affiliation not found for this hospital.");

        if (affiliation.Status == AffiliationStatus.Removed)
            throw new InvalidOperationException("Affiliation is already removed.");

        affiliation.Status = AffiliationStatus.Removed;
        affiliation.DutyStatus = DutyStatus.Off;
        affiliation.DutyUpdatedAt = DateTime.UtcNow;
        affiliation.DutyUpdatedByUserId = hospitalUserId;

        var hospital = await _context.Users.FirstAsync(u => u.Id == hospitalUserId);
        _context.AuditLogs.Add(new AuditLog
        {
            UserId = hospitalUserId,
            UserEmail = hospital.Email,
            Role = "HOSPITAL",
            Action = "STAFF_REMOVED",
            Details = $"Hospital removed staff {affiliation.StaffUser.RegistrationNumber} from roster"
        });

        await _context.SaveChangesAsync();
    }

    public async Task<StaffAffiliationDto> UpdateDutyStatusAsync(Guid actorUserId, Guid affiliationId, UpdateDutyStatusDto dto)
    {
        var affiliation = await _context.StaffAffiliations
            .Include(a => a.HospitalUser).ThenInclude(h => h.HospitalProfile)
            .Include(a => a.StaffUser).ThenInclude(s => s.DoctorProfile)
            .Include(a => a.StaffUser).ThenInclude(s => s.NurseProfile)
            .FirstOrDefaultAsync(a => a.Id == affiliationId);

        if (affiliation == null)
            throw new KeyNotFoundException("Affiliation not found.");

        if (affiliation.Status != AffiliationStatus.Active)
            throw new InvalidOperationException("Duty status can only be updated for active affiliations.");

        var isHospital = affiliation.HospitalUserId == actorUserId;
        var isStaff = affiliation.StaffUserId == actorUserId;
        if (!isHospital && !isStaff)
            throw new UnauthorizedAccessException("Only the hospital or the affiliated staff member can update duty status.");

        if (!Enum.TryParse<DutyStatus>(dto.DutyStatus.Trim(), true, out var newDuty))
            throw new InvalidOperationException("DutyStatus must be Off, OnDuty, or OnBreak.");

        affiliation.DutyStatus = newDuty;
        affiliation.DutyUpdatedAt = DateTime.UtcNow;
        affiliation.DutyUpdatedByUserId = actorUserId;

        await _context.SaveChangesAsync();
        return MapAffiliation(affiliation, affiliation.HospitalUser, affiliation.StaffUser);
    }

    public async Task<StaffShiftDto> CreateShiftAsync(Guid hospitalUserId, CreateStaffShiftDto dto)
    {
        await EnsureActiveHospitalAsync(hospitalUserId);
        ValidateShiftTimes(dto.StartTime, dto.EndTime);

        var affiliation = await _context.StaffAffiliations
            .Include(a => a.StaffUser).ThenInclude(s => s.DoctorProfile)
            .Include(a => a.StaffUser).ThenInclude(s => s.NurseProfile)
            .FirstOrDefaultAsync(a => a.Id == dto.AffiliationId && a.HospitalUserId == hospitalUserId);

        if (affiliation == null)
            throw new KeyNotFoundException("Affiliation not found for this hospital.");

        if (affiliation.Status != AffiliationStatus.Active)
            throw new InvalidOperationException("Shifts can only be assigned to active staff.");

        var shift = new StaffShift
        {
            AffiliationId = affiliation.Id,
            ShiftDate = dto.ShiftDate,
            StartTime = dto.StartTime,
            EndTime = dto.EndTime,
            BoothOrStation = string.IsNullOrWhiteSpace(dto.BoothOrStation) ? null : dto.BoothOrStation.Trim(),
            Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim(),
            CreatedByUserId = hospitalUserId,
            CreatedAt = DateTime.UtcNow
        };

        _context.StaffShifts.Add(shift);
        await _context.SaveChangesAsync();

        return MapShift(shift, affiliation);
    }

    public async Task<List<StaffShiftDto>> GetHospitalShiftsAsync(Guid hospitalUserId, DateOnly? from = null, DateOnly? to = null)
    {
        await EnsureActiveHospitalAsync(hospitalUserId);

        var query = _context.StaffShifts
            .Include(s => s.Affiliation).ThenInclude(a => a.StaffUser).ThenInclude(u => u.DoctorProfile)
            .Include(s => s.Affiliation).ThenInclude(a => a.StaffUser).ThenInclude(u => u.NurseProfile)
            .Where(s => s.Affiliation.HospitalUserId == hospitalUserId)
            .AsQueryable();

        if (from.HasValue) query = query.Where(s => s.ShiftDate >= from.Value);
        if (to.HasValue) query = query.Where(s => s.ShiftDate <= to.Value);

        var list = await query.OrderBy(s => s.ShiftDate).ThenBy(s => s.StartTime).ToListAsync();
        return list.Select(s => MapShift(s, s.Affiliation)).ToList();
    }

    public async Task<List<StaffShiftDto>> GetMyShiftsAsync(Guid staffUserId, DateOnly? from = null, DateOnly? to = null)
    {
        await EnsureActiveStaffAsync(staffUserId);

        var query = _context.StaffShifts
            .Include(s => s.Affiliation).ThenInclude(a => a.StaffUser).ThenInclude(u => u.DoctorProfile)
            .Include(s => s.Affiliation).ThenInclude(a => a.StaffUser).ThenInclude(u => u.NurseProfile)
            .Where(s => s.Affiliation.StaffUserId == staffUserId && s.Affiliation.Status == AffiliationStatus.Active)
            .AsQueryable();

        if (from.HasValue) query = query.Where(s => s.ShiftDate >= from.Value);
        if (to.HasValue) query = query.Where(s => s.ShiftDate <= to.Value);

        var list = await query.OrderBy(s => s.ShiftDate).ThenBy(s => s.StartTime).ToListAsync();
        return list.Select(s => MapShift(s, s.Affiliation)).ToList();
    }

    public async Task<StaffShiftDto> UpdateShiftAsync(Guid hospitalUserId, Guid shiftId, UpdateStaffShiftDto dto)
    {
        await EnsureActiveHospitalAsync(hospitalUserId);
        ValidateShiftTimes(dto.StartTime, dto.EndTime);

        var shift = await _context.StaffShifts
            .Include(s => s.Affiliation).ThenInclude(a => a.StaffUser).ThenInclude(u => u.DoctorProfile)
            .Include(s => s.Affiliation).ThenInclude(a => a.StaffUser).ThenInclude(u => u.NurseProfile)
            .FirstOrDefaultAsync(s => s.Id == shiftId && s.Affiliation.HospitalUserId == hospitalUserId);

        if (shift == null)
            throw new KeyNotFoundException("Shift not found for this hospital.");

        if (shift.Affiliation.Status != AffiliationStatus.Active)
            throw new InvalidOperationException("Cannot update shifts for inactive staff affiliations.");

        shift.ShiftDate = dto.ShiftDate;
        shift.StartTime = dto.StartTime;
        shift.EndTime = dto.EndTime;
        shift.BoothOrStation = string.IsNullOrWhiteSpace(dto.BoothOrStation) ? null : dto.BoothOrStation.Trim();
        shift.Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim();
        shift.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return MapShift(shift, shift.Affiliation);
    }

    public async Task DeleteShiftAsync(Guid hospitalUserId, Guid shiftId)
    {
        await EnsureActiveHospitalAsync(hospitalUserId);

        var shift = await _context.StaffShifts
            .Include(s => s.Affiliation)
            .FirstOrDefaultAsync(s => s.Id == shiftId && s.Affiliation.HospitalUserId == hospitalUserId);

        if (shift == null)
            throw new KeyNotFoundException("Shift not found for this hospital.");

        _context.StaffShifts.Remove(shift);
        await _context.SaveChangesAsync();
    }

    private async Task EnsureActiveHospitalAsync(Guid hospitalUserId)
    {
        var hospital = await _context.Users.FirstOrDefaultAsync(u => u.Id == hospitalUserId);
        if (hospital == null || hospital.Role != UserRole.HOSPITAL)
            throw new UnauthorizedAccessException("Only hospital accounts can perform this action.");
        if (hospital.Status != UserStatus.Active)
            throw new InvalidOperationException("Hospital account must be Active.");
    }

    private async Task EnsureActiveStaffAsync(Guid staffUserId)
    {
        var staff = await _context.Users.FirstOrDefaultAsync(u => u.Id == staffUserId);
        if (staff == null || staff.Role is not (UserRole.DOCTOR or UserRole.NURSE))
            throw new UnauthorizedAccessException("Only doctor or nurse accounts can perform this action.");
        if (staff.Status != UserStatus.Active)
            throw new InvalidOperationException("Staff account must be Active.");
    }

    private static void ValidateShiftTimes(TimeOnly start, TimeOnly end)
    {
        if (end <= start)
            throw new InvalidOperationException("Shift end time must be after start time.");
    }

    private static string GetStaffName(User staffUser)
    {
        if (staffUser.Role == UserRole.DOCTOR && staffUser.DoctorProfile != null)
            return $"Dr. {staffUser.DoctorProfile.FullName}";
        if (staffUser.Role == UserRole.NURSE && staffUser.NurseProfile != null)
            return $"Nurse {staffUser.NurseProfile.FullName}";
        return staffUser.Email;
    }

    private static StaffAffiliationDto MapAffiliation(StaffAffiliation affiliation, User hospitalUser, User staffUser)
    {
        return new StaffAffiliationDto
        {
            AffiliationId = affiliation.Id,
            HospitalUserId = affiliation.HospitalUserId,
            HospitalName = hospitalUser.HospitalProfile?.HospitalName,
            StaffUserId = affiliation.StaffUserId,
            StaffRegistrationNumber = staffUser.RegistrationNumber ?? string.Empty,
            StaffName = GetStaffName(staffUser),
            StaffRole = affiliation.StaffRole.ToString(),
            Specialization = staffUser.DoctorProfile?.Specialization,
            PhoneNumber = staffUser.DoctorProfile?.PhoneNumber ?? staffUser.NurseProfile?.PhoneNumber ?? staffUser.PhoneNumber,
            Email = staffUser.Email,
            Status = affiliation.Status.ToString(),
            DutyStatus = affiliation.DutyStatus.ToString(),
            DutyUpdatedAt = affiliation.DutyUpdatedAt,
            InvitedAt = affiliation.InvitedAt,
            RespondedAt = affiliation.RespondedAt
        };
    }

    private static StaffShiftDto MapShift(StaffShift shift, StaffAffiliation affiliation)
    {
        return new StaffShiftDto
        {
            ShiftId = shift.Id,
            AffiliationId = shift.AffiliationId,
            StaffUserId = affiliation.StaffUserId,
            StaffName = GetStaffName(affiliation.StaffUser),
            StaffRole = affiliation.StaffRole.ToString(),
            ShiftDate = shift.ShiftDate,
            StartTime = shift.StartTime,
            EndTime = shift.EndTime,
            BoothOrStation = shift.BoothOrStation,
            Notes = shift.Notes,
            CreatedAt = shift.CreatedAt,
            UpdatedAt = shift.UpdatedAt
        };
    }
}
