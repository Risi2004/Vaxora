import psycopg2
import urllib.request
import urllib.parse
import json
import jwt
import datetime

conn_str = "host=ep-sparkling-fire-ae85n4vh-pooler.c-2.us-east-2.aws.neon.tech dbname=neondb user=neondb_owner password=npg_yoTu6vF1KNJx sslmode=require"
jwt_secret = "VaxoraSecureHealthPlatformJwtSecretKey2026!#DefaulteKeyMinimum32BytesLength"

def create_patient_token(patient_user_id, email, name):
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {
        "sub": str(patient_user_id),
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier": str(patient_user_id),
        "email": email,
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress": email,
        "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": "PATIENT",
        "status": "Active",
        "name": name,
        "iss": "Vaxora.Api",
        "aud": "Vaxora.Client",
        "exp": now + datetime.timedelta(hours=2),
        "iat": now
    }
    return jwt.encode(payload, jwt_secret, algorithm="HS256")

def main():
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()
    
    # Get active schedule
    cur.execute('SELECT "Id", "VaccineId", "VaccineName", "SpecificDate", "HospitalUserId" FROM "VaccineSchedules" WHERE "Status" = \'Active\' LIMIT 1;')
    sched = cur.fetchone()
    sched_id, vac_id, vac_name, spec_date, hosp_id = sched

    # Get patient
    cur.execute('SELECT "Id", "Email" FROM "Users" WHERE "Role" = \'PATIENT\' LIMIT 1;')
    patient_user = cur.fetchone()
    cur.execute('SELECT "Id", "FullName" FROM "PatientProfiles" WHERE "UserId" = %s;', (patient_user[0],))
    patient_prof = cur.fetchone()
    token = create_patient_token(patient_user[0], patient_user[1], patient_prof[1])
    print(f"Generated JWT for Patient: {patient_prof[1]} ({patient_user[1]})")

    cur.execute('DELETE FROM "Appointments" WHERE "Notes" LIKE \'Automated%\';')
    conn.commit()
    print("Cleaned up previous automated test appointments.")

    # -------------------------------------------------------------
    # TEST 1: Schedule has Price = 1800.00 LKR, Patient selects PayHere
    # -------------------------------------------------------------
    print("\n--- TEST 1: Price = 1800.00 LKR with PayHere Gateway ---")
    cur.execute('UPDATE "VaccineSchedules" SET "Price" = 1800.00 WHERE "Id" = %s;', (sched_id,))
    conn.commit()

    # Book with PayHere
    book_body = {
        "hospitalUserId": str(hosp_id),
        "vaccineName": vac_name,
        "appointmentDate": str(spec_date),
        "vaccineScheduleId": str(sched_id),
        "timeSlot": "09:00 AM - 09:20 AM",
        "notes": "Automated PayHere Gateway Test",
        "paymentMethod": "PayHere"
    }
    req = urllib.request.Request(
        "http://localhost:5004/api/appointments",
        data=json.dumps(book_body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
    )
    try:
        with urllib.request.urlopen(req) as resp:
            apt = json.loads(resp.read().decode())
            print(f"Appointment Created: ID={apt.get('id')}, Status={apt.get('status')}, Fee={apt.get('fee')}, PaymentMethod={apt.get('paymentMethod')}, PaymentStatus={apt.get('paymentStatus')}")
            assert apt.get('status') == "PendingPayment", "Appointment status should be PendingPayment before payment!"
            assert apt.get('paymentStatus') == "PendingOnline", "Payment status should be PendingOnline!"
            assert apt.get('fee') == 1800.0, "Fee should match schedule price!"
    except urllib.error.HTTPError as e:
        print("HTTP Error:", e.code, e.read().decode())
        return

    apt_id = apt.get('id')

    # Test PayHere Init API
    init_body = {"appointmentId": apt_id}
    init_req = urllib.request.Request(
        "http://localhost:5004/api/payment/payhere-init",
        data=json.dumps(init_body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
    )
    with urllib.request.urlopen(init_req) as resp:
        init_res = json.loads(resp.read().decode())
        print(f"PayHere Init Succeeded: MerchantId={init_res.get('merchantId')}, Amount={init_res.get('amount')}, Currency={init_res.get('currency')}, Hash={init_res.get('hash')[:8]}...")
        assert float(init_res.get('amount')) == 1800.0
        assert init_res.get('currency') == "LKR"
        assert len(init_res.get('hash')) == 32

    # Test Confirming Payment
    confirm_body = {
        "appointmentId": apt_id,
        "paymentId": "PAYHERE-TXN-99887766"
    }
    confirm_req = urllib.request.Request(
        "http://localhost:5004/api/payment/confirm",
        data=json.dumps(confirm_body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
    )
    with urllib.request.urlopen(confirm_req) as resp:
        confirm_res = json.loads(resp.read().decode())
        confirmed_apt = confirm_res.get('appointment', {})
        print(f"Payment Confirmed: Status={confirmed_apt.get('status')}, PaymentStatus={confirmed_apt.get('paymentStatus')}, TxnId={confirmed_apt.get('paymentTransactionId')}")
        assert confirmed_apt.get('status') == "Confirmed", "Appointment must be Confirmed after payment!"
        assert confirmed_apt.get('paymentStatus') == "Paid", "PaymentStatus must be Paid!"

    # -------------------------------------------------------------
    # TEST 2: Schedule has Price = 1800.00 LKR, Patient selects Pay at Hospital
    # -------------------------------------------------------------
    print("\n--- TEST 2: Price = 1800.00 LKR with Pay at Hospital ---")
    book_body_hosp = {
        "hospitalUserId": str(hosp_id),
        "vaccineName": vac_name,
        "appointmentDate": str(spec_date),
        "vaccineScheduleId": str(sched_id),
        "timeSlot": "09:20 AM - 09:40 AM",
        "notes": "Automated Pay at Hospital Test",
        "paymentMethod": "Hospital"
    }
    req_hosp = urllib.request.Request(
        "http://localhost:5004/api/appointments",
        data=json.dumps(book_body_hosp).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
    )
    with urllib.request.urlopen(req_hosp) as resp:
        apt_hosp = json.loads(resp.read().decode())
        print(f"Hospital Booking Created: Status={apt_hosp.get('status')}, Fee={apt_hosp.get('fee')}, PaymentMethod={apt_hosp.get('paymentMethod')}, PaymentStatus={apt_hosp.get('paymentStatus')}")
        assert apt_hosp.get('status') == "Confirmed", "Hospital payment appointment must be Confirmed directly!"
        assert apt_hosp.get('paymentStatus') == "PendingAtHospital"

    # -------------------------------------------------------------
    # TEST 3: Schedule Price = 0.00 (Free), Booking directly
    # -------------------------------------------------------------
    print("\n--- TEST 3: Free Schedule (0 Rs) ---")
    cur.execute('UPDATE "VaccineSchedules" SET "Price" = 0.00 WHERE "Id" = %s;', (sched_id,))
    conn.commit()

    book_body_free = {
        "hospitalUserId": str(hosp_id),
        "vaccineName": vac_name,
        "appointmentDate": str(spec_date),
        "vaccineScheduleId": str(sched_id),
        "timeSlot": "09:40 AM - 10:00 AM",
        "notes": "Automated Free Booking Test",
        "paymentMethod": "Free"
    }
    req_free = urllib.request.Request(
        "http://localhost:5004/api/appointments",
        data=json.dumps(book_body_free).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
    )
    with urllib.request.urlopen(req_free) as resp:
        apt_free = json.loads(resp.read().decode())
        print(f"Free Booking Created: Status={apt_free.get('status')}, Fee={apt_free.get('fee')}, PaymentMethod={apt_free.get('paymentMethod')}, PaymentStatus={apt_free.get('paymentStatus')}")
        assert apt_free.get('status') == "Confirmed"
        assert apt_free.get('paymentMethod') == "Free"
        assert apt_free.get('paymentStatus') == "Paid"

    print("\n>>> ALL 3 WORKFLOWS TESTED & VALIDATED SUCCESSFULLY! <<<")

if __name__ == '__main__':
    main()
