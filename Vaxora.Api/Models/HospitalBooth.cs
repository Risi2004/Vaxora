using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Vaxora.Api.Models;

[Table("HospitalBooths")]
public class HospitalBooth
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid HospitalUserId { get; set; }

    [ForeignKey(nameof(HospitalUserId))]
    public virtual User HospitalUser { get; set; } = null!;

    /// <summary>Short hospital-local code, e.g. B01.</summary>
    [Required]
    [MaxLength(20)]
    public string Code { get; set; } = string.Empty;

    /// <summary>Human label, e.g. Adult Immunization.</summary>
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public int SortOrder { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<StaffShift> Shifts { get; set; } = new List<StaffShift>();

    [NotMapped]
    public string DisplayLabel => string.IsNullOrWhiteSpace(Code)
        ? Name
        : $"{Code.Trim()} · {Name.Trim()}";
}
