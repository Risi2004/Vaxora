"""
Smart Restock Advisor Agent — Agent 1 of 2.
Multi-step workflow:
  Plan → Fetch data → Analyze → Validate → Propose (pause for approval)
Uses Groq LLM (separate from teammate's RunPod setup).
"""
import json
import logging
import httpx
from typing import List, Dict, Any, Optional

try:
    from ..config import settings
    from .prompts import RESTOCK_AGENT_SYSTEM_PROMPT
    from .planner import extract_plan_from_response, RESTOCK_DEFAULT_PLAN, mark_step
    from .validator import (
        validate_restock_proposal,
        compute_reorder_quantity,
        compute_urgency,
    )
    from .state_store import state_store
    from .inventory_tools import (
        RESTOCK_TOOLS_SCHEMA,
        tool_get_inventory_summary,
        tool_get_stock_levels,
        tool_get_vaccines,
        tool_propose_restock_order,
    )
except ImportError:
    from config import settings
    from inventory.prompts import RESTOCK_AGENT_SYSTEM_PROMPT
    from inventory.planner import extract_plan_from_response, RESTOCK_DEFAULT_PLAN, mark_step
    from inventory.validator import (
        validate_restock_proposal,
        compute_reorder_quantity,
        compute_urgency,
    )
    from inventory.state_store import state_store
    from inventory.inventory_tools import (
        RESTOCK_TOOLS_SCHEMA,
        tool_get_inventory_summary,
        tool_get_stock_levels,
        tool_get_vaccines,
        tool_propose_restock_order,
    )

logger = logging.getLogger("vaxora-restock-agent")


class RestockAdvisorAgent:
    name = "RestockAgent"
    description = (
        "Analyzes hospital vaccine stock levels, thresholds, and usage to recommend "
        "restock quantities. Pauses for admin approval before any order is placed."
    )

    def __init__(self):
        self.base_url = settings.groq_base_url.rstrip("/")
        self.model = settings.groq_model
        self.api_key = settings.groq_api_key

    # ---------------- LLM call ----------------

    async def _call_llm(
        self, messages: List[Dict[str, Any]], tools: Optional[List] = None
    ) -> Dict[str, Any]:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.1,
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions", headers=headers, json=payload
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]

    # ---------------- Tool dispatch ----------------

    async def _execute_tool(
        self, name: str, args: Dict[str, Any], token: Optional[str], workflow_id: str
    ) -> Any:
        logger.info(f"[{self.name}] tool={name} args={args}")

        if name == "get_inventory_summary":
            result = await tool_get_inventory_summary(token=token)
        elif name == "get_stock_levels":
            result = await tool_get_stock_levels(token=token)
        elif name == "get_vaccines":
            result = await tool_get_vaccines(token=token)
        elif name == "propose_restock_order":
            # Run deterministic validation FIRST
            is_valid, errors = validate_restock_proposal(args)
            if not is_valid:
                logger.warning(f"[{self.name}] Proposal rejected by validator: {errors}")
                return {
                    "success": False,
                    "error": "Proposal failed deterministic validation",
                    "details": errors,
                }
            result = await tool_propose_restock_order(
                vaccine_id=args.get("vaccine_id", ""),
                vaccine_name=args.get("vaccine_name", ""),
                current_stock=args.get("current_stock", 0),
                recommended_quantity=args.get("recommended_quantity", 0),
                reason=args.get("reason", ""),
                urgency=args.get("urgency", "low"),
                token=token,
            )
            state_store.set_approval(workflow_id, "pending_admin_approval")
            state_store.set_validation(workflow_id, [{"rule": "restock_proposal", "passed": True}])
        else:
            result = {"error": f"Unknown tool: {name}"}

        state_store.append_tool_call(workflow_id, name, args, result)
        return result

    # ---------------- Main workflow ----------------

    async def run(
        self,
        messages: List[Dict[str, Any]],
        token: Optional[str] = None,
        user_id: Optional[str] = None,
        user_info: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        # 1. Determine user objective
        objective = next(
            (m["content"] for m in reversed(messages) if m.get("role") == "user"),
            "Restock recommendation",
        )

        # 2. Create workflow in state store
        workflow_id = state_store.create(self.name, user_id, objective)

        # 3. Build conversation
        conversation = [{"role": "system", "content": RESTOCK_AGENT_SYSTEM_PROMPT}]
        if user_info:
            conversation.append({
                "role": "system",
                "content": f"Hospital context: {user_info.get('name', 'Unknown')}",
            })
        conversation.extend(messages)

        # 4. Planning step — force a plan first
        plan: List[Dict[str, Any]] = []
        try:
            plan_msg = await self._call_llm(conversation)
            plan = extract_plan_from_response(plan_msg.get("content") or "")
        except Exception as e:
            logger.warning(f"[{self.name}] Planning LLM call failed: {e}")

        if not plan:
            plan = [dict(s) for s in RESTOCK_DEFAULT_PLAN]

        state_store.set_plan(workflow_id, plan)
        state_store.append_step(workflow_id, {"step": "planning", "status": "completed", "plan": plan})

        # 5. Tool-calling loop
        max_iter = 8
        iteration = 0
        proposal = None
        final_content = ""

        while iteration < max_iter:
            iteration += 1
            try:
                msg = await self._call_llm(conversation, tools=RESTOCK_TOOLS_SCHEMA)
            except Exception as e:
                logger.error(f"[{self.name}] LLM error: {e}")
                state_store.set_outcome(workflow_id, "llm_error")
                return {
                    "agent": self.name,
                    "role": "assistant",
                    "content": f"AI service error: {e}",
                    "workflow_id": workflow_id,
                    "plan": plan,
                    "proposal": None,
                }

            tool_calls = msg.get("tool_calls") or []

            if tool_calls:
                conversation.append({
                    "role": "assistant",
                    "content": msg.get("content") or "",
                    "tool_calls": tool_calls,
                })
                for tc in tool_calls:
                    fn = tc.get("function", {})
                    fn_name = fn.get("name")
                    raw_args = fn.get("arguments", {})
                    try:
                        fn_args = json.loads(raw_args) if isinstance(raw_args, str) else (raw_args or {})
                    except Exception:
                        fn_args = {}

                    tool_result = await self._execute_tool(fn_name, fn_args, token, workflow_id)

                    if fn_name == "propose_restock_order" and tool_result.get("success"):
                        proposal = tool_result

                    conversation.append({
                        "role": "tool",
                        "tool_call_id": tc.get("id"),
                        "content": json.dumps(tool_result),
                    })
            else:
                final_content = msg.get("content") or "Analysis complete."
                break

        if not final_content:
            final_content = "Restock analysis complete. Please review the proposal."

        state_store.set_outcome(
            workflow_id,
            "proposal_pending_approval" if proposal else "analysis_completed",
        )

        return {
            "agent": self.name,
            "role": "assistant",
            "content": final_content,
            "workflow_id": workflow_id,
            "plan": plan,
            "proposal": proposal,
        }


restock_agent = RestockAdvisorAgent()