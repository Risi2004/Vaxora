using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VaccinationSystem.API.DTOs;
using VaccinationSystem.Core.Entities;
using VaccinationSystem.Infrastructure.Data;

namespace VaccinationSystem.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize] // Requires JWT token (you can test without it for now)
public class InventoryController : ControllerBase // 🔥 FIXED: Inherit from ControllerBase, not AppDbContext
{
    private readonly AppDbContext _context;

    public InventoryController(AppDbContext context) // 🔥 FIXED: Constructor injects AppDbContext
    {
        _context = context;
    }

    // 1. GET all vaccines with their total stock
    [HttpGet("vaccines")]
    public async Task<ActionResult<IEnumerable<VaccineDto>>> GetVaccines()
    {
        var vaccines = await _context.Vaccines
            .Include(v => v.Batches)
            .Select(v => new VaccineDto
            {
                Id = v.Id,
                Name = v.Name,
                Manufacturer = v.Manufacturer,
                Dosage = v.Dosage,
                Type = v.Type,
                TotalStock = v.Batches.Sum(b => b.QuantityAvailable)
            })
            .ToListAsync();

        return Ok(vaccines);
    }

    // 2. POST - Receive new stock (add a batch)
    [HttpPost("batches")]
    public async Task<ActionResult<BatchDto>> AddBatch(CreateBatchDto createDto)
    {
        // Verify vaccine exists
        var vaccine = await _context.Vaccines.FindAsync(createDto.VaccineId);
        if (vaccine == null)
            return NotFound($"Vaccine with ID {createDto.VaccineId} not found.");

        var batch = new Batch
        {
            BatchNumber = createDto.BatchNumber,
            ExpiryDate = createDto.ExpiryDate,
            QuantityReceived = createDto.QuantityReceived,
            QuantityAvailable = createDto.QuantityReceived, // Initially same as received
            Supplier = createDto.Supplier,
            StorageLocation = createDto.StorageLocation,
            VaccineId = createDto.VaccineId
        };

        _context.Batches.Add(batch);

        // Log the transaction
        var transaction = new InventoryTransaction
        {
            Type = TransactionType.Receipt,
            Quantity = createDto.QuantityReceived,
            Reason = $"Received batch {createDto.BatchNumber}",
            BatchId = batch.Id
        };
        _context.InventoryTransactions.Add(transaction);

        await _context.SaveChangesAsync();

        var response = new BatchDto
        {
            Id = batch.Id,
            BatchNumber = batch.BatchNumber,
            ExpiryDate = batch.ExpiryDate,
            QuantityReceived = batch.QuantityReceived,
            QuantityAvailable = batch.QuantityAvailable,
            Supplier = batch.Supplier,
            StorageLocation = batch.StorageLocation,
            VaccineId = batch.VaccineId,
            VaccineName = vaccine.Name
        };

        return CreatedAtAction(nameof(GetVaccines), new { id = batch.Id }, response);
    }

    // 3. PUT - Adjust stock (for damage, corrections, etc.)
    [HttpPut("batches/{id}/adjust")]
    public async Task<IActionResult> AdjustStock(Guid id, AdjustStockDto adjustDto)
    {
        var batch = await _context.Batches.FindAsync(id);
        if (batch == null)
            return NotFound($"Batch with ID {id} not found.");

        // Update stock
        batch.QuantityAvailable += adjustDto.Quantity; // Can be negative or positive
        batch.UpdatedAt = DateTime.UtcNow;

        // Log the adjustment
        var transaction = new InventoryTransaction
        {
            Type = TransactionType.Adjustment,
            Quantity = adjustDto.Quantity,
            Reason = adjustDto.Reason,
            BatchId = batch.Id
        };
        _context.InventoryTransactions.Add(transaction);

        await _context.SaveChangesAsync();

        return Ok(new { Message = $"Stock adjusted by {adjustDto.Quantity}. New available: {batch.QuantityAvailable}" });
    }

    // 4. POST - BUSINESS OPERATION: Issue stock to a vaccination session
    [HttpPost("batches/{id}/issue")]
    public async Task<IActionResult> IssueStock(Guid id, IssueStockDto issueDto)
    {
        var batch = await _context.Batches
            .Include(b => b.Vaccine)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (batch == null)
            return NotFound($"Batch with ID {id} not found.");

        // BUSINESS RULE: Check if enough stock is available
        if (batch.QuantityAvailable < issueDto.Quantity)
            return BadRequest($"Insufficient stock. Available: {batch.QuantityAvailable}, Requested: {issueDto.Quantity}");

        // BUSINESS RULE: Check if batch is expired
        if (batch.ExpiryDate < DateTime.UtcNow)
            return BadRequest($"Batch {batch.BatchNumber} is expired. Cannot issue.");

        // Deduct stock
        batch.QuantityAvailable -= issueDto.Quantity;
        batch.UpdatedAt = DateTime.UtcNow;

        // Log the transaction
        var transaction = new InventoryTransaction
        {
            Type = TransactionType.Issue,
            Quantity = issueDto.Quantity,
            Reason = $"Issued to {issueDto.SessionReference}",
            BatchId = batch.Id
        };
        _context.InventoryTransactions.Add(transaction);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            Message = $"Successfully issued {issueDto.Quantity} doses of {batch.Vaccine.Name} to {issueDto.SessionReference}.",
            RemainingStock = batch.QuantityAvailable
        });
    }

    // 5. GET - Expiring soon batches (within 30 days)
    [HttpGet("batches/expiring")]
    public async Task<ActionResult<IEnumerable<BatchDto>>> GetExpiringBatches([FromQuery] int daysThreshold = 30)
    {
        var thresholdDate = DateTime.UtcNow.AddDays(daysThreshold);

        var expiringBatches = await _context.Batches
            .Include(b => b.Vaccine)
            .Where(b => b.ExpiryDate <= thresholdDate && b.ExpiryDate >= DateTime.UtcNow && b.QuantityAvailable > 0)
            .Select(b => new BatchDto
            {
                Id = b.Id,
                BatchNumber = b.BatchNumber,
                ExpiryDate = b.ExpiryDate,
                QuantityReceived = b.QuantityReceived,
                QuantityAvailable = b.QuantityAvailable,
                Supplier = b.Supplier,
                StorageLocation = b.StorageLocation,
                VaccineId = b.VaccineId,
                VaccineName = b.Vaccine.Name
            })
            .OrderBy(b => b.ExpiryDate)
            .ToListAsync();

        return Ok(expiringBatches);
    }
}