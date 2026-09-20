using System.ComponentModel.DataAnnotations;

namespace Vaxora.Api.Dtos;

public class ClinicalPatientSearchResultDto
{
    public Guid PatientProfileId { get; set; }
    public Guid PatientUserId { get; set; }
    public string VaxoraId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Nic { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
}

public class ClinicalVaccinationHistoryItemDto
{
    public Guid Id { get; set; }
    public string Vaccine { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Status { get; set; } = "Completed";
    public int DoseNumber { get; set; }
}

public class ClinicalPendingVaccineDto
{
    public Guid Id { get; set; }
    public string Vaccine { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string? Dosage { get; set; }
    public string? PrescribedBy { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class ClinicalPatientDetailDto
{
    public Guid PatientProfileId { get; set; }
    public Guid PatientUserId { get; set; }
    public string VaxoraId { get; set; } = string.Empty;
    public string Nic { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public List<ClinicalVaccinationHistoryItemDto> VaccinationHistory { get; set; } = new();
    public List<ClinicalPendingVaccineDto> PendingVaccines { get; set; } = new();
}

public class ClinicalRecentUpdateDto
{
    public Guid AppointmentId { get; set; }
    public string VaxoraId { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string Vaccine { get; set; } = string.Empty;
    public string? Dosage { get; set; }
    public string? PrescribedBy { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string RelativeTime { get; set; } = string.Empty;
}

public class UpdatePrescribedDosageDto
{
    [Required]
    [MaxLength(100)]
    public string Dosage { get; set; } = string.Empty;
}
