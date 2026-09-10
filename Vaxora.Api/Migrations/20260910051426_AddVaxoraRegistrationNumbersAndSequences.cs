using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vaxora.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddVaxoraRegistrationNumbersAndSequences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateSequence(
                name: "vaxora_seq_admin",
                startValue: 1000L);

            migrationBuilder.CreateSequence(
                name: "vaxora_seq_doctor",
                startValue: 1000L);

            migrationBuilder.CreateSequence(
                name: "vaxora_seq_hospital",
                startValue: 1000L);

            migrationBuilder.CreateSequence(
                name: "vaxora_seq_nurse",
                startValue: 1000L);

            migrationBuilder.CreateSequence(
                name: "vaxora_seq_patient",
                startValue: 1000L);

            migrationBuilder.AddColumn<string>(
                name: "RegistrationNumber",
                table: "Users",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_RegistrationNumber",
                table: "Users",
                column: "RegistrationNumber",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_RegistrationNumber",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "RegistrationNumber",
                table: "Users");

            migrationBuilder.DropSequence(
                name: "vaxora_seq_admin");

            migrationBuilder.DropSequence(
                name: "vaxora_seq_doctor");

            migrationBuilder.DropSequence(
                name: "vaxora_seq_hospital");

            migrationBuilder.DropSequence(
                name: "vaxora_seq_nurse");

            migrationBuilder.DropSequence(
                name: "vaxora_seq_patient");
        }
    }
}
