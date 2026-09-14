using Microsoft.EntityFrameworkCore;
using Vaxora.Api.Models;
using Vaxora.Api.Services;

namespace Vaxora.Api.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(IServiceProvider serviceProvider, IConfiguration configuration)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<ApplicationDbContext>>();

        try
        {
            // Automatically apply any pending migrations
            await context.Database.MigrateAsync();

            // Seed Admin if not exists
            var adminEmail = configuration["AdminSeed:Email"] ?? "admin@vaxora.health.gov.lk";
            var adminPassword = configuration["AdminSeed:Password"] ?? "Admin@Vaxora2026";

            var existingAdmin = await context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == adminEmail.ToLower());
            if (existingAdmin == null)
            {
                var admin = new User
                {
                    Id = Guid.NewGuid(),
                    Email = adminEmail.ToLower(),
                    PasswordHash = passwordHasher.HashPassword(adminPassword),
                    Role = UserRole.ADMIN,
                    Status = UserStatus.Active,
                    PhoneNumber = "+94112345678",
                    CreatedAt = DateTime.UtcNow
                };

                context.Users.Add(admin);
                context.AuditLogs.Add(new AuditLog
                {
                    UserId = admin.Id,
                    UserEmail = admin.Email,
                    Role = "ADMIN",
                    Action = "SYSTEM_SEED",
                    Details = "Initial system administrator provisioned on startup",
                    Timestamp = DateTime.UtcNow
                });

                await context.SaveChangesAsync();
                logger.LogInformation("Administrator account successfully seeded: {AdminEmail}", adminEmail);
            }

            // === INVENTORY MODULE: SEED GLOBAL VACCINES (Added) ===
            if (!await context.Vaccines.AnyAsync())
            {
                var globalVaccines = new List<Vaccine>
                {
                    new Vaccine { Name = "Pfizer-BioNTech Bivalent (mRNA)", Manufacturer = "Pfizer Inc. & BioNTech", Category = VaccineCategory.MRNA, DosesPerVial = 6, RequiredTemp = "-75°C Ultra Cold", DefaultMinThreshold = 400 },
                    new Vaccine { Name = "Moderna Spikevax mRNA-1273", Manufacturer = "ModernaTX, Inc.", Category = VaccineCategory.MRNA, DosesPerVial = 5, RequiredTemp = "-20°C Freezer", DefaultMinThreshold = 300 },
                    new Vaccine { Name = "Influenza Quadrivalent (Seasonal)", Manufacturer = "Sanofi Pasteur", Category = VaccineCategory.Seasonal, DosesPerVial = 1, RequiredTemp = "2°C to 8°C Chilled", DefaultMinThreshold = 200 },
                    new Vaccine { Name = "Hepatitis B Recombinant", Manufacturer = "GlaxoSmithKline (GSK)", Category = VaccineCategory.Routine, DosesPerVial = 1, RequiredTemp = "2°C to 8°C Chilled", DefaultMinThreshold = 200 },
                    new Vaccine { Name = "MMR (Measles, Mumps, Rubella)", Manufacturer = "Merck & Co.", Category = VaccineCategory.Pediatric, DosesPerVial = 1, RequiredTemp = "2°C to 8°C Chilled", DefaultMinThreshold = 250 },
                    new Vaccine { Name = "Tdap (Tetanus, Diphtheria, Pertussis)", Manufacturer = "Serum Institute / Sanofi", Category = VaccineCategory.Routine, DosesPerVial = 1, RequiredTemp = "2°C to 8°C Chilled", DefaultMinThreshold = 150 },
                    new Vaccine { Name = "Rabies Inactivated Vaccine (Verorab)", Manufacturer = "Sanofi Pasteur", Category = VaccineCategory.Routine, DosesPerVial = 1, RequiredTemp = "2°C to 8°C Chilled", DefaultMinThreshold = 80 }
                };

                context.Vaccines.AddRange(globalVaccines);
                await context.SaveChangesAsync();
                logger.LogInformation("Seeded {Count} global vaccines.", globalVaccines.Count);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error occurred while seeding database");
        }
    }
}