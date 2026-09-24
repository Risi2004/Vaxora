using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Vaxora.Api.Data;

#nullable disable

namespace Vaxora.Api.Migrations
{
    /// <summary>
    /// Vaccines a booth can give, used to place bookings onto the right station.
    /// </summary>
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260924180000_AddHospitalBoothVaccines")]
    public partial class AddHospitalBoothVaccines : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "HospitalBoothVaccines",
                columns: table => new
                {
                    BoothId = table.Column<Guid>(type: "uuid", nullable: false),
                    VaccineId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HospitalBoothVaccines", x => new { x.BoothId, x.VaccineId });
                    table.ForeignKey(
                        name: "FK_HospitalBoothVaccines_HospitalBooths_BoothId",
                        column: x => x.BoothId,
                        principalTable: "HospitalBooths",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_HospitalBoothVaccines_Vaccines_VaccineId",
                        column: x => x.VaccineId,
                        principalTable: "Vaccines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_HospitalBoothVaccines_VaccineId",
                table: "HospitalBoothVaccines",
                column: "VaccineId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "HospitalBoothVaccines");
        }
    }
}
