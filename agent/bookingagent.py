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
        tool_autonomous_find_and_propose,
        tool_get_available_vaccines_and_hospitals,
        tool_get_available_dates,
        tool_get_available_slots,
        tool_book_appointment,
        tool_get_my_appointments,
        tool_cancel_appointment,
        tool_propose_cancellation_for_approval
    )
except ImportError:
    from config import settings
    from tools import (
        TOOLS_SCHEMA,
        _clean_date_string,
        _clean_slot_string,
        tool_autonomous_find_and_propose,
        tool_get_available_vaccines_and_hospitals,
        tool_get_available_dates,
        tool_get_available_slots,
        tool_book_appointment,
        tool_get_my_appointments,
        tool_cancel_appointment,
        tool_propose_cancellation_for_approval
    )

logger = logging.getLogger("vaxora-booking-agent")

BOOKING_AGENT_SYSTEM_PROMPT = """You are the official Vaxora Autonomous Booking Agent, an advanced goal-oriented agent designed to help patients discover vaccines, check hospital schedules, manage appointments, and complete vaccination bookings with maximum clarity and security.

MANDATORY HUMAN-IN-THE-LOOP APPROVAL POLICY:
You are STRICTLY FORBIDDEN from executing permanent database changes (`book_appointment` or `cancel_appointment`) without explicit prior user approval.

1. ONE-PROMPT GOAL-BASED DELEGATED BOOKING (PRIMARY AUTONOMOUS MODE):
   Whenever the patient expresses an intent to book, schedule, or find an appointment (e.g.:
   - "Book the earliest AstraZeneca appointment at Royal Hospitals"
   - "I want to get vaccinated with AstraZeneca next week"
   - "Schedule AstraZeneca for Wednesday morning"
   - "Book me AstraZeneca"
   - "Find me a slot for Test Vaccine"
   ):
   DO NOT conduct a slow back-and-forth interrogation!
   IMMEDIATELY invoke `autonomous_find_and_propose` with their preferences:
   - `vaccine_name`: The requested vaccine name (e.g. 'AstraZeneca')
   - `hospital_name_or_id`: Hospital name or GUID if specified (or leave empty for best match)
   - `preferred_date`: Specific date ('YYYY-MM-DD'), day of week ('Wednesday', 'Friday'), 'next week', or 'earliest'
   - `time_of_day`: 'morning' (<12:00 PM), 'afternoon' (>=12:00 PM), 'earliest', or 'any'
   
   This autonomously discovers the hospital, fetches upcoming clinic dates, locates open time slots, verifies schedule pricing, and prepares the review card in ONE single action!
   Then, provide a clear, helpful summary:
   "I have matched and prepared your optimal appointment slot: [Vaccine] at [Hospital] on [Date] at [Time Slot] (Fee: [Price]).
   Please review the proposal card below and tap 'Confirm & Book' to finalize."
   NEVER call `book_appointment` directly until the patient has approved the proposal!

2. BOOKING APPROVAL & PAYMENT:
   - The user must explicitly approve the proposal by tapping "Confirm & Book" (or sending "I approve and confirm booking...").
   - Once approved, IMMEDIATELY call `book_appointment` to register the booking in the national immunization registry.
   - For paid vaccines (e.g. AstraZeneca at LKR 1,000.00), inform the user that their booking is registered and they can complete payment using PayHere via the payment button on the booking confirmation card.
   - For free vaccines (0 LKR), the slot is confirmed immediately.

3. MANDATORY CANCELLATION APPROVAL WORKFLOW:
   - When the patient asks to cancel an appointment (e.g. "cancel my appointment", "cancel AstraZeneca", "cancel my booking for Wednesday", "cancel all"):
   - NEVER call `cancel_appointment` directly without user approval!
   - You MUST FIRST call `propose_cancellation_for_approval` with `appointment_id`, `vaccine_name`, or `appointment_date`.
   - This prepares an Appointment Cancellation Review card for the patient to approve or decline.
   - Tell the patient: "I've located your appointment for [Vaccine] at [Hospital] on [Date] at [Time Slot]. Please review the cancellation card below and confirm if you would like to proceed with cancellation."
   - ONLY call `cancel_appointment` AFTER the user explicitly approves/confirms the cancellation (e.g. tapping "Confirm Cancellation" or sending "I approve and confirm cancellation...").
   - If the user says "Keep appointment" or declines cancellation, acknowledge that the appointment will remain active.
   - If they ask "what appointments do I have?", call `get_my_appointments`.

4. EXPLORATORY CHAT:
   If the user asks general questions (e.g. "What vaccines do you have?"), call `get_available_vaccines_and_hospitals` and list the available vaccines with their prices.

5. FORMATTING:
   Keep responses concise, clear, and structured with clean bullet points. Avoid messy asterisks.
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
        
        if tool_name == "autonomous_find_and_propose":
            return await tool_autonomous_find_and_propose(
                vaccine_name=arguments.get("vaccine_name"),
                hospital_name_or_id=arguments.get("hospital_name_or_id"),
                preferred_date=arguments.get("preferred_date"),
                preferred_slot=arguments.get("preferred_slot"),
                time_of_day=arguments.get("time_of_day"),
                token=token
            )
        elif tool_name == "get_available_vaccines_and_hospitals":
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
        elif tool_name == "propose_cancellation_for_approval":
            return await tool_propose_cancellation_for_approval(
                appointment_id=arguments.get("appointment_id"),
                vaccine_name=arguments.get("vaccine_name"),
                hospital_name=arguments.get("hospital_name"),
                appointment_date=arguments.get("appointment_date"),
                time_slot=arguments.get("time_slot"),
                token=token
            )
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
        cancellation_result = None

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
                    "booking": None,
                    "cancellation": None
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
                    elif fn_name == "autonomous_find_and_propose" and tool_output.get("proposal"):
                        proposal_data = tool_output.get("proposal")
                    elif fn_name == "propose_cancellation_for_approval" and tool_output.get("proposal"):
                        proposal_data = tool_output.get("proposal")

                    if fn_name == "book_appointment" and tool_output.get("success"):
                        booking_result = tool_output
                    elif fn_name == "cancel_appointment" and tool_output.get("success"):
                        cancellation_result = tool_output

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
                    "booking": booking_result,
                    "cancellation": cancellation_result
                }

        final_content = msg.get("content") or msg.get("reasoning") or "I have processed your request."
        return {
            "agent": self.name,
            "role": "assistant",
            "content": final_content,
            "proposal": proposal_data,
            "booking": booking_result,
            "cancellation": cancellation_result
        }

booking_agent = BookingAgent()
