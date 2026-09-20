using Microsoft.EntityFrameworkCore;
using Vaxora.Api.Data;
using Vaxora.Api.Dtos;
using Vaxora.Api.Models;

namespace Vaxora.Api.Services;

public interface IClinicalPatientService
{
    Task<List<ClinicalPatientSearchResultDto>> SearchPatientsAsync(string query, int limit = 10);
    Task<ClinicalPatientDetailDto> GetPatientByVaxoraIdAsync(string vaxoraId);
    Task<List<ClinicalRecentUpdateDto>> GetRecentDosageUpdatesAsync(int limit = 10);
    Task<ClinicalPendingVaccineDto> UpdatePrescribedDosageAsync(Guid doctorUserId, Guid appointmentId, UpdatePrescribedDosageDto dto);
}

public class ClinicalPatientService : IClinicalPatientService
{
    private static readonly HashSet<string> PendingStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "Confirmed",
        "PendingPayment"
    };

    private readonly ApplicationDbContext _context;
    private readonly ILogger<ClinicalPatientService> _logger;

    public ClinicalPatientService(ApplicationDbContext context, ILogger<ClinicalPatientService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<ClinicalPatientSearchResultDto>> SearchPatientsAsync(string query, int limit = 10)
    {
        var term = query?.Trim() ?? string.Empty;
        if (term.Length < 2)
            return new List<ClinicalPatientSearchResultDto>();

        limit = Math.Clamp(limit, 1, 20);
        var like = $"%{term}%";

        var patients = await _context.PatientProfiles
            .AsNoTracking()
            .Include(p => p.User)
            .Where(p =>
                p.User.Status == UserStatus.Active &&
                p.User.Role == UserRole.PATIENT &&
                (
                    (p.User.RegistrationNumber != null && EF.Functions.ILike(p.User.RegistrationNumber, like)) ||
                    EF.Functions.ILike(p.FullName, like) ||
                    EF.Functions.ILike(p.NicNumber, like) ||
                    EF.Functions.ILike(p.User.Email, like)
                ))
            .OrderBy(p => p.FullName)
            .Take(limit)
            .ToListAsync();

        return patients.Select(p => new ClinicalPatientSearchResultDto
        {
            PatientProfileId = p.Id,
            PatientUserId = p.UserId,
            VaxoraId = p.User.RegistrationNumber ?? string.Empty,
            Name = p.FullName,
            Nic = p.NicNumber,
            Email = p.User.Email,
            Phone = p.PhoneNumber ?? p.User.PhoneNumber
        }).ToList();
    }

    public async Task<ClinicalPatientDetailDto> GetPatientByVaxoraIdAsync(string vaxoraId)
    {
        var reg = (vaxoraId ?? string.Empty).Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(reg))
            throw new InvalidOperationException("Vaxora ID is required.");

        var patient = await _context.PatientProfiles
            .AsNoTracking()
            .Include(p => p.User)
            .FirstOrDefaultAsync(p =>
                p.User.RegistrationNumber != null &&
                p.User.RegistrationNumber.ToUpper() == reg)
            ?? throw new KeyNotFoundException("No patient found with that Vaxora ID.");

        if (patient.User.Role != UserRole.PATIENT)
            throw new InvalidOperationException("The provided Vaxora ID does not belong to a patient.");

        var history = await _context.PatientVaccinationRecords
            .AsNoTracking()
            .Include(r => r.Vaccine)
            .Where(r => r.PatientProfileId == patient.Id)
            .OrderByDescending(r => r.AdministeredAt)
            .ToListAsync();

        var pendingAppointments = await _context.Appointments
            .AsNoTracking()
            .Where(a =>
                a.PatientUserId == patient.UserId &&
                PendingStatuses.Contains(a.Status))
            .OrderBy(a => a.AppointmentDate)
            .ThenBy(a => a.StartTime)
            .ToListAsync();

        return new ClinicalPatientDetailDto
        {
            PatientProfileId = patient.Id,
            PatientUserId = patient.UserId,
            VaxoraId = patient.User.RegistrationNumber ?? string.Empty,
            Nic = patient.NicNumber,
            Name = patient.FullName,
            Email = patient.User.Email,
            Phone = patient.PhoneNumber ?? patient.User.PhoneNumber,
            VaccinationHistory = history.Select(r => new ClinicalVaccinationHistoryItemDto
            {
                Id = r.Id,
                Vaccine = r.Vaccine?.Name ?? "Unknown",
                Date = r.AdministeredAt.ToString("yyyy-MM-dd"),
                Location = r.AdministeredByName ?? "Recorded clinic",
                Status = "Completed",
                DoseNumber = r.DoseNumber
            }).ToList(),
            PendingVaccines = pendingAppointments.Select(MapPending).ToList()
        };
    }

    public async Task<List<ClinicalRecentUpdateDto>> GetRecentDosageUpdatesAsync(int limit = 10)
    {
        limit = Math.Clamp(limit, 1, 20);

        var updates = await _context.Appointments
            .AsNoTracking()
            .Include(a => a.PatientUser)
            .Where(a => a.DosageUpdatedAt != null && !string.IsNullOrWhiteSpace(a.PrescribedDosage))
            .OrderByDescending(a => a.DosageUpdatedAt)
            .Take(limit)
            .ToListAsync();

        return updates.Select(a => new ClinicalRecentUpdateDto
        {
            AppointmentId = a.Id,
            VaxoraId = a.PatientUser?.RegistrationNumber ?? string.Empty,
            PatientName = a.PatientName,
            Vaccine = a.VaccineName,
            Dosage = a.PrescribedDosage,
            PrescribedBy = a.PrescribedByDoctorName,
            UpdatedAt = a.DosageUpdatedAt!.Value,
            RelativeTime = ToRelativeTime(a.DosageUpdatedAt.Value)
        }).ToList();
    }

    public async Task<ClinicalPendingVaccineDto> UpdatePrescribedDosageAsync(
        Guid doctorUserId,
        Guid appointmentId,
        UpdatePrescribedDosageDto dto)
    {
        var dosage = (dto.Dosage ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(dosage))
            throw new InvalidOperationException("Dosage is required.");

        if (dosage.Length > 100)
            throw new InvalidOperationException("Dosage cannot exceed 100 characters.");

        var doctor = await _context.Users
            .Include(u => u.DoctorProfile)
            .FirstOrDefaultAsync(u => u.Id == doctorUserId);

        if (doctor == null || doctor.Role != UserRole.DOCTOR)
            throw new UnauthorizedAccessException("Only doctors can prescribe dosage.");

        if (doctor.Status != UserStatus.Active)
            throw new InvalidOperationException("Doctor account must be Active.");

        var appointment = await _context.Appointments
            .FirstOrDefaultAsync(a => a.Id == appointmentId)
            ?? throw new KeyNotFoundException("Appointment not found.");

        if (string.Equals(appointment.Status, "Completed", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(appointment.Status, "Cancelled", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(appointment.Status, "Rejected", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Cannot edit dosage for completed, cancelled, or rejected appointments.");
        }

        var doctorName = doctor.DoctorProfile?.FullName is { Length: > 0 } name
            ? $"Dr. {name}"
            : doctor.Email;

        appointment.PrescribedDosage = dosage;
        appointment.PrescribedByDoctorUserId = doctorUserId;
        appointment.PrescribedByDoctorName = doctorName;
        appointment.DosageUpdatedAt = DateTime.UtcNow;
        appointment.UpdatedAt = DateTime.UtcNow;
        appointment.DoctorUserId ??= doctorUserId;
        appointment.DoctorName ??= doctorName;

        _context.AuditLogs.Add(new AuditLog
        {
            UserId = doctorUserId,
            UserEmail = doctor.Email,
            Role = "DOCTOR",
            Action = "DOSAGE_PRESCRIBED",
            Details = $"Doctor set dosage '{dosage}' for appointment {appointment.Id} ({appointment.VaccineName}) patient {appointment.PatientName}",
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
        _logger.LogInformation(
            "Doctor {DoctorId} prescribed dosage '{Dosage}' on appointment {AppointmentId}",
            doctorUserId, dosage, appointmentId);

        return MapPending(appointment);
    }

    private static ClinicalPendingVaccineDto MapPending(Appointment a) => new()
    {
        Id = a.Id,
        Vaccine = a.VaccineName,
        Date = a.AppointmentDate.ToString("yyyy-MM-dd"),
        Time = a.TimeSlot,
        Location = a.HospitalName,
        Dosage = a.PrescribedDosage,
        PrescribedBy = a.PrescribedByDoctorName,
        Status = a.Status
    };

    private static string ToRelativeTime(DateTime utc)
    {
        var span = DateTime.UtcNow - utc;
        if (span.TotalMinutes < 1) return "Just now";
        if (span.TotalMinutes < 60) return $"{(int)span.TotalMinutes} min ago";
        if (span.TotalHours < 24) return $"{(int)span.TotalHours} hour{(span.TotalHours >= 2 ? "s" : "")} ago";
        if (span.TotalDays < 7) return $"{(int)span.TotalDays} day{(span.TotalDays >= 2 ? "s" : "")} ago";
        return utc.ToString("yyyy-MM-dd");
    }
}
