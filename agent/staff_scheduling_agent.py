import json
import logging
import re
from typing import List, Dict, Any, Optional

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
    )

logger = logging.getLogger("vaxora-staff-scheduling-agent")

STAFF_SCHEDULING_SYSTEM_PROMPT = """You are the official Vaxora Staff Scheduling Agent for hospital users.
You help with coverage and shift proposals. You only propose; the hospital must Approve in the UI.

Tools (prefer few calls — be fast):
- review_roster — PREFERRED for "what is wrong", thin days, workload, or filling gaps.
  One call reads coverage, shifts, booths, and shift counts, explains the gaps, and
  proposes only the missing morning/afternoon roles. Do not save anything.
- get_active_staff — list doctors/nurses (affiliation roster)
- get_coverage — Low / Partial / Good per day
- get_hospital_shifts — existing shifts (who is scheduled on a date)
- suggest_week_coverage — older full-week fill. Use review_roster instead when you can.
- propose_shift_for_approval — ONLY for a single custom shift the user named

Workflow:
1. What is wrong / fill gaps / suggest week: call review_roster(from_date, to_date) once.
   Lead with the findings, then the proposals. Tell the hospital to Approve. Do not claim shifts were saved.
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
"""

_DATE_RE = re.compile(r"\d{4}-\d{2}-\d{2}")


def _build_follow_ups(
    messages: List[Dict[str, Any]],
    proposals: Optional[List[Dict[str, Any]]] = None,
) -> List[str]:
    """Contextual next-step chips for the hospital UI (not model-generated text)."""
    user_text = ""
    for m in reversed(messages or []):
        if m.get("role") == "user":
            user_text = str(m.get("content") or "").lower()
            break

    dates = _DATE_RE.findall(user_text)
    from_date = dates[0] if len(dates) >= 1 else None
    to_date = dates[1] if len(dates) >= 2 else dates[0] if dates else None
    range_label = f" from {from_date} to {to_date}" if from_date and to_date else " this week"

    follow_ups: List[str] = []
    if proposals:
        follow_ups.append("Summarize the proposals I still need to approve")
        follow_ups.append(f"Who still has low coverage{range_label}?")
        follow_ups.append("List my active staff")
    elif "coverage" in user_text or "gap" in user_text or "low" in user_text:
        follow_ups.append(f"Review what is wrong{range_label}")
        follow_ups.append("List my active staff")
        follow_ups.append(f"Show existing shifts{range_label}")
    elif "staff" in user_text or "doctor" in user_text or "nurse" in user_text:
        follow_ups.append(f"Check coverage{range_label}")
        follow_ups.append(f"Review what is wrong{range_label}")
        follow_ups.append("Who is on duty right now?")
    elif "shift" in user_text or "suggest" in user_text or "propose" in user_text:
        follow_ups.append(f"Check coverage{range_label}")
        follow_ups.append("List my active staff")
        follow_ups.append("Who can cover the thinnest day?")
    else:
        follow_ups.extend(
            [
                f"Check coverage{range_label}",
                f"Review what is wrong{range_label}",
                "List my active staff",
                "Who can cover low days this week?",
            ]
        )

    # De-dupe while preserving order
    seen = set()
    unique: List[str] = []
    for item in follow_ups:
        if item not in seen:
            seen.add(item)
            unique.append(item)
    return unique[:4]


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
            "max_tokens": 1024,
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
        user_text = self._last_user_text(messages).lower()
        dates = self._extract_dates(self._last_user_text(messages))
        from_date = dates[0] if len(dates) >= 1 else None
        to_date = dates[1] if len(dates) >= 2 else dates[0] if dates else None

        proposals: List[Dict[str, Any]] = []
        tool_results: List[Dict[str, Any]] = []

        wants_suggest = any(
            k in user_text for k in ("suggest", "propose", "fill gap", "low coverage", "review", "wrong", "workload")
        )
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
                    "Do not invent staff or dates. If proposals exist, list each one and "
                    "tell them to Approve in the UI."
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
                    "Suggested shifts for low-coverage days (approve in the UI):\n"
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
                    "Not permitted. Shifts are only created or removed by the hospital user "
                    "in the Vaxora UI. Use propose_shift_for_approval instead."
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

        # Fast path: Suggest Week / fill gaps → one API roster + one short LLM summary.
        user_text = self._last_user_text(messages).lower()
        dates = self._extract_dates(self._last_user_text(messages))
        wants_review = any(
            k in user_text
            for k in (
                "suggest",
                "propose",
                "fill gap",
                "low coverage",
                "suggest week",
                "what is wrong",
                "what's wrong",
                "review",
                "workload",
                "overloaded",
                "thin",
                "empty",
            )
        )
        if wants_review and len(dates) >= 2 and token:
            from_date, to_date = dates[0], dates[1]
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
                        "Start with what is wrong in the roster, then mention proposals. "
                        "Tell the hospital to Approve each proposal in the UI. "
                        "Do not invent staff. Do not say shifts were saved. "
                        "Keep the entire reply under 140 words."
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
                    or "Review the findings below and Approve any proposals in the UI."
                )
                if isinstance(content, str) and "</think>" in content:
                    content = content.split("</think>", 1)[-1].strip()
            except Exception as e:
                logger.error("Fast-path summarize failed: %s", e)
                content = reviewed.get("message") or (
                    f"Found {len(proposals)} gap proposal(s). Approve them in the UI."
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
