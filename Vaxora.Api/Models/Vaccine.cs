using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Vaxora.Api.Models;

[Table("Vaccines")]
public class Vaccine
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Manufacturer { get; set; } = string.Empty;

    [Required]
    public VaccineCategory Category { get; set; }

    [Required]
    [Range(1, 100)]
    public int DosesPerVial { get; set; } = 1;

    [Required]
    [MaxLength(100)]
    public string RequiredTemp { get; set; } = "2°C to 8°C Chilled";

    [Required]
    [Range(0, int.MaxValue)]
    public int DefaultMinThreshold { get; set; } = 100;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public virtual ICollection<HospitalFormulary> FormularyEntries { get; set; } = new List<HospitalFormulary>();
    public virtual ICollection<Batch> Batches { get; set; } = new List<Batch>();
}