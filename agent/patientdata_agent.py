"""
PatientDataAgent — compiles a structured summary of a patient's full health record.
Tools: get_patient_profile, get_vaccination_history, get_medical_history,
       get_active_conditions, get_visit_history, get_upcoming_follow_ups
Output: a structured PatientSummary dict.
"""
import json
import logging
import httpx
from typing import List, Dict, Any, Optional

try:
    from .config import settings
    from .patient_tools import (
        PATIENT_TOOLS_SCHEMA,
        tool_get_patient_profile,
        tool_get_vaccination_history,
        tool_get_medical_history,
        tool_get_active_conditions,
        tool_get_visit_history,
        tool_get_upcoming_follow_ups,
    )
except ImportError:
    from config import settings
    from patient_tools import (
        PATIENT_TOOLS_SCHEMA,
        tool_get_patient_profile,
        tool_get_vaccination_history,
        tool_get_medical_history,
        tool_get_active_conditions,
        tool_get_visit_history,
        tool_get_upcoming_follow_ups,
    )

logger = logging.getLogger("vaxora-patient-data-agent")

PATIENT_DATA_SYSTEM_PROMPT = """You are the PATIENT DATA AGENT for Vaxora, a national immunization platform.

Your ONLY responsibility is to compile a comprehensive, structured summary of a patient's health data.
You do NOT give medical advice. You do NOT generate care plans. You ONLY retrieve and summarize.

Workflow:
1. Call get_patient_profile to get core demographics.
2. Call get_medical_history to get ALL medical history (diagnoses, allergies, surgeries).
3. Call get_active_conditions to identify currently active/chronic conditions.
4. Call get_vaccination_history to get all administered vaccines.
5. Call get_visit_history to get recent clinic visits.
6. Call get_upcoming_follow_ups to get scheduled follow-ups.
7. Compile a JSON summary in EXACTLY this schema:

{
  "demographics": {
    "name": "string",
    "nic": "string",
    "age_years": number,
    "phone": "string or null"
  },
  "chronic_conditions": [{"title": "string", "severity": "string", "icd10": "string or null"}],
  "allergies": [{"allergen": "string", "severity": "string"}],
  "active_medications": ["string"],
  "vaccination_summary": {
    "total_doses": number,
    "distinct_vaccines": number,
    "last_vaccination_date": "YYYY-MM-DD or null",
    "administered": ["vaccine names"]
  },
  "recent_visits": [{"date": "YYYY-MM-DD", "type": "string", "complaint": "string", "diagnosis": "string"}],
  "upcoming_follow_ups": [{"date": "YYYY-MM-DD", "type": "string"}],
  "data_gaps": ["any missing or unavailable information"]
}

Rules:
- Reply with ONLY the JSON object, no prose, no markdown fences.
- If a category has no data, use an empty list or null — do NOT invent data.
- Age: compute from date_of_birth.
- Include EVERY chronic condition and allergy you find, no filtering.
"""


class PatientDataAgent:
    name = "PatientDataAgent"
    description = "Retrieves and compiles a structured summary of a patient's full health record."

    def __init__(self):
        self.base_url = settings.runpod_base_url.rstrip("/")
        self.model = settings.model_name
        self.api_key = settings.runpod_api_key

    async def _call_llm(self, messages: List[Dict[str, Any]], tools: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        payload = {"model": self.model, "messages": messages, "temperature": 0.1}
        if tools:
            payload["tools"] = tools
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]

    async def _execute_tool(self, name: str, args: Dict[str, Any], token: Optional[str]) -> Any:
        logger.info(f"[{self.name}] tool={name}")
        pid = args.get("patient_profile_id")
        if name == "get_patient_profile":
            return await tool_get_patient_profile(pid, token=token)
        if name == "get_vaccination_history":
            return await tool_get_vaccination_history(pid, token=token)
        if name == "get_medical_history":
            return await tool_get_medical_history(pid, token=token)
        if name == "get_active_conditions":
            return await tool_get_active_conditions(pid, token=token)
        if name == "get_visit_history":
            return await tool_get_visit_history(pid, token=token)
        if name == "get_upcoming_follow_ups":
            return await tool_get_upcoming_follow_ups(pid, token=token)
        return {"error": f"Unknown tool: {name}"}

    async def run(self, patient_profile_id: str, token: Optional[str] = None) -> Dict[str, Any]:
        """Run the agent, return { success, summary, raw, steps }."""
        conversation = [
            {"role": "system", "content": PATIENT_DATA_SYSTEM_PROMPT},
            {"role": "user", "content": f"Compile a summary for patient profile ID: {patient_profile_id}. Use all your tools."}
        ]
        steps = []

        for iteration in range(8):  # max iterations
            try:
                msg = await self._call_llm(conversation, tools=PATIENT_TOOLS_SCHEMA)
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
                    # force the profile id in case the LLM hallucinated one
                    fn_args["patient_profile_id"] = patient_profile_id
                    out = await self._execute_tool(fn_name, fn_args, token)
                    steps.append({"tool": fn_name, "ok": out.get("success", True) if isinstance(out, dict) else True})
                    conversation.append({
                        "role": "tool",
                        "tool_call_id": tc.get("id"),
                        "content": json.dumps(out, default=str),
                    })
                continue

            # Final message — try to parse JSON
            content = msg.get("content") or ""
            summary = self._try_parse_json(content)
            return {"success": True, "summary": summary, "raw": content, "steps": steps}

        return {"success": False, "error": "Max iterations reached without final answer", "steps": steps}

    @staticmethod
    def _try_parse_json(text: str) -> Any:
        """Best-effort JSON extraction — strips markdown fences if present."""
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


patient_data_agent = PatientDataAgent()
