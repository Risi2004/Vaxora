using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Vaxora.Api.Data;
using Vaxora.Api.Dtos;
using Vaxora.Api.Models;

namespace Vaxora.Api.Services;

public interface IAppointmentService
{
    Task<List<AvailableDateDto>> GetAvailableDatesAsync(Guid hospitalUserId, string vaccineName);
    Task<List<TimeSlotDto>> GetAvailableTimeSlotsAsync(Guid hospitalUserId, string vaccineName, DateOnly date);
    Task<AppointmentResponseDto> BookAppointmentAsync(Guid patientUserId, BookAppointmentRequestDto dto);
    Task<List<AppointmentResponseDto>> GetPatientAppointmentsAsync(Guid patientUserId);
    Task<List<AppointmentResponseDto>> GetHospitalAppointmentsAsync(Guid hospitalUserId, DateOnly? date = null, string? status = null);
    Task<AppointmentResponseDto> UpdateAppointmentStatusAsync(Guid hospitalUserId, Guid appointmentId, UpdateAppointmentStatusDto dto);
    Task<bool> CancelAppointmentAsync(Guid userId, Guid appointmentId, bool isHospital = false);
}

public class AppointmentService : IAppointmentService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AppointmentService> _logger;

    public AppointmentService(ApplicationDbContext context, ILogger<AppointmentService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<AvailableDateDto>> GetAvailableDatesAsync(Guid hospitalUserId, string vaccineName)
    {
        var vName = vaccineName.Trim().ToLowerInvariant();

        var schedules = await _context.VaccineSchedules
            .AsNoTracking()
            .Where(s => s.HospitalUserId == hospitalUserId &&
                        s.Status == "Active" &&
                        s.VaccineName.ToLower().Contains(vName))
            .ToListAsync();

        if (schedules.Count == 0)
        {
            // Fallback: check all active schedules for this hospital if vaccine matching is broad
            schedules = await _context.VaccineSchedules
                .AsNoTracking()
                .Where(s => s.HospitalUserId == hospitalUserId && s.Status == "Active")
                .ToListAsync();
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var maxLookahead = today.AddDays(60);
        var availableDates = new List<AvailableDateDto>();

        foreach (var schedule in schedules)
        {
            var isWeekly = string.Equals(schedule.ScheduleType, "Weekly", StringComparison.OrdinalIgnoreCase);

            if (!isWeekly)
            {
                // One-time schedule
                if (schedule.SpecificDate.HasValue && schedule.SpecificDate.Value >= today)
                {
                    var date = schedule.SpecificDate.Value;
                    var dayName = date.DayOfWeek.ToString();
                    var formattedTime = $"{FormatTime12h(schedule.StartTime)} - {FormatTime12h(schedule.EndTime)}";

                    availableDates.Add(new AvailableDateDto
                    {
                        Date = date.ToString("yyyy-MM-dd"),
                        DayOfWeek = dayName,
                        DisplayText = $"{date:yyyy-MM-dd} ({dayName}) - {formattedTime} (Dr. {schedule.DoctorName})",
                        DoctorName = schedule.DoctorName,
                        NurseName = schedule.NurseName,
                        StartTime = schedule.StartTime,
                        EndTime = schedule.EndTime,
                        ScheduleId = schedule.Id
                    });
                }
            }
            else
            {
                // Weekly recurring schedule
                var daysList = !string.IsNullOrWhiteSpace(schedule.DaysOfWeek)
                    ? schedule.DaysOfWeek.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    : Array.Empty<string>();

                var startDate = schedule.StartDate.HasValue && schedule.StartDate.Value > today
                    ? schedule.StartDate.Value
                    : today;

                var endDate = schedule.EndDate.HasValue && schedule.EndDate.Value < maxLookahead
                    ? schedule.EndDate.Value
                    : maxLookahead;

                if (endDate < startDate) continue;

                var formattedTime = $"{FormatTime12h(schedule.StartTime)} - {FormatTime12h(schedule.EndTime)}";

                for (var cur = startDate; cur <= endDate; cur = cur.AddDays(1))
                {
                    var dayName = cur.DayOfWeek.ToString();
                    var dayShort = dayName[..Math.Min(3, dayName.Length)];

                    var matchesDay = daysList.Any(d =>
                        string.Equals(d, dayName, StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(d, dayShort, StringComparison.OrdinalIgnoreCase));

                    if (matchesDay)
                    {
                        availableDates.Add(new AvailableDateDto
                        {
                            Date = cur.ToString("yyyy-MM-dd"),
                            DayOfWeek = dayName,
                            DisplayText = $"{cur:yyyy-MM-dd} ({dayName}) - {formattedTime} (Dr. {schedule.DoctorName})",
                            DoctorName = schedule.DoctorName,
                            NurseName = schedule.NurseName,
                            StartTime = schedule.StartTime,
                            EndTime = schedule.EndTime,
                            ScheduleId = schedule.Id
                        });
                    }
                }
            }
        }

        // Return distinct dates ordered chronologically
        return availableDates
            .GroupBy(d => d.Date)
            .Select(g => g.First())
            .OrderBy(d => d.Date)
            .ToList();
    }

    public async Task<List<TimeSlotDto>> GetAvailableTimeSlotsAsync(Guid hospitalUserId, string vaccineName, DateOnly date)
    {
        var dayName = date.DayOfWeek.ToString();
        var dayShort = dayName[..Math.Min(3, dayName.Length)];

        var schedules = await _context.VaccineSchedules
            .AsNoTracking()
            .Where(s => s.HospitalUserId == hospitalUserId && s.Status == "Active")
            .ToListAsync();

        // Filter schedules matching this date
        var matchingSchedules = schedules.Where(s =>
        {
            var isWeekly = string.Equals(s.ScheduleType, "Weekly", StringComparison.OrdinalIgnoreCase);
            if (!isWeekly)
            {
                return s.SpecificDate == date;
            }
            else
            {
                if (s.StartDate.HasValue && date < s.StartDate.Value) return false;
                if (s.EndDate.HasValue && date > s.EndDate.Value) return false;

                var daysList = !string.IsNullOrWhiteSpace(s.DaysOfWeek)
                    ? s.DaysOfWeek.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    : Array.Empty<string>();

                return daysList.Any(d =>
                    string.Equals(d, dayName, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(d, dayShort, StringComparison.OrdinalIgnoreCase));
            }
        }).ToList();

        if (matchingSchedules.Count == 0)
        {
            // Default fallback 1-hour session 09:00 - 10:00 if no active schedule configured
            matchingSchedules.Add(new VaccineSchedule
            {
                StartTime = "09:00",
                EndTime = "11:00",
                DoctorName = "Physician on Duty",
                NurseName = "Staff Nurse"
            });
        }

        // Fetch already booked appointments for this hospital and date (not cancelled)
        var bookedAppointments = await _context.Appointments
            .AsNoTracking()
            .Where(a => a.HospitalUserId == hospitalUserId &&
                        a.AppointmentDate == date &&
                        a.Status != "Cancelled")
            .ToListAsync();

        var bookedSlots = bookedAppointments
            .Select(a => a.TimeSlot.Trim())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var slots = new List<TimeSlotDto>();

        foreach (var sch in matchingSchedules)
        {
            var scheduleSlots = Generate20MinSlots(sch.StartTime, sch.EndTime);

            foreach (var slot in scheduleSlots)
            {
                var isBooked = bookedSlots.Contains(slot.Slot);
                slot.IsBooked = isBooked;
                slots.Add(slot);
            }
        }

        return slots
            .GroupBy(s => s.Slot)
            .Select(g => g.First())
            .OrderBy(s => s.StartTime)
            .ToList();
    }

    public async Task<AppointmentResponseDto> BookAppointmentAsync(Guid patientUserId, BookAppointmentRequestDto dto)
    {
        var patient = await _context.Users
            .Include(u => u.PatientProfile)
            .FirstOrDefaultAsync(u => u.Id == patientUserId);

        if (patient == null)
        {
            throw new UnauthorizedAccessException("Patient account not found.");
        }

        var hospital = await _context.Users
            .Include(u => u.HospitalProfile)
            .FirstOrDefaultAsync(u => u.Id == dto.HospitalUserId && u.Role == UserRole.HOSPITAL);

        if (hospital == null)
        {
            throw new KeyNotFoundException("Selected hospital not found.");
        }

        // Validate slot collision: 20-minute slots cannot be booked more than once
        var existingAppointment = await _context.Appointments
            .FirstOrDefaultAsync(a => a.HospitalUserId == dto.HospitalUserId &&
                                      a.AppointmentDate == dto.AppointmentDate &&
                                      a.TimeSlot == dto.TimeSlot &&
                                      a.Status != "Cancelled");

        if (existingAppointment != null)
        {
            throw new InvalidOperationException($"The slot '{dto.TimeSlot}' on {dto.AppointmentDate:yyyy-MM-dd} is already booked by another patient. Please select a different time slot.");
        }

        // Find matching active schedule for doctor/nurse attribution
        var dayName = dto.AppointmentDate.DayOfWeek.ToString();
        var schedule = await _context.VaccineSchedules
            .FirstOrDefaultAsync(s => s.HospitalUserId == dto.HospitalUserId &&
                                      s.Status == "Active" &&
                                      (s.Id == dto.VaccineScheduleId ||
                                       s.SpecificDate == dto.AppointmentDate ||
                                       (s.ScheduleType == "Weekly" && s.DaysOfWeek != null && s.DaysOfWeek.Contains(dayName))));

        var patientName = patient.PatientProfile?.FullName;
        if (string.IsNullOrWhiteSpace(patientName))
        {
            patientName = patient.Email;
        }

        var hospitalName = hospital.HospitalProfile?.HospitalName ?? "Hospital Center";

        var appointment = new Appointment
        {
            Id = Guid.NewGuid(),
            PatientUserId = patientUserId,
            PatientProfileId = patient.PatientProfile?.Id,
            PatientName = patientName,
            PatientNic = patient.PatientProfile?.NicNumber,
            PatientPhone = patient.PatientProfile?.PhoneNumber ?? patient.PhoneNumber,
            PatientEmail = patient.Email,
            HospitalUserId = dto.HospitalUserId,
            HospitalProfileId = hospital.HospitalProfile?.Id,
            HospitalName = hospitalName,
            VaccineScheduleId = schedule?.Id ?? dto.VaccineScheduleId,
            VaccineId = schedule?.VaccineId ?? dto.VaccineId,
            VaccineName = dto.VaccineName.Trim(),
            DoctorUserId = schedule?.DoctorUserId,
            DoctorName = schedule?.DoctorName,
            NurseUserId = schedule?.NurseUserId,
            NurseName = schedule?.NurseName,
            AppointmentDate = dto.AppointmentDate,
            TimeSlot = dto.TimeSlot.Trim(),
            Status = "Confirmed",
            Notes = dto.Notes?.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.Appointments.Add(appointment);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Appointment {AppId} reserved for Patient {Patient} at {Hospital} on {Date} ({Slot})",
            appointment.Id, appointment.PatientName, appointment.HospitalName, appointment.AppointmentDate, appointment.TimeSlot);

        return MapToDto(appointment);
    }

    public async Task<List<AppointmentResponseDto>> GetPatientAppointmentsAsync(Guid patientUserId)
    {
        var appointments = await _context.Appointments
            .AsNoTracking()
            .Where(a => a.PatientUserId == patientUserId)
            .OrderByDescending(a => a.AppointmentDate)
            .ThenByDescending(a => a.CreatedAt)
            .ToListAsync();

        return appointments.Select(MapToDto).ToList();
    }

    public async Task<List<AppointmentResponseDto>> GetHospitalAppointmentsAsync(Guid hospitalUserId, DateOnly? date = null, string? status = null)
    {
        var query = _context.Appointments
            .AsNoTracking()
            .Where(a => a.HospitalUserId == hospitalUserId);

        if (date.HasValue)
        {
            query = query.Where(a => a.AppointmentDate == date.Value);
        }

        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "All", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(a => a.Status.ToLower() == status.ToLower());
        }

        var appointments = await query
            .OrderBy(a => a.AppointmentDate)
            .ThenBy(a => a.TimeSlot)
            .ToListAsync();

        return appointments.Select(MapToDto).ToList();
    }

    public async Task<AppointmentResponseDto> UpdateAppointmentStatusAsync(Guid hospitalUserId, Guid appointmentId, UpdateAppointmentStatusDto dto)
    {
        var appointment = await _context.Appointments
            .FirstOrDefaultAsync(a => a.Id == appointmentId && a.HospitalUserId == hospitalUserId);

        if (appointment == null)
        {
            throw new KeyNotFoundException("Appointment record not found.");
        }

        appointment.Status = dto.Status.Trim();
        appointment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated appointment {AppId} status to {Status}", appointmentId, appointment.Status);

        return MapToDto(appointment);
    }

    public async Task<bool> CancelAppointmentAsync(Guid userId, Guid appointmentId, bool isHospital = false)
    {
        var appointment = await _context.Appointments
            .FirstOrDefaultAsync(a => a.Id == appointmentId &&
                                      (isHospital ? a.HospitalUserId == userId : a.PatientUserId == userId));

        if (appointment == null)
        {
            throw new KeyNotFoundException("Appointment not found or unauthorized to cancel.");
        }

        appointment.Status = "Cancelled";
        appointment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Cancelled appointment {AppId} by user {UserId}", appointmentId, userId);
        return true;
    }

    private static List<TimeSlotDto> Generate20MinSlots(string startTimeStr, string endTimeStr)
    {
        var result = new List<TimeSlotDto>();

        if (!TryParseTime(startTimeStr, out var startTime) || !TryParseTime(endTimeStr, out var endTime))
        {
            // Default 09:00 - 10:00 (3 slots) if time parsing fails
            startTime = new TimeOnly(9, 0);
            endTime = new TimeOnly(10, 0);
        }

        if (endTime <= startTime)
        {
            endTime = startTime.AddHours(1);
        }

        var current = startTime;
        while (current.AddMinutes(20) <= endTime)
        {
            var next = current.AddMinutes(20);
            var slotStr = $"{FormatTime12h(current)} - {FormatTime12h(next)}";

            result.Add(new TimeSlotDto
            {
                Slot = slotStr,
                StartTime = current.ToString("HH:mm"),
                EndTime = next.ToString("HH:mm"),
                IsBooked = false
            });

            current = next;
        }

        return result;
    }

    private static bool TryParseTime(string timeStr, out TimeOnly time)
    {
        time = default;
        if (string.IsNullOrWhiteSpace(timeStr)) return false;

        var formats = new[] { "HH:mm", "H:mm", "hh:mm tt", "h:mm tt", "HH:mm:ss" };
        return TimeOnly.TryParseExact(timeStr.Trim(), formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out time) ||
               TimeOnly.TryParse(timeStr.Trim(), CultureInfo.InvariantCulture, out time);
    }

    private static string FormatTime12h(TimeOnly time)
    {
        return DateTime.Today.Add(time.ToTimeSpan()).ToString("hh:mm tt");
    }

    private static string FormatTime12h(string timeStr)
    {
        if (TryParseTime(timeStr, out var t))
        {
            return FormatTime12h(t);
        }
        return timeStr;
    }

    private static AppointmentResponseDto MapToDto(Appointment a)
    {
        return new AppointmentResponseDto
        {
            Id = a.Id,
            PatientUserId = a.PatientUserId,
            PatientName = a.PatientName,
            PatientNic = a.PatientNic,
            PatientPhone = a.PatientPhone,
            PatientEmail = a.PatientEmail,
            HospitalUserId = a.HospitalUserId,
            HospitalName = a.HospitalName,
            VaccineScheduleId = a.VaccineScheduleId,
            VaccineId = a.VaccineId,
            VaccineName = a.VaccineName,
            DoctorName = a.DoctorName,
            NurseName = a.NurseName,
            AppointmentDate = a.AppointmentDate.ToString("yyyy-MM-dd"),
            TimeSlot = a.TimeSlot,
            StartTime = a.StartTime,
            EndTime = a.EndTime,
            Status = a.Status,
            Notes = a.Notes,
            CreatedAt = a.CreatedAt
        };
    }
}
