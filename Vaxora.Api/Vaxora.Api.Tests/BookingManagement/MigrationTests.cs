using Microsoft.EntityFrameworkCore;
using Xunit;
using Vaxora.Api.Data;
using Vaxora.Api.Models;

namespace Vaxora.Api.Tests.BookingManagement;

public class MigrationTests
{
    private static ApplicationDbContext CreateContextWithNpgsqlModel()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql("Host=dummy_host;Database=dummy_db;Username=dummy;Password=dummy")
            .Options;

        return new ApplicationDbContext(options);
    }

    [Fact]
    public void ModelBuilder_configures_all_essential_entity_types_correctly()
    {
        using var context = CreateContextWithNpgsqlModel();
        var model = context.Model;

        // Verify key tables exist in the model
        Assert.NotNull(model.FindEntityType(typeof(User)));
        Assert.NotNull(model.FindEntityType(typeof(PatientProfile)));
        Assert.NotNull(model.FindEntityType(typeof(DoctorProfile)));
        Assert.NotNull(model.FindEntityType(typeof(NurseProfile)));
        Assert.NotNull(model.FindEntityType(typeof(HospitalProfile)));
        Assert.NotNull(model.FindEntityType(typeof(Appointment)));
        Assert.NotNull(model.FindEntityType(typeof(VaccineSchedule)));
        Assert.NotNull(model.FindEntityType(typeof(Vaccine)));
        Assert.NotNull(model.FindEntityType(typeof(Batch)));
        Assert.NotNull(model.FindEntityType(typeof(ColdVault)));
        Assert.NotNull(model.FindEntityType(typeof(HospitalBooth)));
        Assert.NotNull(model.FindEntityType(typeof(StaffAffiliation)));
        Assert.NotNull(model.FindEntityType(typeof(StaffShift)));
        Assert.NotNull(model.FindEntityType(typeof(ShiftSwapRequest)));
        Assert.NotNull(model.FindEntityType(typeof(PatientVaccinationRecord)));
        Assert.NotNull(model.FindEntityType(typeof(PatientMedicalHistory)));
        Assert.NotNull(model.FindEntityType(typeof(PatientVisit)));
        Assert.NotNull(model.FindEntityType(typeof(AgentWorkflow)));
    }

    [Fact]
    public void ModelBuilder_configures_registration_number_sequences()
    {
        using var context = CreateContextWithNpgsqlModel();
        var sequences = context.Model.GetSequences().Select(s => s.Name).ToHashSet();

        Assert.Contains("vaxora_seq_patient", sequences);
        Assert.Contains("vaxora_seq_doctor", sequences);
        Assert.Contains("vaxora_seq_nurse", sequences);
        Assert.Contains("vaxora_seq_hospital", sequences);
        Assert.Contains("vaxora_seq_admin", sequences);
    }

    [Fact]
    public void ModelBuilder_configures_unique_indexes_for_identity_fields()
    {
        using var context = CreateContextWithNpgsqlModel();
        var userEntity = context.Model.FindEntityType(typeof(User));
        Assert.NotNull(userEntity);

        // Check unique index on Email and RegistrationNumber
        var emailIndex = userEntity.FindIndex(userEntity.FindProperty(nameof(User.Email))!);
        Assert.NotNull(emailIndex);
        Assert.True(emailIndex.IsUnique);

        var regNumIndex = userEntity.FindIndex(userEntity.FindProperty(nameof(User.RegistrationNumber))!);
        Assert.NotNull(regNumIndex);
        Assert.True(regNumIndex.IsUnique);
    }

    [Fact]
    public void MigrationScript_generates_valid_ddl_without_model_exceptions()
    {
        using var context = CreateContextWithNpgsqlModel();

        // GenerateCreateScript translates all entity configs, column types, and constraints into DDL SQL
        var ddlSql = context.Database.GenerateCreateScript();

        Assert.NotNull(ddlSql);
        Assert.NotEmpty(ddlSql);
        Assert.Contains("CREATE TABLE", ddlSql);
        Assert.Contains("CREATE SEQUENCE", ddlSql);
        Assert.Contains("vaxora_seq_patient", ddlSql);
        Assert.Contains("Users", ddlSql);
        Assert.Contains("Appointments", ddlSql);
        Assert.Contains("Batches", ddlSql);
    }

    [Fact]
    public void ModelBuilder_configures_foreign_key_relationships_correctly()
    {
        using var context = CreateContextWithNpgsqlModel();
        var appointmentEntity = context.Model.FindEntityType(typeof(Appointment));
        Assert.NotNull(appointmentEntity);

        // Verify foreign key relations on Appointment
        var fks = appointmentEntity.GetForeignKeys();
        Assert.Contains(fks, fk => fk.PrincipalEntityType.ClrType == typeof(User));
    }
}
