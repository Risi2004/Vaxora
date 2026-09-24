import json
import logging
import re
from datetime import date, timedelta
from typing import List, Dict, Any, Optional, Tuple

import httpx

try:
    from .config import settings
    from .staff_tools import (
        STAFF_TOOLS_SCHEMA,
        tool_get_active_staff,
        tool_get_coverage,
        tool_get_hospital_shifts,
        tool_review_roster,
        tool_suggest_week_coverage,
        tool_propose_shift_for_approval,
        _hospital_today,
        bind_hospital,
        note_decline_message,
    )
except ImportError:
    from config import settings
    from staff_tools import (
        STAFF_TOOLS_SCHEMA,
        tool_get_active_staff,
        tool_get_coverage,
        tool_get_hospital_shifts,
        tool_review_roster,
        tool_suggest_week_coverage,
        tool_propose_shift_for_approval,
        _hospital_today,
        bind_hospital,
        note_decline_message,
    )

logger = logging.getLogger("vaxora-staff-scheduling-agent")

STAFF_SCHEDULING_SYSTEM_PROMPT = """You are the official Vaxora Staff Scheduling Agent for hospital users.
You help with coverage and shift proposals. You only suggest shifts. The hospital presses Approve or Decline on each one. Never say "UI".

Tools (prefer few calls — be fast):
- review_roster — PREFERRED for suggest week, what to staff, or filling gaps.
  One call reads booked appointments, existing shifts, and booths. It opens only
  booths that list the booked vaccine, then proposes the missing nurses and doctors.
  Days with no bookings get no shifts. Do not save anything.
- get_active_staff — list doctors/nurses (affiliation roster)
- get_coverage — Low / Partial / Good per day
- get_hospital_shifts — existing shifts (who is scheduled on a date)
- suggest_week_coverage — older full-week fill. Use review_roster instead when you can.
- propose_shift_for_approval — ONLY for a single custom shift the user named

Workflow:
1. What is wrong / fill gaps / suggest week: call review_roster(from_date, to_date) once.
   Summarize findings briefly. Do NOT re-list every proposal. Tell them to press Approve or Decline.
   Do not claim shifts were saved.
2. Coverage question with no fix requested: call get_coverage once, summarize.
3. Staff list: call get_active_staff once. Summarize as name + role only.
   Do NOT list liveClockStatus / Off / OnDuty unless the user asks who is clocked in right now.
4. Who works today / a date: call get_hospital_shifts, NOT get_active_staff.
5. One custom shift: call propose_shift_for_approval once.

Critical — liveClockStatus vs roster:
- liveClockStatus Off/OnDuty/OnBreak = who is clocked in RIGHT NOW.
- New staff default to Off. That does NOT mean they are on leave or unavailable.
- NEVER say "all nurses are off today" just because liveClockStatus is Off.
- "Who works today" = get_hospital_shifts for that date.

Rules: Be concise. Never invent IDs/dates. Never claim shifts were created.
Past dates cannot be scheduled.

How you speak:
- You are talking to hospital staff, not developers.
- Never mention tool names, function names, JSON, or field names.
- Never say Off, OnDuty, OnBreak, or liveClockStatus.
- Clock-in is not the roster. Mention it only if they ask who is in the building right now, and then say "clocked in" or "not clocked in yet".
"""

_DATE_RE = re.compile(r"\d{4}-\d{2}-\d{2}")
_ORDINAL_DAY_RE = re.compile(r"\b(\d{1,2})(?:st|nd|rd|th)\b", re.IGNORECASE)

_SHIFT_REQUESTS = (
    "suggest",
    "propose",
    "fill gap",
    "low coverage",
    "what is wrong",
    "what's wrong",
    "review",
    "workload",
    "create shift",
    "create shifts",
    "make shift",
    "make shifts",
    "add shift",
    "add shifts",
    "schedule shift",
    "schedule shifts",
    "staff for",
    "staff the",
    "staff tomorrow",
    "staff clinic",
    "staff ",
    "put people",
    "put a nurse",
    "put nurses",
    "put a doctor",
    "put doctors",
    "need staff",
    "need nurses",
    "need doctors",
    "open booth",
)


