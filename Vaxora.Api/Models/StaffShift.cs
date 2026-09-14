using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Vaxora.Api.Models;

[Table("StaffShifts")]
public class StaffShift
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid AffiliationId { get; set; }

    [ForeignKey(nameof(AffiliationId))]
    public virtual StaffAffiliation Affiliation { get; set; } = null!;

    [Required]
    public DateOnly ShiftDate { get; set; }

    [Required]
    public TimeOnly StartTime { get; set; }

    [Required]
    public TimeOnly EndTime { get; set; }

    [MaxLength(100)]
    public string? BoothOrStation { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    [Required]
    public Guid CreatedByUserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
