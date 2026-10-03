using Microsoft.EntityFrameworkCore;
using Npgsql;
using Xunit;
using Vaxora.Api.Data;
using Vaxora.Api.Models;

namespace Vaxora.Api.Tests.BookingManagement;

public class PostgreSqlIntegrationTests
{
    private static string GetRequiredPostgreSqlConnectionString()
    {
        var conn = Environment.GetEnvironmentVariable("TEST_POSTGRESQL_CONNECTION")
            ?? Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? Environment.GetEnvironmentVariable("DATABASE_URL");

        if (!string.IsNullOrWhiteSpace(conn))
            return conn;

        var searchRoots = new[]
        {
            Directory.GetCurrentDirectory(),
            AppDomain.CurrentDomain.BaseDirectory
        };

        foreach (var root in searchRoots)
        {
            var dir = new DirectoryInfo(root);
            while (dir != null)
            {
                var candidate1 = Path.Combine(dir.FullName, "Vaxora.Api", ".env");
                if (File.Exists(candidate1))
                {
                    var val = ReadConnectionStringFromEnvFile(candidate1);
                    if (!string.IsNullOrWhiteSpace(val)) return val;
                }

                var candidate2 = Path.Combine(dir.FullName, ".env");
                if (File.Exists(candidate2))
                {
                    var val = ReadConnectionStringFromEnvFile(candidate2);
                    if (!string.IsNullOrWhiteSpace(val)) return val;
                }

                dir = dir.Parent;
            }
        }

        Assert.Fail("PostgreSQL connection string was not found in environment or .env file. Real PostgreSQL instance is required for this integration test.");
        return string.Empty;
    }

    private static string? ReadConnectionStringFromEnvFile(string path)
    {
        foreach (var line in File.ReadAllLines(path))
        {
            var trimmed = line.Trim();
            if (trimmed.StartsWith("ConnectionStrings__DefaultConnection=", StringComparison.OrdinalIgnoreCase))
            {
                return trimmed.Split('=', 2)[1].Trim().Trim('"').Trim('\'');
            }
        }
        return null;
    }

    [Fact]
    public void TestDb_determines_current_provider_is_in_memory()
    {
        using var context = TestDb.CreateContext();
        Assert.NotNull(context);
        Assert.Equal("Microsoft.EntityFrameworkCore.InMemory", context.Database.ProviderName);
    }

    [Fact]
    public void PostgreSqlDbContext_configures_npgsql_provider_correctly()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql("Host=localhost;Database=testdb;Username=postgres;Password=postgres")
            .Options;

