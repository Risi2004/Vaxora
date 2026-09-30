using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Vaxora.Api.Data;

#nullable disable

namespace Vaxora.Api.Migrations
{
    /// <summary>
    /// Links immunization schedule slots to a hospital booth.
    /// </summary>
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260927220000_AddVaccineScheduleBooth")]
    public partial class AddVaccineScheduleBooth : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
ALTER TABLE ""VaccineSchedules"" ADD COLUMN IF NOT EXISTS ""BoothId"" uuid NULL;
ALTER TABLE ""VaccineSchedules"" ADD COLUMN IF NOT EXISTS ""BoothLabel"" character varying(120) NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'FK_VaccineSchedules_HospitalBooths_BoothId'
    ) THEN
        ALTER TABLE ""VaccineSchedules""
            ADD CONSTRAINT ""FK_VaccineSchedules_HospitalBooths_BoothId""
            FOREIGN KEY (""BoothId"") REFERENCES ""HospitalBooths"" (""Id"")
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ""IX_VaccineSchedules_BoothId"" ON ""VaccineSchedules"" (""BoothId"");
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
ALTER TABLE ""VaccineSchedules"" DROP CONSTRAINT IF EXISTS ""FK_VaccineSchedules_HospitalBooths_BoothId"";
DROP INDEX IF EXISTS ""IX_VaccineSchedules_BoothId"";
ALTER TABLE ""VaccineSchedules"" DROP COLUMN IF EXISTS ""BoothLabel"";
ALTER TABLE ""VaccineSchedules"" DROP COLUMN IF EXISTS ""BoothId"";
");
        }
    }
}
