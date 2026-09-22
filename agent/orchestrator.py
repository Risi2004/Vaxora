import logging
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI

try:
    from .config import settings
    from .bookingagent import booking_agent
except ImportError:
    from config import settings
    from bookingagent import booking_agent

try:
    from .inventory.restock_agent import restock_agent
    from .inventory.expiry_agent import expiry_agent
except ImportError:
    from inventory.restock_agent import restock_agent
    from inventory.expiry_agent import expiry_agent

logger = logging.getLogger("vaxora-orchestrator")

ORCHESTRATOR_SYSTEM_PROMPT = """You are the Vaxora Master Multi-Agent Orchestrator.
Your job is to analyze the user's latest message and route the conversation to the most appropriate specialized agent.

Available Specialized Agents:
1. `BookingAgent` - Handles vaccine discovery, checking hospital stock, finding schedule dates, 20-minute slots, reserving appointments, checking booked appointments, and cancelling appointments.
2. `RestockAgent` - Handles vaccine restock recommendations, low-stock analysis, and purchase order proposals.
3. `ExpiryAgent` - Handles scanning batches for upcoming expiry, wastage risk, and disposal/transfer recommendations.
4. `GeneralAgent` - Handles general greetings, platform inquiries, or non-booking queries.

Respond with ONLY a JSON object indicating the target agent:
{"target_agent": "BookingAgent" | "RestockAgent" | "ExpiryAgent" | "GeneralAgent", "reason": "brief reason"}
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
            timeout=60.0
        )
        self.model = settings.model_name
        self.agents: Dict[str, Any] = {
            "BookingAgent": booking_agent
        }

        # === INVENTORY AGENTS (ADDED) ===
        self.register_agent(restock_agent)
        self.register_agent(expiry_agent)

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

        last_user_message = next((m["content"] for m in messages if m.get("role") == "user"), "")
        last_user_message = last_user_message or ""
        msg_lower = last_user_message.lower()

        # === INVENTORY ROUTING (ADDED) ===
        # Check expiry FIRST (must come before restock to avoid keyword overlap)
        inventory_expiry_keywords = [
            "expire", "expiry", "expiring", "about to expire",
            "expired batch", "wastage", "dispose", "disposal",
            "near expiry", "expiration"
        ]
        if any(kw in msg_lower for kw in inventory_expiry_keywords):
            return "ExpiryAgent"

        inventory_restock_keywords = [
            "restock", "reorder", "replenish", "low stock",
            "purchase order", "restock order", "what should we order",
            "need to order", "stock level"
        ]
        if any(kw in msg_lower for kw in inventory_restock_keywords):
            return "RestockAgent"

        # Fast heuristic checks for common booking keywords
        booking_keywords = [
            "book", "slot", "appointment", "vaccine", "schedule",
            "hospital", "date", "payhere", "cancel",
            "pfizer", "sinopharm", "moderna", "influenza", "approve"
        ]
        if any(kw in msg_lower for kw in booking_keywords):
            return "BookingAgent"

        # Fall back to LLM-based routing
        try:
            res = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": ORCHESTRATOR_SYSTEM_PROMPT},
                    {"role": "user", "content": f"User query: '{last_user_message}'"}
                ],
                temperature=0.0
            )
            content = res.choices[0].message.content or ""
            for agent_name in ("RestockAgent", "ExpiryAgent", "BookingAgent"):
                if agent_name in content:
                    return agent_name
        except Exception as e:
            logger.warning(f"Orchestrator routing fallback to BookingAgent: {e}")

        return "BookingAgent"

    async def process_message(
        self,
        messages: List[Dict[str, Any]],
        token: Optional[str] = None,
        patient_info: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None  # === INVENTORY AGENTS (ADDED) ===
    ) -> Dict[str, Any]:
        """
        Orchestrates request: routes to the target agent and returns the agent's output.
        """
        target_agent_name = await self.route_intent(messages)
        target_agent = self.agents.get(target_agent_name, booking_agent)

        logger.info(f"Orchestrator routed request to: {target_agent.name}")

        # === INVENTORY AGENTS (ADDED): dispatch with correct kwargs ===
        if target_agent.name in ("RestockAgent", "ExpiryAgent"):
            response = await target_agent.run(
                messages,
                token=token,
                user_id=user_id,
                user_info=patient_info,
            )
        else:
            # Teammate's BookingAgent — unchanged signature
            response = await target_agent.run(
                messages,
                token=token,
                patient_info=patient_info,
            )
        return response


orchestrator = MultiAgentOrchestrator()