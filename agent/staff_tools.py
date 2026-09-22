"""
Staff scheduling tools for the StaffSchedulingAgent.
These call Vaxora hospital staff APIs using the caller's Bearer token.
"""
from typing import Any, Dict, List, Optional

try:
    from .tools import api_get, api_post, api_delete, _clean_date_string
except ImportError:
    from tools import api_get, api_post, api_delete, _clean_date_string


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
                    "dutyStatus": s.get("dutyStatus") or s.get("DutyStatus"),
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


async def tool_create_shift(
    affiliation_id: str,
    shift_date: str,
    start_time: str,
    end_time: str,
    booth_or_station: Optional[str] = None,
    notes: Optional[str] = None,
    token: Optional[str] = None,
) -> Dict[str, Any]:
    """Create a shift. Call ONLY after the hospital has approved the proposal."""
    try:
        payload = {
            "affiliationId": affiliation_id,
            "shiftDate": _clean_date_string(shift_date),
            "startTime": _normalize_time(start_time),
            "endTime": _normalize_time(end_time),
            "boothOrStation": booth_or_station,
            "notes": notes,
        }
        data = await api_post("/staff/shifts", payload, token=token)
        return {"success": True, "shift": data}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def tool_delete_shift(shift_id: str, token: Optional[str] = None) -> Dict[str, Any]:
    """Delete a hospital shift by id."""
    try:
        data = await api_delete(f"/staff/shifts/{shift_id}", token=token)
        return {"success": True, "result": data}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def tool_suggest_week_coverage(
    from_date: str,
    to_date: str,
    default_start: str = "08:00",
    default_end: str = "16:00",
    token: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Rules-based week suggester (works without an LLM).
    For each Low coverage day, propose one doctor and one nurse shift
    using the first available active staff of each role who is not already
    scheduled that day.
    """
    try:
        clean_from = _clean_date_string(from_date)
        clean_to = _clean_date_string(to_date)

        coverage_res = await tool_get_coverage(clean_from, clean_to, token=token)
        if not coverage_res.get("success"):
            return coverage_res

        staff_res = await tool_get_active_staff(token=token)
        if not staff_res.get("success"):
            return staff_res

        shifts_res = await tool_get_hospital_shifts(clean_from, clean_to, token=token)
        existing = shifts_res.get("shifts") if shifts_res.get("success") else []

        scheduled_by_day: Dict[str, set] = {}
        for s in existing or []:
            day = str(s.get("shiftDate") or s.get("ShiftDate") or "")[:10]
            aff = str(s.get("affiliationId") or s.get("AffiliationId") or "")
            scheduled_by_day.setdefault(day, set()).add(aff)

        doctors = [s for s in staff_res.get("staff", []) if str(s.get("staffRole", "")).upper() == "DOCTOR"]
        nurses = [s for s in staff_res.get("staff", []) if str(s.get("staffRole", "")).upper() == "NURSE"]

        coverage = coverage_res.get("coverage") or {}
        days = coverage.get("days") or coverage.get("Days") or []
        proposals: List[Dict[str, Any]] = []

        for day in days:
            level = str(day.get("coverageLevel") or day.get("CoverageLevel") or "")
            date_val = str(day.get("date") or day.get("Date") or "")[:10]
            if level.lower() != "low" or not date_val:
                continue

            busy = scheduled_by_day.get(date_val, set())
            summary = day.get("summary") or day.get("Summary") or "Low coverage day"

            free_doc = next((d for d in doctors if d["affiliationId"] not in busy), None)
            free_nurse = next((n for n in nurses if n["affiliationId"] not in busy), None)

            if free_doc:
                proposals.append(
                    {
                        "affiliationId": free_doc["affiliationId"],
                        "staffName": free_doc["staffName"],
                        "staffRole": free_doc["staffRole"],
                        "shiftDate": date_val,
                        "startTime": _normalize_time(default_start),
                        "endTime": _normalize_time(default_end),
                        "boothOrStation": None,
                        "notes": "Auto-suggested to improve coverage",
                        "reason": f"{summary} — assign doctor",
                    }
                )
                busy.add(free_doc["affiliationId"])

            if free_nurse:
                proposals.append(
                    {
                        "affiliationId": free_nurse["affiliationId"],
                        "staffName": free_nurse["staffName"],
                        "staffRole": free_nurse["staffRole"],
                        "shiftDate": date_val,
                        "startTime": _normalize_time(default_start),
                        "endTime": _normalize_time(default_end),
                        "boothOrStation": None,
                        "notes": "Auto-suggested to improve coverage",
                        "reason": f"{summary} — assign nurse",
                    }
                )
                busy.add(free_nurse["affiliationId"])

        return {
            "success": True,
            "from": clean_from,
            "to": clean_to,
            "activeDoctors": len(doctors),
            "activeNurses": len(nurses),
            "proposalCount": len(proposals),
            "proposals": proposals,
            "message": (
                f"Suggested {len(proposals)} shift(s) for low-coverage days."
                if proposals
                else "No low-coverage days needing new shifts, or no free staff available."
            ),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


STAFF_TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "get_active_staff",
            "description": "List active affiliated doctors and nurses for this hospital.",
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
            "description": "Propose shifts for low-coverage days in a week. Returns proposals for hospital approval; does not create shifts.",
            "parameters": {
                "type": "object",
                "properties": {
                    "from_date": {"type": "string", "description": "Week start YYYY-MM-DD"},
                    "to_date": {"type": "string", "description": "Week end YYYY-MM-DD"},
                    "default_start": {"type": "string", "description": "Default start time HH:mm", "default": "08:00"},
                    "default_end": {"type": "string", "description": "Default end time HH:mm", "default": "16:00"},
                },
                "required": ["from_date", "to_date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "propose_shift_for_approval",
            "description": "Propose a single shift for hospital approval before creating it.",
            "parameters": {
                "type": "object",
                "properties": {
                    "affiliation_id": {"type": "string"},
                    "staff_name": {"type": "string"},
                    "shift_date": {"type": "string", "description": "YYYY-MM-DD"},
                    "start_time": {"type": "string", "description": "HH:mm or HH:mm:ss"},
                    "end_time": {"type": "string", "description": "HH:mm or HH:mm:ss"},
                    "booth_or_station": {"type": "string"},
                    "notes": {"type": "string"},
                    "reason": {"type": "string"},
                },
                "required": ["affiliation_id", "staff_name", "shift_date", "start_time", "end_time"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_shift",
            "description": "Create a shift AFTER hospital approval. Do not call without approval.",
            "parameters": {
                "type": "object",
                "properties": {
                    "affiliation_id": {"type": "string"},
                    "shift_date": {"type": "string"},
                    "start_time": {"type": "string"},
                    "end_time": {"type": "string"},
                    "booth_or_station": {"type": "string"},
                    "notes": {"type": "string"},
                },
                "required": ["affiliation_id", "shift_date", "start_time", "end_time"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_shift",
            "description": "Delete an existing shift by shift id.",
            "parameters": {
                "type": "object",
                "properties": {
                    "shift_id": {"type": "string"},
                },
                "required": ["shift_id"],
            },
        },
    },
]
