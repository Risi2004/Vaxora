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
    Task<AppointmentResponseDto> CreateWalkInAppointmentAsync(Guid hospitalUserId, CreateWalkInAppointmentDto dto);
    Task<List<AppointmentResponseDto>> GetPatientAppointmentsAsync(Guid patientUserId);
    Task<List<AppointmentResponseDto>> GetHospitalAppointmentsAsync(Guid hospitalUserId, DateOnly? date = null, string? status = null);
    Task<List<AppointmentResponseDto>> GetStaffHospitalAppointmentsAsync(Guid staffUserId, Guid hospitalUserId, DateOnly? date = null);
    /// <summary>
    /// Update appointment status. Actor may be the owning hospital, or an active
    /// doctor/nurse affiliated with that hospital.
    /// </summary>
    Task<AppointmentResponseDto> UpdateAppointmentStatusAsync(Guid actorUserId, Guid appointmentId, UpdateAppointmentStatusDto dto);
    Task<bool> CancelAppointmentAsync(Guid userId, string idOrRef, bool isHospital = false);
    Task<bool> CancelAppointmentAsync(Guid userId, Guid appointmentId, bool isHospital = false);
    Task<AppointmentResponseDto> ConfirmPayHerePaymentAsync(Guid appointmentId, string transactionId, string? orderId = null);
}

