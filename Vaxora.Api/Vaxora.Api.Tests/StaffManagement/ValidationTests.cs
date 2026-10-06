using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;
using Vaxora.Api.Data;
using Vaxora.Api.Dtos;
using Vaxora.Api.Models;
using Vaxora.Api.Services;

namespace Vaxora.Api.Tests.StaffManagement;

/// <summary>
/// Staff Management — validation / business-rule edge cases.
/// </summary>
public class ValidationTests
{
    [Fact]
    public async Task InviteStaffAsync_rejects_empty_registration_number()
    {
        await using var context = CreateContext();
        var hospital = AddHospital(context);
        await context.SaveChangesAsync();
        var service = CreateService(context);

        await Assert.ThrowsAnyAsync<Exception>(() =>
            service.InviteStaffAsync(hospital.Id, new InviteStaffDto { RegistrationNumber = "   " }));
    }

    [Fact]
    public async Task CreateShiftAsync_rejects_inverted_time_window()
    {
        await using var context = CreateContext();
        var hospital = AddHospital(context);
        var doctor = AddDoctor(context);
        var affiliation = AddActiveAffiliation(context, hospital, doctor);
        await context.SaveChangesAsync();
        var service = CreateService(context);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateShiftAsync(hospital.Id, new CreateStaffShiftDto
            {
                AffiliationId = affiliation.Id,
                ShiftDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(3)),
                StartTime = new TimeOnly(15, 0),
                EndTime = new TimeOnly(9, 0),
            }));

        Assert.Contains("end", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateShiftAsync_rejects_past_shift_date()
    {
        await using var context = CreateContext();
        var hospital = AddHospital(context);
        var doctor = AddDoctor(context);
        var affiliation = AddActiveAffiliation(context, hospital, doctor);
        await context.SaveChangesAsync();
        var service = CreateService(context);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateShiftAsync(hospital.Id, new CreateStaffShiftDto
            {
                AffiliationId = affiliation.Id,
                ShiftDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-2)),
                StartTime = new TimeOnly(9, 0),
                EndTime = new TimeOnly(12, 0),
            }));
    }

    private static ApplicationDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    private static StaffManagementService CreateService(ApplicationDbContext context) =>
        new(context, NullLogger<StaffManagementService>.Instance);

    private static User AddHospital(ApplicationDbContext context)
    {
        var hospital = new User
        {
            Email = $"hospital-{Guid.NewGuid():N}@example.com",
            PasswordHash = "test-hash",
            Role = UserRole.HOSPITAL,
            Status = UserStatus.Active,
            RegistrationNumber = $"VAX-H-{Guid.NewGuid():N}"[..12],
            HospitalProfile = new HospitalProfile
            {
                HospitalName = "Validation Hospital",
                RegistrationNumber = $"HP-{Guid.NewGuid():N}"[..12],
            },
        };
        context.Users.Add(hospital);
        return hospital;
    }

    private static User AddDoctor(ApplicationDbContext context)
    {
        var doctor = new User
        {
            Email = $"doctor-{Guid.NewGuid():N}@example.com",
            PasswordHash = "test-hash",
            Role = UserRole.DOCTOR,
            Status = UserStatus.Active,
            RegistrationNumber = $"VAX-D-{Guid.NewGuid():N}"[..12],
            DoctorProfile = new DoctorProfile
            {
                FullName = "Dr Validation",
                SlmcNumber = $"SLMC-{Guid.NewGuid():N}"[..12],
                VerificationStatus = VerificationStatus.Approved,
            },
        };
        context.Users.Add(doctor);
        return doctor;
    }

    private static StaffAffiliation AddActiveAffiliation(ApplicationDbContext context, User hospital, User staff)
    {
        var affiliation = new StaffAffiliation
        {
            HospitalUserId = hospital.Id,
            HospitalUser = hospital,
            StaffUserId = staff.Id,
            StaffUser = staff,
            StaffRole = staff.Role,
            Status = AffiliationStatus.Active,
            InvitedByUserId = hospital.Id,
            RespondedAt = DateTime.UtcNow,
        };
        context.StaffAffiliations.Add(affiliation);
        return affiliation;
    }
}
