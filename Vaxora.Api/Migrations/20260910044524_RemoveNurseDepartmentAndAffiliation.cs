using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vaxora.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveNurseDepartmentAndAffiliation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Department",
                table: "NurseProfiles");

            migrationBuilder.DropColumn(
                name: "HospitalAffiliation",
                table: "NurseProfiles");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Department",
                table: "NurseProfiles",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HospitalAffiliation",
                table: "NurseProfiles",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);
        }
    }
}
