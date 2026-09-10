using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vaxora.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveDoctorHospitalAffiliation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HospitalAffiliation",
                table: "DoctorProfiles");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "HospitalAffiliation",
                table: "DoctorProfiles",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);
        }
    }
}
