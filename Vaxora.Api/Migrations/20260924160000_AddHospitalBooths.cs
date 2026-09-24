using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Vaxora.Api.Data;

#nullable disable

namespace Vaxora.Api.Migrations
{
    /// <summary>
    /// Hospital-configured vaccination booths, optionally linked from staff shifts.
    /// </summary>
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260924160000_AddHospitalBooths")]
    public partial class AddHospitalBooths : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "HospitalBooths",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HospitalUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HospitalBooths", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HospitalBooths_Users_HospitalUserId",
                        column: x => x.HospitalUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_HospitalBooths_HospitalUserId_Code",
                table: "HospitalBooths",
                columns: new[] { "HospitalUserId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HospitalBooths_HospitalUserId_IsActive_SortOrder",
                table: "HospitalBooths",
                columns: new[] { "HospitalUserId", "IsActive", "SortOrder" });

            migrationBuilder.AddColumn<Guid>(
                name: "BoothId",
                table: "StaffShifts",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_StaffShifts_BoothId",
                table: "StaffShifts",
                column: "BoothId");

            migrationBuilder.AddForeignKey(
                name: "FK_StaffShifts_HospitalBooths_BoothId",
                table: "StaffShifts",
                column: "BoothId",
                principalTable: "HospitalBooths",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_StaffShifts_HospitalBooths_BoothId",
                table: "StaffShifts");

            migrationBuilder.DropIndex(
                name: "IX_StaffShifts_BoothId",
                table: "StaffShifts");

            migrationBuilder.DropColumn(
                name: "BoothId",
                table: "StaffShifts");

            migrationBuilder.DropTable(
                name: "HospitalBooths");
        }
    }
}
