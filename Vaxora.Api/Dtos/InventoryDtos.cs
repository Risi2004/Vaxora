using System.ComponentModel.DataAnnotations;

namespace Vaxora.Api.Dtos;

// ==================== RESPONSE DTOs ====================

public class VaccineDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Manufacturer { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int DosesPerVial { get; set; }
    public string RequiredTemp { get; set; } = string.Empty;
    public int DefaultMinThreshold { get; set; }
}

public class HospitalSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string? District { get; set; }
    public string? Type { get; set; }
    public string? ContactNumber { get; set; }
}

public class VaccineWithHospitalsDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Manufacturer { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int DosesPerVial { get; set; }
    public string RequiredTemp { get; set; } = string.Empty;
    public List<HospitalSummaryDto> Hospitals { get; set; } = new();
}

public class FormularyEntryDto
{
    public Guid Id { get; set; }
    public Guid VaccineId { get; set; }
    public string VaccineName { get; set; } = string.Empty;
    public string Manufacturer { get; set; } = string.Empty;
    public DateTime RegisteredAt { get; set; }
}

public class InventoryItemDto
{
    public Guid Id { get; set; }                 // Batch Id
    public Guid VaccineId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Manufacturer { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string LotNumber { get; set; } = string.Empty;
    public int Available { get; set; }
    public int Capacity { get; set; }
    public int MinThreshold { get; set; }
    public int DosesPerVial { get; set; }
    public string Expiry { get; set; } = string.Empty;
    public string ExpiryStatus { get; set; } = string.Empty;
    public string Temp { get; set; } = string.Empty;
    public string StorageUnit { get; set; } = string.Empty;
    public string StatusColor { get; set; } = string.Empty;
    public string LastRestocked { get; set; } = string.Empty;
}

public class ColdVaultDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Temp { get; set; } = string.Empty;
    public string Target { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Humidity { get; set; } = string.Empty;
    public string SensorStatus { get; set; } = string.Empty;
    public int AssignedLots { get; set; }
}

public class AuditEntryDto
{
    public Guid Id { get; set; }
    public string Timestamp { get; set; } = string.Empty;
    public string Event { get; set; } = string.Empty;
    public string Actor { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
}

public class BatchAuditDto
{
    public InventoryItemDto Vaccine { get; set; } = null!;
    public List<AuditEntryDto> Entries { get; set; } = new();
}

public class InventorySummaryDto
{
    public int TotalVials { get; set; }
    public int TotalDoses { get; set; }
    public int LowStockCount { get; set; }
    public int ExpiringCount { get; set; }
    public int TotalFormulations { get; set; }
    public string ColdStorageHealth { get; set; } = "100%";
    public int VaultsOnline { get; set; }
}

// ==================== REQUEST DTOs ====================

public class RegisterFormularyDto
{
    [Required]
    [MaxLength(200)]
    public string VaccineName { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Manufacturer { get; set; }
}

public class RestockBatchDto
{
    [Required]
    [MaxLength(200)]
    public string VaccineName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string LotNumber { get; set; } = string.Empty;

    [Required]
    [Range(1, int.MaxValue)]
    public int Quantity { get; set; }

    [MaxLength(200)]
    public string? StorageUnit { get; set; }

    public DateTime? ExpiryDate { get; set; }

    [MaxLength(200)]
    public string? Supplier { get; set; }
}

public class WastageDto
{
    [Required]
    [Range(1, int.MaxValue)]
    public int Quantity { get; set; }

    [Required]
    public string Reason { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? ReportedBy { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }

    public DateTime? IncidentDate { get; set; }
}

public class AdjustStockDto
{
    [Required]
    public int Delta { get; set; }   // can be positive or negative

    [MaxLength(500)]
    public string? Reason { get; set; }
}

public class IssueStockDto
{
    [Required]
    [Range(1, int.MaxValue)]
    public int Quantity { get; set; }

    [MaxLength(500)]
    public string? SessionReference { get; set; }
}