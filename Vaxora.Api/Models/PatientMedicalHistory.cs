using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Vaxora.Api.Models;

[Table("PatientMedicalHistories")]
public class PatientMedicalHistory
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid PatientProfileId { get; set; }

    [ForeignKey(nameof(PatientProfileId))]
    public virtual PatientProfile PatientProfile { get; set; } = null!;

    [Required]
    public MedicalRecordType RecordType { get; set; } = MedicalRecordType.Diagnosis;

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string? Description { get; set; }

    [Required]
    public MedicalRecordSeverity Severity { get; set; } = MedicalRecordSeverity.Info;

    [Required]
    public MedicalRecordStatus Status { get; set; } = MedicalRecordStatus.Active;

    [MaxLength(20)]
    public string? Icd10Code { get; set; }

    public DateTime DiagnosedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ResolvedAt { get; set; }

    public Guid? RecordedByUserId { get; set; }

    [ForeignKey(nameof(RecordedByUserId))]
    public virtual User? RecordedByUser { get; set; }

    [MaxLength(200)]
    public string? RecordedByName { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
