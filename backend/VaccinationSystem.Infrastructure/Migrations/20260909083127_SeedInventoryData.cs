using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace VaccinationSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SeedInventoryData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Vaccines",
                columns: new[] { "Id", "CreatedAt", "Dosage", "Manufacturer", "Name", "Type", "UpdatedAt" },
                values: new object[,]
                {
                    { new Guid("11111111-1111-1111-1111-111111111111"), new DateTime(2026, 9, 9, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(5830), "0.3ml", "Pfizer", "Pfizer-BioNTech", "mRNA", null },
                    { new Guid("22222222-2222-2222-2222-222222222222"), new DateTime(2026, 9, 9, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(5839), "0.5ml", "Moderna", "Moderna", "mRNA", null },
                    { new Guid("33333333-3333-3333-3333-333333333333"), new DateTime(2026, 9, 9, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(5846), "0.5ml", "AstraZeneca", "AstraZeneca", "Viral Vector", null }
                });

            migrationBuilder.InsertData(
                table: "Batches",
                columns: new[] { "Id", "BatchNumber", "CreatedAt", "ExpiryDate", "QuantityAvailable", "QuantityReceived", "StorageLocation", "Supplier", "UpdatedAt", "VaccineId" },
                values: new object[,]
                {
                    { new Guid("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"), "PF-2024-001", new DateTime(2026, 9, 9, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(6124), new DateTime(2027, 3, 9, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(6110), 100, 100, "Fridge A1", "Pfizer Inc.", null, new Guid("11111111-1111-1111-1111-111111111111") },
                    { new Guid("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"), "MOD-2024-002", new DateTime(2026, 9, 9, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(6137), new DateTime(2027, 5, 9, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(6132), 145, 150, "Fridge B2", "Moderna Therapeutics", null, new Guid("22222222-2222-2222-2222-222222222222") },
                    { new Guid("cccccccc-cccc-cccc-cccc-cccccccccccc"), "AZ-2024-003", new DateTime(2026, 9, 9, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(6166), new DateTime(2026, 10, 24, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(6160), 200, 200, "Room C3", "AstraZeneca UK", null, new Guid("33333333-3333-3333-3333-333333333333") }
                });

            migrationBuilder.InsertData(
                table: "InventoryTransactions",
                columns: new[] { "Id", "BatchId", "CreatedAt", "PerformedBy", "Quantity", "Reason", "TransactionDate", "Type" },
                values: new object[,]
                {
                    { new Guid("99999999-9999-9999-9999-999999999999"), new Guid("cccccccc-cccc-cccc-cccc-cccccccccccc"), new DateTime(2026, 9, 4, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(6250), null, 200, "Initial stock receipt", new DateTime(2026, 9, 4, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(6248), 0 },
                    { new Guid("dddddddd-dddd-dddd-dddd-dddddddddddd"), new Guid("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"), new DateTime(2026, 8, 30, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(6214), null, 100, "Initial stock receipt", new DateTime(2026, 8, 30, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(6212), 0 },
                    { new Guid("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"), new Guid("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"), new DateTime(2026, 9, 1, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(6228), null, 150, "Initial stock receipt", new DateTime(2026, 9, 1, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(6226), 0 },
                    { new Guid("ffffffff-ffff-ffff-ffff-ffffffffffff"), new Guid("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"), new DateTime(2026, 9, 6, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(6239), null, 5, "Issued to Vaccination Session #101", new DateTime(2026, 9, 6, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(6238), 1 }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "InventoryTransactions",
                keyColumn: "Id",
                keyValue: new Guid("99999999-9999-9999-9999-999999999999"));

            migrationBuilder.DeleteData(
                table: "InventoryTransactions",
                keyColumn: "Id",
                keyValue: new Guid("dddddddd-dddd-dddd-dddd-dddddddddddd"));

            migrationBuilder.DeleteData(
                table: "InventoryTransactions",
                keyColumn: "Id",
                keyValue: new Guid("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"));

            migrationBuilder.DeleteData(
                table: "InventoryTransactions",
                keyColumn: "Id",
                keyValue: new Guid("ffffffff-ffff-ffff-ffff-ffffffffffff"));

            migrationBuilder.DeleteData(
                table: "Batches",
                keyColumn: "Id",
                keyValue: new Guid("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"));

            migrationBuilder.DeleteData(
                table: "Batches",
                keyColumn: "Id",
                keyValue: new Guid("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"));

            migrationBuilder.DeleteData(
                table: "Batches",
                keyColumn: "Id",
                keyValue: new Guid("cccccccc-cccc-cccc-cccc-cccccccccccc"));

            migrationBuilder.DeleteData(
                table: "Vaccines",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.DeleteData(
                table: "Vaccines",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"));

            migrationBuilder.DeleteData(
                table: "Vaccines",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"));
        }
    }
}
