using Microsoft.EntityFrameworkCore;
using VaccinationSystem.Core.Entities;

namespace VaccinationSystem.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) 
        : base(options)
    {
    }

    // YOUR INVENTORY TABLES
    public DbSet<Vaccine> Vaccines { get; set; }
    public DbSet<Batch> Batches { get; set; }
    public DbSet<InventoryTransaction> InventoryTransactions { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Indexes for performance
        modelBuilder.Entity<Batch>()
            .HasIndex(b => b.BatchNumber)
            .IsUnique();

        modelBuilder.Entity<Batch>()
            .HasIndex(b => b.ExpiryDate);

        modelBuilder.Entity<Batch>()
            .HasIndex(b => b.VaccineId);

        modelBuilder.Entity<InventoryTransaction>()
            .HasIndex(t => t.BatchId);

        modelBuilder.Entity<InventoryTransaction>()
            .HasIndex(t => t.TransactionDate);

        // =============================================
        // 🔥 SEED DATA (Required by Assignment Section 6)
        // =============================================

        // 1. Seed Vaccines (using fixed GUIDs so they are stable across migrations)
        var vaccine1Id = Guid.Parse("11111111-1111-1111-1111-111111111111");
        var vaccine2Id = Guid.Parse("22222222-2222-2222-2222-222222222222");
        var vaccine3Id = Guid.Parse("33333333-3333-3333-3333-333333333333");

        modelBuilder.Entity<Vaccine>().HasData(
            new Vaccine
            {
                Id = vaccine1Id,
                Name = "Pfizer-BioNTech",
                Manufacturer = "Pfizer",
                Dosage = "0.3ml",
                Type = "mRNA",
                CreatedAt = DateTime.UtcNow
            },
            new Vaccine
            {
                Id = vaccine2Id,
                Name = "Moderna",
                Manufacturer = "Moderna",
                Dosage = "0.5ml",
                Type = "mRNA",
                CreatedAt = DateTime.UtcNow
            },
            new Vaccine
            {
                Id = vaccine3Id,
                Name = "AstraZeneca",
                Manufacturer = "AstraZeneca",
                Dosage = "0.5ml",
                Type = "Viral Vector",
                CreatedAt = DateTime.UtcNow
            }
        );

        // 2. Seed Batches (linked to the vaccines above)
        modelBuilder.Entity<Batch>().HasData(
            new Batch
            {
                Id = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                BatchNumber = "PF-2024-001",
                ExpiryDate = DateTime.UtcNow.AddMonths(6),
                QuantityReceived = 100,
                QuantityAvailable = 100,
                Supplier = "Pfizer Inc.",
                StorageLocation = "Fridge A1",
                VaccineId = vaccine1Id,
                CreatedAt = DateTime.UtcNow
            },
            new Batch
            {
                Id = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
                BatchNumber = "MOD-2024-002",
                ExpiryDate = DateTime.UtcNow.AddMonths(8),
                QuantityReceived = 150,
                QuantityAvailable = 145, // 5 already issued
                Supplier = "Moderna Therapeutics",
                StorageLocation = "Fridge B2",
                VaccineId = vaccine2Id,
                CreatedAt = DateTime.UtcNow
            },
            new Batch
            {
                Id = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc"),
                BatchNumber = "AZ-2024-003",
                ExpiryDate = DateTime.UtcNow.AddDays(45), // Expiring soon (great for testing your endpoint!)
                QuantityReceived = 200,
                QuantityAvailable = 200,
                Supplier = "AstraZeneca UK",
                StorageLocation = "Room C3",
                VaccineId = vaccine3Id,
                CreatedAt = DateTime.UtcNow
            }
        );

        // 3. Seed Transactions (so your transaction table isn't empty)
        modelBuilder.Entity<InventoryTransaction>().HasData(
            new InventoryTransaction
            {
                Id = Guid.Parse("dddddddd-dddd-dddd-dddd-dddddddddddd"),
                Type = TransactionType.Receipt,
                Quantity = 100,
                Reason = "Initial stock receipt",
                TransactionDate = DateTime.UtcNow.AddDays(-10),
                CreatedAt = DateTime.UtcNow.AddDays(-10),
                BatchId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
            },
            new InventoryTransaction
            {
                Id = Guid.Parse("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"),
                Type = TransactionType.Receipt,
                Quantity = 150,
                Reason = "Initial stock receipt",
                TransactionDate = DateTime.UtcNow.AddDays(-8),
                CreatedAt = DateTime.UtcNow.AddDays(-8),
                BatchId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
            },
            new InventoryTransaction
            {
                Id = Guid.Parse("ffffffff-ffff-ffff-ffff-ffffffffffff"),
                Type = TransactionType.Issue,
                Quantity = 5,
                Reason = "Issued to Vaccination Session #101",
                TransactionDate = DateTime.UtcNow.AddDays(-3),
                CreatedAt = DateTime.UtcNow.AddDays(-3),
                BatchId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
            },
            new InventoryTransaction
            {
                Id = Guid.Parse("99999999-9999-9999-9999-999999999999"),
                Type = TransactionType.Receipt,
                Quantity = 200,
                Reason = "Initial stock receipt",
                TransactionDate = DateTime.UtcNow.AddDays(-5),
                CreatedAt = DateTime.UtcNow.AddDays(-5),
                BatchId = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc")
            }
        );
    }
}