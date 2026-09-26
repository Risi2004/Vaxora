using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Vaxora.Api.Data;

#nullable disable

namespace Vaxora.Api.Migrations
{
    /// <summary>
    /// Adds physician-prescribed dosage columns to Appointments.
    /// Idempotent so fresh DBs and DBs that already applied these via DbInitializer both work.
    /// </summary>
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260920070000_AddAppointmentPrescribedDosage")]
    public partial class AddAppointmentPrescribedDosage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
ALTER TABLE ""Appointments"" ADD COLUMN IF NOT EXISTS ""PrescribedDosage"" character varying(100) NULL;
ALTER TABLE ""Appointments"" ADD COLUMN IF NOT EXISTS ""PrescribedByDoctorUserId"" uuid NULL;
ALTER TABLE ""Appointments"" ADD COLUMN IF NOT EXISTS ""PrescribedByDoctorName"" character varying(200) NULL;
ALTER TABLE ""Appointments"" ADD COLUMN IF NOT EXISTS ""DosageUpdatedAt"" timestamp with time zone NULL;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
ALTER TABLE ""Appointments"" DROP COLUMN IF EXISTS ""PrescribedDosage"";
ALTER TABLE ""Appointments"" DROP COLUMN IF EXISTS ""PrescribedByDoctorUserId"";
ALTER TABLE ""Appointments"" DROP COLUMN IF EXISTS ""PrescribedByDoctorName"";
ALTER TABLE ""Appointments"" DROP COLUMN IF EXISTS ""DosageUpdatedAt"";
");
        }
    }
}
