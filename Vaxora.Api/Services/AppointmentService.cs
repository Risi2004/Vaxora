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
    Task<List<AppointmentResponseDto>> GetStaffHospitalAppointmentsAsync(Guid staffUserId, Guid hospitalUserId, DateOnly? date = null);
    Task<AppointmentResponseDto> UpdateAppointmentStatusAsync(Guid hospitalUserId, Guid appointmentId, UpdateAppointmentStatusDto dto);
    Task<bool> CancelAppointmentAsync(Guid userId, string idOrRef, bool isHospital = false);
    Task<bool> CancelAppointmentAsync(Guid userId, Guid appointmentId, bool isHospital = false);
    Task<AppointmentResponseDto> ConfirmPayHerePaymentAsync(Guid appointmentId, string transactionId, string? orderId = null);
}

public class AppointmentService : IAppointmentService
{
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
                        DisplayText = $"{date:yyyy-MM-dd} ({dayName}) - {formattedTime} (Dr. {schedule.DoctorName})",
                        DoctorName = schedule.DoctorName,
                        NurseName = schedule.NurseName,
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
                            DisplayText = $"{cur:yyyy-MM-dd} ({dayName}) - {formattedTime} (Dr. {schedule.DoctorName})",
                            DoctorName = schedule.DoctorName,
                            NurseName = schedule.NurseName,
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
            Notes = dto.Notes?.Trim(),
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

            appointment = userAppointments.FirstOrDefault(a =>
                a.Id.ToString().Equals(idOrRef, StringComparison.OrdinalIgnoreCase) ||
                a.Id.ToString().StartsWith(idOrRef, StringComparison.OrdinalIgnoreCase) ||
                (!string.IsNullOrEmpty(idOrRef) && idOrRef.Length >= 4 && a.Id.ToString().StartsWith(idOrRef[^4..], StringComparison.OrdinalIgnoreCase)));
        }

        if (appointment == null)
        {
            throw new KeyNotFoundException("Appointment not found or unauthorized to cancel.");
        }

        if (appointment.Status == "Cancelled")
        {
            return true; // Already cancelled
        }

        // Rule: Patients cannot cancel past appointments (unless unpaid pending)
        if (!isHospital)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            if (appointment.AppointmentDate < today && appointment.Status != "PendingPayment")
            {
                throw new InvalidOperationException("Past appointments cannot be cancelled.");
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
            PrescribedDosage = a.PrescribedDosage,
            PrescribedByDoctorUserId = a.PrescribedByDoctorUserId,
            PrescribedByDoctorName = a.PrescribedByDoctorName,
            DosageUpdatedAt = a.DosageUpdatedAt,
            CreatedAt = a.CreatedAt
        };
    }
}
