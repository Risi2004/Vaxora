import json
import logging
import httpx
from typing import List, Dict, Any, Optional

try:
    from .config import settings
    from .staff_tools import (
        STAFF_TOOLS_SCHEMA,
        tool_get_active_staff,
        tool_get_coverage,
        tool_get_hospital_shifts,
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
        tool_suggest_week_coverage,
        tool_propose_shift_for_approval,
    )

logger = logging.getLogger("vaxora-staff-scheduling-agent")

STAFF_SCHEDULING_SYSTEM_PROMPT = """You are the official Vaxora Staff Scheduling Agent for hospital users.
You help hospitals review staff coverage and propose shifts.

You have read-only and proposal tools only. You cannot write to the roster:
every proposal is saved by the hospital user clicking Approve in the Vaxora UI.

Instructions & Workflow:
1. Be concise and structured. Use clean bullet points.
2. Typical flow:
   a. If asked who is on staff / available: call `get_active_staff`.
   b. If asked about coverage or gaps for a week: call `get_coverage` (and optionally `get_hospital_shifts`).
   c. If asked to fill gaps / suggest a roster for a week: call `suggest_week_coverage`.
   d. For a single specific shift, call `propose_shift_for_approval`.
3. After proposing, summarize each proposal (staff, date, time, reason) and tell the
   hospital to review and approve it. Never claim a shift has been created.
4. Never invent affiliation IDs or dates — only use values returned by tools.
5. If a tool returns an error, explain it briefly and suggest the next step
   (e.g. invite staff in Directory, pick a future date).
6. Shifts in the past cannot be scheduled; suggest the next available day instead.
"""


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

    async def _call_llm(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.2,
        }
        if tools:
            payload["tools"] = tools

        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]

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
                notes=arguments.get("notes"),
                reason=arguments.get("reason"),
            )
        # Roster writes are deliberately not reachable from the model. If it hallucinates
        # a write tool, refuse and steer it back to the approval flow.
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
        patient_info may carry optional hospital context from the client.
        """
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

        max_iterations = 6
        iteration = 0
        proposals: List[Dict[str, Any]] = []
        msg: Dict[str, Any] = {}

        while iteration < max_iterations:
            iteration += 1
            try:
                msg = await self._call_llm(conversation, tools=STAFF_TOOLS_SCHEMA)
            except Exception as e:
                logger.error(f"LLM call failed: {e}")
                return {
                    "agent": self.name,
                    "role": "assistant",
                    "content": (
                        f"I encountered an issue connecting to the AI model service "
                        f"({self.model}): {str(e)}. Please verify your LLM endpoint is running."
                    ),
                    "proposals": proposals or None,
                }

            tool_calls = msg.get("tool_calls") or []
            if not tool_calls:
                final_content = (
                    msg.get("content")
                    or msg.get("reasoning")
                    or "How else can I help with staff coverage or shifts?"
                )
                return {
                    "agent": self.name,
                    "role": "assistant",
                    "content": final_content,
                    "proposals": proposals or None,
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
                elif fn_name == "suggest_week_coverage" and tool_output.get("success"):
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
        }


staff_scheduling_agent = StaffSchedulingAgent()
