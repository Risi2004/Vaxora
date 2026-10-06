using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;
using Vaxora.Api.Data;
using Vaxora.Api.Models;

namespace Vaxora.Api.Tests.StaffManagement;

/// <summary>
/// Staff Management — SQLite transaction atomicity for affiliations + shifts.
/// </summary>
public class TransactionTests : IDisposable
{
    private class TransactionTestDbContext : ApplicationDbContext
    {
        public TransactionTestDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            var sequenceAnnotations = modelBuilder.Model.GetAnnotations()
                .Where(a => a.Name.Contains("Sequence", StringComparison.OrdinalIgnoreCase))
                .Select(a => a.Name)
                .ToList();

            foreach (var name in sequenceAnnotations)
                modelBuilder.Model.RemoveAnnotation(name);
        }
    }

    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<ApplicationDbContext> _options;

    public TransactionTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        _options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(_connection)
            .Options;

        using var context = CreateContext();
        context.Database.EnsureCreated();
    }

    private ApplicationDbContext CreateContext() => new TransactionTestDbContext(_options);

    public void Dispose() => _connection.Dispose();

    [Fact]
    public async Task Transaction_Commit_persists_affiliation_and_shift_atomically()
    {
        var hospitalId = Guid.NewGuid();
        var doctorId = Guid.NewGuid();
        var affiliationId = Guid.NewGuid();
        var shiftId = Guid.NewGuid();

        await using (var context = CreateContext())
        {
            await using var tx = await context.Database.BeginTransactionAsync();

            context.Users.Add(new User
            {
                Id = hospitalId,
                Email = "tx.hospital@vaxora.lk",
                PasswordHash = "hash",
                Role = UserRole.HOSPITAL,
                Status = UserStatus.Active,
                RegistrationNumber = "VAX-H-7711",
                HospitalProfile = new HospitalProfile
                {
                    HospitalName = "TX Hospital",
                    RegistrationNumber = "HOSP-7711"
                }
            });
            context.Users.Add(new User
            {
                Id = doctorId,
                Email = "tx.doctor@vaxora.lk",
                PasswordHash = "hash",
                Role = UserRole.DOCTOR,
                Status = UserStatus.Active,
                RegistrationNumber = "VAX-D-7711",
                DoctorProfile = new DoctorProfile
                {
                    FullName = "TX Doctor",
                    SlmcNumber = "SLMC-7711",
                    VerificationStatus = VerificationStatus.Approved
                }
            });
            await context.SaveChangesAsync();

            context.StaffAffiliations.Add(new StaffAffiliation
            {
                Id = affiliationId,
                HospitalUserId = hospitalId,
                StaffUserId = doctorId,
                StaffRole = UserRole.DOCTOR,
                Status = AffiliationStatus.Active,
                InvitedByUserId = hospitalId,
                RespondedAt = DateTime.UtcNow
            });
            await context.SaveChangesAsync();

            context.StaffShifts.Add(new StaffShift
            {
                Id = shiftId,
                AffiliationId = affiliationId,
                ShiftDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(5)),
                StartTime = new TimeOnly(9, 0),
                EndTime = new TimeOnly(12, 0),
                CreatedByUserId = hospitalId
            });
            await context.SaveChangesAsync();
            await tx.CommitAsync();
        }

        await using (var verify = CreateContext())
        {
            var affiliation = await verify.StaffAffiliations
                .Include(a => a.Shifts)
                .SingleAsync(a => a.Id == affiliationId);
            Assert.Equal(AffiliationStatus.Active, affiliation.Status);
            Assert.Contains(affiliation.Shifts, s => s.Id == shiftId);
        }
    }

    [Fact]
    public async Task Transaction_Rollback_discards_staff_affiliation()
    {
        var hospitalId = Guid.NewGuid();
        var doctorId = Guid.NewGuid();
        var affiliationId = Guid.NewGuid();

        await using (var context = CreateContext())
        {
            context.Users.Add(new User
            {
                Id = hospitalId,
                Email = "tx.rollback.h@vaxora.lk",
                PasswordHash = "hash",
                Role = UserRole.HOSPITAL,
                Status = UserStatus.Active,
                RegistrationNumber = "VAX-H-7712",
                HospitalProfile = new HospitalProfile
                {
                    HospitalName = "Rollback Hospital",
                    RegistrationNumber = "HOSP-7712"
                }
            });
            context.Users.Add(new User
            {
                Id = doctorId,
                Email = "tx.rollback.d@vaxora.lk",
                PasswordHash = "hash",
                Role = UserRole.DOCTOR,
                Status = UserStatus.Active,
                RegistrationNumber = "VAX-D-7712",
                DoctorProfile = new DoctorProfile
                {
                    FullName = "Rollback Doctor",
                    SlmcNumber = "SLMC-7712",
                    VerificationStatus = VerificationStatus.Approved
                }
            });
            await context.SaveChangesAsync();
        }

        await using (var context = CreateContext())
        {
            await using var tx = await context.Database.BeginTransactionAsync();
            context.StaffAffiliations.Add(new StaffAffiliation
            {
                Id = affiliationId,
                HospitalUserId = hospitalId,
                StaffUserId = doctorId,
                StaffRole = UserRole.DOCTOR,
                Status = AffiliationStatus.Pending,
                InvitedByUserId = hospitalId
            });
            await context.SaveChangesAsync();
            await tx.RollbackAsync();
        }

        await using (var verify = CreateContext())
        {
            Assert.False(await verify.StaffAffiliations.AnyAsync(a => a.Id == affiliationId));
        }
    }
}
