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
    from .tools import api_get, _clean_date_string
except ImportError:
    from tools import api_get, _clean_date_string

# Kept in this process only. Closing the chat does not clear it. Restarting the agent does.
_DECLINE_PREFIX = "__shift_declined__"
_hospital_key: ContextVar[str] = ContextVar("vaxora_hospital_key", default="")
_declined_slots: Dict[str, set] = {}
_gap_catalog: Dict[str, Dict[str, Any]] = {}
MAX_WEEKLY_SHIFTS = 7


def bind_hospital(patient_info: Optional[Dict[str, Any]], token: Optional[str]) -> None:
    email = ""
    if isinstance(patient_info, dict):
        email = str(patient_info.get("email") or patient_info.get("Email") or "").strip().lower()
    _hospital_key.set(email or str(token or ""))


def parse_decline_payload(text: str) -> Optional[Dict[str, Any]]:
    raw = str(text or "").strip()
    if not raw.startswith(_DECLINE_PREFIX):
        return None
    try:
        data = json.loads(raw[len(_DECLINE_PREFIX):].strip())
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def note_decline_message(text: str) -> bool:
    """Remember a Decline click. Returns True when this message is only that note."""
    data = parse_decline_payload(text)
    if data is None:
        return False
    key = _hospital_key.get()
    if key:
        slot = (
            str(data.get("affiliationId") or ""),
            str(data.get("shiftDate") or "")[:10],
            _normalize_time(data.get("startTime"))[:5],
            _normalize_time(data.get("endTime"))[:5],
        )
        if slot[0] and slot[1]:
            _declined_slots.setdefault(key, set()).add(slot)
    if data.get("requestAlternative"):
        return False
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
    """Legacy single-call helper. Prefer analyze_staffing_needs then build_staffing_plan."""
    analyzed = await tool_analyze_staffing_needs(from_date, to_date, token=token)
    if not analyzed.get("success"):
        return analyzed
    built = await tool_build_staffing_plan(from_date, to_date, token=token)
    if not built.get("success"):
        return built
    findings = analyzed.get("findings") or []
    proposals = built.get("proposals") or []
    return {
        "success": True,
        "from": analyzed.get("from"),
        "to": analyzed.get("to"),
        "findings": findings,
        "openings": analyzed.get("openings") or [],
        "workload": built.get("workloadAfter") or analyzed.get("workloadBefore") or [],
        "workloadBefore": analyzed.get("workloadBefore") or [],
        "workloadAfter": built.get("workloadAfter") or [],
        "validation": built.get("validation") or {"valid": True, "issues": []},
        "proposalCount": len(proposals),
        "proposals": proposals,
        "message": _review_message(analyzed.get("from"), analyzed.get("to"), findings, proposals),
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


def _pick_alternatives(
    pool,
    planned,
    workload,
    date: str,
    slot_start: int,
    slot_end: int,
    exclude_ids: Optional[set] = None,
    limit: int = 3,
):
    exclude_ids = exclude_ids or set()
    ranked = sorted(pool, key=lambda person: str(person.get("staffName") or "").lower())
    order = {person["affiliationId"]: index for index, person in enumerate(ranked)}
    day_offset = datetime.fromisoformat(date).weekday()
    pool_size = len(ranked) or 1

    def tie_break(person) -> int:
        return (order[person["affiliationId"]] - day_offset) % pool_size

    free = []
    for person in pool:
        if person["affiliationId"] in exclude_ids:
            continue
        busy = any(
            item["affiliationId"] == person["affiliationId"]
            and item["date"] == date
            and slot_start < item["end"]
            and item["start"] < slot_end
            for item in planned
        )
        if not busy:
            free.append(person)
    free.sort(key=lambda person: (workload.get(person["affiliationId"], 0), tie_break(person)))
    return free[:limit]


def _gap_id(date: str, slot_name: str, booth_id: Optional[str], role: str) -> str:
    return f"{date}|{slot_name}|{booth_id or 'none'}|{role.upper()}"


def _workload_summary(workload: Dict[str, int], staff: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    counts = list(workload.values()) or [0]
    lightest = min(counts)
    overloaded_ids = {
        affiliation_id
        for affiliation_id, count in workload.items()
        if count - lightest >= 2 and count > 0
    }
    rows = []
    for person in staff:
        count = workload.get(person["affiliationId"], 0)
        flag = (
            "heavy"
            if person["affiliationId"] in overloaded_ids
            else "light"
            if count == lightest
            else "even"
        )
        rows.append(
            {
                "affiliationId": person["affiliationId"],
                "staffName": person["staffName"],
                "staffRole": person["staffRole"],
                "shiftCount": count,
                "load": flag,
            }
        )
    rows.sort(key=lambda row: (-row["shiftCount"], row["staffName"] or ""))
    return rows


def _validate_proposals(
    proposals: List[Dict[str, Any]],
    staff: List[Dict[str, Any]],
    planned: List[Dict[str, Any]],
) -> Dict[str, Any]:
    staff_by_id = {s["affiliationId"]: s for s in staff}
    today = _hospital_today()
    issues = []
    for proposal in proposals:
        gap_id = proposal.get("gapId") or proposal.get("affiliationId")
        affiliation_id = proposal.get("affiliationId")
        date = str(proposal.get("shiftDate") or "")[:10]
        start = _minutes(proposal.get("startTime"))
        end = _minutes(proposal.get("endTime"))
        person = staff_by_id.get(affiliation_id)
        if not person:
            issues.append({"gapId": gap_id, "message": "Staff member is not on the active roster."})
            continue
        if date < today:
            issues.append({"gapId": gap_id, "message": "Shift date is in the past."})
        if end <= start:
            issues.append({"gapId": gap_id, "message": "Shift end time must be after start time."})
        overlap_blocks = [
            item
            for item in planned
            if item.get("affiliationId") == affiliation_id
            and item.get("date") == date
            and start < item["end"]
            and item["start"] < end
        ]
        if len(overlap_blocks) > 1:
            issues.append({"gapId": gap_id, "message": "Staff member is already booked for this slot."})
        week_shifts = sum(1 for item in planned if item.get("affiliationId") == affiliation_id)
        if week_shifts > MAX_WEEKLY_SHIFTS:
            issues.append(
                {
                    "gapId": gap_id,
                    "message": f"{person.get('staffName')} would exceed {MAX_WEEKLY_SHIFTS} shifts this week.",
                }
            )
    return {"valid": len(issues) == 0, "issues": issues}


async def _prepare_roster_state(
    from_date: str,
    to_date: str,
    token: Optional[str],
) -> Dict[str, Any]:
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
    workload = {s["affiliationId"]: 0 for s in staff}
    for shift in shifts:
        affiliation_id = shift.get("affiliationId") or shift.get("AffiliationId")
        if affiliation_id in workload:
            workload[affiliation_id] += 1

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

    appointments = await _load_hospital_appointments(token)
    return {
        "success": True,
        "from": clean_from,
        "to": clean_to,
        "staff": staff,
        "doctors": [s for s in staff if str(s.get("staffRole") or "").upper() == "DOCTOR"],
        "nurses": [s for s in staff if str(s.get("staffRole") or "").upper() == "NURSE"],
        "booths": booths,
        "ordered_booths": _sorted_booths(booths),
        "appointments": appointments,
        "planned": planned,
        "workload": workload,
        "workloadBefore": _workload_summary(workload, staff),
        "today": _hospital_today(),
        "now_minutes": _hospital_now_minutes(),
        "slots": (("Morning", 8 * 60, 12 * 60), ("Afternoon", 13 * 60, 17 * 60)),
    }


def _discover_staffing_gaps(state: Dict[str, Any]) -> Tuple[List[str], List[Dict[str, Any]], List[Dict[str, Any]]]:
    findings: List[str] = []
    openings: List[Dict[str, Any]] = []
    gaps: List[Dict[str, Any]] = []
    appointments = state.get("appointments")
    booths = state.get("booths")
    ordered_booths = state.get("ordered_booths") or []
    planned = state.get("planned") or []
    clean_from = state["from"]
    clean_to = state["to"]
    today = state["today"]
    now_minutes = state["now_minutes"]
    slots = state["slots"]

    if appointments is None:
        findings.append("Appointments could not be loaded, so no booths need to be opened.")
        return findings, openings, gaps

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
                placed, leftover = _place_vaccine_demand(ordered_booths, group, open_booths, booth_room)
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
                openings.append(
                    {
                        "date": date,
                        "slot": slot_name,
                        "count": group["count"],
                        "vaccine": label,
                        "booths": [_booth_label(booth) for booth in placed],
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
                vaccine_label = ", ".join(booth_vaccines.get(str(_booth_id(booth) or id(booth)), []))
                booth_id = _booth_id(booth)
                for role in ("NURSE", "DOCTOR"):
                    if _booth_has_role(planned, booth, date, slot_start, slot_end, role):
                        continue
                    gaps.append(
                        {
                            "gapId": _gap_id(date, slot_name, booth_id, role),
                            "date": date,
                            "slot": slot_name,
                            "slotStart": slot_start,
                            "slotEnd": slot_end,
                            "role": role,
                            "boothId": booth_id,
                            "boothLabel": _booth_label(booth),
                            "booth": booth,
                            "vaccineName": vaccine_label,
                            "reason": "Doctor for this booth" if role == "DOCTOR" else "Nurse for this booth",
                        }
                    )

    if booths is None and appointments is not None:
        findings.append("Booth list could not be loaded, so proposals have no booth.")
    if (
        appointments is not None
        and ordered_booths
        and not gaps
        and not openings
        and not any("bookings for" in item for item in findings)
    ):
        if clean_from == clean_to:
            findings.append(f"There are no appointments on {clean_from}, so no booths need to be opened.")
        else:
            findings.append(
                f"There are no appointments from {clean_from} to {clean_to}, so no booths need to be opened."
            )
    if not findings and not openings:
        findings.append(
            f"There are no appointments from {clean_from} to {clean_to}, so no booths need to be opened."
        )
    return findings, openings, gaps


def _assign_gap_proposals(
    state: Dict[str, Any],
    gaps: List[Dict[str, Any]],
    exclude_affiliation_ids: Optional[List[str]] = None,
    gap_ids: Optional[List[str]] = None,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, int]]:
    exclude = {str(item) for item in (exclude_affiliation_ids or []) if item}
    allowed = {str(item) for item in (gap_ids or [])} if gap_ids else None
    planned = [dict(item) for item in state.get("planned") or []]
    workload = dict(state.get("workload") or {})
    doctors = state.get("doctors") or []
    nurses = state.get("nurses") or []
    proposals: List[Dict[str, Any]] = []

    for gap in gaps:
        if allowed is not None and gap["gapId"] not in allowed:
            continue
        pool = doctors if gap["role"] == "DOCTOR" else nurses
        slot_start = gap["slotStart"]
        slot_end = gap["slotEnd"]
        chosen = _pick_lightest_free(pool, planned, workload, gap["date"], slot_start, slot_end)
        if chosen and chosen["affiliationId"] in exclude:
            alts = _pick_alternatives(
                pool, planned, workload, gap["date"], slot_start, slot_end, exclude, limit=4
            )
            chosen = alts[0] if alts else None
        if chosen is None:
            continue
        alts = _pick_alternatives(
            pool,
            planned,
            workload,
            gap["date"],
            slot_start,
            slot_end,
            {chosen["affiliationId"], *exclude},
            limit=3,
        )
        proposal = _make_gap_proposal(gap, chosen, alts)
        proposals.append(proposal)
        workload[chosen["affiliationId"]] = workload.get(chosen["affiliationId"], 0) + 1
        planned.append(
            {
                "affiliationId": chosen["affiliationId"],
                "date": gap["date"],
                "start": slot_start,
                "end": slot_end,
                "role": gap["role"],
                "boothId": gap.get("boothId"),
            }
        )
    return proposals, planned, workload


def _make_gap_proposal(gap: Dict[str, Any], chosen: Dict[str, Any], alternatives: List[Dict[str, Any]]) -> Dict[str, Any]:
    slot_name = gap["slot"]
    booth = gap.get("booth")
    return {
        "gapId": gap["gapId"],
        "affiliationId": chosen["affiliationId"],
        "staffName": chosen["staffName"],
        "staffRole": chosen["staffRole"],
        "shiftDate": gap["date"],
        "startTime": "08:00:00" if slot_name == "Morning" else "13:00:00",
        "endTime": "12:00:00" if slot_name == "Morning" else "17:00:00",
        "boothId": gap.get("boothId"),
        "boothOrStation": _station_label(booth, slot_name),
        "vaccineName": gap.get("vaccineName") or "",
        "notes": gap.get("vaccineName") or "Morning and afternoon clinic cover",
        "reason": gap.get("reason") or "Suggested by Staff Scheduling Agent",
        "alternatives": [
            {
                "affiliationId": alt["affiliationId"],
                "staffName": alt["staffName"],
                "staffRole": alt["staffRole"],
            }
            for alt in alternatives
        ],
    }


def _store_gap_catalog(state: Dict[str, Any], gaps: List[Dict[str, Any]]) -> None:
    key = _hospital_key.get()
    if not key:
        return
    _gap_catalog[key] = {
        "from": state["from"],
        "to": state["to"],
        "gaps": {gap["gapId"]: gap for gap in gaps},
        "state": {
            "staff": state.get("staff") or [],
            "doctors": state.get("doctors") or [],
            "nurses": state.get("nurses") or [],
            "planned": state.get("planned") or [],
            "workload": state.get("workload") or {},
        },
    }


async def tool_analyze_staffing_needs(
    from_date: str,
    to_date: str,
    token: Optional[str] = None,
) -> Dict[str, Any]:
    """Read bookings, booths, and existing shifts. Returns gaps without assigning staff."""
    state = await _prepare_roster_state(from_date, to_date, token)
    if not state.get("success"):
        return state
    findings, openings, gaps = _discover_staffing_gaps(state)
    _store_gap_catalog(state, gaps)
    return {
        "success": True,
        "from": state["from"],
        "to": state["to"],
        "findings": findings,
        "openings": openings,
        "gaps": [
            {
                "gapId": gap["gapId"],
                "date": gap["date"],
                "slot": gap["slot"],
                "role": gap["role"],
                "boothLabel": gap["boothLabel"],
                "vaccineName": gap.get("vaccineName") or "",
            }
            for gap in gaps
        ],
        "gapCount": len(gaps),
        "workloadBefore": state["workloadBefore"],
        "message": (
            f"Found {len(gaps)} staffing gap(s) across {state['from']} to {state['to']}. "
            "Call build_staffing_plan to propose fair assignments."
        ),
    }


async def tool_build_staffing_plan(
    from_date: str,
    to_date: str,
    exclude_affiliation_ids: Optional[List[str]] = None,
    gap_ids: Optional[List[str]] = None,
    token: Optional[str] = None,
) -> Dict[str, Any]:
    """Assign the lightest free staff to each gap and validate the plan."""
    state = await _prepare_roster_state(from_date, to_date, token)
    if not state.get("success"):
        return state
    findings, openings, gaps = _discover_staffing_gaps(state)
    _store_gap_catalog(state, gaps)
    proposals, planned, workload = _assign_gap_proposals(
        state,
        gaps,
        exclude_affiliation_ids=exclude_affiliation_ids,
        gap_ids=gap_ids,
    )
    validation = _validate_proposals(proposals, state.get("staff") or [], planned)
    workload_after = _workload_summary(workload, state.get("staff") or [])
    return {
        "success": True,
        "from": state["from"],
        "to": state["to"],
        "findings": findings,
        "openings": openings,
        "proposals": proposals,
        "proposalCount": len(proposals),
        "workloadBefore": state["workloadBefore"],
        "workloadAfter": workload_after,
        "validation": validation,
        "message": _review_message(state["from"], state["to"], findings, proposals),
    }


async def tool_propose_alternative_for_gap(
    gap_id: str,
    exclude_affiliation_ids: Optional[List[str]] = None,
    token: Optional[str] = None,
) -> Dict[str, Any]:
    """Propose the next fairest person for one declined gap."""
    catalog = _gap_catalog.get(_hospital_key.get(), {})
    gap = (catalog.get("gaps") or {}).get(gap_id)
    if not gap:
        return {"success": False, "error": "Gap not found. Run analyze_staffing_needs first."}
    snapshot = catalog.get("state") or {}
    state = {
        "success": True,
        "from": catalog.get("from"),
        "to": catalog.get("to"),
        "staff": snapshot.get("staff") or [],
        "doctors": snapshot.get("doctors") or [],
        "nurses": snapshot.get("nurses") or [],
        "planned": [dict(item) for item in snapshot.get("planned") or []],
        "workload": dict(snapshot.get("workload") or {}),
    }
    proposals, planned, workload = _assign_gap_proposals(
        state,
        [gap],
        exclude_affiliation_ids=exclude_affiliation_ids,
        gap_ids=[gap_id],
    )
    if not proposals:
        return {
            "success": False,
            "error": "No alternative staff member is free for that booth and slot.",
        }
    validation = _validate_proposals(proposals, state.get("staff") or [], planned)
    return {
        "success": True,
        "proposal": proposals[0],
        "proposals": proposals,
        "workloadAfter": _workload_summary(workload, state.get("staff") or []),
        "validation": validation,
    }


def _append_gap_proposal(
    proposals, planned, workload, chosen, date, slot_name, slot_start, slot_end, booth, reason, vaccine_name=""
):
    booth_id = _booth_id(booth) if booth else None
    role = str(chosen.get("staffRole") or "").upper()
    pool = [chosen]  # legacy path
    alts = []
    proposal = {
        "gapId": _gap_id(date, slot_name, booth_id, role),
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
        "alternatives": alts,
    }
    proposals.append(proposal)
    workload[chosen["affiliationId"]] = workload.get(chosen["affiliationId"], 0) + 1
    planned.append(
        {
            "affiliationId": chosen["affiliationId"],
            "date": date,
            "start": slot_start,
            "end": slot_end,
            "role": role,
            "boothId": booth_id,
        }
    )


def _review_message(from_date: str, to_date: str, findings: List[str], proposals: List[Dict[str, Any]]) -> str:
    lines = [f"Roster review {from_date} to {to_date}."]
    lines.extend(f"- {item}" for item in findings[:12])
    if proposals:
        lines.append(f"{len(proposals)} suggested shift(s). Press Approve or Decline on each one. Nothing is saved yet.")
    else:
        lines.append("No new shifts to propose.")
    return "\n".join(lines)


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
            "name": "analyze_staffing_needs",
            "description": (
                "Step 1 for staffing. Reads booked appointments, booths, and existing shifts. "
                "Returns staffing gaps and workloadBefore without assigning anyone."
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
            "name": "build_staffing_plan",
            "description": (
                "Step 2 for staffing. Assigns the lightest free nurse and doctor to each gap "
                "with alternatives and validation. Does not save shifts."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "from_date": {"type": "string", "description": "Start date YYYY-MM-DD"},
                    "to_date": {"type": "string", "description": "End date YYYY-MM-DD"},
                    "exclude_affiliation_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Optional staff to skip when building the plan",
                    },
                },
                "required": ["from_date", "to_date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "propose_alternative_for_gap",
            "description": (
                "After a hospital declines someone, propose the next fairest person for one gap."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "gap_id": {"type": "string", "description": "Gap id from analyze_staffing_needs"},
                    "exclude_affiliation_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Declined or unavailable staff affiliation ids",
                    },
                },
                "required": ["gap_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "review_roster",
            "description": (
                "Legacy one-call staffing. Prefer analyze_staffing_needs then build_staffing_plan."
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