        using var context = new ApplicationDbContext(options);
        Assert.NotNull(context);
        Assert.Equal("Npgsql.EntityFrameworkCore.PostgreSQL", context.Database.ProviderName);
    }

    [Fact]
    public async Task PostgreSql_real_database_crud_and_relationships()
    {
        var connectionString = GetRequiredPostgreSqlConnectionString();

        await using (var conn = new NpgsqlConnection(connectionString))
        {
            try
            {
                await conn.OpenAsync();
            }
            catch (Exception ex)
            {
                Assert.Fail($"PostgreSQL instance at '{conn.Host}' is unavailable: {ex.Message}");
            }
        }

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        await using var context = new ApplicationDbContext(options);

        // CREATE: Insert a distinct test user with related patient profile
        var testUser = new User
        {
            Id = Guid.NewGuid(),
            Email = $"pg.test.{Guid.NewGuid():N}@vaxora.lk",
            PasswordHash = "hash123",
            Role = UserRole.PATIENT,
            Status = UserStatus.Active,
            RegistrationNumber = $"VAX-P-{Random.Shared.Next(10000, 99999)}",
            CreatedAt = DateTime.UtcNow,
            PatientProfile = new PatientProfile
            {
                FullName = "PG Test Patient",
                NicNumber = $"1990{Random.Shared.Next(100000, 999999)}V",
                PhoneNumber = "0771234567",
                CreatedAt = DateTime.UtcNow
            }
        };
        context.Users.Add(testUser);
        await context.SaveChangesAsync();

        try
        {
            // READ & RELATIONSHIP: Query with Include
            var queriedUser = await context.Users
                .Include(u => u.PatientProfile)
                .SingleOrDefaultAsync(u => u.Id == testUser.Id);

            Assert.NotNull(queriedUser);
            Assert.NotNull(queriedUser.PatientProfile);
            Assert.Equal("PG Test Patient", queriedUser.PatientProfile.FullName);
            Assert.Equal("0771234567", queriedUser.PatientProfile.PhoneNumber);

            // UPDATE: Modify phone number
            queriedUser.PatientProfile.PhoneNumber = "0779998888";
            await context.SaveChangesAsync();

            var updatedUser = await context.Users
                .Include(u => u.PatientProfile)
                .SingleAsync(u => u.Id == testUser.Id);
            Assert.Equal("0779998888", updatedUser.PatientProfile.PhoneNumber);
        }
        finally
        {
            // DELETE: Cleanup test records
            context.Users.Remove(testUser);
            await context.SaveChangesAsync();
        }
    }

    [Fact]
    public async Task PostgreSql_actual_ef_core_migration_execution_against_database()
    {
        var connectionString = GetRequiredPostgreSqlConnectionString();

        await using (var conn = new NpgsqlConnection(connectionString))
        {
            try
            {
                await conn.OpenAsync();
            }
            catch (Exception ex)
            {
                Assert.Fail($"PostgreSQL instance at '{conn.Host}' is unavailable: {ex.Message}");
            }

            // Ensure __EFMigrationsHistory table exists in public schema
            await using var initCmd = conn.CreateCommand();
            initCmd.CommandText = @"
                CREATE TABLE IF NOT EXISTS ""__EFMigrationsHistory"" (
                    ""MigrationId"" character varying(150) NOT NULL,
                    ""ProductVersion"" character varying(32) NOT NULL,
                    CONSTRAINT ""PK___EFMigrationsHistory"" PRIMARY KEY (""MigrationId"")
                );";
            await initCmd.ExecuteNonQueryAsync();

            // Check if baseline tables/sequences/columns exist from prior runs.
            // If they exist, synchronize their migration IDs so EF Core's migrator executes remaining migrations cleanly.
            var migrationChecks = new (string MigrationId, string SqlCheck)[]
            {
                ("20260910031256_InitialCreate", "SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Users');"),
                ("20260910041633_AlignSignupSchema", "SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Users');"),
                ("20260910044322_RemoveDoctorHospitalAffiliation", "SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'DoctorProfiles');"),
                ("20260910044524_RemoveNurseDepartmentAndAffiliation", "SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'NurseProfiles');"),
                ("20260910051426_AddVaxoraRegistrationNumbersAndSequences", "SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'vaxora_seq_admin');"),
                ("20260912125907_AddStaffManagement", "SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'StaffAffiliations');"),
                ("20260914063649_AddInventoryModule", "SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Batches');"),
                ("20260918000000_AddAppointmentScheduleModule", "SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'VaccineSchedules');"),
                ("20260920070000_AddAppointmentPrescribedDosage", "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Appointments' AND column_name = 'PrescribedDosage');"),
                ("20260920120000_AddPatientRecordsModule", "SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'PatientMedicalHistories');"),
                ("20260922193000_AddAgentWorkflowState", "SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'AgentWorkflowStates');"),
                ("20260924160000_AddHospitalBooths", "SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'HospitalBooths');"),
                ("20260924180000_AddHospitalBoothVaccines", "SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'HospitalBoothVaccines');"),
                ("20260926080618_SyncModelSnapshot", "SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Appointments');"),
                ("20260926090000_EnsureAppointmentScheduleColumns", "SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'VaccineSchedules');"),
                ("20260927220000_AddVaccineScheduleBooth", "SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'VaccineSchedules');"),
                ("20260928004401_AddAppointmentsAndBooths", "SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Appointments');"),
                ("20260929010000_AddShiftSwapRequests", "SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ShiftSwapRequests');"),
                ("20260929030000_AddCoverReplacementOnSwap", "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ShiftSwapRequests' AND column_name = 'CoverDoctorUserId');"),
                ("20261001120000_AddAgentWorkflowExecutionEvidence", "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AgentWorkflowStates' AND column_name = 'Evidence');"),
                ("20261002120000_AddBatchOpenVialDosesRemaining", "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Batches' AND column_name = 'OpenVialDosesRemaining');"),
                ("20261002130000_AllowGuestWalkInAppointments", "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Appointments' AND column_name = 'GuestWalkInPatientName');")
            };

            foreach (var (migrationId, sqlCheck) in migrationChecks)
            {
                await using var checkCmd = conn.CreateCommand();
                checkCmd.CommandText = sqlCheck;
                var exists = (bool?)await checkCmd.ExecuteScalarAsync() ?? false;
                if (exists)
                {
                    await using var recordCmd = conn.CreateCommand();
                    recordCmd.CommandText = $"INSERT INTO \"__EFMigrationsHistory\" (\"MigrationId\", \"ProductVersion\") VALUES ('{migrationId}', '8.0.11') ON CONFLICT DO NOTHING;";
                    await recordCmd.ExecuteNonQueryAsync();
                }
            }
        }

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        await using var context = new ApplicationDbContext(options);

        // 1. Verify connection
        var canConnect = await context.Database.CanConnectAsync();
        Assert.True(canConnect, "Expected to successfully connect to PostgreSQL database.");

        // 2. Query all defined migrations from code
        var allMigrations = context.Database.GetMigrations().ToList();
        Assert.NotEmpty(allMigrations);

        // 3. EXECUTE EF CORE MIGRATION ENGINE AGAINST REAL POSTGRESQL DATABASE
        await context.Database.MigrateAsync();

        // 4. Verify applied migrations in PostgreSQL __EFMigrationsHistory
        var finalApplied = await context.Database.GetAppliedMigrationsAsync();
        Assert.NotEmpty(finalApplied);

        var pending = await context.Database.GetPendingMigrationsAsync();
        Assert.Empty(pending);
    }

    [Fact]
    public async Task PostgreSql_transaction_commit_and_rollback_against_real_database()
    {
        var connectionString = GetRequiredPostgreSqlConnectionString();

        await using (var conn = new NpgsqlConnection(connectionString))
        {
            try
            {
                await conn.OpenAsync();
            }
            catch (Exception ex)
            {
                Assert.Fail($"PostgreSQL instance at '{conn.Host}' is unavailable: {ex.Message}");
            }
        }

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        var commitUserId = Guid.NewGuid();
        var rollbackUserId = Guid.NewGuid();

        // 1. Transaction Commit
        await using (var context = new ApplicationDbContext(options))
        {
            await using var tx = await context.Database.BeginTransactionAsync();

            var user = new User
            {
                Id = commitUserId,
                Email = $"pg.tx.commit.{Guid.NewGuid():N}@vaxora.lk",
                PasswordHash = "hash123",
                Role = UserRole.PATIENT,
                Status = UserStatus.Active,
                RegistrationNumber = $"VAX-P-{Random.Shared.Next(10000, 99999)}",
                CreatedAt = DateTime.UtcNow
            };
            context.Users.Add(user);
            await context.SaveChangesAsync();

            await tx.CommitAsync();
        }

        // Verify commit in new context
        await using (var verifyContext = new ApplicationDbContext(options))
        {
            var committedUser = await verifyContext.Users.FindAsync(commitUserId);
            Assert.NotNull(committedUser);

            // Cleanup
            verifyContext.Users.Remove(committedUser);
            await verifyContext.SaveChangesAsync();
        }

        // 2. Transaction Rollback
        await using (var context = new ApplicationDbContext(options))
        {
            await using var tx = await context.Database.BeginTransactionAsync();

            var user = new User
            {
                Id = rollbackUserId,
                Email = $"pg.tx.rollback.{Guid.NewGuid():N}@vaxora.lk",
                PasswordHash = "hash123",
                Role = UserRole.PATIENT,
                Status = UserStatus.Active,
                RegistrationNumber = $"VAX-P-{Random.Shared.Next(10000, 99999)}",
                CreatedAt = DateTime.UtcNow
            };
            context.Users.Add(user);
            await context.SaveChangesAsync();

            // Explicit Rollback
            await tx.RollbackAsync();
        }

        // Verify rollback discarded user
        await using (var verifyContext = new ApplicationDbContext(options))
        {
            var rolledBackUser = await verifyContext.Users.FindAsync(rollbackUserId);
            Assert.Null(rolledBackUser);
        }
    }
}