public class AppointmentService : IAppointmentService
{
    /// <summary>
    /// Statuses a client may set through the status endpoint, mapped to their canonical
    /// casing. Status is stored as free text, so callers are matched case-insensitively
    /// and the stored value is normalised to keep equality checks elsewhere reliable.
    /// </summary>
    private static readonly Dictionary<string, string> AllowedStatusTransitions =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["Confirmed"] = "Confirmed",
            ["Administering"] = "Administering",
            ["Observation"] = "Observation",
            ["Completed"] = "Completed",
            ["Cancelled"] = "Cancelled",
            ["Rejected"] = "Rejected",
        };

    /// <summary>
    /// Clinical transitions that require the doctor/nurse to be on an active shift.
    /// Hospital owners are exempt (they update without a staff shift).
    /// </summary>
    private static readonly HashSet<string> OnDutyRequiredStatuses =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "Administering",
            "Observation",
            "Completed",
        };

    private readonly ApplicationDbContext _context;
    private readonly IEmailService _emailService;
    private readonly ILogger<AppointmentService> _logger;

    public AppointmentService(ApplicationDbContext context, IEmailService emailService, ILogger<AppointmentService> logger)
    {
        _context = context;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task<List<AvailableDateDto>> GetAvailableDatesAsync(Guid hospitalUserId, string vaccineName)
    {
        var vName = vaccineName.Trim().ToLowerInvariant();

        // Resolve hospital User ID (in case HospitalProfile.Id was passed instead of User.Id)
        var hospitalProfile = await _context.HospitalProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(hp => hp.Id == hospitalUserId || hp.UserId == hospitalUserId);

        var resolvedHospitalUserId = hospitalProfile?.UserId ?? hospitalUserId;
        var resolvedProfileId = hospitalProfile?.Id;

        var schedules = await _context.VaccineSchedules
            .AsNoTracking()
            .Where(s => (s.HospitalUserId == resolvedHospitalUserId || (resolvedProfileId.HasValue && s.HospitalProfileId == resolvedProfileId.Value)) &&
                        s.Status == "Active" &&
                        s.VaccineName.ToLower().Contains(vName))
            .ToListAsync();

        if (schedules.Count == 0)
        {
            // Fallback: check all active schedules for this hospital if vaccine matching is broad
            schedules = await _context.VaccineSchedules
                .AsNoTracking()
                .Where(s => (s.HospitalUserId == resolvedHospitalUserId || (resolvedProfileId.HasValue && s.HospitalProfileId == resolvedProfileId.Value)) && s.Status == "Active")
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
                        DisplayText = string.IsNullOrWhiteSpace(schedule.DoctorName)
                            ? $"{date:yyyy-MM-dd} ({dayName}) - {formattedTime}"
                            : $"{date:yyyy-MM-dd} ({dayName}) - {formattedTime} (Dr. {schedule.DoctorName})",
                        DoctorName = schedule.DoctorName,
                        NurseName = schedule.NurseName,
                        BoothId = schedule.BoothId,
                        BoothLabel = schedule.BoothLabel,
                        StartTime = schedule.StartTime,
                        EndTime = schedule.EndTime,
                        ScheduleId = schedule.Id,
                        Price = schedule.Price,
                        FormattedPrice = schedule.Price <= 0 ? "Free" : $"LKR {schedule.Price:N2}"
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
                            DisplayText = string.IsNullOrWhiteSpace(schedule.DoctorName)
                                ? $"{cur:yyyy-MM-dd} ({dayName}) - {formattedTime}"
                                : $"{cur:yyyy-MM-dd} ({dayName}) - {formattedTime} (Dr. {schedule.DoctorName})",
                            DoctorName = schedule.DoctorName,
                            NurseName = schedule.NurseName,
                            BoothId = schedule.BoothId,
                            BoothLabel = schedule.BoothLabel,
                            StartTime = schedule.StartTime,
                            EndTime = schedule.EndTime,
                            ScheduleId = schedule.Id,
                            Price = schedule.Price,
                            FormattedPrice = schedule.Price <= 0 ? "Free" : $"LKR {schedule.Price:N2}"
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

        // Resolve hospital User ID (in case HospitalProfile.Id was passed instead of User.Id)
        var hospitalProfile = await _context.HospitalProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(hp => hp.Id == hospitalUserId || hp.UserId == hospitalUserId);

        var resolvedHospitalUserId = hospitalProfile?.UserId ?? hospitalUserId;
        var resolvedProfileId = hospitalProfile?.Id;

        var vName = vaccineName.Trim().ToLowerInvariant();
        var schedules = await _context.VaccineSchedules
            .AsNoTracking()
            .Where(s => (s.HospitalUserId == resolvedHospitalUserId || (resolvedProfileId.HasValue && s.HospitalProfileId == resolvedProfileId.Value)) &&
                        s.Status == "Active" &&
                        (string.IsNullOrWhiteSpace(vName) || s.VaccineName.ToLower().Contains(vName)))
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
            .Where(a => (a.HospitalUserId == resolvedHospitalUserId || (resolvedProfileId.HasValue && a.HospitalProfileId == resolvedProfileId.Value)) &&
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
            .FirstOrDefaultAsync(u => (u.Id == dto.HospitalUserId || (u.HospitalProfile != null && u.HospitalProfile.Id == dto.HospitalUserId)) && u.Role == UserRole.HOSPITAL);

        if (hospital == null)
        {
            throw new KeyNotFoundException("Selected hospital not found.");
        }

        var resolvedHospitalUserId = hospital.Id;

        // Validate slot collision: 20-minute slots cannot be booked more than once
        var existingAppointment = await _context.Appointments
            .FirstOrDefaultAsync(a => a.HospitalUserId == resolvedHospitalUserId &&
                                      a.AppointmentDate == dto.AppointmentDate &&
                                      a.TimeSlot == dto.TimeSlot &&
                                      a.Status != "Cancelled");

        if (existingAppointment != null)
        {
            throw new InvalidOperationException($"The slot '{dto.TimeSlot}' on {dto.AppointmentDate:yyyy-MM-dd} is already booked by another patient. Please select a different time slot.");
        }

        // Find matching active schedule for doctor/nurse attribution and fee calculation
        VaccineSchedule? schedule = null;
        var vName = dto.VaccineName.Trim().ToLowerInvariant();

        // 1. First priority: match exact schedule ID if provided
        if (dto.VaccineScheduleId.HasValue && dto.VaccineScheduleId.Value != Guid.Empty)
        {
            schedule = await _context.VaccineSchedules
                .FirstOrDefaultAsync(s => s.Id == dto.VaccineScheduleId.Value && s.Status == "Active");
        }

        // 2. Second priority: match schedule by hospital, matching vaccine name, and date/recurrence
        if (schedule == null)
        {
            var dayName = dto.AppointmentDate.DayOfWeek.ToString();
            var dayShort = dayName[..Math.Min(3, dayName.Length)];

            schedule = await _context.VaccineSchedules
                .FirstOrDefaultAsync(s => (s.HospitalUserId == resolvedHospitalUserId || (hospital.HospitalProfile != null && s.HospitalProfileId == hospital.HospitalProfile.Id)) &&
                                          s.Status == "Active" &&
                                          (s.VaccineName.ToLower() == vName || s.VaccineName.ToLower().Contains(vName)) &&
                                          (s.SpecificDate == dto.AppointmentDate ||
                                           (s.ScheduleType == "Weekly" && s.DaysOfWeek != null &&
                                            (s.DaysOfWeek.Contains(dayName) || s.DaysOfWeek.Contains(dayShort)))));
        }

        // 3. Fallback: match any active schedule for this hospital and vaccine name
        if (schedule == null)
        {
            schedule = await _context.VaccineSchedules
                .FirstOrDefaultAsync(s => (s.HospitalUserId == resolvedHospitalUserId || (hospital.HospitalProfile != null && s.HospitalProfileId == hospital.HospitalProfile.Id)) &&
                                          s.Status == "Active" &&
                                          (s.VaccineName.ToLower() == vName || s.VaccineName.ToLower().Contains(vName)));
        }

        var patientName = patient.PatientProfile?.FullName;
        if (string.IsNullOrWhiteSpace(patientName))
        {
            patientName = patient.Email;
        }

        var hospitalName = hospital.HospitalProfile?.HospitalName ?? "Hospital Center";

        var scheduleFee = schedule?.Price ?? 0.00m;
        var isFree = scheduleFee <= 0;

        string appointmentStatus;
        string paymentMethod;
        string paymentStatus;

        if (isFree)
        {
            appointmentStatus = "Confirmed";
            paymentMethod = "Free";
            paymentStatus = "Paid";
        }
        else
        {
            // Paid appointments require portal card payment (PayHere)
            appointmentStatus = "PendingPayment";
            paymentMethod = "PayHere";
            paymentStatus = "PendingOnline";
        }

        var appointment = new Appointment
        {
            Id = Guid.NewGuid(),
            PatientUserId = patientUserId,
            PatientProfileId = patient.PatientProfile?.Id,
            PatientName = patientName,
            PatientNic = patient.PatientProfile?.NicNumber,
            PatientPhone = patient.PatientProfile?.PhoneNumber ?? patient.PhoneNumber,
            PatientEmail = patient.Email,
            HospitalUserId = resolvedHospitalUserId,
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
            Status = appointmentStatus,
            Fee = isFree ? 0.00m : scheduleFee,
            PaymentMethod = paymentMethod,
            PaymentStatus = paymentStatus,
            Notes = BuildBookingNotes(dto.Notes, schedule?.BoothLabel),
            CreatedAt = DateTime.UtcNow
        };

        _context.Appointments.Add(appointment);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Appointment {AppId} created for Patient {Patient} at {Hospital} on {Date} ({Slot}) - Status: {Status}, Fee: {Fee}, PaymentMethod: {PaymentMethod}",
            appointment.Id, appointment.PatientName, appointment.HospitalName, appointment.AppointmentDate, appointment.TimeSlot, appointment.Status, appointment.Fee, appointment.PaymentMethod);

        // Send booking confirmation email immediately ONLY if appointment is Confirmed (Free)
        // If PayHere, confirmation email is sent ONLY upon successful payment!
        if (appointment.Status == "Confirmed" && !string.IsNullOrWhiteSpace(patient.Email))
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    await _emailService.SendAppointmentBookingConfirmationEmailAsync(
                        patient.Email,
                        appointment.PatientName,
                        appointment.VaccineName,
                        appointment.HospitalName,
                        appointment.AppointmentDate.ToString("dddd, dd MMMM yyyy"),
                        appointment.TimeSlot,
                        appointment.DoctorName,
                        appointment.NurseName,
                        appointment.Notes,
                        appointment.Fee,
                        appointment.PaymentMethod,
                        appointment.PaymentStatus);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send booking confirmation email to {Email} for appointment {AppId}", patient.Email, appointment.Id);
                }
            });
        }

        return MapToDto(appointment);
    }

    public async Task<AppointmentResponseDto> CreateWalkInAppointmentAsync(Guid hospitalUserId, CreateWalkInAppointmentDto dto)
    {
        var hospital = await _context.Users
            .Include(u => u.HospitalProfile)
            .FirstOrDefaultAsync(u => u.Id == hospitalUserId && u.Role == UserRole.HOSPITAL)
            ?? throw new UnauthorizedAccessException("Hospital account not found.");

        var nic = dto.PatientNic.Trim();
        if (string.IsNullOrWhiteSpace(nic))
            throw new InvalidOperationException("Patient NIC is required.");

        var vaccineName = dto.VaccineName.Trim();
        if (string.IsNullOrWhiteSpace(vaccineName))
            throw new InvalidOperationException("Vaccine name is required.");

        var presentedName = (dto.PatientName ?? string.Empty).Trim();

        // Prefer linking a registered patient when NIC matches; otherwise allow guest walk-in.
        var patient = await _context.Users
            .Include(u => u.PatientProfile)
            .FirstOrDefaultAsync(u =>
                u.Role == UserRole.PATIENT &&
                u.PatientProfile != null &&
                u.PatientProfile.NicNumber == nic);

        var isGuest = patient?.PatientProfile == null;
        if (isGuest && string.IsNullOrWhiteSpace(presentedName))
            throw new InvalidOperationException("Patient full name is required for walk-ins without a Vaxora account.");

        var resolvedName = isGuest
            ? presentedName
            : (string.IsNullOrWhiteSpace(presentedName)
                ? patient!.PatientProfile!.FullName
                : presentedName);

        var hospitalNow = DateTime.UtcNow.AddHours(5.5);
        var today = DateOnly.FromDateTime(hospitalNow);
        var start = new TimeOnly(hospitalNow.Hour, hospitalNow.Minute);
        var end = start.AddMinutes(20);
        var timeSlot = $"{FormatTime12h(start)} - {FormatTime12h(end)}";

        // Avoid exact slot collisions for concurrent walk-ins.
        while (await _context.Appointments.AnyAsync(a =>
                   a.HospitalUserId == hospital.Id &&
                   a.AppointmentDate == today &&
                   a.TimeSlot == timeSlot &&
                   a.Status != "Cancelled"))
        {
            start = start.AddMinutes(1);
            end = start.AddMinutes(20);
            timeSlot = $"{FormatTime12h(start)} - {FormatTime12h(end)}";
        }

        var vName = vaccineName.ToLowerInvariant();
        var schedule = await _context.VaccineSchedules
            .FirstOrDefaultAsync(s =>
                s.Status == "Active" &&
                (s.HospitalUserId == hospital.Id ||
                 (hospital.HospitalProfile != null && s.HospitalProfileId == hospital.HospitalProfile.Id)) &&
                (s.VaccineName.ToLower() == vName || s.VaccineName.ToLower().Contains(vName)));

        var noteParts = new List<string>
        {
            isGuest ? "Walk-in registration (guest — no Vaxora account)" : "Walk-in registration"
        };
        if (!string.IsNullOrWhiteSpace(dto.Dose)) noteParts.Add($"Dose: {dto.Dose.Trim()}");
        if (!string.IsNullOrWhiteSpace(dto.BoothLabel)) noteParts.Add($"Booth: {dto.BoothLabel.Trim()}");
        if (dto.Age.HasValue) noteParts.Add($"Age: {dto.Age.Value}");
        if (!string.IsNullOrWhiteSpace(dto.Gender)) noteParts.Add($"Gender: {dto.Gender.Trim()}");
        if (!isGuest &&
            !string.IsNullOrWhiteSpace(presentedName) &&
            !string.Equals(presentedName, patient!.PatientProfile!.FullName, StringComparison.OrdinalIgnoreCase))
        {
            noteParts.Add($"Presented as: {presentedName}");
        }

        var appointment = new Appointment
        {
            Id = Guid.NewGuid(),
            PatientUserId = isGuest ? null : patient!.Id,
            PatientProfileId = isGuest ? null : patient!.PatientProfile!.Id,
            PatientName = resolvedName,
            PatientNic = isGuest ? nic : patient!.PatientProfile!.NicNumber,
            PatientPhone = isGuest ? null : (patient!.PatientProfile!.PhoneNumber ?? patient.PhoneNumber),
            PatientEmail = isGuest ? null : patient!.Email,
            HospitalUserId = hospital.Id,
            HospitalProfileId = hospital.HospitalProfile?.Id,
            HospitalName = hospital.HospitalProfile?.HospitalName ?? "Hospital Center",
            VaccineScheduleId = schedule?.Id,
            VaccineId = schedule?.VaccineId,
            VaccineName = vaccineName,
            DoctorUserId = schedule?.DoctorUserId,
            DoctorName = schedule?.DoctorName,
            NurseUserId = schedule?.NurseUserId,
            NurseName = schedule?.NurseName,
            AppointmentDate = today,
            TimeSlot = timeSlot,
            StartTime = start.ToString("HH:mm"),
            EndTime = end.ToString("HH:mm"),
            Status = "Confirmed",
            Fee = 0.00m,
            PaymentMethod = "WalkIn",
            PaymentStatus = "Paid",
            Notes = string.Join(" · ", noteParts),
            PrescribedDosage = string.IsNullOrWhiteSpace(dto.Dose) ? null : dto.Dose.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.Appointments.Add(appointment);
        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Walk-in appointment {AppId} created for {Patient} (NIC {Nic}, guest={IsGuest}) at hospital {Hospital}",
            appointment.Id, appointment.PatientName, nic, isGuest, appointment.HospitalName);

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

    public async Task<List<AppointmentResponseDto>> GetStaffHospitalAppointmentsAsync(
        Guid staffUserId,
        Guid hospitalUserId,
        DateOnly? date = null)
    {
        var staff = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == staffUserId);
        if (staff == null || staff.Role is not (UserRole.DOCTOR or UserRole.NURSE))
            throw new UnauthorizedAccessException("Only doctors or nurses can view staff hospital appointments.");

        if (staff.Status != UserStatus.Active)
            throw new InvalidOperationException("Staff account must be Active.");

        var isAffiliated = await _context.StaffAffiliations.AsNoTracking().AnyAsync(a =>
            a.StaffUserId == staffUserId &&
            a.HospitalUserId == hospitalUserId &&
            a.Status == AffiliationStatus.Active);

        if (!isAffiliated)
            throw new UnauthorizedAccessException("You are not affiliated with this hospital.");

        var query = _context.Appointments
            .AsNoTracking()
            .Where(a =>
                a.HospitalUserId == hospitalUserId &&
                a.Status != "Cancelled" &&
                a.Status != "Rejected");

        if (date.HasValue)
            query = query.Where(a => a.AppointmentDate == date.Value);

        var appointments = await query
            .OrderBy(a => a.AppointmentDate)
            .ThenBy(a => a.StartTime)
            .ThenBy(a => a.CreatedAt)
            .ToListAsync();

        return appointments.Select(MapToDto).ToList();
    }

    public async Task<AppointmentResponseDto> UpdateAppointmentStatusAsync(Guid actorUserId, Guid appointmentId, UpdateAppointmentStatusDto dto)
    {
        var appointment = await _context.Appointments
            .FirstOrDefaultAsync(a => a.Id == appointmentId);

        if (appointment == null)
            throw new KeyNotFoundException("Appointment record not found.");

        var isHospitalOwner = appointment.HospitalUserId == actorUserId;
        if (!isHospitalOwner)
        {
            var actor = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == actorUserId);
            if (actor == null || actor.Role is not (UserRole.DOCTOR or UserRole.NURSE))
                throw new UnauthorizedAccessException("Only the hospital or affiliated clinical staff can update this appointment.");

            if (actor.Status != UserStatus.Active)
                throw new InvalidOperationException("Staff account must be Active.");

            var isAffiliated = await _context.StaffAffiliations.AsNoTracking().AnyAsync(a =>
                a.StaffUserId == actorUserId &&
                a.HospitalUserId == appointment.HospitalUserId &&
                a.Status == AffiliationStatus.Active);

            if (!isAffiliated)
                throw new UnauthorizedAccessException("You are not affiliated with this hospital.");
        }

        var requestedStatus = (dto.Status ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(requestedStatus))
            throw new InvalidOperationException("Status is required.");

        if (!AllowedStatusTransitions.TryGetValue(requestedStatus, out var nextStatus))
        {
            throw new InvalidOperationException(
                $"Unsupported status '{requestedStatus}'. Allowed values: {string.Join(", ", AllowedStatusTransitions.Values.Distinct())}.");
        }

        if (string.Equals(appointment.Status, "Cancelled", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(appointment.Status, "Rejected", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Cannot update status for cancelled or rejected appointments.");
        }

        // Clinical session transitions are doctor/nurse only — hospital can monitor, not administer.
        if (OnDutyRequiredStatuses.Contains(nextStatus))
        {
            if (isHospitalOwner)
            {
                throw new UnauthorizedAccessException(
                    "Clinical status changes (Administering, Observation, Completed) must be performed by on-duty clinical staff.");
            }

            await StaffDutyHelper.EnsureStaffOnDutyAsync(
                _context,
                actorUserId,
                appointment.HospitalUserId);
        }

        // Dose/session transitions require settled payment (free bookings are Paid at create).
        if (OnDutyRequiredStatuses.Contains(nextStatus) &&
            !string.Equals(appointment.PaymentStatus, "Paid", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Payment must be settled before clinical administration.");
        }

        var previousStatus = appointment.Status;
        appointment.Status = nextStatus;
        appointment.UpdatedAt = DateTime.UtcNow;

        // Hospital desk: confirming a PendingPayment booking records payment as settled.
        if (isHospitalOwner &&
            string.Equals(nextStatus, "Confirmed", StringComparison.OrdinalIgnoreCase) &&
            string.Equals(previousStatus, "PendingPayment", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(appointment.PaymentStatus, "Paid", StringComparison.OrdinalIgnoreCase))
        {
            appointment.PaymentStatus = "Paid";
            if (string.IsNullOrWhiteSpace(appointment.PaymentMethod) ||
                string.Equals(appointment.PaymentMethod, "PayHere", StringComparison.OrdinalIgnoreCase))
            {
                appointment.PaymentMethod = "Hospital";
            }
        }

        var doseIsBeingGiven =
            (nextStatus is "Observation" or "Completed") &&
            !string.Equals(previousStatus, "Observation", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(previousStatus, "Completed", StringComparison.OrdinalIgnoreCase);

        if (doseIsBeingGiven)
        {
            await ConsumeVialForAppointmentAsync(actorUserId, appointment);
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "User {ActorId} updated appointment {AppId} status to {Status}",
            actorUserId, appointmentId, appointment.Status);

        return MapToDto(appointment);
    }

    public Task<bool> CancelAppointmentAsync(Guid userId, Guid appointmentId, bool isHospital = false)
        => CancelAppointmentAsync(userId, appointmentId.ToString(), isHospital);

    public async Task<bool> CancelAppointmentAsync(Guid userId, string idOrRef, bool isHospital = false)
    {
        Guid.TryParse(idOrRef, out var parsedGuid);

        Appointment? appointment = null;
        if (parsedGuid != Guid.Empty)
        {
            appointment = await _context.Appointments
                .FirstOrDefaultAsync(a => a.Id == parsedGuid &&
                                          (isHospital ? a.HospitalUserId == userId : a.PatientUserId == userId));
        }

        // If not found by Guid directly, search user's appointments matching prefix or short id
        if (appointment == null && !string.IsNullOrWhiteSpace(idOrRef))
        {
            var userAppointments = await _context.Appointments
                .Where(a => isHospital ? a.HospitalUserId == userId : a.PatientUserId == userId)
                .ToListAsync();

            var cleanRef = idOrRef.Trim();
            appointment = userAppointments.FirstOrDefault(a =>
            {
                var idStr = a.Id.ToString();
                var shortId = idStr.Length >= 8 ? idStr.Substring(0, 8) : idStr;
                var vaxRef = $"VAX-{shortId}";
                return idStr.Equals(cleanRef, StringComparison.OrdinalIgnoreCase) ||
                       idStr.StartsWith(cleanRef, StringComparison.OrdinalIgnoreCase) ||
                       vaxRef.Equals(cleanRef, StringComparison.OrdinalIgnoreCase) ||
                       cleanRef.Contains(shortId, StringComparison.OrdinalIgnoreCase) ||
                       (!string.IsNullOrEmpty(a.VaccineName) && cleanRef.Contains(a.VaccineName, StringComparison.OrdinalIgnoreCase)) ||
                       (!string.IsNullOrEmpty(cleanRef) && cleanRef.Length >= 4 && idStr.StartsWith(cleanRef[^4..], StringComparison.OrdinalIgnoreCase));
            });
        }

        if (appointment == null)
        {
            throw new KeyNotFoundException("Appointment not found or unauthorized to cancel.");
        }

        if (appointment.Status == "Cancelled")
        {
            return true; // Already cancelled
        }

        // Rule: Patients cannot cancel past appointments if already completed
        if (!isHospital)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            if (appointment.Status == "Completed")
            {
                throw new InvalidOperationException("Completed vaccination appointments cannot be cancelled.");
            }
        }

        appointment.Status = "Cancelled";
        appointment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Cancelled appointment {AppId} by {Actor} {UserId}. Slot {Slot} on {Date} is now released.",
            appointment.Id, isHospital ? "Hospital" : "Patient", userId, appointment.TimeSlot, appointment.AppointmentDate);

        // Asynchronously send cancellation email to patient
        if (!string.IsNullOrWhiteSpace(appointment.PatientEmail))
        {
            var cancelledByText = isHospital ? $"Hospital ({appointment.HospitalName})" : "Patient (Self-Service)";
            _ = Task.Run(async () =>
            {
                try
                {
                    await _emailService.SendAppointmentCancellationEmailAsync(
                        appointment.PatientEmail,
                        appointment.PatientName,
                        appointment.VaccineName,
                        appointment.HospitalName,
                        appointment.AppointmentDate.ToString("dddd, dd MMMM yyyy"),
                        appointment.TimeSlot,
                        cancelledByText);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send cancellation email to {Email} for appointment {AppId}", appointment.PatientEmail, appointment.Id);
                }
            });
        }

        return true;
    }

    public async Task<AppointmentResponseDto> ConfirmPayHerePaymentAsync(Guid appointmentId, string transactionId, string? orderId = null)
    {
        var appointment = await _context.Appointments
            .FirstOrDefaultAsync(a => a.Id == appointmentId);

        if (appointment == null)
        {
            throw new KeyNotFoundException($"Appointment {appointmentId} not found.");
        }

        if (appointment.PaymentStatus == "Paid" && appointment.Status == "Confirmed")
        {
            _logger.LogInformation("Appointment {AppId} is already paid and confirmed.", appointmentId);
            return MapToDto(appointment);
        }

        appointment.Status = "Confirmed";
        appointment.PaymentStatus = "Paid";
        appointment.PaymentTransactionId = transactionId;
        appointment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Confirmed PayHere payment for Appointment {AppId} (Tx: {TxId}, Order: {OrderId})",
            appointment.Id, transactionId, orderId ?? "N/A");

        var resolvedOrderId = !string.IsNullOrWhiteSpace(orderId)
            ? orderId
            : $"APT-{appointment.Id.ToString("N")[..12].ToUpperInvariant()}";

        // Asynchronously dispatch BOTH emails:
        // 1. Booking Confirmation Email
        // 2. Transaction Payment Receipt Email
        if (!string.IsNullOrWhiteSpace(appointment.PatientEmail))
        {
            var patientEmail = appointment.PatientEmail;
            var patientName = appointment.PatientName;
            var vaccineName = appointment.VaccineName;
            var hospitalName = appointment.HospitalName;
            var appointmentDate = appointment.AppointmentDate.ToString("dddd, dd MMMM yyyy");
            var timeSlot = appointment.TimeSlot;
            var doctorName = appointment.DoctorName;
            var nurseName = appointment.NurseName;
            var notes = appointment.Notes;
            var fee = appointment.Fee;
            var payMethod = appointment.PaymentMethod;
            var payStatus = appointment.PaymentStatus;
            var txId = transactionId;
            var ordId = resolvedOrderId;
            var paymentTime = DateTime.UtcNow;

            _ = Task.Run(async () =>
            {
                try
                {
                    // Email 1: Booking Confirmation Email
                    await _emailService.SendAppointmentBookingConfirmationEmailAsync(
                        patientEmail,
                        patientName,
                        vaccineName,
                        hospitalName,
                        appointmentDate,
                        timeSlot,
                        doctorName,
                        nurseName,
                        notes,
                        fee,
                        payMethod,
                        payStatus);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send booking confirmation email after payment to {Email} for appointment {AppId}", patientEmail, appointmentId);
                }

                try
                {
                    // Email 2: Payment Receipt Email
                    await _emailService.SendPaymentReceiptEmailAsync(
                        patientEmail,
                        patientName,
                        vaccineName,
                        hospitalName,
                        appointmentDate,
                        timeSlot,
                        fee,
                        "LKR",
                        txId,
                        ordId,
                        paymentTime);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send payment receipt email to {Email} for appointment {AppId}", patientEmail, appointmentId);
                }
            });
        }

        return MapToDto(appointment);
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

    private static string? BuildBookingNotes(string? notes, string? boothLabel)
    {
        var parts = new List<string>();
        if (!string.IsNullOrWhiteSpace(notes))
            parts.Add(notes.Trim());
        if (!string.IsNullOrWhiteSpace(boothLabel))
            parts.Add($"Booth: {boothLabel.Trim()}");
        return parts.Count == 0 ? null : string.Join("\n", parts);
    }

    private static string? ExtractBoothFromNotes(string? notes)
    {
        if (string.IsNullOrWhiteSpace(notes)) return null;
        const string marker = "Booth:";
        var idx = notes.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (idx < 0) return null;
        var rest = notes[(idx + marker.Length)..].Trim();
        var endLine = rest.IndexOfAny(['\r', '\n']);
        if (endLine >= 0) rest = rest[..endLine].Trim();
        return rest;
    }

    private async Task ConsumeVialForAppointmentAsync(Guid actorUserId, Appointment appointment)
    {
        var appointmentKey = appointment.Id.ToString();
        var alreadyIssued = await _context.InventoryTransactions.AnyAsync(t =>
            t.Type == TransactionType.Issue &&
            t.Reason != null &&
            t.Reason.Contains(appointmentKey));

        if (alreadyIssued)
            return;

        var hospital = await _context.HospitalProfiles
            .FirstOrDefaultAsync(h =>
                h.UserId == appointment.HospitalUserId ||
                (appointment.HospitalProfileId.HasValue && h.Id == appointment.HospitalProfileId.Value));

        if (hospital == null)
        {
            throw new InvalidOperationException(
                "Cannot record this dose: the hospital inventory profile was not found.");
        }

        Vaccine? vaccine = null;
        if (appointment.VaccineId.HasValue)
        {
            vaccine = await _context.Vaccines.FirstOrDefaultAsync(v => v.Id == appointment.VaccineId.Value);
        }

        if (vaccine == null && !string.IsNullOrWhiteSpace(appointment.VaccineName))
        {
            var name = appointment.VaccineName.Trim().ToLower();
            vaccine = await _context.Vaccines.FirstOrDefaultAsync(v => v.Name.ToLower() == name)
                ?? await _context.Vaccines.FirstOrDefaultAsync(v => v.Name.ToLower().Contains(name));
        }

        if (vaccine == null)
        {
            throw new InvalidOperationException(
                $"Cannot record this dose: no inventory product matches '{appointment.VaccineName}'.");
        }

        var now = DateTime.UtcNow;
        var batch = await _context.Batches
            .Include(b => b.Vaccine)
            .Where(b =>
                b.HospitalProfileId == hospital.Id &&
                b.VaccineId == vaccine.Id &&
                b.Status == BatchStatus.Active &&
                b.ExpiryDate >= now &&
                ((b.OpenVialDosesRemaining ?? 0) > 0 || b.QuantityAvailable > 0))
            .OrderByDescending(b => (b.OpenVialDosesRemaining ?? 0) > 0)
            .ThenBy(b => b.ExpiryDate)
            .ThenBy(b => b.CreatedAt)
            .FirstOrDefaultAsync();

        if (batch == null)
        {
            throw new InvalidOperationException(
                $"No usable {vaccine.Name} stock at this hospital. Restock a batch before completing the dose.");
        }

        var actor = await _context.Users
            .AsNoTracking()
            .Include(u => u.DoctorProfile)
            .Include(u => u.NurseProfile)
            .Include(u => u.HospitalProfile)
            .FirstOrDefaultAsync(u => u.Id == actorUserId);

        var actorName = actor?.DoctorProfile?.FullName is { Length: > 0 } docName ? $"Dr. {docName}"
            : actor?.NurseProfile?.FullName is { Length: > 0 } nurseName ? $"Nurse {nurseName}"
            : actor?.HospitalProfile?.HospitalName
            ?? actor?.Email
            ?? "Clinical staff";

        InventoryDoseHelper.ConsumeOneDose(batch, vaccine);

        _context.InventoryTransactions.Add(new InventoryTransaction
        {
            BatchId = batch.Id,
            Type = TransactionType.Issue,
            Quantity = 1,
            Reason = $"Administered 1 dose of {vaccine.Name} for appointment {appointment.Id}",
            PerformedByUserId = actorUserId,
            PerformedByName = actorName
        });

        _context.AuditLogs.Add(new AuditLog
        {
            UserId = actorUserId,
            UserEmail = actor?.Email,
            Role = actor?.Role.ToString() ?? "STAFF",
            Action = "INVENTORY_ISSUE",
            Details =
                $"Issued 1 dose of {vaccine.Name} (Lot {batch.BatchNumber}, {InventoryDoseHelper.ResolveDosesPerVial(vaccine)} doses/vial) for appointment {appointment.Id}",
            Timestamp = DateTime.UtcNow
        });

        if (appointment.PatientProfileId is Guid patientProfileId)
        {
            var patientExists = await _context.PatientProfiles.AnyAsync(p => p.Id == patientProfileId);
            if (patientExists)
            {
                var priorDoses = await _context.PatientVaccinationRecords.CountAsync(r =>
                    r.PatientProfileId == patientProfileId && r.VaccineId == vaccine.Id);

                _context.PatientVaccinationRecords.Add(new PatientVaccinationRecord
                {
                    PatientProfileId = patientProfileId,
                    VaccineId = vaccine.Id,
                    BatchId = batch.Id,
                    AdministeredByUserId = actorUserId,
                    AdministeredByName = actorName,
                    AdministeredAt = DateTime.UtcNow,
                    DoseNumber = priorDoses + 1,
                    Route = VaccineRoute.Intramuscular,
                    LotNumber = batch.BatchNumber,
                    Notes = $"Linked to appointment {appointment.Id}"
                });
            }
        }
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
            Fee = a.Fee,
            PaymentMethod = a.PaymentMethod,
            PaymentStatus = a.PaymentStatus,
            PaymentTransactionId = a.PaymentTransactionId,
            Notes = a.Notes,
            BoothLabel = ExtractBoothFromNotes(a.Notes),
            PrescribedDosage = a.PrescribedDosage,
            PrescribedByDoctorUserId = a.PrescribedByDoctorUserId,
            PrescribedByDoctorName = a.PrescribedByDoctorName,
            DosageUpdatedAt = a.DosageUpdatedAt,
            CreatedAt = a.CreatedAt,
            UpdatedAt = a.UpdatedAt
        };
    }
}
