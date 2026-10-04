using Microsoft.EntityFrameworkCore;
using Npgsql;
using Xunit;
using Vaxora.Api.Data;

namespace Vaxora.Api.Tests;

/// <summary>
/// Shared PostgreSQL migrate helper for CI. Prevents staff/booking Postgres tests from
/// racing on a blank database before ShiftSwapRequests (and related tables) exist.
/// </summary>
[CollectionDefinition("PostgreSql")]
public sealed class PostgreSqlCollection : ICollectionFixture<PostgreSqlFixture>;

public sealed class PostgreSqlFixture
{
    public void EnsureMigrated(string connectionString) =>
        PostgreSqlTestDatabase.EnsureMigrated(connectionString);
}

public static class PostgreSqlTestDatabase
{
    private static readonly object Gate = new();
    private static bool _migrated;

    public static void EnsureMigrated(string connectionString)
    {
        lock (Gate)
        {
            if (_migrated) return;

            using (var conn = new NpgsqlConnection(connectionString))
            {
                conn.Open();

                using var initCmd = conn.CreateCommand();
                initCmd.CommandText = @"
                    CREATE TABLE IF NOT EXISTS ""__EFMigrationsHistory"" (
                        ""MigrationId"" character varying(150) NOT NULL,
                        ""ProductVersion"" character varying(32) NOT NULL,
                        CONSTRAINT ""PK___EFMigrationsHistory"" PRIMARY KEY (""MigrationId"")
                    );";
                initCmd.ExecuteNonQuery();

                // Same baseline strategy as BookingManagement/PostgreSqlIntegrationTests.
                var baselineHistoricalMigrations = new[]
                {
                    "20260910031256_InitialCreate",
                    "20260910041633_AlignSignupSchema",
                    "20260910044322_RemoveDoctorHospitalAffiliation",
                    "20260910044524_RemoveNurseDepartmentAndAffiliation",
                    "20260910051426_AddVaxoraRegistrationNumbersAndSequences",
                    "20260912125907_AddStaffManagement",
                    "20260914063649_AddInventoryModule",
                    "20260918000000_AddAppointmentScheduleModule",
                    "20260920070000_AddAppointmentPrescribedDosage",
                    "20260920120000_AddPatientRecordsModule",
                    "20260922193000_AddAgentWorkflowState",
                    "20260924160000_AddHospitalBooths",
                    "20260924180000_AddHospitalBoothVaccines",
                    "20260926080618_SyncModelSnapshot",
                    "20260926090000_EnsureAppointmentScheduleColumns",
                    "20260927220000_AddVaccineScheduleBooth"
                };

                foreach (var migrationId in baselineHistoricalMigrations)
                {
                    using var recordCmd = conn.CreateCommand();
                    recordCmd.CommandText =
                        $"INSERT INTO \"__EFMigrationsHistory\" (\"MigrationId\", \"ProductVersion\") VALUES ('{migrationId}', '8.0.11') ON CONFLICT DO NOTHING;";
                    recordCmd.ExecuteNonQuery();
                }

                var subsequentChecks = new (string MigrationId, string SqlCheck)[]
                {
                    ("20260928004401_AddAppointmentsAndBooths", "SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Appointments');"),
                    ("20260929010000_AddShiftSwapRequests", "SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ShiftSwapRequests');"),
                    ("20260929030000_AddCoverReplacementOnSwap", "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ShiftSwapRequests' AND column_name = 'CoverDoctorUserId');"),
                    ("20261001120000_AddAgentWorkflowExecutionEvidence", "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AgentWorkflowStates' AND column_name = 'Evidence');"),
                    ("20261002120000_AddBatchOpenVialDosesRemaining", "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Batches' AND column_name = 'OpenVialDosesRemaining');"),
                    ("20261002130000_AllowGuestWalkInAppointments", "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Appointments' AND column_name = 'GuestWalkInPatientName');")
                };

                foreach (var (migrationId, sqlCheck) in subsequentChecks)
                {
                    using var checkCmd = conn.CreateCommand();
                    checkCmd.CommandText = sqlCheck;
                    var exists = (bool?)checkCmd.ExecuteScalar() ?? false;
                    if (!exists) continue;

                    using var recordCmd = conn.CreateCommand();
                    recordCmd.CommandText =
                        $"INSERT INTO \"__EFMigrationsHistory\" (\"MigrationId\", \"ProductVersion\") VALUES ('{migrationId}', '8.0.11') ON CONFLICT DO NOTHING;";
                    recordCmd.ExecuteNonQuery();
                }
            }

            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseNpgsql(connectionString)
                .Options;

            using var context = new ApplicationDbContext(options);
            context.Database.Migrate();
            _migrated = true;
        }
    }
}
