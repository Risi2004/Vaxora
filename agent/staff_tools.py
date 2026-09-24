"""
Staff scheduling tools for the StaffSchedulingAgent.
These call Vaxora hospital staff APIs using the caller's Bearer token.

Read and propose only: creating or deleting a shift is done by the hospital user
through the Vaxora UI, so the agent has no tool that can write to the roster.
"""
import json
from contextvars import ContextVar
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

try:
    from .tools import api_get, api_post, _clean_date_string
except ImportError:
    from tools import api_get, api_post, _clean_date_string

# Kept in this process only. Closing the chat does not clear it. Restarting the agent does.
_DECLINE_PREFIX = "__shift_declined__"
_hospital_key: ContextVar[str] = ContextVar("vaxora_hospital_key", default="")
_declined_slots: Dict[str, set] = {}


def bind_hospital(patient_info: Optional[Dict[str, Any]], token: Optional[str]) -> None:
    email = ""
    if isinstance(patient_info, dict):
        email = str(patient_info.get("email") or patient_info.get("Email") or "").strip().lower()
    _hospital_key.set(email or str(token or ""))


def note_decline_message(text: str) -> bool:
    """Remember a Decline click. Returns True when this message is only that note."""
    raw = str(text or "").strip()
    if not raw.startswith(_DECLINE_PREFIX):
        return False
    key = _hospital_key.get()
    if not key:
        return True
    try:
        data = json.loads(raw[len(_DECLINE_PREFIX):].strip())
    except Exception:
        return True
    slot = (
        str(data.get("affiliationId") or ""),
        str(data.get("shiftDate") or "")[:10],
        _normalize_time(data.get("startTime"))[:5],
        _normalize_time(data.get("endTime"))[:5],
    )
    if slot[0] and slot[1]:
        _declined_slots.setdefault(key, set()).add(slot)
    return True


def _remembered_declines() -> List[Tuple[str, str, str, str]]:
    return list(_declined_slots.get(_hospital_key.get(), ()))


def _normalize_time(value: Any) -> str:
    """Normalize to HH:mm:ss for the ASP.NET TimeOnly binder."""
    if value is None:
        return "08:00:00"
    s = str(value).strip()
    if len(s) == 5 and s[2] == ":":
        return f"{s}:00"
    return s


