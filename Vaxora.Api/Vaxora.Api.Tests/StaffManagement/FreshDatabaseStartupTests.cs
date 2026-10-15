using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using Xunit;
using Vaxora.Api.Data;
using Vaxora.Api.Services;

namespace Vaxora.Api.Tests.StaffManagement;

/// <summary>
/// Staff Management — runs the real startup path (DbInitializer.SeedAsync) against a brand-new,
/// empty PostgreSQL database and checks the schema the staff endpoints depend on.
/// Regression for: fresh databases missing VaccineSchedules.BoothId, which made
/// GET /api/staff/coverage return 500.
/// Needs TEST_POSTGRESQL_CONNECTION (a server where the user may CREATE DATABASE, as in CI);
/// it never falls back to .env so it cannot touch the shared database.
/// </summary>
public class FreshDatabaseStartupTests
{
    [Fact]
    public async Task Startup_on_empty_database_creates_vaccine_schedule_booth_columns()
    {
        var serverConn = Environment.GetEnvironmentVariable("TEST_POSTGRESQL_CONNECTION");
        if (string.IsNullOrWhiteSpace(serverConn))
            return; // Not configured locally; CI always sets it.

        var dbName = $"vaxora_fresh_{Guid.NewGuid():N}";
        var freshConn = new NpgsqlConnectionStringBuilder(serverConn) { Database = dbName, Pooling = false }.ConnectionString;
        await ExecuteOnServerAsync(serverConn, $"CREATE DATABASE \"{dbName}\"");

        try
        {
            var services = new ServiceCollection();
            services.AddLogging();
            services.AddDbContext<ApplicationDbContext>(o => o.UseNpgsql(freshConn));
            services.AddSingleton<IPasswordHasher, PasswordHasher>();
            using var provider = services.BuildServiceProvider();
            var config = new ConfigurationBuilder().Build();

            await DbInitializer.SeedAsync(provider, config);

            await using var conn = new NpgsqlConnection(freshConn);
            await conn.OpenAsync();

            Assert.True(await ColumnExistsAsync(conn, "VaccineSchedules", "BoothId"),
                "VaccineSchedules.BoothId missing after startup on a fresh database");
            Assert.True(await ColumnExistsAsync(conn, "VaccineSchedules", "BoothLabel"),
                "VaccineSchedules.BoothLabel missing after startup on a fresh database");
            Assert.True(await ScalarExistsAsync(conn,
                "SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_VaccineSchedules_HospitalBooths_BoothId')"),
                "Booth foreign key missing after startup on a fresh database");

            // The coverage query reads schedules by booth through EF; it must run without a schema error.
            using var scope = provider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var exception = await Record.ExceptionAsync(() =>
                context.VaccineSchedules.Where(v => v.BoothId != null).Select(v => v.BoothLabel).ToListAsync());
            Assert.Null(exception);
        }
        finally
        {
            NpgsqlConnection.ClearAllPools();
            await ExecuteOnServerAsync(serverConn, $"DROP DATABASE IF EXISTS \"{dbName}\" WITH (FORCE)");
        }
    }

    /// <summary>
    /// Regression for: startup against a server where the database had not been created yet.
    /// The migration baseline could not be recorded, so the old migrations ran for real, collided
    /// with the consolidated baseline migration and left the schema half built
    /// (no ShiftSwapRequests table, staff endpoints returned 500).
    /// </summary>
    [Fact]
    public async Task Startup_when_database_does_not_exist_yet_builds_the_full_schema()
    {
        var serverConn = Environment.GetEnvironmentVariable("TEST_POSTGRESQL_CONNECTION");
        if (string.IsNullOrWhiteSpace(serverConn))
            return; // Not configured locally; CI always sets it.

        // Deliberately not created here: startup has to cope with a missing database.
        var dbName = $"vaxora_missing_{Guid.NewGuid():N}";
        var missingConn = new NpgsqlConnectionStringBuilder(serverConn) { Database = dbName, Pooling = false }.ConnectionString;

        try
        {
            var services = new ServiceCollection();
            services.AddLogging();
            services.AddDbContext<ApplicationDbContext>(o => o.UseNpgsql(missingConn));
            services.AddSingleton<IPasswordHasher, PasswordHasher>();
            using var provider = services.BuildServiceProvider();
            var config = new ConfigurationBuilder().Build();

            await DbInitializer.SeedAsync(provider, config);

            await using var conn = new NpgsqlConnection(missingConn);
            await conn.OpenAsync();

            Assert.True(await ScalarExistsAsync(conn,
                "SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ShiftSwapRequests')"),
                "ShiftSwapRequests table missing after startup created the database");
            Assert.True(await ColumnExistsAsync(conn, "VaccineSchedules", "BoothId"),
                "VaccineSchedules.BoothId missing after startup created the database");
            Assert.True(await ColumnExistsAsync(conn, "HospitalFormularies", "Price"),
                "HospitalFormularies.Price missing after startup created the database");

            // Every migration must be recorded, so the next start has nothing left to apply.
            using var scope = provider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            Assert.Empty(await context.Database.GetPendingMigrationsAsync());

            // The cover request inbox reads this table through EF; it must run without a schema error.
            var exception = await Record.ExceptionAsync(() => context.ShiftSwapRequests.CountAsync());
            Assert.Null(exception);
        }
        finally
        {
            NpgsqlConnection.ClearAllPools();
            await ExecuteOnServerAsync(serverConn, $"DROP DATABASE IF EXISTS \"{dbName}\" WITH (FORCE)");
        }
    }

    private static async Task ExecuteOnServerAsync(string serverConn, string sql)
    {
        var maintenance = new NpgsqlConnectionStringBuilder(serverConn) { Database = "postgres", Pooling = false }.ConnectionString;
        await using var conn = new NpgsqlConnection(maintenance);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(sql, conn);
        await cmd.ExecuteNonQueryAsync();
    }

    private static Task<bool> ColumnExistsAsync(NpgsqlConnection conn, string table, string column) =>
        ScalarExistsAsync(conn,
            $"SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '{table}' AND column_name = '{column}')");

    private static async Task<bool> ScalarExistsAsync(NpgsqlConnection conn, string sql)
    {
        await using var cmd = new NpgsqlCommand(sql, conn);
        return (bool)(await cmd.ExecuteScalarAsync())!;
    }
}
