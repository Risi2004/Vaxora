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

            // Safe column checks for pricing and payment integration
            try
            {
                await context.Database.ExecuteSqlRawAsync(@"
                    ALTER TABLE ""VaccineSchedules"" ADD COLUMN IF NOT EXISTS ""Price"" NUMERIC(18,2) NOT NULL DEFAULT 0.00;
                    ALTER TABLE ""Appointments"" ADD COLUMN IF NOT EXISTS ""Fee"" NUMERIC(18,2) NOT NULL DEFAULT 0.00;
                    ALTER TABLE ""Appointments"" ADD COLUMN IF NOT EXISTS ""PaymentMethod"" VARCHAR(50) NOT NULL DEFAULT 'Free';
                    ALTER TABLE ""Appointments"" ADD COLUMN IF NOT EXISTS ""PaymentStatus"" VARCHAR(50) NOT NULL DEFAULT 'Paid';
                    ALTER TABLE ""Appointments"" ADD COLUMN IF NOT EXISTS ""PaymentTransactionId"" VARCHAR(100) NULL;
                    ALTER TABLE ""Appointments"" ADD COLUMN IF NOT EXISTS ""PrescribedDosage"" VARCHAR(100) NULL;
                    ALTER TABLE ""Appointments"" ADD COLUMN IF NOT EXISTS ""PrescribedByDoctorUserId"" UUID NULL;
                    ALTER TABLE ""Appointments"" ADD COLUMN IF NOT EXISTS ""PrescribedByDoctorName"" VARCHAR(200) NULL;
                    ALTER TABLE ""Appointments"" ADD COLUMN IF NOT EXISTS ""DosageUpdatedAt"" TIMESTAMPTZ NULL;
                ");
            }
            catch (Exception exSql)
            {
                logger.LogWarning(exSql, "Non-fatal notice during database schema sync: {Message}", exSql.Message);
            }

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
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error occurred while seeding database");
        }
    }
}