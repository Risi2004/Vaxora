CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910031256_InitialCreate') THEN
    CREATE TABLE "AuditLogs" (
        "Id" uuid NOT NULL,
        "UserId" uuid,
        "UserEmail" character varying(256),
        "Role" character varying(50),
        "Action" character varying(100) NOT NULL,
        "Details" character varying(1000) NOT NULL,
        "IpAddress" character varying(50),
        "Timestamp" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_AuditLogs" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910031256_InitialCreate') THEN
    CREATE TABLE "Users" (
        "Id" uuid NOT NULL,
        "Email" character varying(256) NOT NULL,
        "PasswordHash" text NOT NULL,
        "Role" text NOT NULL,
        "Status" text NOT NULL,
        "PhoneNumber" character varying(20),
        "RefreshToken" text,
        "RefreshTokenExpiryTime" timestamp with time zone,
        "ResetPasswordToken" text,
        "ResetPasswordExpiryTime" timestamp with time zone,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        "LastLoginAt" timestamp with time zone,
        CONSTRAINT "PK_Users" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910031256_InitialCreate') THEN
    CREATE TABLE "DoctorProfiles" (
        "Id" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "FullName" character varying(200) NOT NULL,
        "SlmcNumber" character varying(50) NOT NULL,
        "Specialization" character varying(100),
        "HospitalAffiliation" character varying(200),
        "YearsOfExperience" integer,
        "ProfilePhotoUrl" character varying(1000),
        "SlmcCardDocKey" character varying(500),
        "SupportingDocKey" character varying(500),
        "VerificationStatus" text NOT NULL,
        "VerifiedAt" timestamp with time zone,
        "VerifiedByAdminId" uuid,
        "RejectionReason" character varying(500),
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_DoctorProfiles" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_DoctorProfiles_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910031256_InitialCreate') THEN
    CREATE TABLE "HospitalProfiles" (
        "Id" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "HospitalName" character varying(250) NOT NULL,
        "RegistrationNumber" character varying(100) NOT NULL,
        "HospitalType" character varying(100),
        "Address" character varying(500),
        "District" character varying(100),
        "Province" character varying(100),
        "ContactNumber" character varying(20),
        "LogoUrl" character varying(1000),
        "RegistrationDocKey" character varying(500),
        "MohDocKey" character varying(500),
        "VerificationStatus" text NOT NULL,
        "VerifiedAt" timestamp with time zone,
        "VerifiedByAdminId" uuid,
        "RejectionReason" character varying(500),
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_HospitalProfiles" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_HospitalProfiles_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910031256_InitialCreate') THEN
    CREATE TABLE "NurseProfiles" (
        "Id" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "FullName" character varying(200) NOT NULL,
        "SlncNumber" character varying(50) NOT NULL,
        "Department" character varying(100),
        "HospitalAffiliation" character varying(200),
        "YearsOfExperience" integer,
        "ProfilePhotoUrl" character varying(1000),
        "SlncCardDocKey" character varying(500),
        "SupportingDocKey" character varying(500),
        "VerificationStatus" text NOT NULL,
        "VerifiedAt" timestamp with time zone,
        "VerifiedByAdminId" uuid,
        "RejectionReason" character varying(500),
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_NurseProfiles" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_NurseProfiles_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910031256_InitialCreate') THEN
    CREATE TABLE "PatientProfiles" (
        "Id" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "FullName" character varying(200) NOT NULL,
        "NicNumber" character varying(20) NOT NULL,
        "DateOfBirth" timestamp with time zone,
        "Gender" character varying(20),
        "BloodGroup" character varying(10),
        "Address" character varying(500),
        "EmergencyContactName" character varying(200),
        "EmergencyContactPhone" character varying(20),
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_PatientProfiles" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_PatientProfiles_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910031256_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_DoctorProfiles_SlmcNumber" ON "DoctorProfiles" ("SlmcNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910031256_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_DoctorProfiles_UserId" ON "DoctorProfiles" ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910031256_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_HospitalProfiles_RegistrationNumber" ON "HospitalProfiles" ("RegistrationNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910031256_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_HospitalProfiles_UserId" ON "HospitalProfiles" ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910031256_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_NurseProfiles_SlncNumber" ON "NurseProfiles" ("SlncNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910031256_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_NurseProfiles_UserId" ON "NurseProfiles" ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910031256_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_PatientProfiles_NicNumber" ON "PatientProfiles" ("NicNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910031256_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_PatientProfiles_UserId" ON "PatientProfiles" ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910031256_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_Users_Email" ON "Users" ("Email");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910031256_InitialCreate') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260910031256_InitialCreate', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910041633_AlignSignupSchema') THEN
    ALTER TABLE "PatientProfiles" DROP COLUMN "Address";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910041633_AlignSignupSchema') THEN
    ALTER TABLE "PatientProfiles" DROP COLUMN "BloodGroup";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910041633_AlignSignupSchema') THEN
    ALTER TABLE "PatientProfiles" DROP COLUMN "EmergencyContactName";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910041633_AlignSignupSchema') THEN
    ALTER TABLE "PatientProfiles" DROP COLUMN "EmergencyContactPhone";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910041633_AlignSignupSchema') THEN
    ALTER TABLE "NurseProfiles" DROP COLUMN "YearsOfExperience";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910041633_AlignSignupSchema') THEN
    ALTER TABLE "DoctorProfiles" DROP COLUMN "YearsOfExperience";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910041633_AlignSignupSchema') THEN
    ALTER TABLE "PatientProfiles" RENAME COLUMN "Gender" TO "PhoneNumber";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910041633_AlignSignupSchema') THEN
    ALTER TABLE "PatientProfiles" ADD "ProfilePhotoUrl" character varying(1000);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910041633_AlignSignupSchema') THEN
    ALTER TABLE "NurseProfiles" ADD "PhoneNumber" character varying(20);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910041633_AlignSignupSchema') THEN
    UPDATE "HospitalProfiles" SET "Address" = '' WHERE "Address" IS NULL;
    ALTER TABLE "HospitalProfiles" ALTER COLUMN "Address" SET NOT NULL;
    ALTER TABLE "HospitalProfiles" ALTER COLUMN "Address" SET DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910041633_AlignSignupSchema') THEN
    ALTER TABLE "HospitalProfiles" ADD "OperatingHours" character varying(100);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910041633_AlignSignupSchema') THEN
    ALTER TABLE "DoctorProfiles" ADD "PhoneNumber" character varying(20);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910041633_AlignSignupSchema') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260910041633_AlignSignupSchema', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910044322_RemoveDoctorHospitalAffiliation') THEN
    ALTER TABLE "DoctorProfiles" DROP COLUMN "HospitalAffiliation";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910044322_RemoveDoctorHospitalAffiliation') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260910044322_RemoveDoctorHospitalAffiliation', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910044524_RemoveNurseDepartmentAndAffiliation') THEN
    ALTER TABLE "NurseProfiles" DROP COLUMN "Department";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910044524_RemoveNurseDepartmentAndAffiliation') THEN
    ALTER TABLE "NurseProfiles" DROP COLUMN "HospitalAffiliation";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910044524_RemoveNurseDepartmentAndAffiliation') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260910044524_RemoveNurseDepartmentAndAffiliation', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910051426_AddVaxoraRegistrationNumbersAndSequences') THEN
    CREATE SEQUENCE vaxora_seq_admin START WITH 1000 INCREMENT BY 1 NO MINVALUE NO MAXVALUE NO CYCLE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910051426_AddVaxoraRegistrationNumbersAndSequences') THEN
    CREATE SEQUENCE vaxora_seq_doctor START WITH 1000 INCREMENT BY 1 NO MINVALUE NO MAXVALUE NO CYCLE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910051426_AddVaxoraRegistrationNumbersAndSequences') THEN
    CREATE SEQUENCE vaxora_seq_hospital START WITH 1000 INCREMENT BY 1 NO MINVALUE NO MAXVALUE NO CYCLE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910051426_AddVaxoraRegistrationNumbersAndSequences') THEN
    CREATE SEQUENCE vaxora_seq_nurse START WITH 1000 INCREMENT BY 1 NO MINVALUE NO MAXVALUE NO CYCLE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910051426_AddVaxoraRegistrationNumbersAndSequences') THEN
    CREATE SEQUENCE vaxora_seq_patient START WITH 1000 INCREMENT BY 1 NO MINVALUE NO MAXVALUE NO CYCLE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910051426_AddVaxoraRegistrationNumbersAndSequences') THEN
    ALTER TABLE "Users" ADD "RegistrationNumber" character varying(50);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910051426_AddVaxoraRegistrationNumbersAndSequences') THEN
    CREATE UNIQUE INDEX "IX_Users_RegistrationNumber" ON "Users" ("RegistrationNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260910051426_AddVaxoraRegistrationNumbersAndSequences') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260910051426_AddVaxoraRegistrationNumbersAndSequences', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260912125907_AddStaffManagement') THEN
    CREATE TABLE "StaffAffiliations" (
        "Id" uuid NOT NULL,
        "HospitalUserId" uuid NOT NULL,
        "StaffUserId" uuid NOT NULL,
        "StaffRole" text NOT NULL,
        "Status" text NOT NULL,
        "DutyStatus" text NOT NULL,
        "DutyUpdatedAt" timestamp with time zone,
        "DutyUpdatedByUserId" uuid,
        "InvitedByUserId" uuid NOT NULL,
        "InvitedAt" timestamp with time zone NOT NULL,
        "RespondedAt" timestamp with time zone,
        CONSTRAINT "PK_StaffAffiliations" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_StaffAffiliations_Users_HospitalUserId" FOREIGN KEY ("HospitalUserId") REFERENCES "Users" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_StaffAffiliations_Users_StaffUserId" FOREIGN KEY ("StaffUserId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260912125907_AddStaffManagement') THEN
    CREATE TABLE "StaffShifts" (
        "Id" uuid NOT NULL,
        "AffiliationId" uuid NOT NULL,
        "ShiftDate" date NOT NULL,
        "StartTime" time without time zone NOT NULL,
        "EndTime" time without time zone NOT NULL,
        "BoothOrStation" character varying(100),
        "Notes" character varying(500),
        "CreatedByUserId" uuid NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_StaffShifts" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_StaffShifts_StaffAffiliations_AffiliationId" FOREIGN KEY ("AffiliationId") REFERENCES "StaffAffiliations" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260912125907_AddStaffManagement') THEN
    CREATE INDEX "IX_StaffAffiliations_HospitalUserId_StaffUserId" ON "StaffAffiliations" ("HospitalUserId", "StaffUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260912125907_AddStaffManagement') THEN
    CREATE INDEX "IX_StaffAffiliations_StaffUserId" ON "StaffAffiliations" ("StaffUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260912125907_AddStaffManagement') THEN
    CREATE INDEX "IX_StaffShifts_AffiliationId_ShiftDate" ON "StaffShifts" ("AffiliationId", "ShiftDate");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260912125907_AddStaffManagement') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260912125907_AddStaffManagement', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260914063649_AddInventoryModule') THEN
    CREATE TABLE "ColdVaults" (
        "Id" uuid NOT NULL,
        "HospitalProfileId" uuid NOT NULL,
        "Name" character varying(100) NOT NULL,
        "Type" character varying(200),
        "CurrentTemp" character varying(50),
        "TargetTemp" character varying(50),
        "Humidity" character varying(50),
        "Status" character varying(50),
        "SensorStatus" character varying(100),
        "AssignedLots" integer NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_ColdVaults" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_ColdVaults_HospitalProfiles_HospitalProfileId" FOREIGN KEY ("HospitalProfileId") REFERENCES "HospitalProfiles" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260914063649_AddInventoryModule') THEN
    CREATE TABLE "Vaccines" (
        "Id" uuid NOT NULL,
        "Name" character varying(200) NOT NULL,
        "Manufacturer" character varying(200) NOT NULL,
        "Category" text NOT NULL,
        "DosesPerVial" integer NOT NULL,
        "RequiredTemp" character varying(100) NOT NULL,
        "DefaultMinThreshold" integer NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_Vaccines" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260914063649_AddInventoryModule') THEN
    CREATE TABLE "Batches" (
        "Id" uuid NOT NULL,
        "HospitalProfileId" uuid NOT NULL,
        "VaccineId" uuid NOT NULL,
        "BatchNumber" character varying(100) NOT NULL,
        "ExpiryDate" timestamp with time zone NOT NULL,
        "QuantityReceived" integer NOT NULL,
        "QuantityAvailable" integer NOT NULL,
        "StorageUnit" character varying(200),
        "Supplier" character varying(200),
        "Status" text NOT NULL,
        "LastRestockedAt" timestamp with time zone,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_Batches" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Batches_HospitalProfiles_HospitalProfileId" FOREIGN KEY ("HospitalProfileId") REFERENCES "HospitalProfiles" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_Batches_Vaccines_VaccineId" FOREIGN KEY ("VaccineId") REFERENCES "Vaccines" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260914063649_AddInventoryModule') THEN
    CREATE TABLE "HospitalFormularies" (
        "Id" uuid NOT NULL,
        "HospitalProfileId" uuid NOT NULL,
        "VaccineId" uuid NOT NULL,
        "RegisteredAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_HospitalFormularies" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_HospitalFormularies_HospitalProfiles_HospitalProfileId" FOREIGN KEY ("HospitalProfileId") REFERENCES "HospitalProfiles" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_HospitalFormularies_Vaccines_VaccineId" FOREIGN KEY ("VaccineId") REFERENCES "Vaccines" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260914063649_AddInventoryModule') THEN
    CREATE TABLE "InventoryTransactions" (
        "Id" uuid NOT NULL,
        "BatchId" uuid NOT NULL,
        "Type" text NOT NULL,
        "Quantity" integer NOT NULL,
        "Reason" character varying(500),
        "WastageReason" text,
        "Notes" character varying(1000),
        "IncidentDate" timestamp with time zone,
        "PerformedByUserId" uuid,
        "PerformedByName" character varying(200),
        "Timestamp" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_InventoryTransactions" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_InventoryTransactions_Batches_BatchId" FOREIGN KEY ("BatchId") REFERENCES "Batches" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_InventoryTransactions_Users_PerformedByUserId" FOREIGN KEY ("PerformedByUserId") REFERENCES "Users" ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260914063649_AddInventoryModule') THEN
    CREATE INDEX "IX_Batches_ExpiryDate" ON "Batches" ("ExpiryDate");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260914063649_AddInventoryModule') THEN
    CREATE INDEX "IX_Batches_HospitalProfileId" ON "Batches" ("HospitalProfileId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260914063649_AddInventoryModule') THEN
    CREATE UNIQUE INDEX "IX_Batches_HospitalProfileId_BatchNumber" ON "Batches" ("HospitalProfileId", "BatchNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260914063649_AddInventoryModule') THEN
    CREATE INDEX "IX_Batches_VaccineId" ON "Batches" ("VaccineId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260914063649_AddInventoryModule') THEN
    CREATE INDEX "IX_ColdVaults_HospitalProfileId" ON "ColdVaults" ("HospitalProfileId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260914063649_AddInventoryModule') THEN
    CREATE UNIQUE INDEX "IX_HospitalFormularies_HospitalProfileId_VaccineId" ON "HospitalFormularies" ("HospitalProfileId", "VaccineId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260914063649_AddInventoryModule') THEN
    CREATE INDEX "IX_HospitalFormularies_VaccineId" ON "HospitalFormularies" ("VaccineId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260914063649_AddInventoryModule') THEN
    CREATE INDEX "IX_InventoryTransactions_BatchId" ON "InventoryTransactions" ("BatchId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260914063649_AddInventoryModule') THEN
    CREATE INDEX "IX_InventoryTransactions_PerformedByUserId" ON "InventoryTransactions" ("PerformedByUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260914063649_AddInventoryModule') THEN
    CREATE INDEX "IX_InventoryTransactions_Timestamp" ON "InventoryTransactions" ("Timestamp");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260914063649_AddInventoryModule') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260914063649_AddInventoryModule', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260920070000_AddAppointmentPrescribedDosage') THEN
    ALTER TABLE "Appointments" ADD "PrescribedDosage" character varying(100);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260920070000_AddAppointmentPrescribedDosage') THEN
    ALTER TABLE "Appointments" ADD "PrescribedByDoctorUserId" uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260920070000_AddAppointmentPrescribedDosage') THEN
    ALTER TABLE "Appointments" ADD "PrescribedByDoctorName" character varying(200);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260920070000_AddAppointmentPrescribedDosage') THEN
    ALTER TABLE "Appointments" ADD "DosageUpdatedAt" timestamp with time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260920070000_AddAppointmentPrescribedDosage') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260920070000_AddAppointmentPrescribedDosage', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260922193000_AddAgentWorkflowState') THEN
    CREATE TABLE "AgentWorkflows" (
        "Id" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "AgentName" character varying(80) NOT NULL,
        "Objective" character varying(2000) NOT NULL,
        "ProposalsJson" text NOT NULL,
        "ResultSummary" character varying(4000),
        "Status" text NOT NULL,
        "DecidedAt" timestamp with time zone,
        "DecisionNote" character varying(500),
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_AgentWorkflows" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_AgentWorkflows_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260922193000_AddAgentWorkflowState') THEN
    CREATE INDEX "IX_AgentWorkflows_UserId_CreatedAt" ON "AgentWorkflows" ("UserId", "CreatedAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260922193000_AddAgentWorkflowState') THEN
    CREATE INDEX "IX_AgentWorkflows_Status" ON "AgentWorkflows" ("Status");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260922193000_AddAgentWorkflowState') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260922193000_AddAgentWorkflowState', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260924160000_AddHospitalBooths') THEN
    CREATE TABLE "HospitalBooths" (
        "Id" uuid NOT NULL,
        "HospitalUserId" uuid NOT NULL,
        "Code" character varying(20) NOT NULL,
        "Name" character varying(100) NOT NULL,
        "IsActive" boolean NOT NULL,
        "SortOrder" integer NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_HospitalBooths" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_HospitalBooths_Users_HospitalUserId" FOREIGN KEY ("HospitalUserId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260924160000_AddHospitalBooths') THEN
    CREATE UNIQUE INDEX "IX_HospitalBooths_HospitalUserId_Code" ON "HospitalBooths" ("HospitalUserId", "Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260924160000_AddHospitalBooths') THEN
    CREATE INDEX "IX_HospitalBooths_HospitalUserId_IsActive_SortOrder" ON "HospitalBooths" ("HospitalUserId", "IsActive", "SortOrder");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260924160000_AddHospitalBooths') THEN
    ALTER TABLE "StaffShifts" ADD "BoothId" uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260924160000_AddHospitalBooths') THEN
    CREATE INDEX "IX_StaffShifts_BoothId" ON "StaffShifts" ("BoothId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260924160000_AddHospitalBooths') THEN
    ALTER TABLE "StaffShifts" ADD CONSTRAINT "FK_StaffShifts_HospitalBooths_BoothId" FOREIGN KEY ("BoothId") REFERENCES "HospitalBooths" ("Id") ON DELETE SET NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260924160000_AddHospitalBooths') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260924160000_AddHospitalBooths', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260924180000_AddHospitalBoothVaccines') THEN
    CREATE TABLE "HospitalBoothVaccines" (
        "BoothId" uuid NOT NULL,
        "VaccineId" uuid NOT NULL,
        CONSTRAINT "PK_HospitalBoothVaccines" PRIMARY KEY ("BoothId", "VaccineId"),
        CONSTRAINT "FK_HospitalBoothVaccines_HospitalBooths_BoothId" FOREIGN KEY ("BoothId") REFERENCES "HospitalBooths" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_HospitalBoothVaccines_Vaccines_VaccineId" FOREIGN KEY ("VaccineId") REFERENCES "Vaccines" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260924180000_AddHospitalBoothVaccines') THEN
    CREATE INDEX "IX_HospitalBoothVaccines_VaccineId" ON "HospitalBoothVaccines" ("VaccineId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260924180000_AddHospitalBoothVaccines') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260924180000_AddHospitalBoothVaccines', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE SEQUENCE vaxora_seq_admin START WITH 1000 INCREMENT BY 1 NO MINVALUE NO MAXVALUE NO CYCLE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE SEQUENCE vaxora_seq_doctor START WITH 1000 INCREMENT BY 1 NO MINVALUE NO MAXVALUE NO CYCLE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE SEQUENCE vaxora_seq_hospital START WITH 1000 INCREMENT BY 1 NO MINVALUE NO MAXVALUE NO CYCLE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE SEQUENCE vaxora_seq_nurse START WITH 1000 INCREMENT BY 1 NO MINVALUE NO MAXVALUE NO CYCLE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE SEQUENCE vaxora_seq_patient START WITH 1000 INCREMENT BY 1 NO MINVALUE NO MAXVALUE NO CYCLE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE TABLE "AuditLogs" (
        "Id" uuid NOT NULL,
        "UserId" uuid,
        "UserEmail" character varying(256),
        "Role" character varying(50),
        "Action" character varying(100) NOT NULL,
        "Details" character varying(1000) NOT NULL,
        "IpAddress" character varying(50),
        "Timestamp" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_AuditLogs" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE TABLE "Users" (
        "Id" uuid NOT NULL,
        "Email" character varying(256) NOT NULL,
        "PasswordHash" text NOT NULL,
        "Role" text NOT NULL,
        "Status" text NOT NULL,
        "PhoneNumber" character varying(20),
        "RegistrationNumber" character varying(50),
        "RefreshToken" text,
        "RefreshTokenExpiryTime" timestamp with time zone,
        "ResetPasswordToken" text,
        "ResetPasswordExpiryTime" timestamp with time zone,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        "LastLoginAt" timestamp with time zone,
        CONSTRAINT "PK_Users" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE TABLE "Vaccines" (
        "Id" uuid NOT NULL,
        "Name" character varying(200) NOT NULL,
        "Manufacturer" character varying(200) NOT NULL,
        "Category" text NOT NULL,
        "DosesPerVial" integer NOT NULL,
        "RequiredTemp" character varying(100) NOT NULL,
        "DefaultMinThreshold" integer NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_Vaccines" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE TABLE "AgentWorkflows" (
        "Id" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "AgentName" character varying(80) NOT NULL,
        "Objective" character varying(2000) NOT NULL,
        "ProposalsJson" text NOT NULL,
        "ResultSummary" character varying(4000),
        "Status" text NOT NULL,
        "DecidedAt" timestamp with time zone,
        "DecisionNote" character varying(500),
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_AgentWorkflows" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_AgentWorkflows_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE TABLE "DoctorProfiles" (
        "Id" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "FullName" character varying(200) NOT NULL,
        "SlmcNumber" character varying(50) NOT NULL,
        "Specialization" character varying(100),
        "PhoneNumber" character varying(20),
        "ProfilePhotoUrl" character varying(1000),
        "SlmcCardDocKey" character varying(500),
        "SupportingDocKey" character varying(500),
        "VerificationStatus" text NOT NULL,
        "VerifiedAt" timestamp with time zone,
        "VerifiedByAdminId" uuid,
        "RejectionReason" character varying(500),
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_DoctorProfiles" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_DoctorProfiles_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE TABLE "HospitalBooths" (
        "Id" uuid NOT NULL,
        "HospitalUserId" uuid NOT NULL,
        "Code" character varying(20) NOT NULL,
        "Name" character varying(100) NOT NULL,
        "IsActive" boolean NOT NULL,
        "SortOrder" integer NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_HospitalBooths" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_HospitalBooths_Users_HospitalUserId" FOREIGN KEY ("HospitalUserId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE TABLE "HospitalProfiles" (
        "Id" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "HospitalName" character varying(250) NOT NULL,
        "RegistrationNumber" character varying(100) NOT NULL,
        "HospitalType" character varying(100),
        "OperatingHours" character varying(100),
        "Address" character varying(500) NOT NULL,
        "District" character varying(100),
        "Province" character varying(100),
        "ContactNumber" character varying(20),
        "LogoUrl" character varying(1000),
        "RegistrationDocKey" character varying(500),
        "MohDocKey" character varying(500),
        "VerificationStatus" text NOT NULL,
        "VerifiedAt" timestamp with time zone,
        "VerifiedByAdminId" uuid,
        "RejectionReason" character varying(500),
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_HospitalProfiles" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_HospitalProfiles_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE TABLE "NurseProfiles" (
        "Id" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "FullName" character varying(200) NOT NULL,
        "SlncNumber" character varying(50) NOT NULL,
        "PhoneNumber" character varying(20),
        "ProfilePhotoUrl" character varying(1000),
        "SlncCardDocKey" character varying(500),
        "SupportingDocKey" character varying(500),
        "VerificationStatus" text NOT NULL,
        "VerifiedAt" timestamp with time zone,
        "VerifiedByAdminId" uuid,
        "RejectionReason" character varying(500),
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_NurseProfiles" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_NurseProfiles_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE TABLE "PatientProfiles" (
        "Id" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "FullName" character varying(200) NOT NULL,
        "NicNumber" character varying(20) NOT NULL,
        "DateOfBirth" timestamp with time zone,
        "PhoneNumber" character varying(20),
        "ProfilePhotoUrl" character varying(1000),
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_PatientProfiles" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_PatientProfiles_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE TABLE "StaffAffiliations" (
        "Id" uuid NOT NULL,
        "HospitalUserId" uuid NOT NULL,
        "StaffUserId" uuid NOT NULL,
        "StaffRole" text NOT NULL,
        "Status" text NOT NULL,
        "DutyStatus" text NOT NULL,
        "DutyUpdatedAt" timestamp with time zone,
        "DutyUpdatedByUserId" uuid,
        "InvitedByUserId" uuid NOT NULL,
        "InvitedAt" timestamp with time zone NOT NULL,
        "RespondedAt" timestamp with time zone,
        CONSTRAINT "PK_StaffAffiliations" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_StaffAffiliations_Users_HospitalUserId" FOREIGN KEY ("HospitalUserId") REFERENCES "Users" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_StaffAffiliations_Users_StaffUserId" FOREIGN KEY ("StaffUserId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE TABLE "VaccineSchedules" (
        "Id" uuid NOT NULL,
        "HospitalUserId" uuid NOT NULL,
        "HospitalProfileId" uuid,
        "DoctorUserId" uuid,
        "DoctorName" character varying(200) NOT NULL,
        "NurseUserId" uuid,
        "NurseName" character varying(200) NOT NULL,
        "VaccineId" uuid,
        "VaccineName" character varying(200) NOT NULL,
        "ScheduleType" character varying(50) NOT NULL,
        "SpecificDate" date,
        "DaysOfWeek" character varying(255),
        "StartDate" date,
        "EndDate" date,
        "StartTime" character varying(20) NOT NULL,
        "EndTime" character varying(20) NOT NULL,
        "Status" character varying(50) NOT NULL,
        "Price" numeric(18,2) NOT NULL DEFAULT 0.0,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_VaccineSchedules" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_VaccineSchedules_Users_DoctorUserId" FOREIGN KEY ("DoctorUserId") REFERENCES "Users" ("Id"),
        CONSTRAINT "FK_VaccineSchedules_Users_HospitalUserId" FOREIGN KEY ("HospitalUserId") REFERENCES "Users" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_VaccineSchedules_Users_NurseUserId" FOREIGN KEY ("NurseUserId") REFERENCES "Users" ("Id"),
        CONSTRAINT "FK_VaccineSchedules_Vaccines_VaccineId" FOREIGN KEY ("VaccineId") REFERENCES "Vaccines" ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE TABLE "HospitalBoothVaccines" (
        "BoothId" uuid NOT NULL,
        "VaccineId" uuid NOT NULL,
        CONSTRAINT "PK_HospitalBoothVaccines" PRIMARY KEY ("BoothId", "VaccineId"),
        CONSTRAINT "FK_HospitalBoothVaccines_HospitalBooths_BoothId" FOREIGN KEY ("BoothId") REFERENCES "HospitalBooths" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_HospitalBoothVaccines_Vaccines_VaccineId" FOREIGN KEY ("VaccineId") REFERENCES "Vaccines" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE TABLE "Batches" (
        "Id" uuid NOT NULL,
        "HospitalProfileId" uuid NOT NULL,
        "VaccineId" uuid NOT NULL,
        "BatchNumber" character varying(100) NOT NULL,
        "ExpiryDate" timestamp with time zone NOT NULL,
        "QuantityReceived" integer NOT NULL,
        "QuantityAvailable" integer NOT NULL,
        "StorageUnit" character varying(200),
        "Supplier" character varying(200),
        "Status" text NOT NULL,
        "LastRestockedAt" timestamp with time zone,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_Batches" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Batches_HospitalProfiles_HospitalProfileId" FOREIGN KEY ("HospitalProfileId") REFERENCES "HospitalProfiles" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_Batches_Vaccines_VaccineId" FOREIGN KEY ("VaccineId") REFERENCES "Vaccines" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE TABLE "ColdVaults" (
        "Id" uuid NOT NULL,
        "HospitalProfileId" uuid NOT NULL,
        "Name" character varying(100) NOT NULL,
        "Type" character varying(200),
        "CurrentTemp" character varying(50),
        "TargetTemp" character varying(50),
        "Humidity" character varying(50),
        "Status" character varying(50),
        "SensorStatus" character varying(100),
        "AssignedLots" integer NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_ColdVaults" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_ColdVaults_HospitalProfiles_HospitalProfileId" FOREIGN KEY ("HospitalProfileId") REFERENCES "HospitalProfiles" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE TABLE "HospitalFormularies" (
        "Id" uuid NOT NULL,
        "HospitalProfileId" uuid NOT NULL,
        "VaccineId" uuid NOT NULL,
        "RegisteredAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_HospitalFormularies" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_HospitalFormularies_HospitalProfiles_HospitalProfileId" FOREIGN KEY ("HospitalProfileId") REFERENCES "HospitalProfiles" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_HospitalFormularies_Vaccines_VaccineId" FOREIGN KEY ("VaccineId") REFERENCES "Vaccines" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE TABLE "PatientMedicalHistories" (
        "Id" uuid NOT NULL,
        "PatientProfileId" uuid NOT NULL,
        "RecordType" text NOT NULL,
        "Title" character varying(200) NOT NULL,
        "Description" character varying(2000),
        "Severity" text NOT NULL,
        "Status" text NOT NULL,
        "Icd10Code" character varying(20),
        "DiagnosedAt" timestamp with time zone NOT NULL,
        "ResolvedAt" timestamp with time zone,
        "RecordedByUserId" uuid,
        "RecordedByName" character varying(200),
        "Notes" character varying(1000),
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_PatientMedicalHistories" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_PatientMedicalHistories_PatientProfiles_PatientProfileId" FOREIGN KEY ("PatientProfileId") REFERENCES "PatientProfiles" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_PatientMedicalHistories_Users_RecordedByUserId" FOREIGN KEY ("RecordedByUserId") REFERENCES "Users" ("Id") ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE TABLE "PatientVisits" (
        "Id" uuid NOT NULL,
        "PatientProfileId" uuid NOT NULL,
        "DoctorUserId" uuid,
        "DoctorName" character varying(200),
        "NurseUserId" uuid,
        "NurseName" character varying(200),
        "HospitalProfileId" uuid,
        "AppointmentId" uuid,
        "VisitDate" timestamp with time zone NOT NULL,
        "VisitType" text NOT NULL,
        "Status" text NOT NULL,
        "ChiefComplaint" character varying(1000),
        "BloodPressure" character varying(20),
        "Temperature" character varying(10),
        "WeightKg" character varying(10),
        "HeightCm" character varying(10),
        "HeartRate" character varying(10),
        "OxygenSaturation" character varying(10),
        "DiagnosisSummary" character varying(2000),
        "TreatmentPlan" character varying(2000),
        "Notes" character varying(1000),
        "FollowUpDate" timestamp with time zone,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_PatientVisits" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_PatientVisits_HospitalProfiles_HospitalProfileId" FOREIGN KEY ("HospitalProfileId") REFERENCES "HospitalProfiles" ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_PatientVisits_PatientProfiles_PatientProfileId" FOREIGN KEY ("PatientProfileId") REFERENCES "PatientProfiles" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_PatientVisits_Users_DoctorUserId" FOREIGN KEY ("DoctorUserId") REFERENCES "Users" ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_PatientVisits_Users_NurseUserId" FOREIGN KEY ("NurseUserId") REFERENCES "Users" ("Id") ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE TABLE "StaffShifts" (
        "Id" uuid NOT NULL,
        "AffiliationId" uuid NOT NULL,
        "ShiftDate" date NOT NULL,
        "StartTime" time without time zone NOT NULL,
        "EndTime" time without time zone NOT NULL,
        "BoothId" uuid,
        "BoothOrStation" character varying(100),
        "Notes" character varying(500),
        "CreatedByUserId" uuid NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_StaffShifts" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_StaffShifts_HospitalBooths_BoothId" FOREIGN KEY ("BoothId") REFERENCES "HospitalBooths" ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_StaffShifts_StaffAffiliations_AffiliationId" FOREIGN KEY ("AffiliationId") REFERENCES "StaffAffiliations" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE TABLE "Appointments" (
        "Id" uuid NOT NULL,
        "PatientUserId" uuid NOT NULL,
        "PatientProfileId" uuid,
        "PatientName" character varying(200) NOT NULL,
        "PatientNic" character varying(50),
        "PatientPhone" character varying(50),
        "PatientEmail" character varying(256),
        "HospitalUserId" uuid NOT NULL,
        "HospitalProfileId" uuid,
        "HospitalName" character varying(200) NOT NULL,
        "VaccineScheduleId" uuid,
        "VaccineId" uuid,
        "VaccineName" character varying(200) NOT NULL,
        "DoctorUserId" uuid,
        "DoctorName" character varying(200),
        "NurseUserId" uuid,
        "NurseName" character varying(200),
        "AppointmentDate" date NOT NULL,
        "TimeSlot" character varying(100) NOT NULL,
        "StartTime" character varying(20),
        "EndTime" character varying(20),
        "Status" character varying(50) NOT NULL,
        "Fee" numeric(18,2) NOT NULL DEFAULT 0.0,
        "PaymentMethod" character varying(50) NOT NULL,
        "PaymentStatus" character varying(50) NOT NULL,
        "PaymentTransactionId" character varying(100),
        "Notes" character varying(1000),
        "PrescribedDosage" character varying(100),
        "PrescribedByDoctorUserId" uuid,
        "PrescribedByDoctorName" character varying(200),
        "DosageUpdatedAt" timestamp with time zone,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_Appointments" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Appointments_Users_HospitalUserId" FOREIGN KEY ("HospitalUserId") REFERENCES "Users" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_Appointments_Users_PatientUserId" FOREIGN KEY ("PatientUserId") REFERENCES "Users" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_Appointments_VaccineSchedules_VaccineScheduleId" FOREIGN KEY ("VaccineScheduleId") REFERENCES "VaccineSchedules" ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE TABLE "InventoryTransactions" (
        "Id" uuid NOT NULL,
        "BatchId" uuid NOT NULL,
        "Type" text NOT NULL,
        "Quantity" integer NOT NULL,
        "Reason" character varying(500),
        "WastageReason" text,
        "Notes" character varying(1000),
        "IncidentDate" timestamp with time zone,
        "PerformedByUserId" uuid,
        "PerformedByName" character varying(200),
        "Timestamp" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_InventoryTransactions" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_InventoryTransactions_Batches_BatchId" FOREIGN KEY ("BatchId") REFERENCES "Batches" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_InventoryTransactions_Users_PerformedByUserId" FOREIGN KEY ("PerformedByUserId") REFERENCES "Users" ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE TABLE "PatientVaccinationRecords" (
        "Id" uuid NOT NULL,
        "PatientProfileId" uuid NOT NULL,
        "VaccineId" uuid NOT NULL,
        "BatchId" uuid,
        "AdministeredByUserId" uuid,
        "AdministeredByName" character varying(200),
        "AdministeredAt" timestamp with time zone NOT NULL,
        "DoseNumber" integer NOT NULL,
        "Route" text NOT NULL,
        "Site" text,
        "LotNumber" character varying(100),
        "Notes" character varying(1000),
        "AdverseEventReported" boolean NOT NULL,
        "AdverseEventNotes" character varying(1000),
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_PatientVaccinationRecords" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_PatientVaccinationRecords_Batches_BatchId" FOREIGN KEY ("BatchId") REFERENCES "Batches" ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_PatientVaccinationRecords_PatientProfiles_PatientProfileId" FOREIGN KEY ("PatientProfileId") REFERENCES "PatientProfiles" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_PatientVaccinationRecords_Users_AdministeredByUserId" FOREIGN KEY ("AdministeredByUserId") REFERENCES "Users" ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_PatientVaccinationRecords_Vaccines_VaccineId" FOREIGN KEY ("VaccineId") REFERENCES "Vaccines" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_AgentWorkflows_Status" ON "AgentWorkflows" ("Status");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_AgentWorkflows_UserId_CreatedAt" ON "AgentWorkflows" ("UserId", "CreatedAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_Appointments_HospitalUserId" ON "Appointments" ("HospitalUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_Appointments_PatientUserId" ON "Appointments" ("PatientUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_Appointments_VaccineScheduleId" ON "Appointments" ("VaccineScheduleId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_Batches_ExpiryDate" ON "Batches" ("ExpiryDate");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_Batches_HospitalProfileId" ON "Batches" ("HospitalProfileId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE UNIQUE INDEX "IX_Batches_HospitalProfileId_BatchNumber" ON "Batches" ("HospitalProfileId", "BatchNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_Batches_VaccineId" ON "Batches" ("VaccineId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_ColdVaults_HospitalProfileId" ON "ColdVaults" ("HospitalProfileId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE UNIQUE INDEX "IX_DoctorProfiles_SlmcNumber" ON "DoctorProfiles" ("SlmcNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE UNIQUE INDEX "IX_DoctorProfiles_UserId" ON "DoctorProfiles" ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE UNIQUE INDEX "IX_HospitalBooths_HospitalUserId_Code" ON "HospitalBooths" ("HospitalUserId", "Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_HospitalBooths_HospitalUserId_IsActive_SortOrder" ON "HospitalBooths" ("HospitalUserId", "IsActive", "SortOrder");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_HospitalBoothVaccines_VaccineId" ON "HospitalBoothVaccines" ("VaccineId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE UNIQUE INDEX "IX_HospitalFormularies_HospitalProfileId_VaccineId" ON "HospitalFormularies" ("HospitalProfileId", "VaccineId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_HospitalFormularies_VaccineId" ON "HospitalFormularies" ("VaccineId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE UNIQUE INDEX "IX_HospitalProfiles_RegistrationNumber" ON "HospitalProfiles" ("RegistrationNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE UNIQUE INDEX "IX_HospitalProfiles_UserId" ON "HospitalProfiles" ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_InventoryTransactions_BatchId" ON "InventoryTransactions" ("BatchId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_InventoryTransactions_PerformedByUserId" ON "InventoryTransactions" ("PerformedByUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_InventoryTransactions_Timestamp" ON "InventoryTransactions" ("Timestamp");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE UNIQUE INDEX "IX_NurseProfiles_SlncNumber" ON "NurseProfiles" ("SlncNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE UNIQUE INDEX "IX_NurseProfiles_UserId" ON "NurseProfiles" ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_PatientMedicalHistories_PatientProfileId_DiagnosedAt" ON "PatientMedicalHistories" ("PatientProfileId", "DiagnosedAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_PatientMedicalHistories_RecordedByUserId" ON "PatientMedicalHistories" ("RecordedByUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_PatientMedicalHistories_RecordType" ON "PatientMedicalHistories" ("RecordType");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_PatientMedicalHistories_Status" ON "PatientMedicalHistories" ("Status");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE UNIQUE INDEX "IX_PatientProfiles_NicNumber" ON "PatientProfiles" ("NicNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE UNIQUE INDEX "IX_PatientProfiles_UserId" ON "PatientProfiles" ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_PatientVaccinationRecords_AdministeredByUserId" ON "PatientVaccinationRecords" ("AdministeredByUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_PatientVaccinationRecords_BatchId" ON "PatientVaccinationRecords" ("BatchId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_PatientVaccinationRecords_PatientProfileId_AdministeredAt" ON "PatientVaccinationRecords" ("PatientProfileId", "AdministeredAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_PatientVaccinationRecords_VaccineId" ON "PatientVaccinationRecords" ("VaccineId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_PatientVisits_DoctorUserId" ON "PatientVisits" ("DoctorUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_PatientVisits_FollowUpDate" ON "PatientVisits" ("FollowUpDate");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_PatientVisits_HospitalProfileId" ON "PatientVisits" ("HospitalProfileId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_PatientVisits_NurseUserId" ON "PatientVisits" ("NurseUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_PatientVisits_PatientProfileId_VisitDate" ON "PatientVisits" ("PatientProfileId", "VisitDate");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_PatientVisits_Status" ON "PatientVisits" ("Status");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_StaffAffiliations_HospitalUserId_StaffUserId" ON "StaffAffiliations" ("HospitalUserId", "StaffUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_StaffAffiliations_StaffUserId" ON "StaffAffiliations" ("StaffUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_StaffShifts_AffiliationId_ShiftDate" ON "StaffShifts" ("AffiliationId", "ShiftDate");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_StaffShifts_BoothId" ON "StaffShifts" ("BoothId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE UNIQUE INDEX "IX_Users_Email" ON "Users" ("Email");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE UNIQUE INDEX "IX_Users_RegistrationNumber" ON "Users" ("RegistrationNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_VaccineSchedules_DoctorUserId" ON "VaccineSchedules" ("DoctorUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_VaccineSchedules_HospitalUserId" ON "VaccineSchedules" ("HospitalUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_VaccineSchedules_NurseUserId" ON "VaccineSchedules" ("NurseUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    CREATE INDEX "IX_VaccineSchedules_VaccineId" ON "VaccineSchedules" ("VaccineId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260928004401_AddAppointmentsAndBooths') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260928004401_AddAppointmentsAndBooths', '8.0.11');
    END IF;
END $EF$;
COMMIT;

