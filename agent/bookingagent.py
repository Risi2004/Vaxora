import json
import logging
import httpx
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI

try:
    from .config import settings
    from .tools import (
        TOOLS_SCHEMA,
        _clean_date_string,
        _clean_slot_string,
        tool_get_available_vaccines_and_hospitals,
        tool_get_available_dates,
        tool_get_available_slots,
        tool_book_appointment,
        tool_get_my_appointments,
        tool_cancel_appointment
    )
except ImportError:
    from config import settings
    from tools import (
        TOOLS_SCHEMA,
        _clean_date_string,
        _clean_slot_string,
        tool_get_available_vaccines_and_hospitals,
        tool_get_available_dates,
        tool_get_available_slots,
        tool_book_appointment,
        tool_get_my_appointments,
        tool_cancel_appointment
    )

logger = logging.getLogger("vaxora-booking-agent")

BOOKING_AGENT_SYSTEM_PROMPT = """You are the official Vaxora Booking Agent, a specialized scheduling agent designed to help patients discover vaccines, check hospital schedules, and book vaccination appointments smoothly.

Instructions & Workflow:
1. Always be proactive, concise, and helpful.
2. Step-by-Step Workflow:
   a. When the user asks about vaccines: Call `get_available_vaccines_and_hospitals` and list the vaccines and hospitals with prices.
   b. When a vaccine or hospital is selected/mentioned (or user says yes to dates): IMMEDIATELY invoke `get_available_dates` to fetch upcoming session dates. List the next 3 to 5 available dates and ask which date they prefer. Never ask "Would you like to see dates?" — directly retrieve and show them!
   c. When a date is selected/mentioned: IMMEDIATELY call `get_available_slots` to fetch open 20-minute time slots for that date and list the available slots.
   d. MANDATORY APPROVAL STEP:
      When vaccine, hospital, date, and slot are chosen, you MUST invoke `propose_booking_for_approval` with hospital_name, vaccine_name, appointment_date, time_slot, price, and is_free.
      This displays a review card to the patient so they can click "Approve & Book".
   e. Only when the patient confirms or approves (e.g. "I approve", "Confirm booking", "Yes proceed") should you call `book_appointment`.
3. If the vaccine is Free, inform the user that their slot is reserved and confirmed immediately.
4. If the vaccine is Paid, inform the user that the PayHere payment popup will open to finalize payment.
5. You can also look up bookings via `get_my_appointments` or cancel bookings via `cancel_appointment`.
6. Formatting: Keep your text clean, structured, and easy to read. Avoid messy repeated asterisks. Present options with clean bullet points.
"""

class BookingAgent:
    """
    Google ADK-compliant Dedicated Booking Agent for Vaxora.
    """
    def __init__(self):
        self.name = "BookingAgent"
        self.description = "Specialized agent for searching vaccine inventory, checking hospital clinic schedules, and booking vaccination appointments."
        self.base_url = settings.runpod_base_url.rstrip("/")
        self.model = settings.model_name
        self.api_key = settings.runpod_api_key

    async def _call_llm(self, messages: List[Dict[str, Any]], tools: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """Calls the OpenAI-compatible endpoint with full error resilience."""
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.2
        }
        if tools:
            payload["tools"] = tools

        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]

    async def execute_tool(self, tool_name: str, arguments: Dict[str, Any], token: Optional[str]) -> Any:
        logger.info(f"[{self.name}] Tool Call: {tool_name} with args: {arguments}")
        
        if tool_name == "get_available_vaccines_and_hospitals":
            return await tool_get_available_vaccines_and_hospitals(token=token)
        elif tool_name == "get_available_dates":
            return await tool_get_available_dates(
                hospital_user_id=arguments.get("hospital_user_id"),
                vaccine_name=arguments.get("vaccine_name"),
                token=token
            )
        elif tool_name == "get_available_slots":
            return await tool_get_available_slots(
                hospital_user_id=arguments.get("hospital_user_id"),
                vaccine_name=arguments.get("vaccine_name"),
                date=arguments.get("date"),
                token=token
            )
        elif tool_name == "propose_booking_for_approval":
            prop = dict(arguments)
            if "appointment_date" in prop:
                prop["appointment_date"] = _clean_date_string(prop["appointment_date"])
            if "time_slot" in prop:
                prop["time_slot"] = _clean_slot_string(prop["time_slot"])
            return {
                "success": True,
                "status": "proposal_pending_user_approval",
                "proposal": prop
            }
        elif tool_name == "book_appointment":
            return await tool_book_appointment(
                hospital_user_id=arguments.get("hospital_user_id"),
                vaccine_name=arguments.get("vaccine_name"),
                appointment_date=arguments.get("appointment_date"),
                time_slot=arguments.get("time_slot"),
                notes=arguments.get("notes"),
                payment_method=arguments.get("payment_method", "Free"),
                vaccine_id=arguments.get("vaccine_id"),
                vaccine_schedule_id=arguments.get("vaccine_schedule_id"),
                token=token
            )
        elif tool_name == "get_my_appointments":
            return await tool_get_my_appointments(token=token)
        elif tool_name == "cancel_appointment":
            return await tool_cancel_appointment(
                appointment_id=arguments.get("appointment_id"),
                token=token
            )
        else:
            return {"error": f"Unknown tool: {tool_name}"}

    async def run(
        self,
        messages: List[Dict[str, Any]],
        token: Optional[str] = None,
        patient_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Runs the conversational tool-calling agent loop.
        """
        conversation = [{"role": "system", "content": BOOKING_AGENT_SYSTEM_PROMPT}]
        if patient_info:
            conversation.append({
                "role": "system",
                "content": f"Active Patient Context: Name={patient_info.get('name')}, Email={patient_info.get('email')}, NIC={patient_info.get('nic')}"
            })
        conversation.extend(messages)

        max_iterations = 6
        iteration = 0
        proposal_data = None
        booking_result = None

        while iteration < max_iterations:
            iteration += 1
            
            try:
                msg = await self._call_llm(conversation, tools=TOOLS_SCHEMA)
            except Exception as e:
                logger.error(f"LLM call failed: {e}")
                return {
                    "agent": self.name,
                    "role": "assistant",
                    "content": f"I encountered an issue connecting to the AI model service ({self.model}): {str(e)}. Please verify your RunPod instance is running.",
                    "proposal": None,
                    "booking": None
                }

            tool_calls = msg.get("tool_calls") or []

            # Check if tools are requested
            if tool_calls:
                conversation.append({
                    "role": "assistant",
                    "content": msg.get("content") or "",
                    "tool_calls": tool_calls
                })

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

                    if fn_name == "propose_booking_for_approval":
                        proposal_data = fn_args

                    if fn_name == "book_appointment" and tool_output.get("success"):
                        booking_result = tool_output

                    conversation.append({
                        "role": "tool",
                        "tool_call_id": tc.get("id"),
                        "content": json.dumps(tool_output)
                    })
            else:
                final_content = msg.get("content") or msg.get("reasoning") or "How else can I help you with your booking?"
                return {
                    "agent": self.name,
                    "role": "assistant",
                    "content": final_content,
                    "proposal": proposal_data,
                    "booking": booking_result
                }

        final_content = msg.get("content") or msg.get("reasoning") or "I have processed your request."
        return {
            "agent": self.name,
            "role": "assistant",
            "content": final_content,
            "proposal": proposal_data,
            "booking": booking_result
        }

booking_agent = BookingAgent()
