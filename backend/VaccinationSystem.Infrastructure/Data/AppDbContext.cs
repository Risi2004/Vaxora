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

        // Indexes for performance (your lecturer will love these)
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
    }
}