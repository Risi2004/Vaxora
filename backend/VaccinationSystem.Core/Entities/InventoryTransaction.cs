using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VaccinationSystem.Core.Entities;

public enum TransactionType
{
    Receipt,    // Stock received
    Issue,      // Issued to vaccination session (BUSINESS OP)
    Adjustment, // Manual adjustment (damage, correction)
    Disposal    // Expired or wasted
}

public class InventoryTransaction
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public TransactionType Type { get; set; }
    
    [Required]
    [Range(1, int.MaxValue)]
    public int Quantity { get; set; }
    
    [MaxLength(500)]
    public string? Reason { get; set; } // e.g., "Issued to session #123", "Expired stock"
    
    public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
    
    // Audit fields
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Foreign Key to Batch
    public Guid BatchId { get; set; }
    
    [ForeignKey("BatchId")]
    public Batch Batch { get; set; } = null!;
    
    // Optional: Who performed the transaction (User ID from Identity)
    public Guid? PerformedBy { get; set; }
}