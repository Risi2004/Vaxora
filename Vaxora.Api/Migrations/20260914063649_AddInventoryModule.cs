using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vaxora.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddInventoryModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ColdVaults",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HospitalProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Type = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CurrentTemp = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    TargetTemp = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Humidity = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    SensorStatus = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    AssignedLots = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ColdVaults", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ColdVaults_HospitalProfiles_HospitalProfileId",
                        column: x => x.HospitalProfileId,
                        principalTable: "HospitalProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Vaccines",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Manufacturer = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    DosesPerVial = table.Column<int>(type: "integer", nullable: false),
                    RequiredTemp = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DefaultMinThreshold = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Vaccines", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Batches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HospitalProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    VaccineId = table.Column<Guid>(type: "uuid", nullable: false),
                    BatchNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ExpiryDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    QuantityReceived = table.Column<int>(type: "integer", nullable: false),
                    QuantityAvailable = table.Column<int>(type: "integer", nullable: false),
                    StorageUnit = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Supplier = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    LastRestockedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Batches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Batches_HospitalProfiles_HospitalProfileId",
                        column: x => x.HospitalProfileId,
                        principalTable: "HospitalProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Batches_Vaccines_VaccineId",
                        column: x => x.VaccineId,
                        principalTable: "Vaccines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "HospitalFormularies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HospitalProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    VaccineId = table.Column<Guid>(type: "uuid", nullable: false),
                    RegisteredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HospitalFormularies", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HospitalFormularies_HospitalProfiles_HospitalProfileId",
                        column: x => x.HospitalProfileId,
                        principalTable: "HospitalProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_HospitalFormularies_Vaccines_VaccineId",
                        column: x => x.VaccineId,
                        principalTable: "Vaccines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "InventoryTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BatchId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "text", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    Reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    WastageReason = table.Column<string>(type: "text", nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    IncidentDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PerformedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    PerformedByName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventoryTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InventoryTransactions_Batches_BatchId",
                        column: x => x.BatchId,
                        principalTable: "Batches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_InventoryTransactions_Users_PerformedByUserId",
                        column: x => x.PerformedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Batches_ExpiryDate",
                table: "Batches",
                column: "ExpiryDate");

            migrationBuilder.CreateIndex(
                name: "IX_Batches_HospitalProfileId",
                table: "Batches",
                column: "HospitalProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_Batches_HospitalProfileId_BatchNumber",
                table: "Batches",
                columns: new[] { "HospitalProfileId", "BatchNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Batches_VaccineId",
                table: "Batches",
                column: "VaccineId");

            migrationBuilder.CreateIndex(
                name: "IX_ColdVaults_HospitalProfileId",
                table: "ColdVaults",
                column: "HospitalProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_HospitalFormularies_HospitalProfileId_VaccineId",
                table: "HospitalFormularies",
                columns: new[] { "HospitalProfileId", "VaccineId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HospitalFormularies_VaccineId",
                table: "HospitalFormularies",
                column: "VaccineId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryTransactions_BatchId",
                table: "InventoryTransactions",
                column: "BatchId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryTransactions_PerformedByUserId",
                table: "InventoryTransactions",
                column: "PerformedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryTransactions_Timestamp",
                table: "InventoryTransactions",
                column: "Timestamp");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ColdVaults");

            migrationBuilder.DropTable(
                name: "HospitalFormularies");

            migrationBuilder.DropTable(
                name: "InventoryTransactions");

            migrationBuilder.DropTable(
                name: "Batches");

            migrationBuilder.DropTable(
                name: "Vaccines");
        }
    }
}
