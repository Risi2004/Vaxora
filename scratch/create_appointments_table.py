import psycopg2

conn_str = 'postgresql://neondb_owner:npg_yoTu6vF1KNJx@ep-sparkling-fire-ae85n4vh-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require'
conn = psycopg2.connect(conn_str)
cur = conn.cursor()

ddl = '''
CREATE TABLE IF NOT EXISTS "Appointments" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "PatientUserId" UUID NOT NULL,
    "PatientProfileId" UUID,
    "PatientName" VARCHAR(200) NOT NULL,
    "PatientNic" VARCHAR(50),
    "PatientPhone" VARCHAR(50),
    "PatientEmail" VARCHAR(256),
    "HospitalUserId" UUID NOT NULL,
    "HospitalProfileId" UUID,
    "HospitalName" VARCHAR(200) NOT NULL,
    "VaccineScheduleId" UUID,
    "VaccineId" UUID,
    "VaccineName" VARCHAR(200) NOT NULL,
    "DoctorUserId" UUID,
    "DoctorName" VARCHAR(200),
    "NurseUserId" UUID,
    "NurseName" VARCHAR(200),
    "AppointmentDate" DATE NOT NULL,
    "TimeSlot" VARCHAR(100) NOT NULL,
    "StartTime" VARCHAR(20),
    "EndTime" VARCHAR(20),
    "Status" VARCHAR(50) NOT NULL DEFAULT 'Confirmed',
    "Notes" VARCHAR(1000),
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMPTZ,
    CONSTRAINT fk_patient_user FOREIGN KEY ("PatientUserId") REFERENCES "Users"("Id") ON DELETE CASCADE,
    CONSTRAINT fk_hospital_user FOREIGN KEY ("HospitalUserId") REFERENCES "Users"("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient ON "Appointments"("PatientUserId");
CREATE INDEX IF NOT EXISTS idx_appointments_hospital_date ON "Appointments"("HospitalUserId", "AppointmentDate");
CREATE INDEX IF NOT EXISTS idx_appointments_slot ON "Appointments"("HospitalUserId", "AppointmentDate", "TimeSlot");
'''

cur.execute(ddl)
conn.commit()
print("Appointments table created successfully in Neon DB!")

cur.execute('''
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'Appointments';
''')
cols = cur.fetchall()
print("Appointments columns:", cols)

cur.close()
conn.close()
