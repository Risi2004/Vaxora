using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Vaxora.Api.Models;

[Table("PatientVaccinationRecords")]
public class PatientVaccinationRecord
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid PatientProfileId { get; set; }

    [ForeignKey(nameof(PatientProfileId))]
    public virtual PatientProfile PatientProfile { get; set; } = null!;

    [Required]
    public Guid VaccineId { get; set; }

    [ForeignKey(nameof(VaccineId))]
    public virtual Vaccine Vaccine { get; set; } = null!;

    public Guid? BatchId { get; set; }

    [ForeignKey(nameof(BatchId))]
    public virtual Batch? Batch { get; set; }

    public Guid? AdministeredByUserId { get; set; }

    [ForeignKey(nameof(AdministeredByUserId))]
    public virtual User? AdministeredByUser { get; set; }

    [MaxLength(200)]
    public string? AdministeredByName { get; set; }

    [Required]
    public DateTime AdministeredAt { get; set; } = DateTime.UtcNow;

    [Required]
    [Range(1, 20)]
    public int DoseNumber { get; set; } = 1;

    [Required]
    public VaccineRoute Route { get; set; } = VaccineRoute.Intramuscular;

    public InjectionSite? Site { get; set; }

    [MaxLength(100)]
    public string? LotNumber { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }

    public bool AdverseEventReported { get; set; } = false;

    [MaxLength(1000)]
    public string? AdverseEventNotes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
