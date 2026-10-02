using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Vaxora.Api.Data;

#nullable disable

namespace Vaxora.Api.Migrations
{
    /// <summary>
    /// Allows guest walk-in appointments without a registered patient user account.
    /// </summary>
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20261002130000_AllowGuestWalkInAppointments")]
    public partial class AllowGuestWalkInAppointments : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
ALTER TABLE ""Appointments"" DROP CONSTRAINT IF EXISTS ""FK_Appointments_Users_PatientUserId"";
ALTER TABLE ""Appointments"" ALTER COLUMN ""PatientUserId"" DROP NOT NULL;
ALTER TABLE ""Appointments""
    ADD CONSTRAINT ""FK_Appointments_Users_PatientUserId""
    FOREIGN KEY (""PatientUserId"") REFERENCES ""Users"" (""Id"") ON DELETE SET NULL;
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
ALTER TABLE ""Appointments"" DROP CONSTRAINT IF EXISTS ""FK_Appointments_Users_PatientUserId"";
UPDATE ""Appointments"" SET ""PatientUserId"" = ""HospitalUserId"" WHERE ""PatientUserId"" IS NULL;
ALTER TABLE ""Appointments"" ALTER COLUMN ""PatientUserId"" SET NOT NULL;
ALTER TABLE ""Appointments""
    ADD CONSTRAINT ""FK_Appointments_Users_PatientUserId""
    FOREIGN KEY (""PatientUserId"") REFERENCES ""Users"" (""Id"") ON DELETE CASCADE;
");
        }
    }
}
