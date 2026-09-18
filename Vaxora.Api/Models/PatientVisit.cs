using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Vaxora.Api.Models;

[Table("PatientVisits")]
public class PatientVisit
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid PatientProfileId { get; set; }

    [ForeignKey(nameof(PatientProfileId))]
    public virtual PatientProfile PatientProfile { get; set; } = null!;

    public Guid? DoctorUserId { get; set; }

    [ForeignKey(nameof(DoctorUserId))]
    public virtual User? DoctorUser { get; set; }

    [MaxLength(200)]
    public string? DoctorName { get; set; }

    public Guid? NurseUserId { get; set; }

    [ForeignKey(nameof(NurseUserId))]
    public virtual User? NurseUser { get; set; }

    [MaxLength(200)]
    public string? NurseName { get; set; }

    public Guid? HospitalProfileId { get; set; }

    [ForeignKey(nameof(HospitalProfileId))]
    public virtual HospitalProfile? HospitalProfile { get; set; }

    public Guid? AppointmentId { get; set; }

    [Required]
    public DateTime VisitDate { get; set; } = DateTime.UtcNow;

    [Required]
    public VisitType VisitType { get; set; } = VisitType.Checkup;

    [Required]
    public VisitStatus Status { get; set; } = VisitStatus.Completed;

    [MaxLength(1000)]
    public string? ChiefComplaint { get; set; }

    // Vitals
    [MaxLength(20)]
    public string? BloodPressure { get; set; }   // e.g., "120/80"

    [MaxLength(10)]
    public string? Temperature { get; set; }      // e.g., "37.2"

    [MaxLength(10)]
    public string? WeightKg { get; set; }

    [MaxLength(10)]
    public string? HeightCm { get; set; }

    [MaxLength(10)]
    public string? HeartRate { get; set; }

    [MaxLength(10)]
    public string? OxygenSaturation { get; set; }

    [MaxLength(2000)]
    public string? DiagnosisSummary { get; set; }

    [MaxLength(2000)]
    public string? TreatmentPlan { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }

    public DateTime? FollowUpDate { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
