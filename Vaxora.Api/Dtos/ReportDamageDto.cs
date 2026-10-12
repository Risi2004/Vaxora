namespace Vaxora.Api.Dtos;

public class ReportDamageDto
{
    public string BatchId { get; set; } = string.Empty;
    public string VaccineName { get; set; } = string.Empty;
    public string LotNumber { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string DamageType { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public byte[]? PhotoBytes { get; set; }
    public string? PhotoFileName { get; set; }
    public string? PhotoContentType { get; set; }
}