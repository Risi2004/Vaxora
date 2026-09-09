using System.ComponentModel.DataAnnotations;

namespace VaccinationSystem.API.DTOs;

public class AdjustStockDto
{
    [Required]
    [Range(1, int.MaxValue)]
    public int Quantity { get; set; }

    [Required]
    [MaxLength(500)]
    public string Reason { get; set; } = string.Empty;
}