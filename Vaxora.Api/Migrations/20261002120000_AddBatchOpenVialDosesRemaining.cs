using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Vaxora.Api.Data;

#nullable disable

namespace Vaxora.Api.Migrations
{
    /// <summary>
    /// Tracks remaining doses on an opened multi-dose vial so administration
    /// consumes one dose rather than one whole vial.
    /// </summary>
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20261002120000_AddBatchOpenVialDosesRemaining")]
    public partial class AddBatchOpenVialDosesRemaining : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
ALTER TABLE ""Batches"" ADD COLUMN IF NOT EXISTS ""OpenVialDosesRemaining"" integer NULL;
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
ALTER TABLE ""Batches"" DROP COLUMN IF EXISTS ""OpenVialDosesRemaining"";
");
        }
    }
}