def _wants_shift_suggestions(text: str) -> bool:
    lowered = (text or "").lower()
    return any(phrase in lowered for phrase in _SHIFT_REQUESTS)


def _resolve_roster_range(text: str) -> Optional[Tuple[str, str]]:
    """Turn 'tomorrow' or calendar dates into the range review_roster expects."""
    dates = _DATE_RE.findall(text or "")
    if len(dates) >= 2:
        return dates[0], dates[1]
    if len(dates) == 1:
        return dates[0], dates[0]
    today = date.fromisoformat(_hospital_today())
    lowered = (text or "").lower()
    if "tomorrow" in lowered:
        day = (today + timedelta(days=1)).isoformat()
        return day, day
    if "today" in lowered:
        return today.isoformat(), today.isoformat()
    if "this week" in lowered or "week" in lowered or _wants_shift_suggestions(lowered):
        return _rest_of_week(today)
    return None


def _build_follow_ups(
    messages: List[Dict[str, Any]],
    proposals: Optional[List[Dict[str, Any]]] = None,
) -> List[str]:
    """Plain next steps a hospital user can tap. The agent reads these as normal sentences."""
    if proposals:
        return [
            "Staff the next day as well",
            "Who is working tomorrow?",
            "Who is on my staff?",
        ]
    return [
        "Staff the rest of the week",
        "Who is working tomorrow?",
        "Who is on my staff?",
        "How busy are we this week?",
    ]


def _parse_intent(text: str) -> Optional[Dict[str, Any]]:
    raw = text or ""
    if "</think>" in raw:
        raw = raw.split("</think>", 1)[-1]
    start = raw.find("{")
    end = raw.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        data = json.loads(raw[start : end + 1])
    except Exception:
        return None
    action = str(data.get("action") or "")
    if action not in {"suggest_shifts", "show_schedule", "show_coverage", "list_staff", "answer"}:
        return None
    return data


