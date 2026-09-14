import psycopg2

conn_str = "Host=ep-sparkling-fire-ae85n4vh-pooler.c-2.us-east-2.aws.neon.tech;Database=neondb;Username=neondb_owner;Password=npg_yoTu6vF1KNJx;SSL Mode=Require"

conn = psycopg2.connect("postgresql://neondb_owner:npg_yoTu6vF1KNJx@ep-sparkling-fire-ae85n4vh-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require")
cur = conn.cursor()

create_table_sql = """
CREATE TABLE IF NOT EXISTS "VaccineSchedules" (
    "Id" UUID PRIMARY KEY,
    "HospitalUserId" UUID NOT NULL REFERENCES "Users"("Id") ON DELETE CASCADE,
    "HospitalProfileId" UUID NULL,
    "DoctorUserId" UUID NULL,
    "DoctorName" VARCHAR(200) NOT NULL,
    "NurseUserId" UUID NULL,
    "NurseName" VARCHAR(200) NOT NULL,
    "VaccineId" UUID NULL,
    "VaccineName" VARCHAR(200) NOT NULL,
    "ScheduleType" VARCHAR(50) NOT NULL DEFAULT 'OneTime',
    "SpecificDate" DATE NULL,
    "DaysOfWeek" VARCHAR(255) NULL,
    "StartDate" DATE NULL,
    "EndDate" DATE NULL,
    "StartTime" VARCHAR(20) NOT NULL,
    "EndTime" VARCHAR(20) NOT NULL,
    "Status" VARCHAR(50) NOT NULL DEFAULT 'Active',
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "IX_VaccineSchedules_HospitalUserId" ON "VaccineSchedules"("HospitalUserId");
CREATE INDEX IF NOT EXISTS "IX_VaccineSchedules_Status" ON "VaccineSchedules"("Status");
CREATE INDEX IF NOT EXISTS "IX_VaccineSchedules_VaccineName" ON "VaccineSchedules"("VaccineName");
"""

cur.execute(create_table_sql)
conn.commit()
print("VaccineSchedules table successfully created and indexed in Neon PostgreSQL!")

cur.close()
conn.close()
