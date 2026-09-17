import httpx
import re
from typing import Dict, Any, List, Optional

try:
    from .config import settings
except ImportError:
    from config import settings

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
        response.raise_for_status()
        return response.json()

async def api_post(endpoint: str, data: Dict[str, Any], token: Optional[str] = None) -> Any:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(f"{settings.vaxora_api_base_url}{endpoint}", headers=headers, json=data)
        response.raise_for_status()
        return response.json()

async def api_delete(endpoint: str, token: Optional[str] = None) -> Any:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.delete(f"{settings.vaxora_api_base_url}{endpoint}", headers=headers)
        response.raise_for_status()
        return response.json()

# Tool Implementations
async def _resolve_hospital_and_vaccine(hospital_id_or_name: str, vaccine_name: str, token: Optional[str] = None):
    resolved_hospital_id = hospital_id_or_name
    resolved_vaccine_name = vaccine_name

    try:
        data = await api_get("/inventory/vaccines-with-hospitals", token=token)
        # Find exact vaccine name match if possible
        for v in data:
            if vaccine_name and (v.get("name", "").lower() == vaccine_name.lower() or vaccine_name.lower() in v.get("name", "").lower()):
                resolved_vaccine_name = v.get("name")
                for h in v.get("hospitals", []):
                    if not hospital_id_or_name or hospital_id_or_name.lower() in h.get("name", "").lower() or h.get("userId") == hospital_id_or_name:
                        resolved_hospital_id = h.get("userId") or h.get("id")
                        return resolved_hospital_id, resolved_vaccine_name

        # If hospital still not matched, check all hospitals
        if not (hospital_id_or_name and len(hospital_id_or_name) == 36 and "-" in hospital_id_or_name):
            for v in data:
                for h in v.get("hospitals", []):
                    if hospital_id_or_name and hospital_id_or_name.lower() in h.get("name", "").lower():
                        resolved_hospital_id = h.get("userId") or h.get("id")
                        return resolved_hospital_id, resolved_vaccine_name
    except Exception:
        pass

    return resolved_hospital_id, resolved_vaccine_name

async def tool_get_available_vaccines_and_hospitals(token: Optional[str] = None) -> Dict[str, Any]:
    """Retrieve all available vaccines, current hospital stock, and pricing information."""
    try:
        data = await api_get("/inventory/vaccines-with-hospitals", token=token)
        return {"success": True, "vaccines": data}
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
        payload = {
            "hospitalUserId": hospital_user_id,
            "vaccineName": vaccine_name,
            "appointmentDate": clean_date,
            "timeSlot": clean_slot,
            "notes": notes or "Booked via Vaxora AI Agent",
            "paymentMethod": payment_method
        }
        if vaccine_id:
            payload["vaccineId"] = vaccine_id
        if vaccine_schedule_id:
            payload["vaccineScheduleId"] = vaccine_schedule_id

        res = await api_post("/appointments", data=payload, token=token)
        appointment_id = res.get("id") or res.get("Id")

        # If it's a paid booking, initialize PayHere checkout payload automatically
        payhere_payload = None
        if payment_method.lower() != "free" or res.get("status") == "PendingPayment" or res.get("fee", 0) > 0:
            try:
                payhere_payload = await api_post("/payment/payhere-init", data={"appointmentId": appointment_id}, token=token)
            except Exception as pe:
                payhere_payload = {"error": f"Payment init failed: {str(pe)}"}

        return {
            "success": True,
            "appointment": res,
            "payhere_payload": payhere_payload,
            "is_free": payment_method.lower() == "free" and (res.get("fee", 0) == 0)
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

async def tool_cancel_appointment(appointment_id: str, token: Optional[str] = None) -> Dict[str, Any]:
    """Cancel an upcoming appointment (subject to 1-day advance notice rule)."""
    try:
        data = await api_delete(f"/appointments/{appointment_id}/cancel", token=token)
        return {"success": True, "result": data}
    except Exception as e:
        return {"success": False, "error": str(e)}


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
            "name": "cancel_appointment",
            "description": "Cancel an existing appointment by its appointment ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "appointment_id": {"type": "string", "description": "The GUID of the appointment to cancel"}
                },
                "required": ["appointment_id"]
            }
        }
    }
]
