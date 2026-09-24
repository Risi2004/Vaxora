"""
Staff scheduling tools for the StaffSchedulingAgent.
These call Vaxora hospital staff APIs using the caller's Bearer token.

Read and propose only: creating or deleting a shift is done by the hospital user
through the Vaxora UI, so the agent has no tool that can write to the roster.
"""
from typing import Any, Dict, Optional

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
    notes: Optional[str] = None,
    reason: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Build a shift proposal for the hospital to approve in the UI.
    Does NOT create the shift yet.
    """
    return {
        "success": True,
        "status": "proposal_pending_hospital_approval",
        "proposal": {
            "affiliationId": affiliation_id,
            "staffName": staff_name,
            "shiftDate": _clean_date_string(shift_date),
            "startTime": _normalize_time(start_time),
            "endTime": _normalize_time(end_time),
            "boothOrStation": booth_or_station,
            "notes": notes,
            "reason": reason or "Suggested by Staff Scheduling Agent",
        },
    }


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
            "name": "suggest_week_coverage",
            "description": (
                "PREFERRED for week/fill/low-coverage requests. One call returns AM/PM "
                "rotated shift proposals for Low/Partial days. Prefer this over many "
                "propose_shift_for_approval calls."
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
                    "booth_or_station": {"type": "string"},
                    "notes": {"type": "string"},
                    "reason": {"type": "string"},
                },
                "required": ["affiliation_id", "staff_name", "shift_date", "start_time", "end_time"],
            },
        },
    },
]
