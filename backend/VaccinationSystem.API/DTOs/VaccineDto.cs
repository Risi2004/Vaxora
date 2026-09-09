namespace VaccinationSystem.API.DTOs;

public class VaccineDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Manufacturer { get; set; } = string.Empty;
    public string Dosage { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int TotalStock { get; set; } // Computed from batches
}