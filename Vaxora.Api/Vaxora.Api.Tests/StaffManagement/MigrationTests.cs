using Microsoft.EntityFrameworkCore;
using Xunit;
using Vaxora.Api.Data;
using Vaxora.Api.Models;

namespace Vaxora.Api.Tests.StaffManagement;

/// <summary>
/// Staff Management — EF model / migration surface for staff tables.
/// </summary>
public class MigrationTests
{
    [Fact]
    public void ApplicationDbContext_includes_staff_and_agent_entities()
    {
        using var context = TestDb.CreateContext();
        var model = context.Model;

        Assert.NotNull(model.FindEntityType(typeof(StaffAffiliation)));
        Assert.NotNull(model.FindEntityType(typeof(StaffShift)));
        Assert.NotNull(model.FindEntityType(typeof(ShiftSwapRequest)));
        Assert.NotNull(model.FindEntityType(typeof(AgentWorkflow)));
        Assert.NotNull(model.FindEntityType(typeof(HospitalBooth)));
    }

    [Fact]
    public void StaffShift_has_required_fk_to_affiliation_and_date_index()
    {
        using var context = TestDb.CreateContext();
        var entity = context.Model.FindEntityType(typeof(StaffShift));
        Assert.NotNull(entity);

        var affiliationFk = entity!.GetForeignKeys()
            .SingleOrDefault(fk => fk.PrincipalEntityType.ClrType == typeof(StaffAffiliation));
        Assert.NotNull(affiliationFk);
        Assert.Contains(affiliationFk!.Properties, p => p.Name == nameof(StaffShift.AffiliationId));

        var indexes = entity.GetIndexes().Select(i => string.Join(",", i.Properties.Select(p => p.Name))).ToList();
        Assert.Contains(indexes, name => name.Contains(nameof(StaffShift.AffiliationId), StringComparison.Ordinal)
                                         && name.Contains(nameof(StaffShift.ShiftDate), StringComparison.Ordinal));
    }

    [Fact]
    public void StaffAffiliation_has_hospital_staff_composite_index()
    {
        using var context = TestDb.CreateContext();
        var entity = context.Model.FindEntityType(typeof(StaffAffiliation));
        Assert.NotNull(entity);

        var indexes = entity!.GetIndexes().Select(i => string.Join(",", i.Properties.Select(p => p.Name))).ToList();
        Assert.Contains(indexes, name =>
            name.Contains(nameof(StaffAffiliation.HospitalUserId), StringComparison.Ordinal) &&
            name.Contains(nameof(StaffAffiliation.StaffUserId), StringComparison.Ordinal));
    }

    [Fact]
    public void GenerateCreateScript_includes_staff_tables()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql("Host=localhost;Database=vaxora_migration_probe;Username=postgres;Password=postgres")
            .Options;

        using var context = new ApplicationDbContext(options);
        var script = context.Database.GenerateCreateScript();

        Assert.Contains("StaffAffiliations", script, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("StaffShifts", script, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("ShiftSwapRequests", script, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("AgentWorkflows", script, StringComparison.OrdinalIgnoreCase);
    }
}
