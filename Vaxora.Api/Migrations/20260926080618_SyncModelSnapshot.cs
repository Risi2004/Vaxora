using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vaxora.Api.Migrations
{
    /// <summary>
    /// Snapshot-only sync. Earlier hand-written migrations already create these tables.
    /// This migration updates ApplicationDbContextModelSnapshot so future
    /// <c>dotnet ef migrations add</c> commands are accurate. Up/Down are intentionally empty.
    /// </summary>
    public partial class SyncModelSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
