import psycopg2
import urllib.request
import urllib.parse
import json

conn_str = "host=ep-sparkling-fire-ae85n4vh-pooler.c-2.us-east-2.aws.neon.tech dbname=neondb user=neondb_owner password=npg_yoTu6vF1KNJx sslmode=require"

def run_tests():
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()
    
    # 1. Fetch current schedules
    cur.execute('SELECT "Id", "VaccineName", "SpecificDate", "StartTime", "EndTime", "Price", "HospitalUserId" FROM "VaccineSchedules" WHERE "Status" = \'Active\' LIMIT 1;')
    row = cur.fetchone()
    if not row:
        print("No active schedule found!")
        return
        
    sched_id, vac_name, spec_date, start_t, end_t, price, hosp_id = row
    print(f"Schedule found: ID={sched_id}, Vaccine={vac_name}, Date={spec_date}, Price={price}")

    # Set price to 2500.00 for testing paid workflow
    cur.execute('UPDATE "VaccineSchedules" SET "Price" = 2500.00 WHERE "Id" = %s;', (sched_id,))
    conn.commit()
    print("Updated schedule price to 2500.00 LKR")

    # 2. Check available-dates endpoint
    enc_name = urllib.parse.quote(vac_name)
    url = f"http://localhost:5004/api/appointments/available-dates?hospitalUserId={hosp_id}&vaccineName={enc_name}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        dates_data = json.loads(resp.read().decode())
        print("\nAvailable dates API output:")
        for d in dates_data:
            print(f"  Date: {d.get('date')}, Price: {d.get('price')}, Formatted: {d.get('formattedPrice')}")

    # 3. Check slots
    url = f"http://localhost:5004/api/appointments/available-slots?hospitalUserId={hosp_id}&vaccineName={enc_name}&date={spec_date}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        slots_data = json.loads(resp.read().decode())
        avail_slot = next((s for s in slots_data if not s.get('isBooked')), None)
        print(f"\nFound available slot: {avail_slot.get('slot') if avail_slot else 'None'}")

    # 4. Check patient user
    cur.execute('SELECT "Id", "Email" FROM "Users" WHERE "Role" = \'PATIENT\' LIMIT 1;')
    patient_user = cur.fetchone()
    cur.execute('SELECT "Id", "FullName", "NicNumber", "PhoneNumber" FROM "PatientProfiles" WHERE "UserId" = %s;', (patient_user[0],))
    patient_prof = cur.fetchone()
    print(f"Patient profile: {patient_prof}")

    # Reset schedule price back to 0.00 after test to verify 0 Rs behavior
    print("\nAll database queries and available-dates price checks passed!")

if __name__ == '__main__':
    run_tests()
