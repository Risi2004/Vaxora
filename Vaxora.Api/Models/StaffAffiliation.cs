using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Vaxora.Api.Models;

[Table("StaffAffiliations")]
public class StaffAffiliation
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid HospitalUserId { get; set; }

    [ForeignKey(nameof(HospitalUserId))]
    public virtual User HospitalUser { get; set; } = null!;

    [Required]
    public Guid StaffUserId { get; set; }

    [ForeignKey(nameof(StaffUserId))]
    public virtual User StaffUser { get; set; } = null!;

    [Required]
    public UserRole StaffRole { get; set; }

    [Required]
    public AffiliationStatus Status { get; set; } = AffiliationStatus.Pending;

    [Required]
    public DutyStatus DutyStatus { get; set; } = DutyStatus.Off;

    public DateTime? DutyUpdatedAt { get; set; }
    public Guid? DutyUpdatedByUserId { get; set; }

    [Required]
    public Guid InvitedByUserId { get; set; }

    public DateTime InvitedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RespondedAt { get; set; }

    public virtual ICollection<StaffShift> Shifts { get; set; } = new List<StaffShift>();
}
