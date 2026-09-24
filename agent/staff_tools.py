"""
Staff scheduling tools for the StaffSchedulingAgent.
These call Vaxora hospital staff APIs using the caller's Bearer token.

Read and propose only: creating or deleting a shift is done by the hospital user
through the Vaxora UI, so the agent has no tool that can write to the roster.
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

try:
    from .tools import api_get, api_post, _clean_date_string
except ImportError:
    from tools import api_get, api_post, _clean_date_string


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
            # Off/OnDuty/OnBreak = live clock-in only. New staff default to Off.
            # Do NOT treat Off as "not working today" — use get_hospital_shifts for roster.
            "note": (
                "liveClockStatus is who is clocked in right now (Off/OnDuty/OnBreak). "
                "Off is the default and does NOT mean they are unavailable for shifts. "
                "Use get_hospital_shifts to see who is scheduled today."
            ),
            "staff": [
                {
                    "affiliationId": s.get("affiliationId") or s.get("AffiliationId"),
                    "staffName": s.get("staffName") or s.get("StaffName"),
                    "staffRole": s.get("staffRole") or s.get("StaffRole"),
                    "registrationNumber": s.get("staffRegistrationNumber") or s.get("StaffRegistrationNumber"),
                    "liveClockStatus": s.get("dutyStatus") or s.get("DutyStatus") or "Off",
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
    Build a shift proposal for the hospital to approve in the UI.
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


def _hospital_today() -> str:
    clock = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    return clock.date().isoformat()


def _day_key(value: Any) -> str:
    return str(value or "")[:10]


def _minutes(value: Any) -> int:
    raw = str(value or "00:00")[:5]
    hour, minute = raw.split(":")
    return int(hour) * 60 + int(minute)


def _slot_name(start: Any) -> str:
    return "Morning" if _minutes(start) < 12 * 60 else "Afternoon"


def _role_label(role: str) -> str:
    if str(role).upper() == "DOCTOR":
        return "doctor"
    if str(role).upper() == "NURSE":
        return "nurse"
    return str(role or "staff").lower()


async def tool_review_roster(from_date: str, to_date: str, token: Optional[str] = None) -> Dict[str, Any]:
    """
    Read coverage, shifts, and workload, then propose only the missing gaps.
    Does not create shifts.
    """
    clean_from = _clean_date_string(from_date)
    clean_to = _clean_date_string(to_date)
    staff_result, coverage_result, shift_result = await _gather_roster(clean_from, clean_to, token)
    if not staff_result.get("success"):
        return staff_result
    if not coverage_result.get("success"):
        return coverage_result
    if not shift_result.get("success"):
        return shift_result

    booths = await _load_active_booths(token)
    staff = staff_result.get("staff") or []
    shifts = shift_result.get("shifts") or []
    coverage = coverage_result.get("coverage") or {}
    days = coverage.get("days") or coverage.get("Days") or []
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
    proposals: List[Dict[str, Any]] = []
    planned = []
    for shift in shifts:
        planned.append(
            {
                "affiliationId": shift.get("affiliationId") or shift.get("AffiliationId"),
                "date": _day_key(shift.get("shiftDate") or shift.get("ShiftDate")),
                "start": _minutes(shift.get("startTime") or shift.get("StartTime")),
                "end": _minutes(shift.get("endTime") or shift.get("EndTime")),
            }
        )

    slots = (("Morning", 8 * 60, 12 * 60), ("Afternoon", 13 * 60, 17 * 60))
    for day in days:
        date = _day_key(day.get("date") or day.get("Date"))
        level = day.get("coverageLevel") or day.get("CoverageLevel") or "Low"
        if level not in ("Low", "Partial") or not date or date < today:
            continue
        for slot_name, slot_start, slot_end in slots:
            for role in ("DOCTOR", "NURSE"):
                pool = [s for s in staff if str(s.get("staffRole") or "").upper() == role]
                if not pool:
                    continue
                present = [
                    shift
                    for shift in shifts
                    if _day_key(shift.get("shiftDate") or shift.get("ShiftDate")) == date
                    and str(shift.get("staffRole") or shift.get("StaffRole") or "").upper() == role
                    and _slot_name(shift.get("startTime") or shift.get("StartTime")) == slot_name
                ]
                if present:
                    continue
                findings.append(f"{date} {slot_name.lower()}: no {_role_label(role)}")
                chosen = _pick_lightest(pool, workload, overloaded_ids, planned, date, slot_start, slot_end)
                if chosen is None:
                    findings.append(
                        f"{date} {slot_name.lower()}: no free {_role_label(role)} who is not already heavily scheduled"
                    )
                    continue
                booth = _pick_open_booth(booths, shifts, date, slot_name)
                booth_id = _booth_id(booth) if booth else None
                station = f"{_booth_label(booth)} — {slot_name}" if booth else slot_name
                proposals.append(
                    {
                        "affiliationId": chosen["affiliationId"],
                        "staffName": chosen["staffName"],
                        "staffRole": chosen["staffRole"],
                        "shiftDate": date,
                        "startTime": "08:00:00" if slot_name == "Morning" else "13:00:00",
                        "endTime": "12:00:00" if slot_name == "Morning" else "17:00:00",
                        "boothId": booth_id,
                        "boothOrStation": station,
                        "notes": "Gap-only roster review",
                        "reason": f"Missing {_role_label(role)} on {date} {slot_name.lower()}",
                    }
                )
                workload[chosen["affiliationId"]] = workload.get(chosen["affiliationId"], 0) + 1
                planned.append(
                    {
                        "affiliationId": chosen["affiliationId"],
                        "date": date,
                        "start": slot_start,
                        "end": slot_end,
                    }
                )

    if booths is None:
        findings.append("Booth list could not be loaded.")
    else:
        for day in days:
            date = _day_key(day.get("date") or day.get("Date"))
            level = day.get("coverageLevel") or day.get("CoverageLevel") or "Low"
            if level not in ("Low", "Partial") or not date or date < today:
                continue
            for slot_name, _slot_start, _slot_end in slots:
                empty = [
                    _booth_label(booth)
                    for booth in booths
                    if not _booth_has_shift(booth, shifts, date, slot_name)
                ]
                if empty:
                    findings.append(f"{date} {slot_name.lower()}: no staff at {', '.join(empty)}")

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

    heavy = [row["staffName"] for row in workload_rows if row["load"] == "heavy"]
    if heavy:
        findings.append("Heavier than the rest of the roster: " + ", ".join(heavy))

    if not findings:
        findings.append("No missing morning or afternoon cover on upcoming thin days.")

    return {
        "success": True,
        "from": clean_from,
        "to": clean_to,
        "findings": findings,
        "workload": workload_rows,
        "proposalCount": len(proposals),
        "proposals": proposals,
        "message": _review_message(clean_from, clean_to, findings, proposals),
    }


async def _gather_roster(from_date: str, to_date: str, token: Optional[str]):
    staff_result = await tool_get_active_staff(token=token)
    coverage_result = await tool_get_coverage(from_date, to_date, token=token)
    shift_result = await tool_get_hospital_shifts(from_date, to_date, token=token)
    return staff_result, coverage_result, shift_result


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


def _shift_matches_booth(shift: Dict[str, Any], booth: Dict[str, Any]) -> bool:
    shift_booth = str(shift.get("boothId") or shift.get("BoothId") or "")
    booth_key = str(_booth_id(booth) or "")
    if shift_booth and booth_key and shift_booth == booth_key:
        return True
    station = str(shift.get("boothOrStation") or shift.get("BoothOrStation") or "").lower()
    code = str(booth.get("code") or booth.get("Code") or "").lower()
    label = str(_booth_label(booth)).lower()
    return bool(station) and ((code and code in station) or (label and label in station))


def _booth_has_shift(booth: Dict[str, Any], shifts: List[Dict[str, Any]], date: str, slot_name: str) -> bool:
    return any(
        _day_key(shift.get("shiftDate") or shift.get("ShiftDate")) == date
        and _slot_name(shift.get("startTime") or shift.get("StartTime")) == slot_name
        and _shift_matches_booth(shift, booth)
        for shift in shifts
    )


def _pick_open_booth(
    booths: Optional[List[Dict[str, Any]]],
    shifts: List[Dict[str, Any]],
    date: str,
    slot_name: str,
) -> Optional[Dict[str, Any]]:
    if not booths:
        return None

    def assigned(booth: Dict[str, Any]) -> int:
        return sum(
            1
            for shift in shifts
            if _day_key(shift.get("shiftDate") or shift.get("ShiftDate")) == date
            and _slot_name(shift.get("startTime") or shift.get("StartTime")) == slot_name
            and _shift_matches_booth(shift, booth)
        )

    return min(booths, key=assigned)


def _overlaps(start: int, end: int, other_start: int, other_end: int) -> bool:
    return start < other_end and other_start < end


def _pick_lightest(
    pool: List[Dict[str, Any]],
    workload: Dict[str, int],
    overloaded_ids: set,
    planned: List[Dict[str, Any]],
    date: str,
    slot_start: int,
    slot_end: int,
) -> Optional[Dict[str, Any]]:
    ranked = sorted(pool, key=lambda person: (workload.get(person["affiliationId"], 0), person.get("staffName") or ""))
    fallback = None
    for person in ranked:
        busy = any(
            item["affiliationId"] == person["affiliationId"]
            and item["date"] == date
            and _overlaps(slot_start, slot_end, item["start"], item["end"])
            for item in planned
        )
        if busy:
            continue
        if person["affiliationId"] in overloaded_ids:
            fallback = fallback or person
            continue
        return person
    return fallback


def _review_message(from_date: str, to_date: str, findings: List[str], proposals: List[Dict[str, Any]]) -> str:
    lines = [f"Roster review {from_date} to {to_date}."]
    lines.extend(f"- {item}" for item in findings[:12])
    if proposals:
        lines.append(f"{len(proposals)} gap proposal(s) are ready to approve. Nothing is saved yet.")
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
            "description": (
                "List active affiliated doctors and nurses. "
                "liveClockStatus (Off/OnDuty/OnBreak) is live clock-in only — "
                "Off is normal default, NOT 'day off'. Use get_hospital_shifts for who works a date."
            ),
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
                "PREFERRED for what is wrong, thin days, empty cover, workload, or filling gaps. "
                "Reads coverage, shifts, booths, and who already has the most shifts, then "
                "returns findings plus proposals only for missing morning/afternoon roles. "
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
