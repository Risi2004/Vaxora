using System.ComponentModel.DataAnnotations;

namespace VaccinationSystem.API.DTOs;

public class CreateBatchDto
{
    [Required]
    [MaxLength(50)]
    public string BatchNumber { get; set; } = string.Empty;

    [Required]
    public DateTime ExpiryDate { get; set; }

    [Required]
    [Range(1, int.MaxValue)]
    public int QuantityReceived { get; set; }

    [MaxLength(200)]
    public string? Supplier { get; set; }

    [MaxLength(100)]
    public string? StorageLocation { get; set; }

    [Required]
    public Guid VaccineId { get; set; }
}