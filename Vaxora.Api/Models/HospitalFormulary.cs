using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Vaxora.Api.Models;

[Table("HospitalFormularies")]
public class HospitalFormulary
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid HospitalProfileId { get; set; }

    [Required]
    public Guid VaccineId { get; set; }

    public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey(nameof(HospitalProfileId))]
    public virtual HospitalProfile HospitalProfile { get; set; } = null!;

    [ForeignKey(nameof(VaccineId))]
    public virtual Vaccine Vaccine { get; set; } = null!;
}