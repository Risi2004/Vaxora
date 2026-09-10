using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Vaxora.Api.Models;

[Table("NurseProfiles")]
public class NurseProfile
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;

    [Required]
    [MaxLength(200)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string SlncNumber { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? PhoneNumber { get; set; }

    [MaxLength(1000)]
    public string? ProfilePhotoUrl { get; set; }

    [MaxLength(500)]
    public string? SlncCardDocKey { get; set; }

    [MaxLength(500)]
    public string? SupportingDocKey { get; set; }

    [Required]
    public VerificationStatus VerificationStatus { get; set; } = VerificationStatus.Pending;

    public DateTime? VerifiedAt { get; set; }
    public Guid? VerifiedByAdminId { get; set; }

    [MaxLength(500)]
    public string? RejectionReason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
