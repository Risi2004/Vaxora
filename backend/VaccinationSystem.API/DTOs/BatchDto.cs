namespace VaccinationSystem.API.DTOs;

public class BatchDto
{
    public Guid Id { get; set; }
    public string BatchNumber { get; set; } = string.Empty;
    public DateTime ExpiryDate { get; set; }
    public int QuantityReceived { get; set; }
    public int QuantityAvailable { get; set; }
    public string? Supplier { get; set; }
    public string? StorageLocation { get; set; }
    public Guid VaccineId { get; set; }
    public string VaccineName { get; set; } = string.Empty;
}