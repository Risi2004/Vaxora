using Microsoft.AspNetCore.Http;

namespace Vaxora.Api.Dtos;

public class ReportDamageForm
{
    public IFormFile? Photo { get; set; }
    public string? BatchId { get; set; }
    public string? VaccineName { get; set; }
    public string? LotNumber { get; set; }
    public int Quantity { get; set; }
    public string? DamageType { get; set; }
    public string? Notes { get; set; }
}