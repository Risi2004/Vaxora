using Microsoft.EntityFrameworkCore;
using Vaxora.Api.Data;
using Vaxora.Api.Dtos;
using Vaxora.Api.Models;

namespace Vaxora.Api.Services;

public interface IInventoryService
{
    Task<List<VaccineDto>> GetGlobalVaccinesAsync();
    Task<List<FormularyEntryDto>> GetFormularyAsync(Guid userId);
    Task<FormularyEntryDto> RegisterFormularyAsync(Guid userId, RegisterFormularyDto dto);
    Task<bool> RemoveFormularyAsync(Guid userId, Guid formularyId);
    Task<List<InventoryItemDto>> GetInventoryAsync(Guid userId);
    Task<InventoryItemDto> RestockBatchAsync(Guid userId, RestockBatchDto dto);
    Task<InventoryItemDto> LogWastageAsync(Guid userId, Guid batchId, WastageDto dto);
    Task<InventoryItemDto> AdjustStockAsync(Guid userId, Guid batchId, AdjustStockDto dto);
    Task<InventoryItemDto> IssueStockAsync(Guid userId, Guid batchId, IssueStockDto dto);
    Task<BatchAuditDto> GetBatchAuditAsync(Guid userId, Guid batchId);
    Task<List<ColdVaultDto>> GetColdVaultsAsync(Guid userId);
    Task<InventorySummaryDto> GetSummaryAsync(Guid userId);
}

