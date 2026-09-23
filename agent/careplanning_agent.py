"""
CarePlanningAgent — generates a personalized care plan from a patient summary.
Tools: get_clinical_guidelines, get_age_based_vaccine_schedule
Input: patient_summary (from PatientDataAgent)
Output: a structured CarePlan dict with actions, vaccines, follow-ups, warnings.
"""
import json
import logging
import httpx
from typing import List, Dict, Any, Optional

try:
    from .config import settings
    from .patient_tools import (
        CARE_PLANNING_TOOLS_SCHEMA,
        tool_get_clinical_guidelines,
        tool_get_age_based_vaccine_schedule,
    )
except ImportError:
    from config import settings
    from patient_tools import (
        CARE_PLANNING_TOOLS_SCHEMA,
        tool_get_clinical_guidelines,
        tool_get_age_based_vaccine_schedule,
    )

logger = logging.getLogger("vaxora-care-planning-agent")

CARE_PLANNING_SYSTEM_PROMPT = """You are the CARE PLANNING AGENT for Vaxora, a national immunization platform.

You receive a structured patient summary (produced by the Patient Data Agent) and generate a personalized, evidence-based care plan.

Workflow:
1. For EACH chronic condition in the summary, call get_clinical_guidelines with a matching key (try lowercase title, e.g., 'diabetes', 'hypertension'). Also call it for each allergy (e.g., 'penicillin_allergy').
2. Call get_age_based_vaccine_schedule with the patient's age.
3. Cross-reference: what vaccines does the age-based schedule recommend that are MISSING from the patient's administered list?
4. Produce a care plan in EXACTLY this JSON schema:

{
  "summary_text": "One-paragraph human-readable summary of the patient's situation.",
  "immediate_actions": [{"action": "string", "priority": "High|Medium|Low", "reason": "string"}],
  "upcoming_vaccines": [{"vaccine": "string", "reason": "string", "due_within_days": number or null}],
  "lifestyle_recommendations": ["string"],
  "recommended_screenings": ["string"],
  "referrals": ["string"],
  "warnings": [{"severity": "Info|Warning|Critical", "message": "string"}],
  "follow_up_recommendation": "string"
}

Rules:
- Reply with ONLY the JSON object, no prose, no markdown fences.
- Only recommend actions supported by the guidelines returned by your tools.
- Allergy cross-reactivity must be a CRITICAL warning.
- If a condition has no matching guideline, note it in warnings, don't guess.
"""


class CarePlanningAgent:
    name = "CarePlanningAgent"
    description = "Generates a personalized, guideline-grounded care plan from a patient summary."

    def __init__(self):
        self.base_url = settings.runpod_base_url.rstrip("/")
        self.model = settings.model_name
        self.api_key = settings.runpod_api_key

    async def _call_llm(self, messages: List[Dict[str, Any]], tools: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        payload = {"model": self.model, "messages": messages, "temperature": 0.2}
        if tools:
            payload["tools"] = tools
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]

    async def _execute_tool(self, name: str, args: Dict[str, Any]) -> Any:
        logger.info(f"[{self.name}] tool={name}")
        if name == "get_clinical_guidelines":
            return await tool_get_clinical_guidelines(args.get("condition_key", ""))
        if name == "get_age_based_vaccine_schedule":
            return await tool_get_age_based_vaccine_schedule(int(args.get("age_years", 30)))
        return {"error": f"Unknown tool: {name}"}

    async def run(self, patient_summary: Dict[str, Any]) -> Dict[str, Any]:
        conversation = [
            {"role": "system", "content": CARE_PLANNING_SYSTEM_PROMPT},
            {"role": "user", "content": "Patient summary JSON:\n" + json.dumps(patient_summary, indent=2, default=str)}
        ]
        steps = []

        for iteration in range(10):
            try:
                msg = await self._call_llm(conversation, tools=CARE_PLANNING_TOOLS_SCHEMA)
            except Exception as e:
                return {"success": False, "error": f"LLM error: {e}", "steps": steps}

            tool_calls = msg.get("tool_calls") or []

            if tool_calls:
                conversation.append({"role": "assistant", "content": msg.get("content") or "", "tool_calls": tool_calls})
                for tc in tool_calls:
                    fn = tc.get("function", {})
                    fn_name = fn.get("name")
                    raw_args = fn.get("arguments", "{}")
                    try:
                        fn_args = json.loads(raw_args) if isinstance(raw_args, str) else (raw_args or {})
                    except Exception:
                        fn_args = {}
                    out = await self._execute_tool(fn_name, fn_args)
                    steps.append({"tool": fn_name, "ok": out.get("success", True) if isinstance(out, dict) else True})
                    conversation.append({
                        "role": "tool",
                        "tool_call_id": tc.get("id"),
                        "content": json.dumps(out, default=str),
                    })
                continue

            content = msg.get("content") or ""
            plan = self._try_parse_json(content)
            return {"success": True, "care_plan": plan, "raw": content, "steps": steps}

        return {"success": False, "error": "Max iterations reached without final answer", "steps": steps}

    @staticmethod
    def _try_parse_json(text: str) -> Any:
        if not text:
            return None
        t = text.strip()
        if t.startswith("```"):
            t = t.strip("`")
            if t.lower().startswith("json"):
                t = t[4:]
            t = t.strip()
        try:
            return json.loads(t)
        except Exception:
            return {"raw_text": text}


care_planning_agent = CarePlanningAgent()
