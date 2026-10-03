using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;
using Vaxora.Api.Data;
using Vaxora.Api.Models;

namespace Vaxora.Api.Tests.BookingManagement;

public class TransactionTests : IDisposable
{
    private class TransactionTestDbContext : ApplicationDbContext
    {
        public TransactionTestDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Strip relational sequence annotations so SQLite in-memory provider does not reject EnsureCreated()
            var sequenceAnnotations = modelBuilder.Model.GetAnnotations()
                .Where(a => a.Name.Contains("Sequence", StringComparison.OrdinalIgnoreCase))
                .Select(a => a.Name)
                .ToList();

            foreach (var name in sequenceAnnotations)
            {
                modelBuilder.Model.RemoveAnnotation(name);
            }
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

    public void Dispose()
    {
        _connection.Dispose();
    }

    [Fact]
    public async Task Transaction_Commit_persists_all_operations_atomically()
    {
        var userId = Guid.NewGuid();
        var profileId = Guid.NewGuid();

        await using (var context = CreateContext())
        {
            await using var transaction = await context.Database.BeginTransactionAsync();

            var user = new User
            {
                Id = userId,
                Email = "tx.success@vaxora.lk",
                PasswordHash = "hash123",
                Role = UserRole.PATIENT,
                Status = UserStatus.Active,
                RegistrationNumber = "VAX-P-7701",
                CreatedAt = DateTime.UtcNow
            };
            context.Users.Add(user);
            await context.SaveChangesAsync();

            var profile = new PatientProfile
            {
                Id = profileId,
                UserId = userId,
                FullName = "Transaction Patient",
                NicNumber = "990011223V",
                CreatedAt = DateTime.UtcNow
            };
            context.PatientProfiles.Add(profile);
            await context.SaveChangesAsync();

            await transaction.CommitAsync();
        }

        // Verify across a new context instance reading from the database
        await using (var verifyContext = CreateContext())
        {
            var savedUser = await verifyContext.Users
                .Include(u => u.PatientProfile)
                .SingleOrDefaultAsync(u => u.Id == userId);

            Assert.NotNull(savedUser);
            Assert.Equal("tx.success@vaxora.lk", savedUser.Email);
            Assert.NotNull(savedUser.PatientProfile);
            Assert.Equal("Transaction Patient", savedUser.PatientProfile.FullName);
        }
    }

    [Fact]
    public async Task Transaction_Rollback_discards_all_operations_when_explicitly_rolled_back()
    {
        var userId = Guid.NewGuid();

        await using (var context = CreateContext())
        {
            await using var transaction = await context.Database.BeginTransactionAsync();

            var user = new User
            {
                Id = userId,
                Email = "tx.rollback@vaxora.lk",
                PasswordHash = "hash123",
                Role = UserRole.PATIENT,
                Status = UserStatus.Active,
                RegistrationNumber = "VAX-P-7702",
                CreatedAt = DateTime.UtcNow
            };
            context.Users.Add(user);
            await context.SaveChangesAsync();

            // Explicit rollback
            await transaction.RollbackAsync();
        }

        // Verify record does NOT exist in the database
        await using (var verifyContext = CreateContext())
        {
            var user = await verifyContext.Users.SingleOrDefaultAsync(u => u.Id == userId);
            Assert.Null(user);
        }
    }

    [Fact]
    public async Task Transaction_Rollback_discards_operations_on_unhandled_failure()
    {
        var userId = Guid.NewGuid();

        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
        {
            await using var context = CreateContext();
            await using var transaction = await context.Database.BeginTransactionAsync();

            var user = new User
            {
                Id = userId,
                Email = "tx.failure@vaxora.lk",
                PasswordHash = "hash123",
                Role = UserRole.DOCTOR,
                Status = UserStatus.Active,
                RegistrationNumber = "VAX-D-7703",
                CreatedAt = DateTime.UtcNow
            };
            context.Users.Add(user);
            await context.SaveChangesAsync();

            // Simulate downstream failure triggering automatic rollback on dispose
            throw new InvalidOperationException("Simulated business error before commit");
        });

        // Verify uncommitted record was discarded
        await using (var verifyContext = CreateContext())
        {
            var user = await verifyContext.Users.SingleOrDefaultAsync(u => u.Id == userId);
            Assert.Null(user);
        }
    }

    [Fact]
    public async Task Transaction_Savepoints_support_partial_rollback()
    {
        var user1Id = Guid.NewGuid();
        var user2Id = Guid.NewGuid();

        await using (var context = CreateContext())
        {
            await using var transaction = await context.Database.BeginTransactionAsync();

            // 1. Insert first user
            context.Users.Add(new User
            {
                Id = user1Id,
                Email = "savepoint1@vaxora.lk",
                PasswordHash = "hash1",
                Role = UserRole.NURSE,
                Status = UserStatus.Active,
                RegistrationNumber = "VAX-N-7704",
                CreatedAt = DateTime.UtcNow
            });
            await context.SaveChangesAsync();

            // 2. Create Savepoint
            await transaction.CreateSavepointAsync("User1Created");

            // 3. Insert second user
            context.Users.Add(new User
            {
                Id = user2Id,
                Email = "savepoint2@vaxora.lk",
                PasswordHash = "hash2",
                Role = UserRole.NURSE,
                Status = UserStatus.Active,
                RegistrationNumber = "VAX-N-7705",
                CreatedAt = DateTime.UtcNow
            });
            await context.SaveChangesAsync();

            // 4. Rollback to Savepoint (discards User 2, preserves User 1)
            await transaction.RollbackToSavepointAsync("User1Created");

            // 5. Commit transaction
            await transaction.CommitAsync();
        }

        // Verify User 1 exists and User 2 does not
        await using (var verifyContext = CreateContext())
        {
            var user1 = await verifyContext.Users.SingleOrDefaultAsync(u => u.Id == user1Id);
            var user2 = await verifyContext.Users.SingleOrDefaultAsync(u => u.Id == user2Id);

            Assert.NotNull(user1);
            Assert.Equal("savepoint1@vaxora.lk", user1.Email);
            Assert.Null(user2);
        }
    }
}
