using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Vaxora.Api.Data;

#nullable disable

namespace Vaxora.Api.Migrations
{
    /// <summary>
    /// Records who took a covered shift so staff can see incoming assignments.
    /// </summary>
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260929030000_AddCoverReplacementOnSwap")]
    public partial class AddCoverReplacementOnSwap : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ReplacementUserId",
                table: "ShiftSwapRequests",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ReplacementAffiliationId",
                table: "ShiftSwapRequests",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReplacementName",
                table: "ShiftSwapRequests",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ShiftSwapRequests_ReplacementUserId",
                table: "ShiftSwapRequests",
                column: "ReplacementUserId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ShiftSwapRequests_ReplacementUserId",
                table: "ShiftSwapRequests");

            migrationBuilder.DropColumn(name: "ReplacementName", table: "ShiftSwapRequests");
            migrationBuilder.DropColumn(name: "ReplacementAffiliationId", table: "ShiftSwapRequests");
            migrationBuilder.DropColumn(name: "ReplacementUserId", table: "ShiftSwapRequests");
        }
    }
}
