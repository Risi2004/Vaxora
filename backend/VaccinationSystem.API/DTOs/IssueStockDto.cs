using System.ComponentModel.DataAnnotations;

namespace VaccinationSystem.API.DTOs;

public class IssueStockDto
{
    [Required]
    [Range(1, int.MaxValue)]
    public int Quantity { get; set; }

    [Required]
    [MaxLength(500)]
    public string SessionReference { get; set; } = string.Empty; // e.g., "Vaccination Session #123"
}