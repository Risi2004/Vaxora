using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VaccinationSystem.Core.Entities;

public class Batch
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [MaxLength(50)]
    public string BatchNumber { get; set; } = string.Empty;
    
    [Required]
    public DateTime ExpiryDate { get; set; }
    
    [Required]
    [Range(0, int.MaxValue)]
    public int QuantityReceived { get; set; }
    
    [Required]
    [Range(0, int.MaxValue)]
    public int QuantityAvailable { get; set; }
    
    [MaxLength(200)]
    public string? Supplier { get; set; }
    
    [MaxLength(100)]
    public string? StorageLocation { get; set; }
    
    // Audit fields
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    
    // Foreign Key to Vaccine
    public Guid VaccineId { get; set; }
    
    [ForeignKey("VaccineId")]
    public Vaccine Vaccine { get; set; } = null!;
    
    // Navigation property - one batch has many transactions
    public ICollection<InventoryTransaction> Transactions { get; set; } = new List<InventoryTransaction>();
}