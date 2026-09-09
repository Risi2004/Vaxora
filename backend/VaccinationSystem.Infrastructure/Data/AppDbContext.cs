using Microsoft.EntityFrameworkCore;

namespace VaccinationSystem.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) 
        : base(options)
    {
    }

    // Your Inventory tables will go here (we'll add them next!)
    // public DbSet<Vaccine> Vaccines { get; set; }
    // public DbSet<Batch> Batches { get; set; }
}