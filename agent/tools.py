import httpx
import re
from typing import Dict, Any, List, Optional

try:
    from .config import settings
except ImportError:
    from config import settings

def _is_valid_uuid(val: Any) -> bool:
    if not val:
        return False
    s = str(val).strip()
    return bool(re.match(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$', s))

def _clean_date_string(date_str: Any) -> str:
    """Extracts YYYY-MM-DD from any text (e.g. '2026-09-18 (Friday) - 09:00 AM - 11:00 AM')."""
    if not date_str:
        return ""
    m = re.search(r'(\d{4}-\d{2}-\d{2})', str(date_str))
    if m:
        return m.group(1)
    return str(date_str).strip()

def _clean_slot_string(slot_str: Any) -> str:
    """Extracts clean time slot range (e.g. '09:00 AM - 09:20 AM' or '09:00 - 09:20')."""
    if not slot_str:
        return ""
    s = str(slot_str).strip()
    m = re.search(r'(\d{1,2}:\d{2}(?:\s*(?:AM|PM|am|pm))?\s*-\s*\d{1,2}:\d{2}(?:\s*(?:AM|PM|am|pm))?)', s)
    if m:
        return m.group(1)
    return s

async def api_get(endpoint: str, token: Optional[str] = None, params: Optional[Dict[str, Any]] = None) -> Any:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(f"{settings.vaxora_api_base_url}{endpoint}", headers=headers, params=params)
        if response.is_error:
            try:
                err_data = response.json()
                msg = err_data.get("message") or err_data.get("title") or err_data.get("errors") or str(err_data)
                raise Exception(f"API Error ({response.status_code}): {msg}")
            except Exception as pe:
                if "API Error" in str(pe):
                    raise pe
                raise Exception(f"API Error ({response.status_code}): {response.text}")
        return response.json()

async def api_post(endpoint: str, data: Dict[str, Any], token: Optional[str] = None) -> Any:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(f"{settings.vaxora_api_base_url}{endpoint}", headers=headers, json=data)
        if response.is_error:
            try:
                err_data = response.json()
                msg = err_data.get("message") or err_data.get("title") or err_data.get("errors") or str(err_data)
                raise Exception(f"API Error ({response.status_code}): {msg}")
            except Exception as pe:
                if "API Error" in str(pe):
                    raise pe
                raise Exception(f"API Error ({response.status_code}): {response.text}")
        return response.json()

async def api_delete(endpoint: str, token: Optional[str] = None) -> Any:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.delete(f"{settings.vaxora_api_base_url}{endpoint}", headers=headers)
        if response.is_error:
            try:
                err_data = response.json()
                msg = err_data.get("message") or err_data.get("title") or err_data.get("errors") or str(err_data)
                raise Exception(f"API Error ({response.status_code}): {msg}")
            except Exception as pe:
                if "API Error" in str(pe):
                    raise pe
                raise Exception(f"API Error ({response.status_code}): {response.text}")
        return response.json()

# Tool Implementations
async def _resolve_hospital_and_vaccine(hospital_id_or_name: Optional[str], vaccine_name: Optional[str], token: Optional[str] = None):
    resolved_hospital_id = str(hospital_id_or_name).strip() if hospital_id_or_name else ""
    resolved_vaccine_name = str(vaccine_name).strip() if vaccine_name else ""

    try:
        # Load inventory vaccines and active schedules
        data = await api_get("/inventory/vaccines-with-hospitals", token=token)
        schedules = []
        try:
            schedules = await api_get("/schedule/available", token=token)
        except Exception:
            pass

        # Collect all hospital references: [{userId, id, name}]
        known_hospitals = []
        for v in (data if isinstance(data, list) else []):
            for h in v.get("hospitals", []):
                uid = h.get("userId") or h.get("id")
                name = h.get("name", "")
                if uid and uid not in [kh["userId"] for kh in known_hospitals]:
                    known_hospitals.append({"userId": uid, "name": name, "profileId": h.get("hospitalProfileId")})

        for s in (schedules if isinstance(schedules, list) else []):
            uid = s.get("hospitalUserId")
            name = s.get("hospitalName", "")
            if uid and uid not in [kh["userId"] for kh in known_hospitals]:
                known_hospitals.append({"userId": uid, "name": name, "profileId": None})

        # Match vaccine name from known inventory / schedules
        v_input = (vaccine_name or "").lower().strip()
        matched_vname = None

        if v_input:
            # 1. Exact or bidirectional containment with inventory
            for v in (data if isinstance(data, list) else []):
                db_vname = v.get("name", "")
                if db_vname.lower() == v_input or db_vname.lower() in v_input or v_input in db_vname.lower():
                    matched_vname = db_vname
                    break

            # 2. Check schedules if still not matched
            if not matched_vname:
                for s in (schedules if isinstance(schedules, list) else []):
                    sched_vname = s.get("vaccineName", "")
                    if sched_vname.lower() == v_input or sched_vname.lower() in v_input or v_input in sched_vname.lower():
                        matched_vname = sched_vname
                        break

            # 3. Word token matching (e.g. "astrazeneca" in "AstraZeneca COVID-19 Vaccine")
            if not matched_vname:
                v_words = [w for w in re.split(r'[\s\-_]+', v_input) if len(w) >= 4]
                for v in (data if isinstance(data, list) else []):
                    db_vname = v.get("name", "")
                    if any(w in db_vname.lower() for w in v_words):
                        matched_vname = db_vname
                        break

        if matched_vname:
            resolved_vaccine_name = matched_vname

        # If hospital_id_or_name is ALREADY a valid UUID, keep it
        if _is_valid_uuid(resolved_hospital_id):
            return resolved_hospital_id, resolved_vaccine_name

        h_input = (hospital_id_or_name or "").lower().strip()
        # Clean sluggy terms like "hospital-royal" -> ["royal"]
        h_tokens = [t for t in re.split(r'[\s\-_]+', h_input) if t and t not in ("hospital", "hospitals", "clinic", "center")]

        matched_hid = None
        for kh in known_hospitals:
            kh_name = kh["name"].lower()
            if h_input and (h_input in kh_name or kh_name in h_input):
                matched_hid = kh["userId"]
                break
            if h_tokens and any(t in kh_name for t in h_tokens):
                matched_hid = kh["userId"]
                break

        # If still not matched, check if a hospital offers the matched vaccine
        if not matched_hid and resolved_vaccine_name:
            for v in (data if isinstance(data, list) else []):
                if v.get("name", "").lower() == resolved_vaccine_name.lower():
                    if v.get("hospitals"):
                        matched_hid = v["hospitals"][0].get("userId") or v["hospitals"][0].get("id")
                        break

        # Fallback to the first available hospital in system if still not a valid UUID
        if not matched_hid and known_hospitals:
            matched_hid = known_hospitals[0]["userId"]

        if matched_hid and _is_valid_uuid(matched_hid):
            resolved_hospital_id = matched_hid

    except Exception:
        pass

    return resolved_hospital_id, resolved_vaccine_name

async def tool_get_available_vaccines_and_hospitals(token: Optional[str] = None) -> Dict[str, Any]:
    """Retrieve all available vaccines, current hospital stock, and pricing information."""
    try:
        data = await api_get("/inventory/vaccines-with-hospitals", token=token)
        schedules = []
        try:
            schedules = await api_get("/schedule/available", token=token)
        except Exception:
            pass

        # Enrich inventory with price and schedule information
        enriched_vaccines = []
        for v in (data if isinstance(data, list) else []):
            v_copy = dict(v)
            v_name = v_copy.get("name", "").strip().lower()
            hospitals = v_copy.get("hospitals", [])
            enriched_hospitals = []
            matched_prices = []

            for h in hospitals:
                h_copy = dict(h)
                h_uid = str(h_copy.get("userId") or h_copy.get("id") or "").lower()

                # Find matching schedule for this hospital and vaccine
                matched_sched = None
                for s in schedules:
                    s_huid = str(s.get("hospitalUserId") or "").lower()
                    s_vname = str(s.get("vaccineName") or "").strip().lower()
                    if (s_huid == h_uid or not h_uid) and (s_vname == v_name or s_vname in v_name or v_name in s_vname):
                        matched_sched = s
                        break

                if matched_sched:
                    price = float(matched_sched.get("price") or 0.0)
                    h_copy["price"] = price
                    h_copy["formattedPrice"] = matched_sched.get("formattedPrice") or (f"LKR {price:,.2f}" if price > 0 else "Free (0 LKR)")
                    h_copy["is_free"] = price <= 0
                    h_copy["vaccineScheduleId"] = matched_sched.get("id")
                    h_copy["doctorName"] = matched_sched.get("doctorName")
                    h_copy["nurseName"] = matched_sched.get("nurseName")
                    matched_prices.append(price)
                else:
                    h_copy["price"] = 0.0
                    h_copy["formattedPrice"] = "Free (0 LKR)"
                    h_copy["is_free"] = True

                enriched_hospitals.append(h_copy)

            v_copy["hospitals"] = enriched_hospitals
            if matched_prices:
                primary_price = matched_prices[0]
                v_copy["price"] = primary_price
                v_copy["formattedPrice"] = f"LKR {primary_price:,.2f}" if primary_price > 0 else "Free (0 LKR)"
                v_copy["is_free"] = primary_price <= 0
            else:
                v_copy["price"] = 0.0
                v_copy["formattedPrice"] = "Free (0 LKR)"
                v_copy["is_free"] = True

            enriched_vaccines.append(v_copy)

        return {"success": True, "vaccines": enriched_vaccines}
    except Exception as e:
        return {"success": False, "error": str(e)}

async def tool_get_available_dates(hospital_user_id: str, vaccine_name: str, token: Optional[str] = None) -> Dict[str, Any]:
    """Retrieve available clinic dates and schedules for a specific hospital and vaccine."""
    try:
        hid, vname = await _resolve_hospital_and_vaccine(hospital_user_id, vaccine_name, token=token)
        params = {"hospitalUserId": hid, "vaccineName": vname}
        data = await api_get("/appointments/available-dates", token=token, params=params)
        return {"success": True, "dates": data, "hospital_user_id": hid, "vaccine_name": vname}
    except Exception as e:
        return {"success": False, "error": str(e)}

async def tool_get_available_slots(hospital_user_id: str, vaccine_name: str, date: str, token: Optional[str] = None) -> Dict[str, Any]:
    """Retrieve available 20-minute time slots for a given date, hospital, and vaccine."""
    try:
        clean_date = _clean_date_string(date)
        hid, vname = await _resolve_hospital_and_vaccine(hospital_user_id, vaccine_name, token=token)
        params = {"hospitalUserId": hid, "vaccineName": vname, "date": clean_date}
        data = await api_get("/appointments/available-slots", token=token, params=params)
        return {"success": True, "slots": data, "hospital_user_id": hid, "vaccine_name": vname, "date": clean_date}
    except Exception as e:
        return {"success": False, "error": str(e)}

async def tool_autonomous_find_and_propose(
    vaccine_name: str,
    hospital_name_or_id: Optional[str] = None,
    preferred_date: Optional[str] = None,
    preferred_slot: Optional[str] = None,
    time_of_day: Optional[str] = None,
    token: Optional[str] = None
) -> Dict[str, Any]:
    """
    Autonomous Delegated Booking Tool (One-Prompt Execution):
    In a single shot, discovers the hospital, fetches upcoming clinic dates, locates open time slots,
    applies schedule pricing, and prepares the official proposal card for human-in-the-loop patient approval.
    """
    try:
        # 1. Resolve hospital and vaccine name
        hid, vname = await _resolve_hospital_and_vaccine(hospital_name_or_id, vaccine_name, token=token)

        # 2. Get schedule details for hospital name, price, doctor, etc.
        hospital_name = "Hospital Center"
        doctor_name = None
        schedule_id = None
        vaccine_id = None
        price = 0.0
        formatted_price = "Free (0 LKR)"
        is_free = True

        try:
            schedules = await api_get("/schedule/available", token=token)
            for s in schedules:
                s_huid = str(s.get("hospitalUserId") or "").lower()
                s_vname = str(s.get("vaccineName") or "").strip().lower()
                if (s_huid == str(hid).lower() or not hid) and (s_vname == vname.lower() or s_vname in vname.lower() or vname.lower() in s_vname):
                    hospital_name = s.get("hospitalName") or hospital_name
                    doctor_name = s.get("doctorName")
                    schedule_id = s.get("id")
                    vaccine_id = s.get("vaccineId")
                    price = float(s.get("price") or 0.0)
                    formatted_price = s.get("formattedPrice") or (f"LKR {price:,.2f}" if price > 0 else "Free (0 LKR)")
                    is_free = price <= 0
                    break
        except Exception:
            pass

        if hospital_name == "Hospital Center":
            try:
                inv = await api_get("/inventory/vaccines-with-hospitals", token=token)
                for iv in inv:
                    for ih in iv.get("hospitals", []):
                        if ih.get("userId") == hid or ih.get("id") == hid:
                            hospital_name = ih.get("name") or hospital_name
                            break
            except Exception:
                pass

        # 3. Retrieve available clinic dates
        dates_res = await api_get("/appointments/available-dates", token=token, params={"hospitalUserId": hid, "vaccineName": vname})
        if not dates_res or not isinstance(dates_res, list) or len(dates_res) == 0:
            return {
                "success": False,
                "error": f"No clinic sessions found for {vname} at {hospital_name}. Please choose another vaccine or hospital."
            }

        # Select date matching preference
        selected_date = None
        pref_date_clean = _clean_date_string(preferred_date) if preferred_date else None
        pref_day_lower = str(preferred_date or "").lower().strip()

        if pref_date_clean and re.match(r'^\d{4}-\d{2}-\d{2}$', pref_date_clean):
            # Exact date match
            for d in dates_res:
                if d.get("date") == pref_date_clean:
                    selected_date = d.get("date")
                    break

        if not selected_date and pref_day_lower:
            # Check day of week match (e.g. "wednesday", "friday")
            for d in dates_res:
                if d.get("dayOfWeek", "").lower() in pref_day_lower or pref_day_lower in d.get("dayOfWeek", "").lower():
                    selected_date = d.get("date")
                    break

        if not selected_date:
            # Default to the earliest available date
            selected_date = dates_res[0].get("date")

        # 4. Fetch available slots for this date
        slots_res = await api_get("/appointments/available-slots", token=token, params={"hospitalUserId": hid, "vaccineName": vname, "date": selected_date})
        open_slots = [s for s in (slots_res if isinstance(slots_res, list) else []) if not s.get("isBooked")]

        # If no open slots on chosen date, try next available dates
        if not open_slots:
            for next_d in dates_res:
                if next_d.get("date") != selected_date:
                    next_slots = await api_get("/appointments/available-slots", token=token, params={"hospitalUserId": hid, "vaccineName": vname, "date": next_d.get("date")})
                    open_slots = [s for s in (next_slots if isinstance(next_slots, list) else []) if not s.get("isBooked")]
                    if open_slots:
                        selected_date = next_d.get("date")
                        break

        if not open_slots:
            return {
                "success": False,
                "error": f"All slots are currently booked for {vname} at {hospital_name} across upcoming dates."
            }

        # Pick slot matching user time preference
        selected_slot = None
        pref_time_lower = (time_of_day or preferred_slot or "").lower()

        if preferred_slot:
            clean_pref_slot = _clean_slot_string(preferred_slot)
            for s in open_slots:
                if clean_pref_slot in s.get("slot", ""):
                    selected_slot = s.get("slot")
                    break

        if not selected_slot and ("morning" in pref_time_lower or "am" in pref_time_lower):
            for s in open_slots:
                st = s.get("startTime", "")
                if st and st < "12:00":
                    selected_slot = s.get("slot")
                    break

        if not selected_slot and ("afternoon" in pref_time_lower or "evening" in pref_time_lower or "pm" in pref_time_lower):
            for s in open_slots:
                st = s.get("startTime", "")
                if st and st >= "12:00":
                    selected_slot = s.get("slot")
                    break

        if not selected_slot:
            # Default to first open slot
            selected_slot = open_slots[0].get("slot")

        proposal = {
            "hospital_user_id": hid,
            "hospital_name": hospital_name,
            "vaccine_name": vname,
            "vaccine_id": vaccine_id,
            "vaccine_schedule_id": schedule_id,
            "appointment_date": selected_date,
            "time_slot": selected_slot,
            "price": price,
            "is_free": is_free,
            "doctor_name": doctor_name
        }

        return {
            "success": True,
            "status": "proposal_pending_user_approval",
            "proposal": proposal,
            "summary": f"Optimal appointment found: {vname} at {hospital_name} on {selected_date} at {selected_slot}. Fee: {formatted_price}."
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

async def tool_book_appointment(
    hospital_user_id: str,
    vaccine_name: str,
    appointment_date: str,
    time_slot: str,
    notes: Optional[str] = None,
    payment_method: str = "Free",
    vaccine_id: Optional[str] = None,
    vaccine_schedule_id: Optional[str] = None,
    token: Optional[str] = None
) -> Dict[str, Any]:
    """Execute the final booking for an appointment. Must only be invoked after explicit user approval."""
    try:
        clean_date = _clean_date_string(appointment_date)
        clean_slot = _clean_slot_string(time_slot)
        hid, vname = await _resolve_hospital_and_vaccine(hospital_user_id, vaccine_name, token=token)

        # Lookup schedule if vaccine_schedule_id not supplied
        resolved_schedule_id = vaccine_schedule_id
        resolved_vaccine_id = vaccine_id
        schedule_price = 0.0

        try:
            schedules = await api_get("/schedule/available", token=token)
            for s in schedules:
                s_huid = str(s.get("hospitalUserId") or "").lower()
                s_vname = str(s.get("vaccineName") or "").strip().lower()
                if (s_huid == str(hid).lower() or not hid) and (s_vname == vname.lower() or s_vname in vname.lower() or vname.lower() in s_vname):
                    if not resolved_schedule_id:
                        resolved_schedule_id = s.get("id")
                    if not resolved_vaccine_id:
                        resolved_vaccine_id = s.get("vaccineId")
                    schedule_price = float(s.get("price") or 0.0)
                    break
        except Exception:
            pass

        # Determine payment method based on schedule pricing
        if schedule_price > 0 or payment_method.lower() in ("payhere", "paid", "online"):
            resolved_payment_method = "PayHere"
        else:
            resolved_payment_method = "Free"

        payload = {
            "hospitalUserId": hid,
            "vaccineName": vname,
            "appointmentDate": clean_date,
            "timeSlot": clean_slot,
            "notes": notes or "Booked via Vaxora AI Agent",
            "paymentMethod": resolved_payment_method
        }
        if resolved_vaccine_id and _is_valid_uuid(resolved_vaccine_id):
            payload["vaccineId"] = resolved_vaccine_id
        if resolved_schedule_id and _is_valid_uuid(resolved_schedule_id):
            payload["vaccineScheduleId"] = resolved_schedule_id

        res = await api_post("/appointments", data=payload, token=token)
        appointment_id = res.get("id") or res.get("Id")

        # If it's a paid booking, initialize PayHere checkout payload automatically
        payhere_payload = None
        fee = float(res.get("fee") or schedule_price or 0.0)
        is_free = fee <= 0 and res.get("status") != "PendingPayment"

        if not is_free or res.get("status") == "PendingPayment" or fee > 0:
            try:
                payhere_payload = await api_post("/payment/payhere-init", data={"appointmentId": appointment_id}, token=token)
            except Exception as pe:
                payhere_payload = {"error": f"Payment init failed: {str(pe)}"}

        return {
            "success": True,
            "appointment": res,
            "payhere_payload": payhere_payload,
            "is_free": is_free,
            "fee": fee
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

async def tool_get_my_appointments(token: Optional[str] = None) -> Dict[str, Any]:
    """Retrieve the logged-in patient's appointment history and upcoming bookings."""
    try:
        data = await api_get("/appointments/patient", token=token)
        return {"success": True, "appointments": data}
    except Exception as e:
        return {"success": False, "error": str(e)}

async def tool_cancel_appointment(appointment_id: Optional[str] = None, token: Optional[str] = None) -> Dict[str, Any]:
    """Cancel an upcoming appointment. Accepts GUID, ReferenceNumber, Vaccine Name, Date, 'all', or 'latest'."""
    try:
        # 1. Fetch user's current appointments from database
        patient_appts = []
        try:
            patient_appts = await api_get("/appointments/patient", token=token)
        except Exception as ex_fetch:
            # If fetching fails, still attempt direct delete if an ID is present
            if appointment_id:
                data = await api_delete(f"/appointments/{appointment_id.strip()}/cancel", token=token)
                return {"success": True, "result": data, "message": f"Appointment {appointment_id} cancelled."}
            raise ex_fetch

        if not patient_appts or not isinstance(patient_appts, list):
            return {"success": False, "error": "You currently have no booked appointments on record."}

        target_input = (appointment_id or "").strip()
        lower_input = target_input.lower()

        # Filter candidates: non-cancelled
        active_appts = [
            a for a in patient_appts 
            if str(a.get("status", "")).lower() != "cancelled"
        ]

        if not active_appts:
            return {"success": False, "error": "No active upcoming appointments found to cancel."}

        to_cancel = []

        if not target_input or lower_input in ("latest", "upcoming", "my appointment", "appointment"):
            to_cancel = [active_appts[0]]
        elif lower_input in ("all", "everything", "all appointments", "all bookings"):
            to_cancel = active_appts
        else:
            for a in active_appts:
                a_id = str(a.get("id", "")).lower()
                a_ref = str(a.get("referenceNumber", "")).lower()
                a_vaccine = str(a.get("vaccineName", "")).lower()
                a_date = str(a.get("appointmentDate", "")).lower()
                a_hospital = str(a.get("hospitalName", "")).lower()

                if (
                    lower_input == a_id or
                    (len(lower_input) >= 4 and a_id.startswith(lower_input)) or
                    (a_ref and lower_input in a_ref) or
                    (lower_input in a_vaccine) or
                    (lower_input in a_date) or
                    (lower_input in a_hospital)
                ):
                    to_cancel.append(a)

            if not to_cancel:
                for a in patient_appts:
                    a_id = str(a.get("id", "")).lower()
                    if lower_input in a_id:
                        to_cancel.append(a)

        if not to_cancel:
            if target_input:
                data = await api_delete(f"/appointments/{target_input}/cancel", token=token)
                return {"success": True, "result": data, "message": f"Appointment {target_input} cancelled."}
            return {"success": False, "error": f"Could not find an active appointment matching '{target_input}'."}

        cancelled_items = []
        for apt in to_cancel:
            apt_id = apt.get("id")
            await api_delete(f"/appointments/{apt_id}/cancel", token=token)
            cancelled_items.append({
                "id": apt_id,
                "referenceNumber": apt.get("referenceNumber"),
                "vaccineName": apt.get("vaccineName"),
                "hospitalName": apt.get("hospitalName"),
                "appointmentDate": apt.get("appointmentDate"),
                "timeSlot": apt.get("timeSlot")
            })

        count = len(cancelled_items)
        details = ", ".join([f"{item['vaccineName']} on {item['appointmentDate']} at {item['timeSlot']}" for item in cancelled_items])
        return {
            "success": True,
            "count": count,
            "message": f"Successfully cancelled {count} appointment(s): {details}.",
            "cancelled": cancelled_items
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

async def tool_propose_cancellation_for_approval(
    appointment_id: Optional[str] = None,
    vaccine_name: Optional[str] = None,
    hospital_name: Optional[str] = None,
    appointment_date: Optional[str] = None,
    time_slot: Optional[str] = None,
    token: Optional[str] = None
) -> Dict[str, Any]:
    """Prepares an appointment cancellation card for explicit patient approval BEFORE executing cancellation."""
    target_apt = None
    active_appts = []
    try:
        if token:
            patient_appts = await api_get("/appointments/patient", token=token)
            if isinstance(patient_appts, list):
                active_appts = [a for a in patient_appts if str(a.get("status", "")).lower() != "cancelled"]
                
                # Check target criteria
                search_terms = []
                if appointment_id and appointment_id.lower() not in ("latest", "all", "none"):
                    search_terms.append(appointment_id.lower().strip())
                if vaccine_name:
                    search_terms.append(vaccine_name.lower().strip())
                if appointment_date:
                    search_terms.append(appointment_date.strip())

                if search_terms:
                    for a in active_appts:
                        a_id = str(a.get("id", "")).lower()
                        a_ref = str(a.get("referenceNumber", "")).lower()
                        a_vac = str(a.get("vaccineName", "")).lower()
                        a_date = str(a.get("appointmentDate", "")).lower()
                        
                        for st in search_terms:
                            if st in a_id or st in a_ref or st in a_vac or st in a_date:
                                target_apt = a
                                break
                        if target_apt:
                            break

                # Fallback to latest/first active appointment if not specifically matched
                if not target_apt and active_appts:
                    target_apt = active_appts[0]
    except Exception:
        pass

    if token and not target_apt and not active_appts:
        return {
            "success": False,
            "error": "No active upcoming appointments found to cancel."
        }

    resolved_id = target_apt.get("id") if target_apt else (appointment_id or "")
    resolved_vaccine = target_apt.get("vaccineName") if target_apt else (vaccine_name or "Vaccination Appointment")
    resolved_hospital = target_apt.get("hospitalName") if target_apt else (hospital_name or "Assigned Hospital")
    resolved_date = target_apt.get("appointmentDate") if target_apt else (appointment_date or "")
    resolved_slot = target_apt.get("timeSlot") if target_apt else (time_slot or "")

    return {
        "success": True,
        "status": "cancellation_pending_user_approval",
        "proposal": {
            "type": "cancellation",
            "appointment_id": str(resolved_id),
            "vaccine_name": resolved_vaccine,
            "hospital_name": resolved_hospital,
            "appointment_date": resolved_date,
            "time_slot": resolved_slot,
            "fee": 0.0,
            "requires_payment": False
        }
    }


# Function definitions for Qwen / OpenAI tool calling
TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "get_available_vaccines_and_hospitals",
            "description": "Get all vaccines, hospital locations, stock levels, and pricing details in Vaxora.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "autonomous_find_and_propose",
            "description": "AUTONOMOUS GOAL-BASED DELEGATED BOOKING: In ONE shot, autonomously searches hospital schedules, finds the best date and open slot matching the patient's request (e.g. earliest, morning, afternoon, specific date/day), and prepares the official proposal card for patient approval. Use this whenever the user wants to book, schedule, or find an appointment directly.",
            "parameters": {
                "type": "object",
                "properties": {
                    "vaccine_name": {
                        "type": "string",
                        "description": "Name of the vaccine requested (e.g. 'AstraZeneca', 'Test Vaccine', etc.)"
                    },
                    "hospital_name_or_id": {
                        "type": "string",
                        "description": "Optional hospital name or GUID if specified by user (e.g. 'Royal Hospitals'). If omitted, optimal hospital is chosen automatically."
                    },
                    "preferred_date": {
                        "type": "string",
                        "description": "Optional preferred date ('YYYY-MM-DD') or day of week ('Wednesday', 'Friday', 'next week') or 'earliest'."
                    },
                    "preferred_slot": {
                        "type": "string",
                        "description": "Optional specific slot if requested (e.g. '09:00 AM - 09:20 AM')."
                    },
                    "time_of_day": {
                        "type": "string",
                        "enum": ["morning", "afternoon", "earliest", "any"],
                        "description": "Time preference: 'morning' (<12:00 PM), 'afternoon' (>=12:00 PM), 'earliest' (first available), or 'any'."
                    }
                },
                "required": ["vaccine_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_available_dates",
            "description": "Get available scheduled clinic dates for a specific hospital and vaccine name.",
            "parameters": {
                "type": "object",
                "properties": {
                    "hospital_user_id": {
                        "type": "string",
                        "description": "The unique GUID of the hospital user"
                    },
                    "vaccine_name": {
                        "type": "string",
                        "description": "The name of the vaccine (e.g. 'COVID-19 (Pfizer-BioNTech)', 'Influenza')"
                    }
                },
                "required": ["hospital_user_id", "vaccine_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_available_slots",
            "description": "Get available 20-minute time slots for a specific date, hospital, and vaccine.",
            "parameters": {
                "type": "object",
                "properties": {
                    "hospital_user_id": {
                        "type": "string",
                        "description": "The unique GUID of the hospital user"
                    },
                    "vaccine_name": {
                        "type": "string",
                        "description": "The name of the vaccine"
                    },
                    "date": {
                        "type": "string",
                        "description": "The appointment date in 'YYYY-MM-DD' format"
                    }
                },
                "required": ["hospital_user_id", "vaccine_name", "date"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "propose_booking_for_approval",
            "description": "Propose an appointment booking to the user for explicit approval BEFORE booking. Use this tool when you have chosen hospital, vaccine, date, and slot, so the user sees a review card with a Confirm button.",
            "parameters": {
                "type": "object",
                "properties": {
                    "hospital_user_id": {"type": "string", "description": "Hospital GUID"},
                    "hospital_name": {"type": "string", "description": "Hospital Name"},
                    "vaccine_name": {"type": "string", "description": "Vaccine Name"},
                    "vaccine_id": {"type": "string", "description": "Vaccine GUID if known"},
                    "vaccine_schedule_id": {"type": "string", "description": "Schedule GUID if known"},
                    "appointment_date": {"type": "string", "description": "Date in 'YYYY-MM-DD' format"},
                    "time_slot": {"type": "string", "description": "Time slot like '09:00 AM - 09:20 AM'"},
                    "price": {"type": "number", "description": "Vaccine fee in LKR (0 for free)"},
                    "is_free": {"type": "boolean", "description": "True if free, False if paid"},
                    "doctor_name": {"type": "string", "description": "Assigned doctor if any"}
                },
                "required": ["hospital_user_id", "hospital_name", "vaccine_name", "appointment_date", "time_slot", "is_free"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "book_appointment",
            "description": "Execute the final booking. Call this ONLY after the user has approved the proposal.",
            "parameters": {
                "type": "object",
                "properties": {
                    "hospital_user_id": {"type": "string", "description": "Hospital GUID"},
                    "vaccine_name": {"type": "string", "description": "Vaccine Name"},
                    "appointment_date": {"type": "string", "description": "Date in 'YYYY-MM-DD' format"},
                    "time_slot": {"type": "string", "description": "Time slot string"},
                    "notes": {"type": "string", "description": "Any special notes"},
                    "payment_method": {"type": "string", "description": "'Free' or 'PayHere'"},
                    "vaccine_id": {"type": "string", "description": "Vaccine GUID"},
                    "vaccine_schedule_id": {"type": "string", "description": "Schedule GUID"}
                },
                "required": ["hospital_user_id", "vaccine_name", "appointment_date", "time_slot"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_my_appointments",
            "description": "Retrieve the current patient's booked appointments and vaccination history.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "propose_cancellation_for_approval",
            "description": "Prepares an appointment cancellation card for explicit patient approval BEFORE executing cancellation. Call this whenever a patient asks to cancel an appointment.",
            "parameters": {
                "type": "object",
                "properties": {
                    "appointment_id": {
                        "type": "string",
                        "description": "The appointment GUID, reference number, vaccine name, date, 'latest', or 'all' to cancel."
                    },
                    "vaccine_name": {
                        "type": "string",
                        "description": "Optional name of the vaccine (e.g. 'AstraZeneca', 'Pfizer')."
                    },
                    "appointment_date": {
                        "type": "string",
                        "description": "Optional appointment date ('YYYY-MM-DD')."
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "cancel_appointment",
            "description": "Execute the cancellation of an appointment in the database. Call this ONLY after the user has explicitly confirmed/approved the cancellation.",
            "parameters": {
                "type": "object",
                "properties": {
                    "appointment_id": {
                        "type": "string",
                        "description": "The appointment GUID, reference number, vaccine name, date, 'latest', or 'all' to cancel."
                    }
                },
                "required": []
            }
        }
    }
]
