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
                    RegistrationNumber = "VAX-A-1000",
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

            // Seed National Vaccines if not exists
            if (!await context.Vaccines.AnyAsync())
            {
                var defaultVaccines = new List<Vaccine>
                {
                    new Vaccine { Name = "Pfizer Bivalent mRNA", Manufacturer = "Pfizer-BioNTech", Category = VaccineCategory.MRNA, DosesPerVial = 6, RequiredTemp = "-80°C to -60°C Deep Freeze", DefaultMinThreshold = 200 },
                    new Vaccine { Name = "Hepatitis B Recombinant", Manufacturer = "Serum Institute of India", Category = VaccineCategory.Routine, DosesPerVial = 10, RequiredTemp = "+2°C to +8°C Chilled", DefaultMinThreshold = 300 },
                    new Vaccine { Name = "Moderna Spikevax", Manufacturer = "Moderna Inc.", Category = VaccineCategory.MRNA, DosesPerVial = 10, RequiredTemp = "-25°C to -15°C Frozen", DefaultMinThreshold = 150 },
                    new Vaccine { Name = "Influenza (Quadrivalent)", Manufacturer = "Sanofi Pasteur", Category = VaccineCategory.Seasonal, DosesPerVial = 1, RequiredTemp = "+2°C to +8°C Chilled", DefaultMinThreshold = 250 },
                    new Vaccine { Name = "MMR (Measles, Mumps, Rubella)", Manufacturer = "GlaxoSmithKline", Category = VaccineCategory.Routine, DosesPerVial = 1, RequiredTemp = "+2°C to +8°C Chilled", DefaultMinThreshold = 200 },
                    new Vaccine { Name = "BCG (Tuberculosis)", Manufacturer = "State Pharmaceuticals Corp", Category = VaccineCategory.Routine, DosesPerVial = 20, RequiredTemp = "+2°C to +8°C Chilled", DefaultMinThreshold = 100 }
                };

                context.Vaccines.AddRange(defaultVaccines);
                await context.SaveChangesAsync();
                logger.LogInformation("National immunization vaccines successfully initialized.");
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error occurred while seeding database");
        }
    }
}
