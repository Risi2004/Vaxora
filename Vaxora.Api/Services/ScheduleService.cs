using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Vaxora.Api.Data;
using Vaxora.Api.Dtos;
using Vaxora.Api.Models;

namespace Vaxora.Api.Services;

public interface IScheduleService
{
    Task<VaccineScheduleDto> CreateScheduleAsync(Guid hospitalUserId, CreateVaccineScheduleDto dto);
    Task<List<VaccineScheduleDto>> GetHospitalSchedulesAsync(Guid hospitalUserId);
    Task<bool> CancelScheduleAsync(Guid hospitalUserId, Guid scheduleId);
    Task<List<VaccineScheduleDto>> GetAvailableSchedulesAsync(Guid? hospitalUserId = null, string? vaccineName = null);
}

public class ScheduleService : IScheduleService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<ScheduleService> _logger;

    public ScheduleService(ApplicationDbContext context, ILogger<ScheduleService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<VaccineScheduleDto> CreateScheduleAsync(Guid hospitalUserId, CreateVaccineScheduleDto dto)
    {
        var hospital = await _context.Users
            .Include(u => u.HospitalProfile)
            .FirstOrDefaultAsync(u => u.Id == hospitalUserId && u.Role == UserRole.HOSPITAL);

        if (hospital == null)
        {
            throw new UnauthorizedAccessException("Hospital account not found.");
        }

        var isWeekly = string.Equals(dto.ScheduleType, "Weekly", StringComparison.OrdinalIgnoreCase);

        if (isWeekly)
        {
            if (dto.DaysOfWeek == null || dto.DaysOfWeek.Count == 0)
            {
                throw new ArgumentException("Please select at least one day of the week for recurring schedules.");
            }
            if (!dto.StartDate.HasValue || !dto.EndDate.HasValue)
            {
                throw new ArgumentException("Start date and End date are required for weekly recurring schedules.");
            }
            if (dto.EndDate < dto.StartDate)
            {
                throw new ArgumentException("End date cannot be earlier than start date.");
            }
        }
        else
        {
            if (!dto.SpecificDate.HasValue)
            {
                throw new ArgumentException("Please specify a date for one-time schedules.");
            }
        }

        var daysOfWeekJoined = (dto.DaysOfWeek != null && dto.DaysOfWeek.Count > 0)
            ? string.Join(",", dto.DaysOfWeek.Select(d => d.Trim()))
            : null;

        var schedule = new VaccineSchedule
        {
            Id = Guid.NewGuid(),
            HospitalUserId = hospitalUserId,
            HospitalProfileId = hospital.HospitalProfile?.Id,
            DoctorUserId = dto.DoctorUserId,
            DoctorName = dto.DoctorName.Trim(),
            NurseUserId = dto.NurseUserId,
            NurseName = dto.NurseName.Trim(),
            VaccineId = dto.VaccineId,
            VaccineName = dto.VaccineName.Trim(),
            ScheduleType = isWeekly ? "Weekly" : "OneTime",
            SpecificDate = isWeekly ? null : dto.SpecificDate,
            DaysOfWeek = isWeekly ? daysOfWeekJoined : null,
            StartDate = isWeekly ? dto.StartDate : null,
            EndDate = isWeekly ? dto.EndDate : null,
            StartTime = dto.StartTime.Trim(),
            EndTime = dto.EndTime.Trim(),
            Status = "Active",
            CreatedAt = DateTime.UtcNow
        };

        _context.VaccineSchedules.Add(schedule);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created {Type} schedule {ScheduleId} for hospital {HospitalName}", schedule.ScheduleType, schedule.Id, hospital.HospitalProfile?.HospitalName ?? hospital.Email);

        return MapToDto(schedule, hospital.HospitalProfile?.HospitalName ?? "Hospital");
    }

    public async Task<List<VaccineScheduleDto>> GetHospitalSchedulesAsync(Guid hospitalUserId)
    {
        var hospital = await _context.Users
            .Include(u => u.HospitalProfile)
            .FirstOrDefaultAsync(u => u.Id == hospitalUserId);

        var hospitalName = hospital?.HospitalProfile?.HospitalName ?? "Hospital";

        var schedules = await _context.VaccineSchedules
            .AsNoTracking()
            .Where(s => s.HospitalUserId == hospitalUserId && s.Status == "Active")
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();

        return schedules.Select(s => MapToDto(s, hospitalName)).ToList();
    }

    public async Task<bool> CancelScheduleAsync(Guid hospitalUserId, Guid scheduleId)
    {
        var schedule = await _context.VaccineSchedules
            .FirstOrDefaultAsync(s => s.Id == scheduleId && s.HospitalUserId == hospitalUserId);

        if (schedule == null)
        {
            throw new KeyNotFoundException("Schedule slot not found.");
        }

        schedule.Status = "Cancelled";
        await _context.SaveChangesAsync();

        _logger.LogInformation("Cancelled schedule {ScheduleId} by hospital {HospitalUserId}", scheduleId, hospitalUserId);
        return true;
    }

    public async Task<List<VaccineScheduleDto>> GetAvailableSchedulesAsync(Guid? hospitalUserId = null, string? vaccineName = null)
    {
        var query = _context.VaccineSchedules
            .Include(s => s.HospitalUser!)
            .ThenInclude(h => h.HospitalProfile)
            .AsNoTracking()
            .Where(s => s.Status == "Active");

        if (hospitalUserId.HasValue)
        {
            var hId = hospitalUserId.Value;
            var hp = await _context.HospitalProfiles.AsNoTracking().FirstOrDefaultAsync(p => p.Id == hId || p.UserId == hId);
            var resUserId = hp?.UserId ?? hId;
            var resProfId = hp?.Id;

            query = query.Where(s => s.HospitalUserId == resUserId || (resProfId.HasValue && s.HospitalProfileId == resProfId.Value));
        }

        if (!string.IsNullOrWhiteSpace(vaccineName))
        {
            var vName = vaccineName.Trim().ToLowerInvariant();
            query = query.Where(s => s.VaccineName.ToLower().Contains(vName));
        }

        var schedules = await query.OrderByDescending(s => s.CreatedAt).ToListAsync();

        return schedules.Select(s => MapToDto(s, s.HospitalUser?.HospitalProfile?.HospitalName ?? "Hospital")).ToList();
    }

    private static VaccineScheduleDto MapToDto(VaccineSchedule s, string hospitalName)
    {
        var daysList = !string.IsNullOrWhiteSpace(s.DaysOfWeek)
            ? s.DaysOfWeek.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList()
            : new List<string>();

        var formattedTime = $"{FormatTime12h(s.StartTime)} - {FormatTime12h(s.EndTime)}";

        string displayRecurrence;
        if (s.ScheduleType == "Weekly")
        {
            var daysStr = daysList.Count > 0 ? string.Join(", ", daysList) : "Weekly";
            var rangeStr = (s.StartDate.HasValue && s.EndDate.HasValue)
                ? $" ({s.StartDate:MMM dd} - {s.EndDate:MMM dd, yyyy})"
                : "";
            displayRecurrence = $"Repeats {daysStr}{rangeStr}";
        }
        else
        {
            displayRecurrence = s.SpecificDate.HasValue
                ? s.SpecificDate.Value.ToString("yyyy-MM-dd")
                : "One-Time";
        }

        return new VaccineScheduleDto
        {
            Id = s.Id,
            HospitalUserId = s.HospitalUserId,
            HospitalName = hospitalName,
            DoctorUserId = s.DoctorUserId,
            DoctorName = s.DoctorName,
            NurseUserId = s.NurseUserId,
            NurseName = s.NurseName,
            VaccineId = s.VaccineId,
            VaccineName = s.VaccineName,
            ScheduleType = s.ScheduleType,
            SpecificDate = s.SpecificDate,
            DaysOfWeek = daysList,
            StartDate = s.StartDate,
            EndDate = s.EndDate,
            StartTime = s.StartTime,
            EndTime = s.EndTime,
            FormattedTime = formattedTime,
            DisplayRecurrence = displayRecurrence,
            Status = s.Status,
            CreatedAt = s.CreatedAt
        };
    }

    private static string FormatTime12h(string time24)
    {
        if (string.IsNullOrWhiteSpace(time24)) return string.Empty;
        if (DateTime.TryParseExact(time24, new[] { "HH:mm", "H:mm", "h:mm tt", "hh:mm tt" }, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
        {
            return dt.ToString("hh:mm tt");
        }
        return time24;
    }
}
