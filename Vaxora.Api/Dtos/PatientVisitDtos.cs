using System.ComponentModel.DataAnnotations;

namespace Vaxora.Api.Dtos;

// ==================== RESPONSE DTOs ====================

public class PatientVisitDto
{
    public Guid Id { get; set; }
    public Guid PatientProfileId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string PatientNic { get; set; } = string.Empty;

    public Guid? DoctorUserId { get; set; }
    public string? DoctorName { get; set; }

    public Guid? NurseUserId { get; set; }
    public string? NurseName { get; set; }

    public Guid? HospitalProfileId { get; set; }
    public string? HospitalName { get; set; }

    public Guid? AppointmentId { get; set; }

    public DateTime VisitDate { get; set; }
    public string VisitType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;

    public string? ChiefComplaint { get; set; }

    public string? BloodPressure { get; set; }
    public string? Temperature { get; set; }
    public string? WeightKg { get; set; }
    public string? HeightCm { get; set; }
    public string? HeartRate { get; set; }
    public string? OxygenSaturation { get; set; }

    public string? DiagnosisSummary { get; set; }
    public string? TreatmentPlan { get; set; }
    public string? Notes { get; set; }

    public DateTime? FollowUpDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class PatientVisitTimelineDto
{
    public Guid PatientProfileId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string NicNumber { get; set; } = string.Empty;
    public int TotalVisits { get; set; }
    public DateTime? LastVisitDate { get; set; }
    public DateTime? NextFollowUpDate { get; set; }
    public List<PatientVisitDto> Visits { get; set; } = new();
}

public class PatientVisitSummaryDto
{
    public Guid VisitId { get; set; }
    public DateTime VisitDate { get; set; }
    public string VisitType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string PatientNic { get; set; } = string.Empty;
    public string? PatientPhone { get; set; }
    public string? DoctorName { get; set; }
    public string? HospitalName { get; set; }
    public string? ChiefComplaint { get; set; }
    public string? VitalsSummary { get; set; }
    public string? DiagnosisSummary { get; set; }
    public string? TreatmentPlan { get; set; }
    public DateTime? FollowUpDate { get; set; }
    public int AgeYears { get; set; }
}

// ==================== REQUEST DTOs ====================

public class CreatePatientVisitDto
{
    [Required]
    public string VisitType { get; set; } = "Checkup";

    public string? Status { get; set; }

    public Guid? DoctorUserId { get; set; }
    public Guid? NurseUserId { get; set; }
    public Guid? HospitalProfileId { get; set; }
    public Guid? AppointmentId { get; set; }

    public DateTime? VisitDate { get; set; }

    [MaxLength(1000)]
    public string? ChiefComplaint { get; set; }

    [MaxLength(20)] public string? BloodPressure { get; set; }
    [MaxLength(10)] public string? Temperature { get; set; }
    [MaxLength(10)] public string? WeightKg { get; set; }
    [MaxLength(10)] public string? HeightCm { get; set; }
    [MaxLength(10)] public string? HeartRate { get; set; }
    [MaxLength(10)] public string? OxygenSaturation { get; set; }

    [MaxLength(2000)]
    public string? DiagnosisSummary { get; set; }

    [MaxLength(2000)]
    public string? TreatmentPlan { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }

    public DateTime? FollowUpDate { get; set; }
}

public class UpdatePatientVisitDto
{
    [Required]
    public string VisitType { get; set; } = "Checkup";

    [Required]
    public string Status { get; set; } = "Completed";

    [MaxLength(1000)]
    public string? ChiefComplaint { get; set; }

    [MaxLength(20)] public string? BloodPressure { get; set; }
    [MaxLength(10)] public string? Temperature { get; set; }
    [MaxLength(10)] public string? WeightKg { get; set; }
    [MaxLength(10)] public string? HeightCm { get; set; }
    [MaxLength(10)] public string? HeartRate { get; set; }
    [MaxLength(10)] public string? OxygenSaturation { get; set; }

    [MaxLength(2000)]
    public string? DiagnosisSummary { get; set; }

    [MaxLength(2000)]
    public string? TreatmentPlan { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }

    public DateTime? FollowUpDate { get; set; }
}
