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

            await SeedSampleStaffAccountsAsync(context, passwordHasher, logger);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error occurred while seeding database");
        }
    }

    /// <summary>
    /// Dev/demo accounts for staff-management testing.
    /// Safe to re-run: skips any email that already exists.
    /// </summary>
    private static async Task SeedSampleStaffAccountsAsync(
        ApplicationDbContext context,
        IPasswordHasher passwordHasher,
        ILogger logger)
    {
        const string samplePassword = "Test@12345";

        // Hospital
        if (!await context.Users.AnyAsync(u => u.Email == "hospital.demo@vaxora.lk"))
        {
            var hospitalUser = new User
            {
                Id = Guid.NewGuid(),
                Email = "hospital.demo@vaxora.lk",
                PasswordHash = passwordHasher.HashPassword(samplePassword),
                Role = UserRole.HOSPITAL,
                Status = UserStatus.Active,
                PhoneNumber = "+94112223344",
                RegistrationNumber = "VAX-H-9001",
                CreatedAt = DateTime.UtcNow
            };

            context.Users.Add(hospitalUser);
            context.HospitalProfiles.Add(new HospitalProfile
            {
                UserId = hospitalUser.Id,
                HospitalName = "Demo General Hospital",
                RegistrationNumber = "MOH-DEMO-9001",
                HospitalType = "General",
                OperatingHours = "08:00-20:00",
                Address = "123 Demo Road, Colombo",
                District = "Colombo",
                Province = "Western",
                ContactNumber = "+94112223344",
                VerificationStatus = VerificationStatus.Approved,
                VerifiedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            });

            logger.LogInformation("Sample hospital seeded: hospital.demo@vaxora.lk / {Password} / {Reg}", samplePassword, hospitalUser.RegistrationNumber);
        }

        // Doctor
        if (!await context.Users.AnyAsync(u => u.Email == "doctor.demo@vaxora.lk"))
        {
            var doctorUser = new User
            {
                Id = Guid.NewGuid(),
                Email = "doctor.demo@vaxora.lk",
                PasswordHash = passwordHasher.HashPassword(samplePassword),
                Role = UserRole.DOCTOR,
                Status = UserStatus.Active,
                PhoneNumber = "+94771234567",
                RegistrationNumber = "VAX-D-9001",
                CreatedAt = DateTime.UtcNow
            };

            context.Users.Add(doctorUser);
            context.DoctorProfiles.Add(new DoctorProfile
            {
                UserId = doctorUser.Id,
                FullName = "Kasun Perera",
                SlmcNumber = "SLMC-DEMO-9001",
                Specialization = "General Medicine",
                PhoneNumber = "+94771234567",
                VerificationStatus = VerificationStatus.Approved,
                VerifiedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            });

            logger.LogInformation("Sample doctor seeded: doctor.demo@vaxora.lk / {Password} / {Reg}", samplePassword, doctorUser.RegistrationNumber);
        }

        // Nurse
        if (!await context.Users.AnyAsync(u => u.Email == "nurse.demo@vaxora.lk"))
        {
            var nurseUser = new User
            {
                Id = Guid.NewGuid(),
                Email = "nurse.demo@vaxora.lk",
                PasswordHash = passwordHasher.HashPassword(samplePassword),
                Role = UserRole.NURSE,
                Status = UserStatus.Active,
                PhoneNumber = "+94779876543",
                RegistrationNumber = "VAX-N-9001",
                CreatedAt = DateTime.UtcNow
            };

            context.Users.Add(nurseUser);
            context.NurseProfiles.Add(new NurseProfile
            {
                UserId = nurseUser.Id,
                FullName = "Nimali Fernando",
                SlncNumber = "SLNC-DEMO-9001",
                PhoneNumber = "+94779876543",
                VerificationStatus = VerificationStatus.Approved,
                VerifiedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            });

            logger.LogInformation("Sample nurse seeded: nurse.demo@vaxora.lk / {Password} / {Reg}", samplePassword, nurseUser.RegistrationNumber);
        }

        await context.SaveChangesAsync();
    }
}
