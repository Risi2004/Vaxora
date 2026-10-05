using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vaxora.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddFeedback : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // The VaccineSchedules -> HospitalBooths FK is a no-op repair that EF
            // emitted because the model snapshot drifted from the real schema.
            // On a fresh database the constraint was never created, so a plain
            // DropForeignKey throws 42704. Make both sides idempotent with raw SQL.
            migrationBuilder.Sql(@"
                ALTER TABLE ""VaccineSchedules""
                DROP CONSTRAINT IF EXISTS ""FK_VaccineSchedules_HospitalBooths_BoothId"";
            ");

            migrationBuilder.CreateTable(
                name: "Feedbacks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsAnonymous = table.Column<bool>(type: "boolean", nullable: false),
                    SubmitterName = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    SubmitterEmail = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    SubmitterPhone = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    HospitalName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Category = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Subject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Message = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    Rating = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    AdminResponse = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    RepliedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    InternalNotes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Feedbacks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Feedbacks_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Feedbacks_UserId_CreatedAt",
                table: "Feedbacks",
                columns: new[] { "UserId", "CreatedAt" },
                descending: new[] { false, true });

            // Only add the FK if it does not already exist — safe on both fresh
            // databases and databases that already have the constraint.
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint
                        WHERE conname = 'FK_VaccineSchedules_HospitalBooths_BoothId'
                    ) THEN
                        ALTER TABLE ""VaccineSchedules""
                        ADD CONSTRAINT ""FK_VaccineSchedules_HospitalBooths_BoothId""
                        FOREIGN KEY (""BoothId"") REFERENCES ""HospitalBooths"" (""Id"");
                    END IF;
                END $$;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE ""VaccineSchedules""
                DROP CONSTRAINT IF EXISTS ""FK_VaccineSchedules_HospitalBooths_BoothId"";
            ");

            migrationBuilder.DropTable(
                name: "Feedbacks");

            // Restore the original FK definition (with SetNull, matching the
            // original migration that introduced it). Guarded so it is safe
            // to roll back even if the constraint was already restored.
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint
                        WHERE conname = 'FK_VaccineSchedules_HospitalBooths_BoothId'
                    ) THEN
                        ALTER TABLE ""VaccineSchedules""
                        ADD CONSTRAINT ""FK_VaccineSchedules_HospitalBooths_BoothId""
                        FOREIGN KEY (""BoothId"") REFERENCES ""HospitalBooths"" (""Id"")
                        ON DELETE SET NULL;
                    END IF;
                END $$;
            ");
        }
    }
}