def _named_day(text: str) -> Optional[str]:
    """Turn '26th' into the next calendar date with that day number."""
    match = _ORDINAL_DAY_RE.search(text or "")
    if not match:
        return None
    day_number = int(match.group(1))
    if day_number < 1 or day_number > 31:
        return None
    cursor = date.fromisoformat(_hospital_today())
    for _ in range(14):
        year = cursor.year + (cursor.month - 1) // 12
        month = (cursor.month - 1) % 12 + 1
        try:
            found = date(year, month, day_number)
        except ValueError:
            cursor = date(year + (month // 12), (month % 12) + 1, 1)
            continue
        if found >= date.fromisoformat(_hospital_today()):
            return found.isoformat()
        cursor = date(year + (month // 12), (month % 12) + 1, 1)
    return None


def _rest_of_week(today: date) -> Tuple[str, str]:
    """Tomorrow through Sunday. Next week if Sunday is already past."""
    tomorrow = today + timedelta(days=1)
    sunday = today + timedelta(days=6 - today.weekday())
    if tomorrow > sunday:
        sunday = tomorrow + timedelta(days=6)
    return tomorrow.isoformat(), sunday.isoformat()


def _local_intent(text: str) -> Optional[Dict[str, Any]]:
    """Handle the usual hospital sentences without waiting on the model."""
    lowered = (text or "").lower()
    today = date.fromisoformat(_hospital_today())
    tomorrow = (today + timedelta(days=1)).isoformat()
    week_end = (today + timedelta(days=6)).isoformat()
    weekdays = ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")
    if any(day in lowered for day in weekdays):
        return None

    if any(phrase in lowered for phrase in ("who is on my staff", "my staff", "list my staff", "who works here")):
        return {"action": "list_staff", "from": None, "to": None}
    if any(phrase in lowered for phrase in ("who is working", "who is scheduled", "already scheduled", "who's working")):
        named = _named_day(text)
        if named:
            day = named
        elif "tomorrow" in lowered:
            day = tomorrow
        elif "today" in lowered:
            day = today.isoformat()
        else:
            day = None
        if day:
            return {"action": "show_schedule", "from": day, "to": day}
        return {"action": "show_schedule", "from": today.isoformat(), "to": week_end}
    if "how busy" in lowered or "coverage" in lowered:
        return {"action": "show_coverage", "from": today.isoformat(), "to": week_end}
    if _wants_shift_suggestions(lowered):
        dates = _DATE_RE.findall(text or "")
        if len(dates) >= 2:
            return {"action": "suggest_shifts", "from": dates[0], "to": dates[1]}
        if len(dates) == 1:
            return {"action": "suggest_shifts", "from": dates[0], "to": dates[0]}
        named = _named_day(text)
        if named:
            return {"action": "suggest_shifts", "from": named, "to": named}
        if "tomorrow" in lowered or "next day" in lowered:
            return {"action": "suggest_shifts", "from": tomorrow, "to": tomorrow}
        if "today" in lowered:
            return {"action": "suggest_shifts", "from": today.isoformat(), "to": today.isoformat()}
        start, end = _rest_of_week(today)
        return {"action": "suggest_shifts", "from": start, "to": end}
    return None


def _speak_dates(text: str) -> str:
    def spoken(match: re.Match[str]) -> str:
        found = date.fromisoformat(match.group(0))
        return f"{found.day} {found.strftime('%B')}"

    return _DATE_RE.sub(spoken, text)


def _briefing(payload: Dict[str, Any], proposals: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    openings = payload.get("openings") or []
    if not openings:
        return None
    days: List[Dict[str, Any]] = []
    for item in openings:
        day = next((row for row in days if row["date"] == item.get("date")), None)
        if day is None:
            day = {"date": item.get("date"), "slots": []}
            days.append(day)
        day["slots"].append(
            {
                "name": item.get("slot"),
                "count": item.get("count") or 0,
                "vaccine": item.get("vaccine") or "",
                "booths": list(item.get("booths") or []),
            }
        )
    return {
        "days": days,
        "shiftCount": len(proposals),
    }


def _plain_reply(action: str, payload: Dict[str, Any], proposals: List[Dict[str, Any]]) -> str:
    if action == "suggest_shifts":
        if _briefing(payload, proposals):
            count = len(proposals)
            if count:
                return f"{count} suggested shifts are ready. Press Approve all, or Approve or Decline on each one."
        findings = [str(item).strip() for item in (payload.get("findings") or []) if str(item).strip()]
        return "\n".join(findings) or "There are no appointments for that day, so no booths need to be opened."

    if action == "list_staff":
        people = payload.get("staff") or []
        if not people:
            return "No doctors or nurses are on your staff."
        lines = []
        for person in people:
            role = str(person.get("staffRole") or "").upper()
            title = "doctor" if role == "DOCTOR" else "nurse" if role == "NURSE" else "staff member"
            lines.append(f"- {person.get('staffName') or 'A staff member'} is a {title}.")
        return "\n".join(lines)

    if action == "show_schedule":
        shifts = payload.get("shifts") or []
        if not shifts:
            return "Nobody is scheduled for that day."
        lines = []
        for shift in shifts[:12]:
            name = shift.get("staffName") or shift.get("StaffName") or "Someone"
            day = str(shift.get("shiftDate") or shift.get("ShiftDate") or "")[:10]
            start = str(shift.get("startTime") or shift.get("StartTime") or "")[:5]
            lines.append(f"- {name} is scheduled on {day} at {start}.")
        return "\n".join(lines)

    days = (payload.get("coverage") or {}).get("days") or (payload.get("coverage") or {}).get("Days") or []
    if not isinstance(days, list) or not days:
        return "I could not read how busy the week is."
    words = {"Low": "needs more people", "Partial": "is partly covered", "Good": "is covered"}
    lines = []
    for day in days:
        level = str(day.get("coverageLevel") or day.get("CoverageLevel") or "")
        date_text = str(day.get("date") or day.get("Date") or "")[:10]
        lines.append(f"- {date_text} {words.get(level, 'needs a look')}.")
    return "\n".join(lines)


def _intent_dates(intent: Dict[str, Any]) -> Tuple[str, str]:
    today = date.fromisoformat(_hospital_today())
    tomorrow = (today + timedelta(days=1)).isoformat()
    week_end = (today + timedelta(days=6)).isoformat()
    action = intent.get("action")
    default_from = tomorrow if action == "suggest_shifts" else today.isoformat()
    default_to = tomorrow if action == "suggest_shifts" else week_end

    def pick(value: Any, fallback: str) -> str:
        found = _DATE_RE.findall(str(value or ""))
        return found[0] if found else fallback

    start = pick(intent.get("from"), default_from)
    end = pick(intent.get("to"), default_to)
    if start > end:
        start, end = end, start
    return start, end


class StaffSchedulingAgent:
    """Dedicated Staff Scheduling Agent for hospital roster / coverage workflows."""

    def __init__(self):
        self.name = "StaffSchedulingAgent"
        self.description = (
            "Specialized agent for hospital staff coverage analysis, shift proposals, "
            "and approved shift creation."
        )
        self.base_url = settings.runpod_base_url.rstrip("/")
        self.model = settings.model_name
        self.api_key = settings.runpod_api_key
        self._native_tools_supported: Optional[bool] = None

    async def _call_llm(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.2,
            # Keep replies short; Qwen3 thinking is disabled below for speed.
            "max_tokens": 180,
            "chat_template_kwargs": {"enable_thinking": False},
        }
        if tools:
            payload["tools"] = tools
            # Prefer parallel tool use in one turn when the model supports it.
            payload["tool_choice"] = "auto"

        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            if resp.status_code >= 400:
                detail = resp.text
                logger.error("LLM HTTP %s: %s", resp.status_code, detail[:500])
                raise httpx.HTTPStatusError(
                    f"{resp.status_code} {resp.reason_phrase} for url '{resp.url}': {detail}",
                    request=resp.request,
                    response=resp,
                )
            data = resp.json()
            return data["choices"][0]["message"]

    @staticmethod
    def _is_tool_choice_unsupported(error: Exception) -> bool:
        text = str(error).lower()
        return (
            "enable-auto-tool-choice" in text
            or "tool-call-parser" in text
            or "tool choice" in text
        )

    @staticmethod
    def _extract_dates(text: str) -> List[str]:
        return _DATE_RE.findall(text or "")

    @staticmethod
    def _last_user_text(messages: List[Dict[str, Any]]) -> str:
        for m in reversed(messages):
            if m.get("role") == "user":
                return str(m.get("content") or "")
        return ""

    async def _respond_from_intent(
        self,
        messages: List[Dict[str, Any]],
        token: Optional[str],
    ) -> Optional[Dict[str, Any]]:
        """
        Read a normal hospital sentence and do the matching roster action.
        Returns None when the model does not give a usable decision, so older routing can run.
        """
        user_text = self._last_user_text(messages).strip()
        if not user_text or not token:
            return None

        intent = _local_intent(user_text)
        if intent is None:
            intent = await self._read_model_intent(user_text)
        if intent is None:
            return None

        action = intent["action"]
        if _wants_shift_suggestions(user_text) and action != "list_staff":
            action = "suggest_shifts"
            intent["action"] = action
        named_day = _named_day(user_text)
        if named_day and action == "suggest_shifts":
            intent["from"] = named_day
            intent["to"] = named_day

        proposals: List[Dict[str, Any]] = []
        briefing = None
        if action == "answer":
            try:
                reply = await self._call_llm(
                    [
                        {"role": "system", "content": STAFF_SCHEDULING_SYSTEM_PROMPT},
                        *messages,
                    ],
                    tools=None,
                )
                content = reply.get("content") or reply.get("reasoning") or "How else can I help with the roster?"
            except Exception as e:
                logger.error("Plain reply failed: %s", e)
                return None
        else:
            start, end = _intent_dates(intent)
            if action == "suggest_shifts":
                payload = await tool_review_roster(from_date=start, to_date=end, token=token)
                if payload.get("success"):
                    proposals = list(payload.get("proposals") or [])
            elif action == "show_schedule":
                payload = await tool_get_hospital_shifts(start, end, token=token)
            elif action == "show_coverage":
                payload = await tool_get_coverage(start, end, token=token)
            else:
                payload = await tool_get_active_staff(token=token)
            if not isinstance(payload, dict) or not payload.get("success"):
                content = "I could not finish that. Please try again."
            else:
                briefing = _briefing(payload, proposals) if action == "suggest_shifts" else None
                content = _speak_dates(_plain_reply(action, payload, proposals))

        if isinstance(content, str) and "</think>" in content:
            content = content.split("</think>", 1)[-1].strip()

        return {
            "agent": self.name,
            "role": "assistant",
            "content": content,
            "briefing": briefing,
            "proposals": proposals or None,
            "suggestedFollowUps": _build_follow_ups(messages, proposals),
        }

    async def _read_model_intent(self, user_text: str) -> Optional[Dict[str, Any]]:
        today = date.fromisoformat(_hospital_today())
        tomorrow = today + timedelta(days=1)
        week_end = today + timedelta(days=6)
        try:
            decision = await self._call_llm(
                [
                    {
                        "role": "system",
                        "content": (
                            f"Today is {today.isoformat()} ({today.strftime('%A')}). "
                            f"Tomorrow is {tomorrow.isoformat()}. "
                            f"This week runs through {week_end.isoformat()}.\n"
                            "Decide what the hospital user wants. Reply with JSON only:\n"
                            '{"action":"suggest_shifts"|"show_schedule"|"show_coverage"|"list_staff"|"answer",'
                            '"from":"YYYY-MM-DD or null","to":"YYYY-MM-DD or null"}\n'
                            "suggest_shifts: they want shifts made, people put on, booths staffed, gaps filled, or the roster fixed. "
                            "'staff 26th' means suggest shifts for that day, not a question about who is already working.\n"
                            "show_schedule: they want who is already working.\n"
                            "show_coverage: they want which days are busy or thin, and they are not asking to add shifts.\n"
                            "list_staff: they want the doctors and nurses at this hospital.\n"
                            "answer: anything else.\n"
                            "If they want shifts and name no day, from and to are tomorrow.\n"
                            "A named weekday means the next date with that weekday, including today.\n"
                            "A day like 26th means that day of this month if it is still ahead, otherwise next month."
                        ),
                    },
                    {"role": "user", "content": user_text},
                ],
                tools=None,
            )
        except Exception as e:
            logger.warning("Intent read failed: %s", e)
            return None

        intent_text = decision.get("content") or decision.get("reasoning") or ""
        intent = _parse_intent(intent_text if isinstance(intent_text, str) else "")
        if intent is None:
            logger.warning("Intent was not usable: %s", str(intent_text)[:300])
        return intent

    async def _run_without_native_tools(
        self,
        messages: List[Dict[str, Any]],
        token: Optional[str],
        patient_info: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Fallback when vLLM was started without --enable-auto-tool-choice.
        Routes common intents in Python, then asks the LLM to summarize only.
        """
        raw_user = self._last_user_text(messages)
        user_text = raw_user.lower()
        roster_range = _resolve_roster_range(raw_user)
        from_date, to_date = roster_range if roster_range else (None, None)

        proposals: List[Dict[str, Any]] = []
        tool_results: List[Dict[str, Any]] = []

        wants_suggest = _wants_shift_suggestions(user_text)
        wants_coverage = "coverage" in user_text or "gap" in user_text
        wants_staff = any(
            k in user_text for k in ("staff", "doctor", "nurse", "who is", "roster member")
        )
        wants_shifts = "shift" in user_text and not wants_suggest

        if wants_staff or (not wants_suggest and not wants_coverage and not from_date):
            staff = await tool_get_active_staff(token=token)
            tool_results.append({"tool": "get_active_staff", "result": staff})

        if from_date and to_date and (wants_coverage or wants_suggest):
            coverage = await tool_get_coverage(from_date, to_date, token=token)
            tool_results.append({"tool": "get_coverage", "result": coverage})

        if from_date and to_date and wants_shifts:
            shifts = await tool_get_hospital_shifts(from_date, to_date, token=token)
            tool_results.append({"tool": "get_hospital_shifts", "result": shifts})

        if from_date and to_date and wants_suggest:
            reviewed = await tool_review_roster(
                from_date=from_date,
                to_date=to_date,
                token=token,
            )
            tool_results.append({"tool": "review_roster", "result": reviewed})
            if reviewed.get("success"):
                for p in reviewed.get("proposals") or []:
                    proposals.append(p)

        summary_prompt = [
            {
                "role": "system",
                "content": (
                    STAFF_SCHEDULING_SYSTEM_PROMPT
                    + "\n\nNative tool calling is unavailable on this LLM server. "
                    "Tool results are provided below. Summarize them for the hospital user. "
                    "Do not invent staff or dates. Do not list every staff name. "
                    "Say which vaccines were booked and which booth each vaccine opened. "
                    "Only when suggested shifts exist, say how many and to press Approve or Decline. "
                    "When there are none, do not mention Approve or Decline. Never say UI."
                ),
            }
        ]
        if patient_info:
            summary_prompt.append(
                {
                    "role": "system",
                    "content": (
                        "Active Hospital Context: "
                        f"Name={patient_info.get('name') or patient_info.get('hospitalName')}, "
                        f"Email={patient_info.get('email')}"
                    ),
                }
            )
        summary_prompt.extend(messages)
        summary_prompt.append(
            {
                "role": "user",
                "content": (
                    "Tool results (JSON):\n"
                    f"{json.dumps(tool_results, default=str)[:12000]}\n\n"
                    "Write a concise reply for the hospital user."
                ),
            }
        )

        try:
            msg = await self._call_llm(summary_prompt, tools=None)
            content = (
                msg.get("content")
                or msg.get("reasoning")
                or "I gathered the scheduling data. Please review any proposals below."
            )
            # Strip Qwen3 thinking tags if present
            if isinstance(content, str) and "</think>" in content:
                content = content.split("</think>", 1)[-1].strip()
        except Exception as e:
            logger.error("Fallback LLM summarize failed: %s", e)
            if proposals:
                lines = [
                    f"- {p.get('staffName')} on {p.get('shiftDate')} "
                    f"{p.get('startTime')}–{p.get('endTime')}"
                    for p in proposals
                ]
                content = (
                    "Suggested shifts. Press Approve or Decline on each one:\n"
                    + "\n".join(lines)
                )
            elif tool_results:
                content = (
                    "I pulled staff/coverage data, but the model could not summarize it. "
                    "Try again or check coverage in the Shifts panel."
                )
            else:
                content = (
                    f"LLM summarize failed ({e}). "
                    "If Suggest Week, include dates like YYYY-MM-DD to YYYY-MM-DD."
                )

        return {
            "agent": self.name,
            "role": "assistant",
            "content": content,
            "proposals": proposals or None,
            "suggestedFollowUps": _build_follow_ups(messages, proposals),
        }

    async def execute_tool(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
        token: Optional[str],
    ) -> Any:
        logger.info(f"[{self.name}] Tool Call: {tool_name} with args: {arguments}")

        if tool_name == "get_active_staff":
            return await tool_get_active_staff(
                token=token,
                role=arguments.get("role"),
            )
        if tool_name == "get_coverage":
            return await tool_get_coverage(
                from_date=arguments.get("from_date"),
                to_date=arguments.get("to_date"),
                token=token,
            )
        if tool_name == "get_hospital_shifts":
            return await tool_get_hospital_shifts(
                from_date=arguments.get("from_date"),
                to_date=arguments.get("to_date"),
                token=token,
            )
        if tool_name == "review_roster":
            return await tool_review_roster(
                from_date=arguments.get("from_date"),
                to_date=arguments.get("to_date"),
                token=token,
            )
        if tool_name == "suggest_week_coverage":
            return await tool_suggest_week_coverage(
                from_date=arguments.get("from_date"),
                to_date=arguments.get("to_date"),
                default_start=arguments.get("default_start", "08:00"),
                default_end=arguments.get("default_end", "16:00"),
                token=token,
            )
        if tool_name == "propose_shift_for_approval":
            return await tool_propose_shift_for_approval(
                affiliation_id=arguments.get("affiliation_id"),
                staff_name=arguments.get("staff_name"),
                shift_date=arguments.get("shift_date"),
                start_time=arguments.get("start_time"),
                end_time=arguments.get("end_time"),
                booth_or_station=arguments.get("booth_or_station"),
                booth_id=arguments.get("booth_id"),
                notes=arguments.get("notes"),
                reason=arguments.get("reason"),
            )
        if tool_name in ("create_shift", "delete_shift"):
            logger.warning(f"[{self.name}] Blocked write tool attempt: {tool_name}")
            return {
                "success": False,
                "error": (
                    "Not permitted. Only suggest the shift. The hospital presses Approve or Decline."
                ),
            }
        return {"error": f"Unknown tool: {tool_name}"}

    async def run(
        self,
        messages: List[Dict[str, Any]],
        token: Optional[str] = None,
        patient_info: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Conversational tool-calling loop for hospital staff scheduling.
        Falls back when the RunPod/vLLM pod was started without tool-calling flags.
        """
        bind_hospital(patient_info, token)
        if note_decline_message(self._last_user_text(messages)):
            return {
                "agent": self.name,
                "role": "assistant",
                "content": "Noted.",
                "proposals": None,
                "suggestedFollowUps": [],
            }

        handled = await self._respond_from_intent(messages, token)
        if handled is not None:
            return handled

        if self._native_tools_supported is False:
            return await self._run_without_native_tools(messages, token, patient_info)

        conversation = [{"role": "system", "content": STAFF_SCHEDULING_SYSTEM_PROMPT}]
        if patient_info:
            conversation.append(
                {
                    "role": "system",
                    "content": (
                        "Active Hospital Context: "
                        f"Name={patient_info.get('name') or patient_info.get('hospitalName')}, "
                        f"Email={patient_info.get('email')}"
                    ),
                }
            )
        conversation.extend(messages)

        # Fast path: plain requests like "create shifts for tomorrow".
        raw_user = self._last_user_text(messages)
        user_text = raw_user.lower()
        roster_range = _resolve_roster_range(raw_user)
        if _wants_shift_suggestions(user_text) and roster_range and token:
            from_date, to_date = roster_range
            reviewed = await tool_review_roster(
                from_date=from_date,
                to_date=to_date,
                token=token,
            )
            proposals: List[Dict[str, Any]] = []
            if reviewed.get("success"):
                for p in reviewed.get("proposals") or []:
                    proposals.append(p)

            summary_messages = [
                {
                    "role": "system",
                    "content": (
                        "You are the Vaxora Staff Scheduling Agent. "
                        "Say which vaccines were booked and which booth each vaccine opened. "
                        "Do NOT list every staff name. "
                        "Do NOT print unicode escapes. "
                        "Only when suggested shifts exist, tell them to press Approve or Decline. "
                        "When there are none, do not mention Approve or Decline. Never say UI. "
                        "Never mention tool names, function names, or status codes. "
                        "Do not invent staff. Do not say shifts were saved."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"User asked: {self._last_user_text(messages)}\n\n"
                        f"Tool result:\n{json.dumps(reviewed, default=str)[:8000]}"
                    ),
                },
            ]
            try:
                msg = await self._call_llm(summary_messages, tools=None)
                content = (
                    msg.get("content")
                    or msg.get("reasoning")
                    or reviewed.get("message")
                    or "There are no appointments for that day, so no booths need to be opened."
                )
                if isinstance(content, str) and "</think>" in content:
                    content = content.split("</think>", 1)[-1].strip()
            except Exception as e:
                logger.error("Fast-path summarize failed: %s", e)
                content = reviewed.get("message") or (
                    f"Found {len(proposals)} suggested shift(s). Press Approve or Decline on each one."
                )

            return {
                "agent": self.name,
                "role": "assistant",
                "content": content,
                "proposals": proposals or None,
                "suggestedFollowUps": _build_follow_ups(messages, proposals),
            }

        max_iterations = 6
        iteration = 0
        proposals = []
        msg: Dict[str, Any] = {}

        while iteration < max_iterations:
            iteration += 1
            try:
                msg = await self._call_llm(conversation, tools=STAFF_TOOLS_SCHEMA)
                self._native_tools_supported = True
            except Exception as e:
                if self._is_tool_choice_unsupported(e):
                    logger.warning(
                        "vLLM native tools unavailable (%s); using Python tool fallback",
                        e,
                    )
                    self._native_tools_supported = False
                    return await self._run_without_native_tools(
                        messages, token, patient_info
                    )
                logger.error(f"LLM call failed: {e}")
                return {
                    "agent": self.name,
                    "role": "assistant",
                    "content": (
                        f"I encountered an issue connecting to the AI model service "
                        f"({self.model}): {str(e)}. Please verify your LLM endpoint is running."
                    ),
                    "proposals": proposals or None,
                    "suggestedFollowUps": _build_follow_ups(messages, proposals),
                }

            tool_calls = msg.get("tool_calls") or []
            if not tool_calls:
                final_content = (
                    msg.get("content")
                    or msg.get("reasoning")
                    or "How else can I help with staff coverage or shifts?"
                )
                if isinstance(final_content, str) and "</think>" in final_content:
                    final_content = final_content.split("</think>", 1)[-1].strip()
                return {
                    "agent": self.name,
                    "role": "assistant",
                    "content": final_content,
                    "proposals": proposals or None,
                    "suggestedFollowUps": _build_follow_ups(messages, proposals),
                }

            conversation.append(
                {
                    "role": "assistant",
                    "content": msg.get("content") or "",
                    "tool_calls": tool_calls,
                }
            )

            for tc in tool_calls:
                fn = tc.get("function", {})
                fn_name = fn.get("name")
                fn_args_raw = fn.get("arguments", {})
                if isinstance(fn_args_raw, str):
                    try:
                        fn_args = json.loads(fn_args_raw)
                    except Exception:
                        fn_args = {}
                else:
                    fn_args = fn_args_raw or {}

                tool_output = await self.execute_tool(fn_name, fn_args, token)

                if fn_name == "propose_shift_for_approval" and tool_output.get("success"):
                    prop = tool_output.get("proposal")
                    if prop:
                        proposals.append(prop)
                elif fn_name in ("suggest_week_coverage", "review_roster") and tool_output.get("success"):
                    for p in tool_output.get("proposals") or []:
                        proposals.append(p)

                conversation.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.get("id"),
                        "content": json.dumps(tool_output),
                    }
                )

        final_content = (
            msg.get("content")
            or msg.get("reasoning")
            or "I have processed your staff scheduling request."
        )
        return {
            "agent": self.name,
            "role": "assistant",
            "content": final_content,
            "proposals": proposals or None,
            "suggestedFollowUps": _build_follow_ups(messages, proposals),
        }


staff_scheduling_agent = StaffSchedulingAgent()