public class InventoryService : IInventoryService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<InventoryService> _logger;

    public InventoryService(ApplicationDbContext context, ILogger<InventoryService> logger)
    {
        _context = context;
        _logger = logger;
    }

    // ==================== HELPERS ====================

    private async Task<HospitalProfile?> GetHospitalAsync(Guid userId)
        => await _context.HospitalProfiles.FirstOrDefaultAsync(h => h.UserId == userId);

    private async Task<(string Name, string Email)> GetUserInfoAsync(Guid userId)
    {
        var user = await _context.Users
            .Include(u => u.HospitalProfile)
            .Include(u => u.NurseProfile)
            .Include(u => u.DoctorProfile)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return ("System", "system@vaxora.local");

        var name = user.HospitalProfile?.HospitalName
            ?? user.NurseProfile?.FullName
            ?? user.DoctorProfile?.FullName
            ?? user.Email;

        return (name, user.Email);
    }

    private static string ComputeCategory(VaccineCategory c) => c switch
    {
        VaccineCategory.MRNA => "mrna",
        VaccineCategory.Routine => "routine",
        VaccineCategory.Seasonal => "seasonal",
        VaccineCategory.Pediatric => "pediatric",
        _ => "routine"
    };

    private static string ComputeStatusColor(int available, int minThreshold)
    {
        if (available <= minThreshold) return "bar-red";
        if (available <= minThreshold * 1.5) return "bar-orange";
        return "bar-green";
    }

    private static string ComputeExpiryStatus(DateTime expiry)
    {
        if (expiry < DateTime.UtcNow) return "expired";
        if (expiry <= DateTime.UtcNow.AddDays(60)) return "expiring_soon";
        return "healthy";
    }

    private static DateTime EnsureUtc(DateTime value) =>
        value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value, DateTimeKind.Utc);

    private static WastageReason MapWastageReason(string reason) => reason?.ToLower() switch
    {
        "vial_breakage" => WastageReason.VialBreakage,
        "cold_chain_excursion" => WastageReason.ColdChainExcursion,
        "expired_unopened" => WastageReason.ExpiredUnopened,
        "open_vial_expiration" => WastageReason.OpenVialExpiration,
        "reconstitution_error" => WastageReason.ReconstitutionError,
        "contamination" => WastageReason.Contamination,
        _ => WastageReason.VialBreakage
    };

    private static InventoryItemDto MapToItemDto(Batch b, Vaccine v)
    {
        var minThreshold = v.DefaultMinThreshold;
        var lastRestock = b.LastRestockedAt ?? b.CreatedAt;
        return new InventoryItemDto
        {
            Id = b.Id,
            VaccineId = v.Id,
            Name = v.Name,
            Manufacturer = v.Manufacturer,
            Category = ComputeCategory(v.Category),
            LotNumber = b.BatchNumber,
            Available = b.QuantityAvailable,
            Capacity = b.QuantityReceived,
            MinThreshold = minThreshold,
            DosesPerVial = v.DosesPerVial,
            Expiry = b.ExpiryDate.ToString("yyyy-MM-dd"),
            ExpiryStatus = ComputeExpiryStatus(b.ExpiryDate),
            Temp = v.RequiredTemp,
            StorageUnit = b.StorageUnit ?? "Chiller Unit B (2-8°C)",
            StatusColor = ComputeStatusColor(b.QuantityAvailable, minThreshold),
            LastRestocked = lastRestock.ToString("yyyy-MM-dd")
        };
    }

    // ==================== VACCINES (GLOBAL) ====================

    public async Task<List<VaccineDto>> GetGlobalVaccinesAsync()
    {
        return await _context.Vaccines
            .OrderBy(v => v.Name)
            .Select(v => new VaccineDto
            {
                Id = v.Id,
                Name = v.Name,
                Manufacturer = v.Manufacturer,
                Category = ComputeCategory(v.Category),
                DosesPerVial = v.DosesPerVial,
                RequiredTemp = v.RequiredTemp,
                DefaultMinThreshold = v.DefaultMinThreshold
            })
            .ToListAsync();
    }

    // ==================== FORMULARY ====================

    public async Task<List<FormularyEntryDto>> GetFormularyAsync(Guid userId)
    {
        var hospital = await GetHospitalAsync(userId);
        if (hospital == null) return new List<FormularyEntryDto>();

        return await _context.HospitalFormularies
            .Where(f => f.HospitalProfileId == hospital.Id)
            .Include(f => f.Vaccine)
            .OrderBy(f => f.Vaccine.Name)
            .Select(f => new FormularyEntryDto
            {
                Id = f.Id,
                VaccineId = f.VaccineId,
                VaccineName = f.Vaccine.Name,
                Manufacturer = f.Vaccine.Manufacturer,
                RegisteredAt = f.RegisteredAt
            })
            .ToListAsync();
    }

    public async Task<FormularyEntryDto> RegisterFormularyAsync(Guid userId, RegisterFormularyDto dto)
    {
        var hospital = await GetHospitalAsync(userId)
            ?? throw new InvalidOperationException("Only hospital accounts can manage formulary.");

        var (_, userEmail) = await GetUserInfoAsync(userId);

        var normalizedName = dto.VaccineName.Trim();
        var vaccine = await _context.Vaccines
            .FirstOrDefaultAsync(v => v.Name.ToLower() == normalizedName.ToLower());

        if (vaccine == null)
        {
            vaccine = new Vaccine
            {
                Name = normalizedName,
                Manufacturer = string.IsNullOrWhiteSpace(dto.Manufacturer) ? "Authorized State Manufacturer" : dto.Manufacturer.Trim(),
                Category = VaccineCategory.Routine,
                DosesPerVial = 1,
                RequiredTemp = "2°C to 8°C Chilled",
                DefaultMinThreshold = 100
            };
            _context.Vaccines.Add(vaccine);
            await _context.SaveChangesAsync();
        }

        var existing = await _context.HospitalFormularies
            .FirstOrDefaultAsync(f => f.HospitalProfileId == hospital.Id && f.VaccineId == vaccine.Id);

        if (existing != null)
        {
            return new FormularyEntryDto
            {
                Id = existing.Id,
                VaccineId = vaccine.Id,
                VaccineName = vaccine.Name,
                Manufacturer = vaccine.Manufacturer,
                RegisteredAt = existing.RegisteredAt
            };
        }

        var entry = new HospitalFormulary
        {
            HospitalProfileId = hospital.Id,
            VaccineId = vaccine.Id
        };
        _context.HospitalFormularies.Add(entry);

        _context.AuditLogs.Add(new AuditLog
        {
            UserId = userId,
            UserEmail = userEmail,
            Role = "HOSPITAL",
            Action = "FORMULARY_REGISTERED",
            Details = $"Vaccine '{vaccine.Name}' added to formulary",
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        return new FormularyEntryDto
        {
            Id = entry.Id,
            VaccineId = vaccine.Id,
            VaccineName = vaccine.Name,
            Manufacturer = vaccine.Manufacturer,
            RegisteredAt = entry.RegisteredAt
        };
    }

    public async Task<bool> RemoveFormularyAsync(Guid userId, Guid formularyId)
    {
        var hospital = await GetHospitalAsync(userId)
            ?? throw new InvalidOperationException("Only hospital accounts can manage formulary.");

        var (_, userEmail) = await GetUserInfoAsync(userId);

        var entry = await _context.HospitalFormularies
            .Include(f => f.Vaccine)
            .FirstOrDefaultAsync(f => f.Id == formularyId && f.HospitalProfileId == hospital.Id)
            ?? throw new InvalidOperationException("Formulary entry not found.");

        var hasBatches = await _context.Batches
            .AnyAsync(b => b.HospitalProfileId == hospital.Id && b.VaccineId == entry.VaccineId && b.QuantityAvailable > 0);
        if (hasBatches)
            throw new InvalidOperationException("Cannot remove — this vaccine still has stock in inventory.");

        _context.HospitalFormularies.Remove(entry);
        _context.AuditLogs.Add(new AuditLog
        {
            UserId = userId,
            UserEmail = userEmail,
            Role = "HOSPITAL",
            Action = "FORMULARY_REMOVED",
            Details = $"Vaccine '{entry.Vaccine.Name}' removed from formulary",
            Timestamp = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();
        return true;
    }

    // ==================== INVENTORY (BATCHES) ====================

    public async Task<List<InventoryItemDto>> GetInventoryAsync(Guid userId)
    {
        var hospital = await GetHospitalAsync(userId);
        if (hospital == null) return new List<InventoryItemDto>();

        var batches = await _context.Batches
            .Where(b => b.HospitalProfileId == hospital.Id)
            .Include(b => b.Vaccine)
            .OrderBy(b => b.Vaccine.Name)
            .ToListAsync();

        return batches.Select(b => MapToItemDto(b, b.Vaccine)).ToList();
    }

    public async Task<InventoryItemDto> RestockBatchAsync(Guid userId, RestockBatchDto dto)
    {
        var hospital = await GetHospitalAsync(userId)
            ?? throw new InvalidOperationException("Only hospital accounts can restock inventory.");

        var (userName, userEmail) = await GetUserInfoAsync(userId);

        var normalizedName = dto.VaccineName.Trim();
        var vaccine = await _context.Vaccines
            .FirstOrDefaultAsync(v => v.Name.ToLower() == normalizedName.ToLower());

        if (vaccine == null)
        {
            vaccine = new Vaccine
            {
                Name = normalizedName,
                Manufacturer = string.IsNullOrWhiteSpace(dto.Supplier) ? "Authorized State Manufacturer" : dto.Supplier.Trim(),
                Category = VaccineCategory.Routine,
                DosesPerVial = 1,
                RequiredTemp = "2°C to 8°C Chilled",
                DefaultMinThreshold = 100
            };
            _context.Vaccines.Add(vaccine);
            await _context.SaveChangesAsync();
        }

        var inFormulary = await _context.HospitalFormularies
            .AnyAsync(f => f.HospitalProfileId == hospital.Id && f.VaccineId == vaccine.Id);
        if (!inFormulary)
        {
            _context.HospitalFormularies.Add(new HospitalFormulary
            {
                HospitalProfileId = hospital.Id,
                VaccineId = vaccine.Id
            });
        }

        // FIX: force UTC Kind so Npgsql accepts it
        var expiryDate = dto.ExpiryDate.HasValue
            ? EnsureUtc(dto.ExpiryDate.Value)
            : DateTime.UtcNow.AddYears(2);

        var batch = new Batch
        {
            HospitalProfileId = hospital.Id,
            VaccineId = vaccine.Id,
            BatchNumber = dto.LotNumber.Trim(),
            ExpiryDate = expiryDate,
            QuantityReceived = dto.Quantity,
            QuantityAvailable = dto.Quantity,
            StorageUnit = dto.StorageUnit,
            Supplier = dto.Supplier,
            Status = BatchStatus.Active,
            LastRestockedAt = DateTime.UtcNow
        };
        _context.Batches.Add(batch);
        await _context.SaveChangesAsync();

        _context.InventoryTransactions.Add(new InventoryTransaction
        {
            BatchId = batch.Id,
            Type = TransactionType.Restock,
            Quantity = dto.Quantity,
            Reason = $"Restock of {dto.Quantity} vials",
            PerformedByUserId = userId,
            PerformedByName = userName
        });

        _context.AuditLogs.Add(new AuditLog
        {
            UserId = userId,
            UserEmail = userEmail,
            Role = "HOSPITAL",
            Action = "INVENTORY_RESTOCK",
            Details = $"Restocked {dto.Quantity} vials of {vaccine.Name} (Lot {batch.BatchNumber})",
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
        return MapToItemDto(batch, vaccine);
    }

    public async Task<InventoryItemDto> LogWastageAsync(Guid userId, Guid batchId, WastageDto dto)
    {
        var hospital = await GetHospitalAsync(userId)
            ?? throw new InvalidOperationException("Only hospital accounts can log wastage.");

        var (userName, userEmail) = await GetUserInfoAsync(userId);

        var batch = await _context.Batches
            .Include(b => b.Vaccine)
            .FirstOrDefaultAsync(b => b.Id == batchId && b.HospitalProfileId == hospital.Id)
            ?? throw new InvalidOperationException("Batch not found.");

        if (dto.Quantity > batch.QuantityAvailable)
            throw new InvalidOperationException($"Cannot wastage {dto.Quantity} — only {batch.QuantityAvailable} vials available.");

        batch.QuantityAvailable -= dto.Quantity;
        batch.UpdatedAt = DateTime.UtcNow;
        if (batch.QuantityAvailable == 0) batch.Status = BatchStatus.Depleted;

        var reason = MapWastageReason(dto.Reason);

        // FIX: force UTC Kind
        var incidentDate = dto.IncidentDate.HasValue
            ? EnsureUtc(dto.IncidentDate.Value)
            : DateTime.UtcNow;

        _context.InventoryTransactions.Add(new InventoryTransaction
        {
            BatchId = batch.Id,
            Type = TransactionType.Wastage,
            Quantity = dto.Quantity,
            WastageReason = reason,
            Reason = $"Wastage: {reason}",
            Notes = dto.Notes,
            IncidentDate = incidentDate,
            PerformedByUserId = userId,
            PerformedByName = dto.ReportedBy ?? userName
        });

        _context.AuditLogs.Add(new AuditLog
        {
            UserId = userId,
            UserEmail = userEmail,
            Role = "HOSPITAL",
            Action = "INVENTORY_WASTAGE",
            Details = $"Logged {dto.Quantity} wasted vials of {batch.Vaccine.Name} (Lot {batch.BatchNumber}) — {reason}",
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
        return MapToItemDto(batch, batch.Vaccine);
    }

    public async Task<InventoryItemDto> AdjustStockAsync(Guid userId, Guid batchId, AdjustStockDto dto)
    {
        var hospital = await GetHospitalAsync(userId)
            ?? throw new InvalidOperationException("Only hospital accounts can adjust stock.");

        var (userName, userEmail) = await GetUserInfoAsync(userId);

        var batch = await _context.Batches
            .Include(b => b.Vaccine)
            .FirstOrDefaultAsync(b => b.Id == batchId && b.HospitalProfileId == hospital.Id)
            ?? throw new InvalidOperationException("Batch not found.");

        var newQty = batch.QuantityAvailable + dto.Delta;
        if (newQty < 0)
            throw new InvalidOperationException($"Cannot adjust — result would be negative ({newQty}).");

        batch.QuantityAvailable = newQty;
        batch.UpdatedAt = DateTime.UtcNow;
        if (batch.QuantityAvailable == 0 && batch.Status == BatchStatus.Active)
            batch.Status = BatchStatus.Depleted;

        _context.InventoryTransactions.Add(new InventoryTransaction
        {
            BatchId = batch.Id,
            Type = TransactionType.Adjustment,
            Quantity = Math.Abs(dto.Delta),
            Reason = dto.Reason ?? $"Manual adjustment {(dto.Delta >= 0 ? "+" : "")}{dto.Delta}",
            PerformedByUserId = userId,
            PerformedByName = userName
        });

        _context.AuditLogs.Add(new AuditLog
        {
            UserId = userId,
            UserEmail = userEmail,
            Role = "HOSPITAL",
            Action = "INVENTORY_ADJUST",
            Details = $"Stock adjustment {(dto.Delta >= 0 ? "+" : "")}{dto.Delta} for {batch.Vaccine.Name} (Lot {batch.BatchNumber})",
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
        return MapToItemDto(batch, batch.Vaccine);
    }

    // ==================== BUSINESS OP: ISSUE STOCK ====================

    public async Task<InventoryItemDto> IssueStockAsync(Guid userId, Guid batchId, IssueStockDto dto)
    {
        var (userName, userEmail) = await GetUserInfoAsync(userId);

        var batch = await _context.Batches
            .Include(b => b.Vaccine)
            .Include(b => b.HospitalProfile)
            .FirstOrDefaultAsync(b => b.Id == batchId)
            ?? throw new InvalidOperationException("Batch not found.");

        if (batch.QuantityAvailable < dto.Quantity)
            throw new InvalidOperationException($"Insufficient stock. Available: {batch.QuantityAvailable}, Requested: {dto.Quantity}.");

        if (batch.ExpiryDate < DateTime.UtcNow)
            throw new InvalidOperationException($"Batch {batch.BatchNumber} is expired and cannot be issued.");

        batch.QuantityAvailable -= dto.Quantity;
        batch.UpdatedAt = DateTime.UtcNow;
        if (batch.QuantityAvailable == 0) batch.Status = BatchStatus.Depleted;

        _context.InventoryTransactions.Add(new InventoryTransaction
        {
            BatchId = batch.Id,
            Type = TransactionType.Issue,
            Quantity = dto.Quantity,
            Reason = $"Issued to {(string.IsNullOrWhiteSpace(dto.SessionReference) ? "session" : dto.SessionReference)}",
            PerformedByUserId = userId,
            PerformedByName = userName
        });

        _context.AuditLogs.Add(new AuditLog
        {
            UserId = userId,
            UserEmail = userEmail,
            Role = "HOSPITAL",
            Action = "INVENTORY_ISSUE",
            Details = $"Issued {dto.Quantity} vials of {batch.Vaccine.Name} (Lot {batch.BatchNumber})",
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
        return MapToItemDto(batch, batch.Vaccine);
    }

    // ==================== AUDIT TRAIL ====================

    public async Task<BatchAuditDto> GetBatchAuditAsync(Guid userId, Guid batchId)
    {
        var batch = await _context.Batches
            .Include(b => b.Vaccine)
            .FirstOrDefaultAsync(b => b.Id == batchId)
            ?? throw new InvalidOperationException("Batch not found.");

        var transactions = await _context.InventoryTransactions
            .Where(t => t.BatchId == batchId)
            .OrderByDescending(t => t.Timestamp)
            .ToListAsync();

        var entries = transactions.Select(t => new AuditEntryDto
        {
            Id = t.Id,
            Timestamp = t.Timestamp.ToLocalTime().ToString("yyyy-MM-dd hh:mm tt"),
            Event = BuildEventText(t, batch),
            Actor = t.PerformedByName ?? "System",
            Type = t.Type switch
            {
                TransactionType.Restock => "restock",
                TransactionType.Issue => "dispense",
                TransactionType.Wastage => "qa",
                TransactionType.Adjustment => "sensor",
                _ => "qa"
            }
        }).ToList();

        return new BatchAuditDto
        {
            Vaccine = MapToItemDto(batch, batch.Vaccine),
            Entries = entries
        };
    }

    private static string BuildEventText(InventoryTransaction t, Batch b) => t.Type switch
    {
        TransactionType.Restock => $"Batch Shipment {b.BatchNumber} Logged into Inventory (+{t.Quantity} vials)",
        TransactionType.Issue => $"Dispensed {t.Quantity} vials — {t.Reason}",
        TransactionType.Wastage => $"Wastage logged: {t.Quantity} vials ({t.WastageReason})",
        TransactionType.Adjustment => $"Stock adjustment: {t.Quantity} vials — {t.Reason}",
        _ => $"Transaction: {t.Quantity} vials"
    };

    // ==================== COLD VAULTS ====================

    public async Task<List<ColdVaultDto>> GetColdVaultsAsync(Guid userId)
    {
        var hospital = await GetHospitalAsync(userId);
        if (hospital == null) return new List<ColdVaultDto>();

        return await _context.ColdVaults
            .Where(v => v.HospitalProfileId == hospital.Id)
            .Select(v => new ColdVaultDto
            {
                Id = v.Id,
                Name = v.Name,
                Type = v.Type ?? "",
                Temp = v.CurrentTemp ?? "",
                Target = v.TargetTemp ?? "",
                Status = v.Status ?? "Optimal",
                Humidity = v.Humidity ?? "",
                SensorStatus = v.SensorStatus ?? "Active",
                AssignedLots = v.AssignedLots
            })
            .ToListAsync();
    }

    // ==================== SUMMARY ====================

    public async Task<InventorySummaryDto> GetSummaryAsync(Guid userId)
    {
        var hospital = await GetHospitalAsync(userId);
        if (hospital == null) return new InventorySummaryDto();

        var batches = await _context.Batches
            .Where(b => b.HospitalProfileId == hospital.Id)
            .Include(b => b.Vaccine)
            .ToListAsync();

        var totalVials = batches.Sum(b => b.QuantityAvailable);
        var totalDoses = batches.Sum(b => b.QuantityAvailable * b.Vaccine.DosesPerVial);
        var lowStock = batches.Count(b => b.QuantityAvailable <= b.Vaccine.DefaultMinThreshold);
        var expiring = batches.Count(b => b.ExpiryDate <= DateTime.UtcNow.AddDays(60) && b.ExpiryDate >= DateTime.UtcNow);
        var formulations = batches.Select(b => b.VaccineId).Distinct().Count();

        return new InventorySummaryDto
        {
            TotalVials = totalVials,
            TotalDoses = totalDoses,
            LowStockCount = lowStock,
            ExpiringCount = expiring,
            TotalFormulations = formulations,
            ColdStorageHealth = "100%",
            VaultsOnline = await _context.ColdVaults.CountAsync(v => v.HospitalProfileId == hospital.Id)
        };
    }
}