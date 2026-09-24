"""
Expiry Watchdog Agent — Agent 2 of 2.
Multi-step workflow:
  Plan → Scan expiring batches → Investigate → Prioritize → Validate → Draft Memo (pause for approval)
Uses Groq LLM.
"""
import json
import logging
import httpx
from typing import List, Dict, Any, Optional

try:
    from ..config import settings
    from .prompts import EXPIRY_AGENT_SYSTEM_PROMPT
    from .planner import extract_plan_from_response, EXPIRY_DEFAULT_PLAN
    from .validator import validate_expiry_action, compute_expiry_priority
    from .state_store import state_store
    from .draft_generator import generate_expiry_memo_draft
    from .inventory_tools import (
        EXPIRY_TOOLS_SCHEMA,
        tool_get_expiring_batches,
        tool_get_batch_audit,
        tool_propose_expiry_action,
    )
except ImportError:
    from config import settings
    from inventory.prompts import EXPIRY_AGENT_SYSTEM_PROMPT
    from inventory.planner import extract_plan_from_response, EXPIRY_DEFAULT_PLAN
    from inventory.validator import validate_expiry_action, compute_expiry_priority
    from inventory.state_store import state_store
    from inventory.draft_generator import generate_expiry_memo_draft
    from inventory.inventory_tools import (
        EXPIRY_TOOLS_SCHEMA,
        tool_get_expiring_batches,
        tool_get_batch_audit,
        tool_propose_expiry_action,
    )

logger = logging.getLogger("vaxora-expiry-agent")


class ExpiryWatchdogAgent:
    name = "ExpiryAgent"
    description = (
        "Scans vaccine batches for upcoming expiry, prioritizes by urgency and quantity, "
        "and produces a formal Expiry Action Memo for admin approval."
    )

    def __init__(self):
        self.base_url = settings.groq_base_url.rstrip("/")
        self.model = settings.groq_model
        self.api_key = settings.groq_api_key

    async def _call_llm(
        self, messages: List[Dict[str, Any]], tools: Optional[List] = None
    ) -> Dict[str, Any]:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        payload = {"model": self.model, "messages": messages}
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions", headers=headers, json=payload
            )
            if resp.status_code >= 400:
                logger.error(f"[{self.name}] Groq error {resp.status_code}: {resp.text[:1000]}")
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]

    async def _execute_tool(
        self, name: str, args: Dict[str, Any], token: Optional[str], workflow_id: str
    ) -> Any:
        logger.info(f"[{self.name}] tool={name} args={args}")

        if name == "get_expiring_batches":
            days = args.get("days_threshold", 60)
            result = await tool_get_expiring_batches(days_threshold=days, token=token)
        elif name == "get_batch_audit":
            result = await tool_get_batch_audit(batch_id=args.get("batch_id", ""), token=token)
        elif name == "propose_expiry_action":
            actions = args.get("actions", [])
            validation_results = []
            all_valid = True
            for a in actions:
                ok, errs = validate_expiry_action(a)
                validation_results.append({"action": a.get("batch_id"), "passed": ok, "errors": errs})
                if not ok:
                    all_valid = False

            if not all_valid:
                logger.warning(f"[{self.name}] Some actions failed validation")
                return {
                    "success": False,
                    "error": "One or more actions failed deterministic validation",
                    "details": validation_results,
                }

            result = await tool_propose_expiry_action(
                actions=actions,
                summary=args.get("summary", ""),
                token=token,
            )
            state_store.set_approval(workflow_id, "pending_admin_approval")
            state_store.set_validation(workflow_id, validation_results)
        else:
            result = {"error": f"Unknown tool: {name}"}

        state_store.append_tool_call(workflow_id, name, args, result)
        return result

    async def run(
        self,
        messages: List[Dict[str, Any]],
        token: Optional[str] = None,
        user_id: Optional[str] = None,
        user_info: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        objective = next(
            (m["content"] for m in reversed(messages) if m.get("role") == "user"),
            "Scan expiring batches",
        )
        workflow_id = state_store.create(self.name, user_id, objective)

        conversation = [{"role": "system", "content": EXPIRY_AGENT_SYSTEM_PROMPT}]
        hospital_name = "Unknown Hospital"
        if user_info:
            hospital_name = user_info.get("name", hospital_name)
            conversation.append({
                "role": "system",
                "content": f"Hospital context: {hospital_name}",
            })
        conversation.extend(messages)

        # Planning — deterministic
        plan: List[Dict[str, Any]] = [dict(s) for s in EXPIRY_DEFAULT_PLAN]
        state_store.set_plan(workflow_id, plan)
        state_store.append_step(workflow_id, {"step": "planning", "status": "completed", "plan": plan})

        max_iter = 8
        iteration = 0
        expiry_actions: List[Dict[str, Any]] = []
        summary = ""
        final_content = ""

        while iteration < max_iter:
            iteration += 1
            try:
                msg = await self._call_llm(conversation, tools=EXPIRY_TOOLS_SCHEMA)
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
                    "draft": None,
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

                    if fn_name == "propose_expiry_action" and tool_result.get("success"):
                        proposal = tool_result.get("proposal", {})
                        expiry_actions = proposal.get("actions", [])
                        summary = proposal.get("summary", "")

                    conversation.append({
                        "role": "tool",
                        "tool_call_id": tc.get("id"),
                        "content": json.dumps(tool_result),
                    })
            else:
                final_content = msg.get("content") or "Expiry scan complete."
                break

        if not final_content:
            final_content = "Expiry scan complete. Please review the draft memo."

        # Build the draft memo
        draft = None
        if expiry_actions:
            draft = generate_expiry_memo_draft(
                expiry_actions=expiry_actions,
                summary=summary,
                hospital_name=hospital_name,
            )

        state_store.set_outcome(
            workflow_id,
            "proposal_pending_approval" if draft else "no_action_needed",
        )

        return {
            "agent": self.name,
            "role": "assistant",
            "content": final_content,
            "workflow_id": workflow_id,
            "plan": plan,
            "proposal": {"actions": expiry_actions, "summary": summary} if expiry_actions else None,
            "draft": draft,
        }


expiry_agent = ExpiryWatchdogAgent()