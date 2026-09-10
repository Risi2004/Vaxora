using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Vaxora.Api.Models;

[Table("HospitalProfiles")]
public class HospitalProfile
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;

    [Required]
    [MaxLength(250)]
    public string HospitalName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string RegistrationNumber { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? HospitalType { get; set; }

    [MaxLength(100)]
    public string? OperatingHours { get; set; }

    [Required]
    [MaxLength(500)]
    public string Address { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? District { get; set; }

    [MaxLength(100)]
    public string? Province { get; set; }

    [MaxLength(20)]
    public string? ContactNumber { get; set; }

    [MaxLength(1000)]
    public string? LogoUrl { get; set; }

    [MaxLength(500)]
    public string? RegistrationDocKey { get; set; }

    [MaxLength(500)]
    public string? MohDocKey { get; set; }

    [Required]
    public VerificationStatus VerificationStatus { get; set; } = VerificationStatus.Pending;

    public DateTime? VerifiedAt { get; set; }
    public Guid? VerifiedByAdminId { get; set; }

    [MaxLength(500)]
    public string? RejectionReason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