async def tool_get_active_staff(token: Optional[str] = None, role: Optional[str] = None) -> Dict[str, Any]:
    """List active affiliated doctors/nurses for the logged-in hospital."""
    try:
        params: Dict[str, Any] = {"status": "Active"}
        if role:
            params["role"] = role
        data = await api_get("/staff/hospital", token=token, params=params)
        staff = data if isinstance(data, list) else []
        return {
            "success": True,
            "count": len(staff),
            "staff": [
                {
                    "affiliationId": s.get("affiliationId") or s.get("AffiliationId"),
                    "staffName": s.get("staffName") or s.get("StaffName"),
                    "staffRole": s.get("staffRole") or s.get("StaffRole"),
                    "registrationNumber": s.get("staffRegistrationNumber") or s.get("StaffRegistrationNumber"),
                }
                for s in staff
            ],
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def tool_get_coverage(from_date: str, to_date: str, token: Optional[str] = None) -> Dict[str, Any]:
    """Fetch weekly coverage report for the hospital (Low / Partial / Good per day)."""
    try:
        clean_from = _clean_date_string(from_date)
        clean_to = _clean_date_string(to_date)
        data = await api_get(
            "/staff/coverage",
            token=token,
            params={"from": clean_from, "to": clean_to},
        )
        return {"success": True, "coverage": data}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def tool_get_hospital_shifts(
    from_date: str,
    to_date: str,
    token: Optional[str] = None,
) -> Dict[str, Any]:
    """List hospital shifts in a date range."""
    try:
        clean_from = _clean_date_string(from_date)
        clean_to = _clean_date_string(to_date)
        data = await api_get(
            "/staff/shifts/hospital",
            token=token,
            params={"from": clean_from, "to": clean_to},
        )
        shifts = data if isinstance(data, list) else []
        return {"success": True, "count": len(shifts), "shifts": shifts}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def tool_propose_shift_for_approval(
    affiliation_id: str,
    staff_name: str,
    shift_date: str,
    start_time: str,
    end_time: str,
    booth_or_station: Optional[str] = None,
    booth_id: Optional[str] = None,
    notes: Optional[str] = None,
    reason: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Build a suggested shift. The hospital presses Approve or Decline.
    Does NOT create the shift yet.
    """
    proposal: Dict[str, Any] = {
        "affiliationId": affiliation_id,
        "staffName": staff_name,
        "shiftDate": _clean_date_string(shift_date),
        "startTime": _normalize_time(start_time),
        "endTime": _normalize_time(end_time),
        "boothOrStation": booth_or_station,
        "notes": notes,
        "reason": reason or "Suggested by Staff Scheduling Agent",
    }
    if booth_id:
        proposal["boothId"] = booth_id
    return {
        "success": True,
        "status": "proposal_pending_hospital_approval",
        "proposal": proposal,
    }


def _hospital_clock() -> datetime:
    return datetime.now(timezone(timedelta(hours=5, minutes=30)))


def _hospital_today() -> str:
    return _hospital_clock().date().isoformat()


def _week_bounds(start: str, end: str) -> Tuple[str, str]:
    """Monday through Sunday covering the days being staffed."""
    start_day = datetime.fromisoformat(start).date()
    end_day = datetime.fromisoformat(end).date()
    week_start = start_day - timedelta(days=start_day.weekday())
    week_end = end_day + timedelta(days=6 - end_day.weekday())
    return week_start.isoformat(), week_end.isoformat()


def _hospital_now_minutes() -> int:
    clock = _hospital_clock()
    return clock.hour * 60 + clock.minute


def _day_key(value: Any) -> str:
    return str(value or "")[:10]


def _minutes(value: Any) -> int:
    raw = str(value or "00:00")[:5]
    hour, minute = raw.split(":")
    return int(hour) * 60 + int(minute)


async def tool_review_roster(from_date: str, to_date: str, token: Optional[str] = None) -> Dict[str, Any]:
    """
    Read shifts, booths, and appointments, then propose only the missing gaps.
    Does not create shifts.
    """
    clean_from = _clean_date_string(from_date)
    clean_to = _clean_date_string(to_date)
    staff_result = await tool_get_active_staff(token=token)
    if not staff_result.get("success"):
        return staff_result
    week_from, week_to = _week_bounds(clean_from, clean_to)
    shift_result = await tool_get_hospital_shifts(week_from, week_to, token=token)
    if not shift_result.get("success") and (week_from != clean_from or week_to != clean_to):
        shift_result = await tool_get_hospital_shifts(clean_from, clean_to, token=token)
    if not shift_result.get("success"):
        return shift_result

    booths = await _load_active_booths(token)
    staff = staff_result.get("staff") or []
    shifts = shift_result.get("shifts") or []
    today = _hospital_today()

    workload = {s["affiliationId"]: 0 for s in staff}
    for shift in shifts:
        affiliation_id = shift.get("affiliationId") or shift.get("AffiliationId")
        if affiliation_id in workload:
            workload[affiliation_id] += 1

    counts = list(workload.values()) or [0]
    lightest = min(counts)
    overloaded_ids = {
        affiliation_id
        for affiliation_id, count in workload.items()
        if count - lightest >= 2 and count > 0
    }

    findings: List[str] = []
    openings: List[Dict[str, Any]] = []
    proposals: List[Dict[str, Any]] = []
    planned = []
    for shift in shifts:
        planned.append(
            {
                "affiliationId": shift.get("affiliationId") or shift.get("AffiliationId"),
                "date": _day_key(shift.get("shiftDate") or shift.get("ShiftDate")),
                "start": _minutes(shift.get("startTime") or shift.get("StartTime")),
                "end": _minutes(shift.get("endTime") or shift.get("EndTime")),
                "role": str(shift.get("staffRole") or shift.get("StaffRole") or "").upper(),
                "boothId": shift.get("boothId") or shift.get("BoothId"),
            }
        )

    for affiliation_id, day, start, end in _remembered_declines():
        planned.append(
            {
                "affiliationId": affiliation_id,
                "date": day,
                "start": _minutes(start),
                "end": _minutes(end),
                "role": "",
                "boothId": None,
            }
        )

    doctors = [s for s in staff if str(s.get("staffRole") or "").upper() == "DOCTOR"]
    nurses = [s for s in staff if str(s.get("staffRole") or "").upper() == "NURSE"]
    ordered_booths = _sorted_booths(booths)
    now_minutes = _hospital_now_minutes()
    slots = (("Morning", 8 * 60, 12 * 60), ("Afternoon", 13 * 60, 17 * 60))
    appointments = await _load_hospital_appointments(token)
    if appointments is None:
        findings.append("Appointments could not be loaded, so no booths need to be opened.")
    else:
        demand = _demand_groups(appointments, clean_from, clean_to)
        cursor_day = datetime.fromisoformat(clean_from).date()
        end_day = datetime.fromisoformat(clean_to).date()
        while cursor_day <= end_day:
            date = cursor_day.isoformat()
            cursor_day += timedelta(days=1)
            if date < today:
                continue
            for slot_name, slot_start, slot_end in slots:
                if date == today and slot_start <= now_minutes:
                    continue
                groups = demand.get((date, slot_name), [])
                if not groups:
                    continue
                open_booths: List[Dict[str, Any]] = []
                booth_room = {}
                booth_vaccines: Dict[str, List[str]] = {}
                for group in groups:
                    placed, leftover = _place_vaccine_demand(
                        ordered_booths, group, open_booths, booth_room
                    )
                    label = group["label"]
                    for booth in placed:
                        key = str(_booth_id(booth) or id(booth))
                        names = booth_vaccines.setdefault(key, [])
                        if label not in names:
                            names.append(label)
                    if not placed and leftover:
                        findings.append(
                            f"{date} {slot_name.lower()}: {leftover} {label} bookings, no booth gives that vaccine."
                        )
                        continue
                    labels = [_booth_label(booth) for booth in placed]
                    openings.append(
                        {
                            "date": date,
                            "slot": slot_name,
                            "count": group["count"],
                            "vaccine": label,
                            "booths": labels,
                        }
                    )
                    if leftover:
                        findings.append(
                            f"{date} {slot_name.lower()}: {leftover} {label} bookings do not fit. "
                            "Add another booth for that vaccine."
                        )
                if not open_booths:
                    continue
                for booth in open_booths:
                    vaccine_label = ", ".join(
                        booth_vaccines.get(str(_booth_id(booth) or id(booth)), [])
                    )
                    if not _booth_has_role(planned, booth, date, slot_start, slot_end, "NURSE"):
                        chosen = _pick_lightest_free(
                            nurses, planned, workload, date, slot_start, slot_end
                        )
                        if chosen is None:
                            findings.append(f"{date} {slot_name.lower()}: not enough free nurses.")
                        else:
                            _append_gap_proposal(
                                proposals, planned, workload, chosen, date, slot_name, slot_start, slot_end, booth,
                                "Nurse for this booth",
                                vaccine_label,
                            )
                    if not _booth_has_role(planned, booth, date, slot_start, slot_end, "DOCTOR"):
                        chosen = _pick_lightest_free(
                            doctors, planned, workload, date, slot_start, slot_end
                        )
                        if chosen is None:
                            findings.append(f"{date} {slot_name.lower()}: not enough free doctors.")
                        else:
                            _append_gap_proposal(
                                proposals, planned, workload, chosen, date, slot_name, slot_start, slot_end, booth,
                                "Doctor for this booth",
                                vaccine_label,
                            )

    if booths is None and appointments is not None:
        findings.append("Booth list could not be loaded, so proposals have no booth.")
    if appointments is not None and ordered_booths and not proposals and not openings and not any("bookings for" in item for item in findings):
        if clean_from == clean_to:
            findings.append(
                f"There are no appointments on {clean_from}, so no booths need to be opened."
            )
        else:
            findings.append(
                f"There are no appointments from {clean_from} to {clean_to}, so no booths need to be opened."
            )

    workload_rows = []
    for person in staff:
        count = workload.get(person["affiliationId"], 0)
        flag = "heavy" if person["affiliationId"] in overloaded_ids else "light" if count == lightest else "even"
        workload_rows.append(
            {
                "staffName": person["staffName"],
                "staffRole": person["staffRole"],
                "shiftCount": count,
                "load": flag,
            }
        )
    workload_rows.sort(key=lambda row: (-row["shiftCount"], row["staffName"] or ""))

    if not findings and not openings:
        findings.append(
            f"There are no appointments from {clean_from} to {clean_to}, so no booths need to be opened."
        )

    return {
        "success": True,
        "from": clean_from,
        "to": clean_to,
        "findings": findings,
        "openings": openings,
        "workload": workload_rows,
        "proposalCount": len(proposals),
        "proposals": proposals,
        "message": _review_message(clean_from, clean_to, findings, proposals),
    }


async def _load_active_booths(token: Optional[str]) -> Optional[List[Dict[str, Any]]]:
    """Return active booths, or None when the booth API cannot be reached."""
    try:
        data = await api_get("/staff/booths", token=token, params={"activeOnly": True})
    except Exception:
        return None
    return data if isinstance(data, list) else None


def _booth_id(booth: Optional[Dict[str, Any]]) -> Optional[str]:
    if not booth:
        return None
    return booth.get("boothId") or booth.get("BoothId") or booth.get("id") or booth.get("Id")


def _booth_label(booth: Dict[str, Any]) -> str:
    return (
        booth.get("displayLabel")
        or booth.get("DisplayLabel")
        or booth.get("name")
        or booth.get("Name")
        or booth.get("code")
        or booth.get("Code")
        or "Booth"
    )


PATIENTS_PER_BOOTH = 12


def _sorted_booths(booths):
    if not booths:
        return []
    return sorted(
        booths,
        key=lambda booth: (
            booth.get("sortOrder") if booth.get("sortOrder") is not None else booth.get("SortOrder") or 0,
            str(booth.get("code") or booth.get("Code") or ""),
        ),
    )


async def _load_hospital_appointments(token: Optional[str]) -> Optional[List[Dict[str, Any]]]:
    try:
        data = await api_get("/appointments/hospital", token=token)
    except Exception:
        return None
    return data if isinstance(data, list) else None


def _clock_to_minutes(text: str) -> Optional[int]:
    raw = str(text or "").strip().upper()
    if not raw:
        return None
    mer = None
    if raw.endswith("AM"):
        mer = "AM"
        raw = raw[:-2].strip()
    elif raw.endswith("PM"):
        mer = "PM"
        raw = raw[:-2].strip()
    if ":" not in raw:
        return None
    hour_text, minute_text = raw.split(":", 1)
    minute_digits = "".join(ch for ch in minute_text if ch.isdigit())[:2]
    if not hour_text.isdigit() or len(minute_digits) < 2:
        return None
    hour = int(hour_text)
    minute = int(minute_digits)
    if mer == "PM" and hour < 12:
        hour += 12
    if mer == "AM" and hour == 12:
        hour = 0
    if hour > 23 or minute > 59:
        return None
    return hour * 60 + minute


def _appt_start_minutes(appt: Dict[str, Any]) -> Optional[int]:
    raw = str(appt.get("startTime") or appt.get("StartTime") or "").strip()
    if raw:
        if "M" in raw.upper():
            parsed = _clock_to_minutes(raw)
            if parsed is not None:
                return parsed
        elif ":" in raw:
            return _minutes(raw)
    slot = str(appt.get("timeSlot") or appt.get("TimeSlot") or "")
    for index, ch in enumerate(slot):
        if not ch.isdigit():
            continue
        chunk = slot[index:].split("-", 1)[0].strip()
        parsed = _clock_to_minutes(chunk)
        if parsed is not None:
            return parsed
    return None


def _slot_for_minutes(minutes: int) -> str:
    return "Morning" if minutes < 12 * 60 else "Afternoon"


def _is_active_booking(appt: Dict[str, Any]) -> bool:
    status = str(appt.get("status") or appt.get("Status") or "").lower()
    return status not in ("cancelled", "canceled", "rejected", "completed")


def _vaccine_key(appt: Dict[str, Any]) -> str:
    vaccine_id = appt.get("vaccineId") or appt.get("VaccineId")
    if vaccine_id:
        return str(vaccine_id)
    name = str(appt.get("vaccineName") or appt.get("VaccineName") or "").strip().lower()
    return name or "unknown"


def _vaccine_label(appt: Dict[str, Any]) -> str:
    name = str(appt.get("vaccineName") or appt.get("VaccineName") or "").strip()
    return name or "Unknown vaccine"


def _demand_groups(appointments: List[Dict[str, Any]], start: str, end: str) -> Dict[tuple, List[Dict[str, Any]]]:
    buckets: Dict[tuple, Dict[str, Dict[str, Any]]] = {}
    for appt in appointments:
        if not _is_active_booking(appt):
            continue
        date = _day_key(appt.get("appointmentDate") or appt.get("AppointmentDate"))
        if not date or date < start or date > end:
            continue
        minutes = _appt_start_minutes(appt)
        if minutes is None:
            continue
        slot_key = (date, _slot_for_minutes(minutes))
        vaccine_key = _vaccine_key(appt)
        slot_bucket = buckets.setdefault(slot_key, {})
        row = slot_bucket.setdefault(
            vaccine_key,
            {"key": vaccine_key, "label": _vaccine_label(appt), "count": 0},
        )
        row["count"] += 1
    return {slot_key: list(rows.values()) for slot_key, rows in buckets.items()}


def _booth_serves(booth: Dict[str, Any], vaccine_key: str, label: str) -> bool:
    ids = {str(item) for item in (booth.get("vaccineIds") or booth.get("VaccineIds") or [])}
    if vaccine_key in ids:
        return True
    names = {
        str(name).strip().lower()
        for name in (booth.get("vaccineNames") or booth.get("VaccineNames") or [])
    }
    return bool(label) and label.strip().lower() in names


def _place_vaccine_demand(booths, group, open_booths, booth_room):
    """Fill booths that list this vaccine. Each booth holds 12 patients in the slot."""
    capable = [booth for booth in booths if _booth_serves(booth, group["key"], group["label"])]
    if not capable:
        return [], group["count"]
    remaining = group["count"]
    used = []
    for booth in capable:
        if remaining <= 0:
            break
        room_key = str(_booth_id(booth) or id(booth))
        room = booth_room.get(room_key, PATIENTS_PER_BOOTH)
        if room <= 0:
            continue
        take = min(room, remaining)
        booth_room[room_key] = room - take
        remaining -= take
        used.append(booth)
        if booth not in open_booths:
            open_booths.append(booth)
    return used, remaining


def _booth_has_role(planned, booth, date, slot_start, slot_end, role) -> bool:
    booth_key = str(_booth_id(booth) or "")
    return any(
        item.get("date") == date
        and str(item.get("role") or "").upper() == role
        and str(item.get("boothId") or "") == booth_key
        and item["start"] < slot_end
        and slot_start < item["end"]
        for item in planned
    )


def _pick_lightest_free(pool, planned, workload, date: str, slot_start: int, slot_end: int):
    """Prefer whoever has the fewest shifts this week and is free for this half-day."""
    if not pool:
        return None
    ranked = sorted(pool, key=lambda person: str(person.get("staffName") or "").lower())
    order = {person["affiliationId"]: index for index, person in enumerate(ranked)}
    day_offset = datetime.fromisoformat(date).weekday()
    pool_size = len(ranked)

    def tie_break(person) -> int:
        return (order[person["affiliationId"]] - day_offset) % pool_size

    free = []
    for person in pool:
        busy = any(
            item["affiliationId"] == person["affiliationId"]
            and item["date"] == date
            and slot_start < item["end"]
            and item["start"] < slot_end
            for item in planned
        )
        if not busy:
            free.append(person)
    if not free:
        return None
    free.sort(key=lambda person: (workload.get(person["affiliationId"], 0), tie_break(person)))
    return free[0]


def _station_label(booth, slot_name: str) -> str:
    if not booth:
        return slot_name
    label = (
        str(_booth_label(booth))
        .replace("\u00b7", "-")
        .replace("·", "-")
        .replace("\u2014", "-")
        .replace("—", "-")
        .strip()
    )
    return f"{label} - {slot_name}"


def _append_gap_proposal(
    proposals, planned, workload, chosen, date, slot_name, slot_start, slot_end, booth, reason, vaccine_name=""
):
    booth_id = _booth_id(booth) if booth else None
    role = str(chosen.get("staffRole") or "").upper()
    proposals.append({
        "affiliationId": chosen["affiliationId"],
        "staffName": chosen["staffName"],
        "staffRole": chosen["staffRole"],
        "shiftDate": date,
        "startTime": "08:00:00" if slot_name == "Morning" else "13:00:00",
        "endTime": "12:00:00" if slot_name == "Morning" else "17:00:00",
        "boothId": booth_id,
        "boothOrStation": _station_label(booth, slot_name),
        "vaccineName": vaccine_name,
        "notes": vaccine_name or "Morning and afternoon clinic cover",
        "reason": reason,
    })
    workload[chosen["affiliationId"]] = workload.get(chosen["affiliationId"], 0) + 1
    planned.append({
        "affiliationId": chosen["affiliationId"],
        "date": date,
        "start": slot_start,
        "end": slot_end,
        "role": role,
        "boothId": booth_id,
    })


def _review_message(from_date: str, to_date: str, findings: List[str], proposals: List[Dict[str, Any]]) -> str:
    lines = [f"Roster review {from_date} to {to_date}."]
    lines.extend(f"- {item}" for item in findings[:12])
    if proposals:
        lines.append(f"{len(proposals)} suggested shift(s). Press Approve or Decline on each one. Nothing is saved yet.")
    else:
        lines.append("No new shifts to propose.")
    return "\n".join(lines)


async def tool_suggest_week_coverage(
    from_date: str,
    to_date: str,
    default_start: str = "08:00",
    default_end: str = "16:00",
    token: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Call ASP.NET suggest-week endpoint (rules-based, no LLM required).
    Returns proposals for hospital approval; does not create shifts.
    """
    try:
        clean_from = _clean_date_string(from_date)
        clean_to = _clean_date_string(to_date)
        payload = {
            "from": clean_from,
            "to": clean_to,
            "defaultStart": default_start,
            "defaultEnd": default_end,
        }
        data = await api_post("/staff/shifts/suggest-week", payload, token=token)
        proposals = data.get("proposals") or data.get("Proposals") or []
        return {
            "success": True,
            "from": data.get("from") or data.get("From") or clean_from,
            "to": data.get("to") or data.get("To") or clean_to,
            "activeDoctors": data.get("activeDoctors") or data.get("ActiveDoctors") or 0,
            "activeNurses": data.get("activeNurses") or data.get("ActiveNurses") or 0,
            "proposalCount": data.get("proposalCount") or data.get("ProposalCount") or len(proposals),
            "proposals": proposals,
            "message": data.get("message") or data.get("Message") or "",
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


STAFF_TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "get_active_staff",
            "description": "List active affiliated doctors and nurses by name and role.",
            "parameters": {
                "type": "object",
                "properties": {
                    "role": {
                        "type": "string",
                        "description": "Optional filter: DOCTOR or NURSE",
                    }
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_coverage",
            "description": "Get coverage report (Low/Partial/Good) for a date range.",
            "parameters": {
                "type": "object",
                "properties": {
                    "from_date": {"type": "string", "description": "Start date YYYY-MM-DD"},
                    "to_date": {"type": "string", "description": "End date YYYY-MM-DD"},
                },
                "required": ["from_date", "to_date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_hospital_shifts",
            "description": "List existing hospital shifts between two dates.",
            "parameters": {
                "type": "object",
                "properties": {
                    "from_date": {"type": "string", "description": "Start date YYYY-MM-DD"},
                    "to_date": {"type": "string", "description": "End date YYYY-MM-DD"},
                },
                "required": ["from_date", "to_date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "review_roster",
            "description": (
                "PREFERRED for suggest week or filling the roster. Reads booked appointments, "
                "shifts, and booths. Opens booths that list the booked vaccine (12 patients each) "
                "and proposes one nurse and one doctor for each open booth. "
                "Does not save shifts."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "from_date": {"type": "string", "description": "Start date YYYY-MM-DD"},
                    "to_date": {"type": "string", "description": "End date YYYY-MM-DD"},
                },
                "required": ["from_date", "to_date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "suggest_week_coverage",
            "description": (
                "Fallback when review_roster is unavailable. One call returns AM/PM "
                "rotated shift proposals for Low/Partial days, using configured hospital "
                "booths when available. Prefer this over many propose_shift_for_approval calls."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "from_date": {"type": "string", "description": "Week start YYYY-MM-DD"},
                    "to_date": {"type": "string", "description": "Week end YYYY-MM-DD"},
                    "default_start": {"type": "string"},
                    "default_end": {"type": "string"},
                },
                "required": ["from_date", "to_date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "propose_shift_for_approval",
            "description": (
                "Propose ONE custom shift. Use only when the user asks for a single "
                "specific shift — not for whole-week suggestions."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "affiliation_id": {"type": "string", "description": "From get_active_staff"},
                    "staff_name": {"type": "string"},
                    "shift_date": {"type": "string", "description": "YYYY-MM-DD"},
                    "start_time": {"type": "string", "description": "HH:mm e.g. 08:00 or 13:00"},
                    "end_time": {"type": "string", "description": "HH:mm e.g. 12:00 or 17:00"},
                    "booth_or_station": {
                        "type": "string",
                        "description": "Optional free-text label if no booth_id",
                    },
                    "booth_id": {
                        "type": "string",
                        "description": "Optional hospital booth GUID from configured booths",
                    },
                    "notes": {"type": "string"},
                    "reason": {"type": "string"},
                },
                "required": ["affiliation_id", "staff_name", "shift_date", "start_time", "end_time"],
            },
        },
    },
]
