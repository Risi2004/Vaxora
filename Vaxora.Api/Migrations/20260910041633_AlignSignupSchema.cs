using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vaxora.Api.Migrations
{
    /// <inheritdoc />
    public partial class AlignSignupSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Address",
                table: "PatientProfiles");

            migrationBuilder.DropColumn(
                name: "BloodGroup",
                table: "PatientProfiles");

            migrationBuilder.DropColumn(
                name: "EmergencyContactName",
                table: "PatientProfiles");

            migrationBuilder.DropColumn(
                name: "EmergencyContactPhone",
                table: "PatientProfiles");

            migrationBuilder.DropColumn(
                name: "YearsOfExperience",
                table: "NurseProfiles");

            migrationBuilder.DropColumn(
                name: "YearsOfExperience",
                table: "DoctorProfiles");

            migrationBuilder.RenameColumn(
                name: "Gender",
                table: "PatientProfiles",
                newName: "PhoneNumber");

            migrationBuilder.AddColumn<string>(
                name: "ProfilePhotoUrl",
                table: "PatientProfiles",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PhoneNumber",
                table: "NurseProfiles",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Address",
                table: "HospitalProfiles",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500,
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OperatingHours",
                table: "HospitalProfiles",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PhoneNumber",
                table: "DoctorProfiles",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProfilePhotoUrl",
                table: "PatientProfiles");

            migrationBuilder.DropColumn(
                name: "PhoneNumber",
                table: "NurseProfiles");

            migrationBuilder.DropColumn(
                name: "OperatingHours",
                table: "HospitalProfiles");

            migrationBuilder.DropColumn(
                name: "PhoneNumber",
                table: "DoctorProfiles");

            migrationBuilder.RenameColumn(
                name: "PhoneNumber",
                table: "PatientProfiles",
                newName: "Gender");

            migrationBuilder.AddColumn<string>(
                name: "Address",
                table: "PatientProfiles",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BloodGroup",
                table: "PatientProfiles",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmergencyContactName",
                table: "PatientProfiles",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmergencyContactPhone",
                table: "PatientProfiles",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "YearsOfExperience",
                table: "NurseProfiles",
                type: "integer",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Address",
                table: "HospitalProfiles",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500);

            migrationBuilder.AddColumn<int>(
                name: "YearsOfExperience",
                table: "DoctorProfiles",
                type: "integer",
                nullable: true);
        }
    }
}
