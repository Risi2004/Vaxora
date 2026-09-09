using System.ComponentModel.DataAnnotations;

namespace VaccinationSystem.Core.Entities;

public class Vaccine
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(100)]
    public string Manufacturer { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(20)]
    public string Dosage { get; set; } = string.Empty; // e.g., "0.5ml"
    
    [Required]
    [MaxLength(50)]
    public string Type { get; set; } = string.Empty; // e.g., "mRNA", "Viral Vector"
    
    // Audit fields
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    
    // Navigation property - one vaccine has many batches
    public ICollection<Batch> Batches { get; set; } = new List<Batch>();
}