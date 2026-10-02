using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Vaxora.Api.Models;

[Table("Batches")]
public class Batch
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid HospitalProfileId { get; set; }

    [Required]
    public Guid VaccineId { get; set; }

    [Required]
    [MaxLength(100)]
    public string BatchNumber { get; set; } = string.Empty;

    [Required]
    public DateTime ExpiryDate { get; set; }

    [Required]
    [Range(0, int.MaxValue)]
    public int QuantityReceived { get; set; }

    [Required]
    [Range(0, int.MaxValue)]
    public int QuantityAvailable { get; set; }

    /// <summary>
    /// Doses left in the currently opened multi-dose vial. Null when no vial is open.
    /// Sealed stock remains in <see cref="QuantityAvailable"/>.
    /// </summary>
    [Range(0, int.MaxValue)]
    public int? OpenVialDosesRemaining { get; set; }

    [MaxLength(200)]
    public string? StorageUnit { get; set; }

    [MaxLength(200)]
    public string? Supplier { get; set; }

    [Required]
    public BatchStatus Status { get; set; } = BatchStatus.Active;

    public DateTime? LastRestockedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    [ForeignKey(nameof(HospitalProfileId))]
    public virtual HospitalProfile HospitalProfile { get; set; } = null!;

    [ForeignKey(nameof(VaccineId))]
    public virtual Vaccine Vaccine { get; set; } = null!;

    public virtual ICollection<InventoryTransaction> Transactions { get; set; } = new List<InventoryTransaction>();
}