using System.ComponentModel.DataAnnotations;

namespace Vaxora.Api.Dtos;

// ==================== RESPONSE DTOs ====================

public class PatientVaccinationRecordDto
{
    public Guid Id { get; set; }
    public Guid PatientProfileId { get; set; }
    public Guid VaccineId { get; set; }
    public string VaccineName { get; set; } = string.Empty;
    public string Manufacturer { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int DoseNumber { get; set; }
    public string Route { get; set; } = string.Empty;
    public string? Site { get; set; }
    public string? LotNumber { get; set; }
    public string? Notes { get; set; }
    public DateTime AdministeredAt { get; set; }
    public string AdministeredByName { get; set; } = string.Empty;
    public Guid? AdministeredByUserId { get; set; }
    public Guid? BatchId { get; set; }
    public bool AdverseEventReported { get; set; }
    public string? AdverseEventNotes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class PatientVaccinationTimelineDto
{
    public Guid PatientProfileId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string NicNumber { get; set; } = string.Empty;
    public int TotalDoses { get; set; }
    public int DistinctVaccines { get; set; }
    public DateTime? LastVaccinatedAt { get; set; }
    public List<PatientVaccinationRecordDto> Records { get; set; } = new();
}

// ==================== REQUEST DTOs ====================

public class CreatePatientVaccinationDto
{
    [Required]
    public Guid VaccineId { get; set; }

    public Guid? BatchId { get; set; }

    [Required]
    [Range(1, 20)]
    public int DoseNumber { get; set; } = 1;

    [Required]
    public string Route { get; set; } = "Intramuscular";

    public string? Site { get; set; }

    [MaxLength(100)]
    public string? LotNumber { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }

    public bool AdverseEventReported { get; set; } = false;

    [MaxLength(1000)]
    public string? AdverseEventNotes { get; set; }

    public DateTime? AdministeredAt { get; set; }
}
