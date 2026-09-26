using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Vaxora.Api.Data;

#nullable disable

namespace Vaxora.Api.Migrations
{
    /// <summary>
    /// Creates patient clinical record tables:
    /// PatientVaccinationRecords, PatientMedicalHistories, PatientVisits.
    /// Uses IF NOT EXISTS so existing DBs that created these via scripts still apply cleanly.
    /// Fixes #28
    /// </summary>
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260920120000_AddPatientRecordsModule")]
    public partial class AddPatientRecordsModule : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS ""PatientVaccinationRecords"" (
    ""Id"" uuid NOT NULL,
    ""PatientProfileId"" uuid NOT NULL,
    ""VaccineId"" uuid NOT NULL,
    ""BatchId"" uuid NULL,
    ""AdministeredByUserId"" uuid NULL,
    ""AdministeredByName"" character varying(200) NULL,
    ""AdministeredAt"" timestamp with time zone NOT NULL,
    ""DoseNumber"" integer NOT NULL,
    ""Route"" text NOT NULL,
    ""Site"" text NULL,
    ""LotNumber"" character varying(100) NULL,
    ""Notes"" character varying(1000) NULL,
    ""AdverseEventReported"" boolean NOT NULL DEFAULT FALSE,
    ""AdverseEventNotes"" character varying(1000) NULL,
    ""CreatedAt"" timestamp with time zone NOT NULL,
    CONSTRAINT ""PK_PatientVaccinationRecords"" PRIMARY KEY (""Id""),
    CONSTRAINT ""FK_PatientVaccinationRecords_PatientProfiles_PatientProfileId""
        FOREIGN KEY (""PatientProfileId"") REFERENCES ""PatientProfiles"" (""Id"") ON DELETE CASCADE,
    CONSTRAINT ""FK_PatientVaccinationRecords_Vaccines_VaccineId""
        FOREIGN KEY (""VaccineId"") REFERENCES ""Vaccines"" (""Id"") ON DELETE RESTRICT,
    CONSTRAINT ""FK_PatientVaccinationRecords_Batches_BatchId""
        FOREIGN KEY (""BatchId"") REFERENCES ""Batches"" (""Id"") ON DELETE SET NULL,
    CONSTRAINT ""FK_PatientVaccinationRecords_Users_AdministeredByUserId""
        FOREIGN KEY (""AdministeredByUserId"") REFERENCES ""Users"" (""Id"") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ""PatientMedicalHistories"" (
    ""Id"" uuid NOT NULL,
    ""PatientProfileId"" uuid NOT NULL,
    ""RecordType"" text NOT NULL,
    ""Title"" character varying(200) NOT NULL,
    ""Description"" character varying(2000) NULL,
    ""Severity"" text NOT NULL,
    ""Status"" text NOT NULL,
    ""Icd10Code"" character varying(20) NULL,
    ""DiagnosedAt"" timestamp with time zone NOT NULL,
    ""ResolvedAt"" timestamp with time zone NULL,
    ""RecordedByUserId"" uuid NULL,
    ""RecordedByName"" character varying(200) NULL,
    ""Notes"" character varying(1000) NULL,
    ""CreatedAt"" timestamp with time zone NOT NULL,
    ""UpdatedAt"" timestamp with time zone NULL,
    CONSTRAINT ""PK_PatientMedicalHistories"" PRIMARY KEY (""Id""),
    CONSTRAINT ""FK_PatientMedicalHistories_PatientProfiles_PatientProfileId""
        FOREIGN KEY (""PatientProfileId"") REFERENCES ""PatientProfiles"" (""Id"") ON DELETE CASCADE,
    CONSTRAINT ""FK_PatientMedicalHistories_Users_RecordedByUserId""
        FOREIGN KEY (""RecordedByUserId"") REFERENCES ""Users"" (""Id"") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ""PatientVisits"" (
    ""Id"" uuid NOT NULL,
    ""PatientProfileId"" uuid NOT NULL,
    ""DoctorUserId"" uuid NULL,
    ""DoctorName"" character varying(200) NULL,
    ""NurseUserId"" uuid NULL,
    ""NurseName"" character varying(200) NULL,
    ""HospitalProfileId"" uuid NULL,
    ""AppointmentId"" uuid NULL,
    ""VisitDate"" timestamp with time zone NOT NULL,
    ""VisitType"" text NOT NULL,
    ""Status"" text NOT NULL,
    ""ChiefComplaint"" character varying(1000) NULL,
    ""BloodPressure"" character varying(20) NULL,
    ""Temperature"" character varying(10) NULL,
    ""WeightKg"" character varying(10) NULL,
    ""HeightCm"" character varying(10) NULL,
    ""HeartRate"" character varying(10) NULL,
    ""OxygenSaturation"" character varying(10) NULL,
    ""DiagnosisSummary"" character varying(2000) NULL,
    ""TreatmentPlan"" character varying(2000) NULL,
    ""Notes"" character varying(1000) NULL,
    ""FollowUpDate"" timestamp with time zone NULL,
    ""CreatedAt"" timestamp with time zone NOT NULL,
    ""UpdatedAt"" timestamp with time zone NULL,
    CONSTRAINT ""PK_PatientVisits"" PRIMARY KEY (""Id""),
    CONSTRAINT ""FK_PatientVisits_PatientProfiles_PatientProfileId""
        FOREIGN KEY (""PatientProfileId"") REFERENCES ""PatientProfiles"" (""Id"") ON DELETE CASCADE,
    CONSTRAINT ""FK_PatientVisits_Users_DoctorUserId""
        FOREIGN KEY (""DoctorUserId"") REFERENCES ""Users"" (""Id"") ON DELETE SET NULL,
    CONSTRAINT ""FK_PatientVisits_Users_NurseUserId""
        FOREIGN KEY (""NurseUserId"") REFERENCES ""Users"" (""Id"") ON DELETE SET NULL,
    CONSTRAINT ""FK_PatientVisits_HospitalProfiles_HospitalProfileId""
        FOREIGN KEY (""HospitalProfileId"") REFERENCES ""HospitalProfiles"" (""Id"") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ""IX_PatientVaccinationRecords_PatientProfileId_AdministeredAt""
    ON ""PatientVaccinationRecords"" (""PatientProfileId"", ""AdministeredAt"");
CREATE INDEX IF NOT EXISTS ""IX_PatientVaccinationRecords_VaccineId""
    ON ""PatientVaccinationRecords"" (""VaccineId"");
CREATE INDEX IF NOT EXISTS ""IX_PatientVaccinationRecords_BatchId""
    ON ""PatientVaccinationRecords"" (""BatchId"");

CREATE INDEX IF NOT EXISTS ""IX_PatientMedicalHistories_PatientProfileId_DiagnosedAt""
    ON ""PatientMedicalHistories"" (""PatientProfileId"", ""DiagnosedAt"");
CREATE INDEX IF NOT EXISTS ""IX_PatientMedicalHistories_RecordType""
    ON ""PatientMedicalHistories"" (""RecordType"");
CREATE INDEX IF NOT EXISTS ""IX_PatientMedicalHistories_Status""
    ON ""PatientMedicalHistories"" (""Status"");

CREATE INDEX IF NOT EXISTS ""IX_PatientVisits_PatientProfileId_VisitDate""
    ON ""PatientVisits"" (""PatientProfileId"", ""VisitDate"");
CREATE INDEX IF NOT EXISTS ""IX_PatientVisits_Status""
    ON ""PatientVisits"" (""Status"");
CREATE INDEX IF NOT EXISTS ""IX_PatientVisits_FollowUpDate""
    ON ""PatientVisits"" (""FollowUpDate"");
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DROP TABLE IF EXISTS ""PatientVisits"";
DROP TABLE IF EXISTS ""PatientMedicalHistories"";
DROP TABLE IF EXISTS ""PatientVaccinationRecords"";
");
        }
    }
}
