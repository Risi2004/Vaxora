using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Vaxora.Api.Models;

[Table("ColdVaults")]
public class ColdVault
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid HospitalProfileId { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Type { get; set; }

    [MaxLength(50)]
    public string? CurrentTemp { get; set; }

    [MaxLength(50)]
    public string? TargetTemp { get; set; }

    [MaxLength(50)]
    public string? Humidity { get; set; }

    [MaxLength(50)]
    public string? Status { get; set; }

    [MaxLength(100)]
    public string? SensorStatus { get; set; }

    public int AssignedLots { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    [ForeignKey(nameof(HospitalProfileId))]
    public virtual HospitalProfile HospitalProfile { get; set; } = null!;
}