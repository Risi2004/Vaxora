using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vaxora.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAppointmentsAndBooths : Migration
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

            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    UserEmail = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    Role = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Action = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Details = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    IpAddress = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    Role = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    PhoneNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    RegistrationNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    RefreshToken = table.Column<string>(type: "text", nullable: true),
                    RefreshTokenExpiryTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ResetPasswordToken = table.Column<string>(type: "text", nullable: true),
                    ResetPasswordExpiryTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastLoginAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
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
                name: "AgentWorkflows",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    AgentName = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Objective = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    ProposalsJson = table.Column<string>(type: "text", nullable: false),
                    ResultSummary = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    DecidedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DecisionNote = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AgentWorkflows", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AgentWorkflows_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DoctorProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    FullName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SlmcNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Specialization = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PhoneNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    ProfilePhotoUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    SlmcCardDocKey = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SupportingDocKey = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    VerificationStatus = table.Column<string>(type: "text", nullable: false),
                    VerifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    VerifiedByAdminId = table.Column<Guid>(type: "uuid", nullable: true),
                    RejectionReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DoctorProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DoctorProfiles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "HospitalBooths",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HospitalUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HospitalBooths", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HospitalBooths_Users_HospitalUserId",
                        column: x => x.HospitalUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "HospitalProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    HospitalName = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    RegistrationNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    HospitalType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    OperatingHours = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    District = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Province = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ContactNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    LogoUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    RegistrationDocKey = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    MohDocKey = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    VerificationStatus = table.Column<string>(type: "text", nullable: false),
                    VerifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    VerifiedByAdminId = table.Column<Guid>(type: "uuid", nullable: true),
                    RejectionReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HospitalProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HospitalProfiles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NurseProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    FullName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SlncNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PhoneNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    ProfilePhotoUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    SlncCardDocKey = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SupportingDocKey = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    VerificationStatus = table.Column<string>(type: "text", nullable: false),
                    VerifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    VerifiedByAdminId = table.Column<Guid>(type: "uuid", nullable: true),
                    RejectionReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NurseProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NurseProfiles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PatientProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    FullName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    NicNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    DateOfBirth = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PhoneNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    ProfilePhotoUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PatientProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PatientProfiles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "StaffAffiliations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HospitalUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    StaffUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    StaffRole = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    DutyStatus = table.Column<string>(type: "text", nullable: false),
                    DutyUpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DutyUpdatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    InvitedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    InvitedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RespondedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StaffAffiliations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StaffAffiliations_Users_HospitalUserId",
                        column: x => x.HospitalUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StaffAffiliations_Users_StaffUserId",
                        column: x => x.StaffUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "VaccineSchedules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HospitalUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    HospitalProfileId = table.Column<Guid>(type: "uuid", nullable: true),
                    DoctorUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DoctorName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    NurseUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    NurseName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    VaccineId = table.Column<Guid>(type: "uuid", nullable: true),
                    VaccineName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ScheduleType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SpecificDate = table.Column<DateOnly>(type: "date", nullable: true),
                    DaysOfWeek = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: true),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: true),
                    StartTime = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    EndTime = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0.00m),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VaccineSchedules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VaccineSchedules_Users_DoctorUserId",
                        column: x => x.DoctorUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_VaccineSchedules_Users_HospitalUserId",
                        column: x => x.HospitalUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_VaccineSchedules_Users_NurseUserId",
                        column: x => x.NurseUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_VaccineSchedules_Vaccines_VaccineId",
                        column: x => x.VaccineId,
                        principalTable: "Vaccines",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "HospitalBoothVaccines",
                columns: table => new
                {
                    BoothId = table.Column<Guid>(type: "uuid", nullable: false),
                    VaccineId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HospitalBoothVaccines", x => new { x.BoothId, x.VaccineId });
                    table.ForeignKey(
                        name: "FK_HospitalBoothVaccines_HospitalBooths_BoothId",
                        column: x => x.BoothId,
                        principalTable: "HospitalBooths",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_HospitalBoothVaccines_Vaccines_VaccineId",
                        column: x => x.VaccineId,
                        principalTable: "Vaccines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
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
                name: "PatientMedicalHistories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    RecordType = table.Column<string>(type: "text", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Severity = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    Icd10Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    DiagnosedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ResolvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RecordedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    RecordedByName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PatientMedicalHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PatientMedicalHistories_PatientProfiles_PatientProfileId",
                        column: x => x.PatientProfileId,
                        principalTable: "PatientProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PatientMedicalHistories_Users_RecordedByUserId",
                        column: x => x.RecordedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "PatientVisits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    DoctorUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DoctorName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    NurseUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    NurseName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    HospitalProfileId = table.Column<Guid>(type: "uuid", nullable: true),
                    AppointmentId = table.Column<Guid>(type: "uuid", nullable: true),
                    VisitDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    VisitType = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    ChiefComplaint = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    BloodPressure = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Temperature = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    WeightKg = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    HeightCm = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    HeartRate = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    OxygenSaturation = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    DiagnosisSummary = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    TreatmentPlan = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    FollowUpDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PatientVisits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PatientVisits_HospitalProfiles_HospitalProfileId",
                        column: x => x.HospitalProfileId,
                        principalTable: "HospitalProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PatientVisits_PatientProfiles_PatientProfileId",
                        column: x => x.PatientProfileId,
                        principalTable: "PatientProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PatientVisits_Users_DoctorUserId",
                        column: x => x.DoctorUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PatientVisits_Users_NurseUserId",
                        column: x => x.NurseUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "StaffShifts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AffiliationId = table.Column<Guid>(type: "uuid", nullable: false),
                    ShiftDate = table.Column<DateOnly>(type: "date", nullable: false),
                    StartTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    EndTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    BoothId = table.Column<Guid>(type: "uuid", nullable: true),
                    BoothOrStation = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StaffShifts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StaffShifts_HospitalBooths_BoothId",
                        column: x => x.BoothId,
                        principalTable: "HospitalBooths",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_StaffShifts_StaffAffiliations_AffiliationId",
                        column: x => x.AffiliationId,
                        principalTable: "StaffAffiliations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Appointments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientProfileId = table.Column<Guid>(type: "uuid", nullable: true),
                    PatientName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    PatientNic = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    PatientPhone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    PatientEmail = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    HospitalUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    HospitalProfileId = table.Column<Guid>(type: "uuid", nullable: true),
                    HospitalName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    VaccineScheduleId = table.Column<Guid>(type: "uuid", nullable: true),
                    VaccineId = table.Column<Guid>(type: "uuid", nullable: true),
                    VaccineName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    DoctorUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DoctorName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    NurseUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    NurseName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    AppointmentDate = table.Column<DateOnly>(type: "date", nullable: false),
                    TimeSlot = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    StartTime = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    EndTime = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Fee = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0.00m),
                    PaymentMethod = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PaymentStatus = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PaymentTransactionId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    PrescribedDosage = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PrescribedByDoctorUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    PrescribedByDoctorName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    DosageUpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Appointments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Appointments_Users_HospitalUserId",
                        column: x => x.HospitalUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Appointments_Users_PatientUserId",
                        column: x => x.PatientUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Appointments_VaccineSchedules_VaccineScheduleId",
                        column: x => x.VaccineScheduleId,
                        principalTable: "VaccineSchedules",
                        principalColumn: "Id");
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

            migrationBuilder.CreateTable(
                name: "PatientVaccinationRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    VaccineId = table.Column<Guid>(type: "uuid", nullable: false),
                    BatchId = table.Column<Guid>(type: "uuid", nullable: true),
                    AdministeredByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    AdministeredByName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    AdministeredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DoseNumber = table.Column<int>(type: "integer", nullable: false),
                    Route = table.Column<string>(type: "text", nullable: false),
                    Site = table.Column<string>(type: "text", nullable: true),
                    LotNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    AdverseEventReported = table.Column<bool>(type: "boolean", nullable: false),
                    AdverseEventNotes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PatientVaccinationRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PatientVaccinationRecords_Batches_BatchId",
                        column: x => x.BatchId,
                        principalTable: "Batches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PatientVaccinationRecords_PatientProfiles_PatientProfileId",
                        column: x => x.PatientProfileId,
                        principalTable: "PatientProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PatientVaccinationRecords_Users_AdministeredByUserId",
                        column: x => x.AdministeredByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PatientVaccinationRecords_Vaccines_VaccineId",
                        column: x => x.VaccineId,
                        principalTable: "Vaccines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AgentWorkflows_Status",
                table: "AgentWorkflows",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_AgentWorkflows_UserId_CreatedAt",
                table: "AgentWorkflows",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_HospitalUserId",
                table: "Appointments",
                column: "HospitalUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_PatientUserId",
                table: "Appointments",
                column: "PatientUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_VaccineScheduleId",
                table: "Appointments",
                column: "VaccineScheduleId");

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
                name: "IX_DoctorProfiles_SlmcNumber",
                table: "DoctorProfiles",
                column: "SlmcNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DoctorProfiles_UserId",
                table: "DoctorProfiles",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HospitalBooths_HospitalUserId_Code",
                table: "HospitalBooths",
                columns: new[] { "HospitalUserId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HospitalBooths_HospitalUserId_IsActive_SortOrder",
                table: "HospitalBooths",
                columns: new[] { "HospitalUserId", "IsActive", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_HospitalBoothVaccines_VaccineId",
                table: "HospitalBoothVaccines",
                column: "VaccineId");

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
                name: "IX_HospitalProfiles_RegistrationNumber",
                table: "HospitalProfiles",
                column: "RegistrationNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HospitalProfiles_UserId",
                table: "HospitalProfiles",
                column: "UserId",
                unique: true);

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

            migrationBuilder.CreateIndex(
                name: "IX_NurseProfiles_SlncNumber",
                table: "NurseProfiles",
                column: "SlncNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NurseProfiles_UserId",
                table: "NurseProfiles",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PatientMedicalHistories_PatientProfileId_DiagnosedAt",
                table: "PatientMedicalHistories",
                columns: new[] { "PatientProfileId", "DiagnosedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PatientMedicalHistories_RecordedByUserId",
                table: "PatientMedicalHistories",
                column: "RecordedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientMedicalHistories_RecordType",
                table: "PatientMedicalHistories",
                column: "RecordType");

            migrationBuilder.CreateIndex(
                name: "IX_PatientMedicalHistories_Status",
                table: "PatientMedicalHistories",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_PatientProfiles_NicNumber",
                table: "PatientProfiles",
                column: "NicNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PatientProfiles_UserId",
                table: "PatientProfiles",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PatientVaccinationRecords_AdministeredByUserId",
                table: "PatientVaccinationRecords",
                column: "AdministeredByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientVaccinationRecords_BatchId",
                table: "PatientVaccinationRecords",
                column: "BatchId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientVaccinationRecords_PatientProfileId_AdministeredAt",
                table: "PatientVaccinationRecords",
                columns: new[] { "PatientProfileId", "AdministeredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PatientVaccinationRecords_VaccineId",
                table: "PatientVaccinationRecords",
                column: "VaccineId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientVisits_DoctorUserId",
                table: "PatientVisits",
                column: "DoctorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientVisits_FollowUpDate",
                table: "PatientVisits",
                column: "FollowUpDate");

            migrationBuilder.CreateIndex(
                name: "IX_PatientVisits_HospitalProfileId",
                table: "PatientVisits",
                column: "HospitalProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientVisits_NurseUserId",
                table: "PatientVisits",
                column: "NurseUserId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientVisits_PatientProfileId_VisitDate",
                table: "PatientVisits",
                columns: new[] { "PatientProfileId", "VisitDate" });

            migrationBuilder.CreateIndex(
                name: "IX_PatientVisits_Status",
                table: "PatientVisits",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_StaffAffiliations_HospitalUserId_StaffUserId",
                table: "StaffAffiliations",
                columns: new[] { "HospitalUserId", "StaffUserId" });

            migrationBuilder.CreateIndex(
                name: "IX_StaffAffiliations_StaffUserId",
                table: "StaffAffiliations",
                column: "StaffUserId");

            migrationBuilder.CreateIndex(
                name: "IX_StaffShifts_AffiliationId_ShiftDate",
                table: "StaffShifts",
                columns: new[] { "AffiliationId", "ShiftDate" });

            migrationBuilder.CreateIndex(
                name: "IX_StaffShifts_BoothId",
                table: "StaffShifts",
                column: "BoothId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_RegistrationNumber",
                table: "Users",
                column: "RegistrationNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VaccineSchedules_DoctorUserId",
                table: "VaccineSchedules",
                column: "DoctorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_VaccineSchedules_HospitalUserId",
                table: "VaccineSchedules",
                column: "HospitalUserId");

            migrationBuilder.CreateIndex(
                name: "IX_VaccineSchedules_NurseUserId",
                table: "VaccineSchedules",
                column: "NurseUserId");

            migrationBuilder.CreateIndex(
                name: "IX_VaccineSchedules_VaccineId",
                table: "VaccineSchedules",
                column: "VaccineId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AgentWorkflows");

            migrationBuilder.DropTable(
                name: "Appointments");

            migrationBuilder.DropTable(
                name: "AuditLogs");

            migrationBuilder.DropTable(
                name: "ColdVaults");

            migrationBuilder.DropTable(
                name: "DoctorProfiles");

            migrationBuilder.DropTable(
                name: "HospitalBoothVaccines");

            migrationBuilder.DropTable(
                name: "HospitalFormularies");

            migrationBuilder.DropTable(
                name: "InventoryTransactions");

            migrationBuilder.DropTable(
                name: "NurseProfiles");

            migrationBuilder.DropTable(
                name: "PatientMedicalHistories");

            migrationBuilder.DropTable(
                name: "PatientVaccinationRecords");

            migrationBuilder.DropTable(
                name: "PatientVisits");

            migrationBuilder.DropTable(
                name: "StaffShifts");

            migrationBuilder.DropTable(
                name: "VaccineSchedules");

            migrationBuilder.DropTable(
                name: "Batches");

            migrationBuilder.DropTable(
                name: "PatientProfiles");

            migrationBuilder.DropTable(
                name: "HospitalBooths");

            migrationBuilder.DropTable(
                name: "StaffAffiliations");

            migrationBuilder.DropTable(
                name: "HospitalProfiles");

            migrationBuilder.DropTable(
                name: "Vaccines");

            migrationBuilder.DropTable(
                name: "Users");

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
