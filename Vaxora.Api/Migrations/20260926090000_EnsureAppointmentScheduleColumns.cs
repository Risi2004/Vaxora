using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Vaxora.Api.Data;

#nullable disable

namespace Vaxora.Api.Migrations
{
    /// <summary>
    /// Ensures price/payment/dosage columns exist on DBs where Appointments or
    /// VaccineSchedules already existed before create migrations (CREATE IF NOT EXISTS
    /// does not add columns to existing tables). Fully idempotent.
    /// </summary>
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260926090000_EnsureAppointmentScheduleColumns")]
    public partial class EnsureAppointmentScheduleColumns : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
ALTER TABLE ""VaccineSchedules"" ADD COLUMN IF NOT EXISTS ""Price"" numeric(18,2) NOT NULL DEFAULT 0.00;
ALTER TABLE ""Appointments"" ADD COLUMN IF NOT EXISTS ""Fee"" numeric(18,2) NOT NULL DEFAULT 0.00;
ALTER TABLE ""Appointments"" ADD COLUMN IF NOT EXISTS ""PaymentMethod"" character varying(50) NOT NULL DEFAULT 'Free';
ALTER TABLE ""Appointments"" ADD COLUMN IF NOT EXISTS ""PaymentStatus"" character varying(50) NOT NULL DEFAULT 'Paid';
ALTER TABLE ""Appointments"" ADD COLUMN IF NOT EXISTS ""PaymentTransactionId"" character varying(100) NULL;
ALTER TABLE ""Appointments"" ADD COLUMN IF NOT EXISTS ""PrescribedDosage"" character varying(100) NULL;
ALTER TABLE ""Appointments"" ADD COLUMN IF NOT EXISTS ""PrescribedByDoctorUserId"" uuid NULL;
ALTER TABLE ""Appointments"" ADD COLUMN IF NOT EXISTS ""PrescribedByDoctorName"" character varying(200) NULL;
ALTER TABLE ""Appointments"" ADD COLUMN IF NOT EXISTS ""DosageUpdatedAt"" timestamp with time zone NULL;
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Intentionally empty: do not drop columns that may hold production data.
        }
    }
}
