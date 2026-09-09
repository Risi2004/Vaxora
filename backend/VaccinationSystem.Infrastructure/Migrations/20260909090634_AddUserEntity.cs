using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace VaccinationSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUserEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Username = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    Role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastLoginAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.UpdateData(
                table: "Batches",
                keyColumn: "Id",
                keyValue: new Guid("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                columns: new[] { "CreatedAt", "ExpiryDate" },
                values: new object[] { new DateTime(2026, 9, 9, 9, 6, 32, 995, DateTimeKind.Utc).AddTicks(2134), new DateTime(2027, 3, 9, 9, 6, 32, 995, DateTimeKind.Utc).AddTicks(2122) });

            migrationBuilder.UpdateData(
                table: "Batches",
                keyColumn: "Id",
                keyValue: new Guid("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
                columns: new[] { "CreatedAt", "ExpiryDate" },
                values: new object[] { new DateTime(2026, 9, 9, 9, 6, 32, 995, DateTimeKind.Utc).AddTicks(2146), new DateTime(2027, 5, 9, 9, 6, 32, 995, DateTimeKind.Utc).AddTicks(2143) });

            migrationBuilder.UpdateData(
                table: "Batches",
                keyColumn: "Id",
                keyValue: new Guid("cccccccc-cccc-cccc-cccc-cccccccccccc"),
                columns: new[] { "CreatedAt", "ExpiryDate" },
                values: new object[] { new DateTime(2026, 9, 9, 9, 6, 32, 995, DateTimeKind.Utc).AddTicks(2156), new DateTime(2026, 10, 24, 9, 6, 32, 995, DateTimeKind.Utc).AddTicks(2150) });

            migrationBuilder.UpdateData(
                table: "InventoryTransactions",
                keyColumn: "Id",
                keyValue: new Guid("99999999-9999-9999-9999-999999999999"),
                columns: new[] { "CreatedAt", "TransactionDate" },
                values: new object[] { new DateTime(2026, 9, 4, 9, 6, 32, 995, DateTimeKind.Utc).AddTicks(2320), new DateTime(2026, 9, 4, 9, 6, 32, 995, DateTimeKind.Utc).AddTicks(2319) });

            migrationBuilder.UpdateData(
                table: "InventoryTransactions",
                keyColumn: "Id",
                keyValue: new Guid("dddddddd-dddd-dddd-dddd-dddddddddddd"),
                columns: new[] { "CreatedAt", "TransactionDate" },
                values: new object[] { new DateTime(2026, 8, 30, 9, 6, 32, 995, DateTimeKind.Utc).AddTicks(2285), new DateTime(2026, 8, 30, 9, 6, 32, 995, DateTimeKind.Utc).AddTicks(2283) });

            migrationBuilder.UpdateData(
                table: "InventoryTransactions",
                keyColumn: "Id",
                keyValue: new Guid("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"),
                columns: new[] { "CreatedAt", "TransactionDate" },
                values: new object[] { new DateTime(2026, 9, 1, 9, 6, 32, 995, DateTimeKind.Utc).AddTicks(2303), new DateTime(2026, 9, 1, 9, 6, 32, 995, DateTimeKind.Utc).AddTicks(2302) });

            migrationBuilder.UpdateData(
                table: "InventoryTransactions",
                keyColumn: "Id",
                keyValue: new Guid("ffffffff-ffff-ffff-ffff-ffffffffffff"),
                columns: new[] { "CreatedAt", "TransactionDate" },
                values: new object[] { new DateTime(2026, 9, 6, 9, 6, 32, 995, DateTimeKind.Utc).AddTicks(2314), new DateTime(2026, 9, 6, 9, 6, 32, 995, DateTimeKind.Utc).AddTicks(2313) });

            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "Id", "CreatedAt", "LastLoginAt", "PasswordHash", "Role", "Username" },
                values: new object[,]
                {
                    { new Guid("11111111-1111-1111-1111-111111111111"), new DateTime(2026, 9, 9, 9, 6, 33, 166, DateTimeKind.Utc).AddTicks(844), null, "$2a$11$/PychBce6PMuWm53NsJrLuZm9T2gefcfmv4QcbLhOQeyBRh8.p8Sa", "Admin", "admin" },
                    { new Guid("22222222-2222-2222-2222-222222222222"), new DateTime(2026, 9, 9, 9, 6, 33, 325, DateTimeKind.Utc).AddTicks(2931), null, "$2a$11$TG8.s0EqBDLXasxTGh6a9ecKHKBg9VRnKo0s1c8WLrB.YcFgdEVIu", "Staff", "staff" }
                });

            migrationBuilder.UpdateData(
                table: "Vaccines",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 9, 9, 6, 32, 995, DateTimeKind.Utc).AddTicks(1917));

            migrationBuilder.UpdateData(
                table: "Vaccines",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 9, 9, 6, 32, 995, DateTimeKind.Utc).AddTicks(1921));

            migrationBuilder.UpdateData(
                table: "Vaccines",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 9, 9, 6, 32, 995, DateTimeKind.Utc).AddTicks(1925));

            migrationBuilder.CreateIndex(
                name: "IX_Users_Username",
                table: "Users",
                column: "Username",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.UpdateData(
                table: "Batches",
                keyColumn: "Id",
                keyValue: new Guid("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                columns: new[] { "CreatedAt", "ExpiryDate" },
                values: new object[] { new DateTime(2026, 9, 9, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(6124), new DateTime(2027, 3, 9, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(6110) });

            migrationBuilder.UpdateData(
                table: "Batches",
                keyColumn: "Id",
                keyValue: new Guid("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
                columns: new[] { "CreatedAt", "ExpiryDate" },
                values: new object[] { new DateTime(2026, 9, 9, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(6137), new DateTime(2027, 5, 9, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(6132) });

            migrationBuilder.UpdateData(
                table: "Batches",
                keyColumn: "Id",
                keyValue: new Guid("cccccccc-cccc-cccc-cccc-cccccccccccc"),
                columns: new[] { "CreatedAt", "ExpiryDate" },
                values: new object[] { new DateTime(2026, 9, 9, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(6166), new DateTime(2026, 10, 24, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(6160) });

            migrationBuilder.UpdateData(
                table: "InventoryTransactions",
                keyColumn: "Id",
                keyValue: new Guid("99999999-9999-9999-9999-999999999999"),
                columns: new[] { "CreatedAt", "TransactionDate" },
                values: new object[] { new DateTime(2026, 9, 4, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(6250), new DateTime(2026, 9, 4, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(6248) });

            migrationBuilder.UpdateData(
                table: "InventoryTransactions",
                keyColumn: "Id",
                keyValue: new Guid("dddddddd-dddd-dddd-dddd-dddddddddddd"),
                columns: new[] { "CreatedAt", "TransactionDate" },
                values: new object[] { new DateTime(2026, 8, 30, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(6214), new DateTime(2026, 8, 30, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(6212) });

            migrationBuilder.UpdateData(
                table: "InventoryTransactions",
                keyColumn: "Id",
                keyValue: new Guid("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"),
                columns: new[] { "CreatedAt", "TransactionDate" },
                values: new object[] { new DateTime(2026, 9, 1, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(6228), new DateTime(2026, 9, 1, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(6226) });

            migrationBuilder.UpdateData(
                table: "InventoryTransactions",
                keyColumn: "Id",
                keyValue: new Guid("ffffffff-ffff-ffff-ffff-ffffffffffff"),
                columns: new[] { "CreatedAt", "TransactionDate" },
                values: new object[] { new DateTime(2026, 9, 6, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(6239), new DateTime(2026, 9, 6, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(6238) });

            migrationBuilder.UpdateData(
                table: "Vaccines",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 9, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(5830));

            migrationBuilder.UpdateData(
                table: "Vaccines",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 9, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(5839));

            migrationBuilder.UpdateData(
                table: "Vaccines",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 9, 8, 31, 26, 980, DateTimeKind.Utc).AddTicks(5846));
        }
    }
}
