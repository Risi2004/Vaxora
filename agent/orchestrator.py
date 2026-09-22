import logging
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI

try:
    from .config import settings
    from .bookingagent import booking_agent
    from .staff_scheduling_agent import staff_scheduling_agent
except ImportError:
    from config import settings
    from bookingagent import booking_agent
    from staff_scheduling_agent import staff_scheduling_agent

logger = logging.getLogger("vaxora-orchestrator")

ORCHESTRATOR_SYSTEM_PROMPT = """You are the Vaxora Master Multi-Agent Orchestrator.
Your job is to analyze the user's latest message and route the conversation to the most appropriate specialized agent.

Available Specialized Agents:
1. `BookingAgent` - Handles vaccine discovery, checking hospital stock, finding schedule dates, 20-minute slots, reserving appointments, checking booked appointments, and cancelling appointments.
2. `StaffSchedulingAgent` - Handles hospital staff directory lookups, weekly coverage gaps, proposing shifts for approval, and creating shifts only after hospital approval.
3. `GeneralAgent` - Handles general greetings, platform inquiries, or non-booking queries.

Respond with ONLY a JSON object indicating the target agent:
{"target_agent": "BookingAgent" | "StaffSchedulingAgent" | "GeneralAgent", "reason": "brief reason"}
"""


class MultiAgentOrchestrator:
    """
    Google ADK-compliant Master Orchestrator.
    Manages multi-agent routing, coordination, and execution across specialized agents.
    """

    def __init__(self):
        self.client = AsyncOpenAI(
            base_url=settings.runpod_base_url,
            api_key=settings.runpod_api_key,
            timeout=60.0,
        )
        self.model = settings.model_name
        self.agents: Dict[str, Any] = {
            "BookingAgent": booking_agent,
            "StaffSchedulingAgent": staff_scheduling_agent,
        }

    def register_agent(self, agent_instance: Any):
        """Allows team members to register their specialized agents into the orchestrator."""
        self.agents[agent_instance.name] = agent_instance
        logger.info(f"Registered agent: {agent_instance.name}")

    async def route_intent(self, messages: List[Dict[str, Any]]) -> str:
        """
        Determines which specialized agent should handle the incoming conversation.
        """
        if not messages:
            return "BookingAgent"

        last_user_message = next(
            (m["content"] for m in reversed(messages) if m.get("role") == "user"),
            "",
        )
        lower = last_user_message.lower()

        # Unambiguous hospital-roster vocabulary — a patient would not use these.
        staff_keywords = [
            "shift",
            "roster",
            "coverage",
            "on duty",
            "on-duty",
            "affiliation",
            "booth",
            "scheduling agent",
            "fill gaps",
            "suggest week",
            "suggest shifts",
        ]
        if any(kw in lower for kw in staff_keywords):
            return "StaffSchedulingAgent"

        # Fast heuristic checks for common booking keywords
        booking_keywords = [
            "book",
            "slot",
            "appointment",
            "vaccine",
            "schedule",
            "hospital",
            "date",
            "payhere",
            "cancel",
            "pfizer",
            "sinopharm",
            "moderna",
            "influenza",
            "approve",
        ]
        if any(kw in lower for kw in booking_keywords):
            return "BookingAgent"

        # "doctor"/"nurse"/"staff" appear in patient booking requests too, so they only
        # route to scheduling once the booking vocabulary above has been ruled out.
        if any(kw in lower for kw in ["staff", "doctor", "nurse"]):
            return "StaffSchedulingAgent"

        try:
            res = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": ORCHESTRATOR_SYSTEM_PROMPT},
                    {"role": "user", "content": f"User query: '{last_user_message}'"},
                ],
                temperature=0.0,
            )
            content = res.choices[0].message.content or ""
            if "StaffSchedulingAgent" in content:
                return "StaffSchedulingAgent"
            if "BookingAgent" in content:
                return "BookingAgent"
        except Exception as e:
            logger.warning(f"Orchestrator routing fallback to BookingAgent: {e}")

        return "BookingAgent"

    async def process_message(
        self,
        messages: List[Dict[str, Any]],
        token: Optional[str] = None,
        patient_info: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Orchestrates request: routes to the target agent and returns the agent's output.
        """
        target_agent_name = await self.route_intent(messages)
        target_agent = self.agents.get(target_agent_name, booking_agent)

        logger.info(f"Orchestrator routed request to: {target_agent.name}")
        response = await target_agent.run(
            messages, token=token, patient_info=patient_info
        )
        return response


orchestrator = MultiAgentOrchestrator()
