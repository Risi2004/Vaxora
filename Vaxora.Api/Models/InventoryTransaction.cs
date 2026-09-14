using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Vaxora.Api.Models;

[Table("InventoryTransactions")]
public class InventoryTransaction
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid BatchId { get; set; }

    [Required]
    public TransactionType Type { get; set; }

    [Required]
    public int Quantity { get; set; }

    [MaxLength(500)]
    public string? Reason { get; set; }

    public WastageReason? WastageReason { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }

    public DateTime? IncidentDate { get; set; }

    public Guid? PerformedByUserId { get; set; }

    [MaxLength(200)]
    public string? PerformedByName { get; set; }

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey(nameof(BatchId))]
    public virtual Batch Batch { get; set; } = null!;

    [ForeignKey(nameof(PerformedByUserId))]
    public virtual User? PerformedByUser { get; set; }
}