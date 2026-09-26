using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Vaxora.Api.Data;

#nullable disable

namespace Vaxora.Api.Migrations
{
    /// <summary>
    /// Creates VaccineSchedules and Appointments base tables for the booking module.
    /// Must run before AddAppointmentPrescribedDosage (which ALTERs Appointments).
    /// Uses IF NOT EXISTS so existing DBs that created these tables via scripts still apply cleanly.
    /// Fixes #27
    /// </summary>
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260918000000_AddAppointmentScheduleModule")]
    public partial class AddAppointmentScheduleModule : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS ""VaccineSchedules"" (
    ""Id"" uuid NOT NULL,
    ""HospitalUserId"" uuid NOT NULL,
    ""HospitalProfileId"" uuid NULL,
    ""DoctorUserId"" uuid NULL,
    ""DoctorName"" character varying(200) NOT NULL,
    ""NurseUserId"" uuid NULL,
    ""NurseName"" character varying(200) NOT NULL,
    ""VaccineId"" uuid NULL,
    ""VaccineName"" character varying(200) NOT NULL,
    ""ScheduleType"" character varying(50) NOT NULL,
    ""SpecificDate"" date NULL,
    ""DaysOfWeek"" character varying(255) NULL,
    ""StartDate"" date NULL,
    ""EndDate"" date NULL,
    ""StartTime"" character varying(20) NOT NULL,
    ""EndTime"" character varying(20) NOT NULL,
    ""Status"" character varying(50) NOT NULL,
    ""Price"" numeric(18,2) NOT NULL DEFAULT 0.00,
    ""CreatedAt"" timestamp with time zone NOT NULL,
    CONSTRAINT ""PK_VaccineSchedules"" PRIMARY KEY (""Id""),
    CONSTRAINT ""FK_VaccineSchedules_Users_HospitalUserId""
        FOREIGN KEY (""HospitalUserId"") REFERENCES ""Users"" (""Id"") ON DELETE CASCADE,
    CONSTRAINT ""FK_VaccineSchedules_Users_DoctorUserId""
        FOREIGN KEY (""DoctorUserId"") REFERENCES ""Users"" (""Id""),
    CONSTRAINT ""FK_VaccineSchedules_Users_NurseUserId""
        FOREIGN KEY (""NurseUserId"") REFERENCES ""Users"" (""Id""),
    CONSTRAINT ""FK_VaccineSchedules_Vaccines_VaccineId""
        FOREIGN KEY (""VaccineId"") REFERENCES ""Vaccines"" (""Id"")
);

CREATE TABLE IF NOT EXISTS ""Appointments"" (
    ""Id"" uuid NOT NULL,
    ""PatientUserId"" uuid NOT NULL,
    ""PatientProfileId"" uuid NULL,
    ""PatientName"" character varying(200) NOT NULL,
    ""PatientNic"" character varying(50) NULL,
    ""PatientPhone"" character varying(50) NULL,
    ""PatientEmail"" character varying(256) NULL,
    ""HospitalUserId"" uuid NOT NULL,
    ""HospitalProfileId"" uuid NULL,
    ""HospitalName"" character varying(200) NOT NULL,
    ""VaccineScheduleId"" uuid NULL,
    ""VaccineId"" uuid NULL,
    ""VaccineName"" character varying(200) NOT NULL,
    ""DoctorUserId"" uuid NULL,
    ""DoctorName"" character varying(200) NULL,
    ""NurseUserId"" uuid NULL,
    ""NurseName"" character varying(200) NULL,
    ""AppointmentDate"" date NOT NULL,
    ""TimeSlot"" character varying(100) NOT NULL,
    ""StartTime"" character varying(20) NULL,
    ""EndTime"" character varying(20) NULL,
    ""Status"" character varying(50) NOT NULL,
    ""Fee"" numeric(18,2) NOT NULL DEFAULT 0.00,
    ""PaymentMethod"" character varying(50) NOT NULL DEFAULT 'Free',
    ""PaymentStatus"" character varying(50) NOT NULL DEFAULT 'Paid',
    ""PaymentTransactionId"" character varying(100) NULL,
    ""Notes"" character varying(1000) NULL,
    ""CreatedAt"" timestamp with time zone NOT NULL,
    ""UpdatedAt"" timestamp with time zone NULL,
    CONSTRAINT ""PK_Appointments"" PRIMARY KEY (""Id""),
    CONSTRAINT ""FK_Appointments_Users_PatientUserId""
        FOREIGN KEY (""PatientUserId"") REFERENCES ""Users"" (""Id"") ON DELETE CASCADE,
    CONSTRAINT ""FK_Appointments_Users_HospitalUserId""
        FOREIGN KEY (""HospitalUserId"") REFERENCES ""Users"" (""Id"") ON DELETE CASCADE,
    CONSTRAINT ""FK_Appointments_VaccineSchedules_VaccineScheduleId""
        FOREIGN KEY (""VaccineScheduleId"") REFERENCES ""VaccineSchedules"" (""Id"")
);

CREATE INDEX IF NOT EXISTS ""IX_VaccineSchedules_HospitalUserId"" ON ""VaccineSchedules"" (""HospitalUserId"");
CREATE INDEX IF NOT EXISTS ""IX_VaccineSchedules_DoctorUserId"" ON ""VaccineSchedules"" (""DoctorUserId"");
CREATE INDEX IF NOT EXISTS ""IX_VaccineSchedules_NurseUserId"" ON ""VaccineSchedules"" (""NurseUserId"");
CREATE INDEX IF NOT EXISTS ""IX_VaccineSchedules_VaccineId"" ON ""VaccineSchedules"" (""VaccineId"");
CREATE INDEX IF NOT EXISTS ""IX_Appointments_PatientUserId"" ON ""Appointments"" (""PatientUserId"");
CREATE INDEX IF NOT EXISTS ""IX_Appointments_HospitalUserId"" ON ""Appointments"" (""HospitalUserId"");
CREATE INDEX IF NOT EXISTS ""IX_Appointments_VaccineScheduleId"" ON ""Appointments"" (""VaccineScheduleId"");
CREATE INDEX IF NOT EXISTS ""IX_Appointments_HospitalUserId_AppointmentDate"" ON ""Appointments"" (""HospitalUserId"", ""AppointmentDate"");
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DROP TABLE IF EXISTS ""Appointments"";
DROP TABLE IF EXISTS ""VaccineSchedules"";
");
        }
    }
}
