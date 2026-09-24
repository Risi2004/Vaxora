using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Vaxora.Api.Data;

#nullable disable

namespace Vaxora.Api.Migrations
{
    /// <summary>
    /// Adds physician-prescribed dosage columns to Appointments.
    /// Hand-written AddColumn-only migration to avoid regenerating unrelated tables.
    /// </summary>
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260920070000_AddAppointmentPrescribedDosage")]
    public partial class AddAppointmentPrescribedDosage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PrescribedDosage",
                table: "Appointments",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PrescribedByDoctorUserId",
                table: "Appointments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PrescribedByDoctorName",
                table: "Appointments",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DosageUpdatedAt",
                table: "Appointments",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "PrescribedDosage", table: "Appointments");
            migrationBuilder.DropColumn(name: "PrescribedByDoctorUserId", table: "Appointments");
            migrationBuilder.DropColumn(name: "PrescribedByDoctorName", table: "Appointments");
            migrationBuilder.DropColumn(name: "DosageUpdatedAt", table: "Appointments");
        }
    }
}
