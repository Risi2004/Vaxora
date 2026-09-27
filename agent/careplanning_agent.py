"""
CarePlanningAgent — generates a personalized care plan from a patient summary.

Architecture note:
  Same as PatientDataAgent — tool invocation is deterministic to work around
  Groq free-tier tool-calling instability. The LLM makes two real decisions:
    1. Which clinical guidelines to look up (given the patient's conditions/allergies)
    2. How to compose the final care plan

Tools invoked: get_clinical_guidelines, get_age_based_vaccine_schedule
Input: patient_summary (from PatientDataAgent)
Output: a structured CarePlan dict.
"""
import json
import asyncio
import logging
import httpx
from typing import List, Dict, Any, Optional

try:
    from .config import settings
    from .patient_tools import (
        tool_get_clinical_guidelines,
        tool_get_age_based_vaccine_schedule,
    )
except ImportError:
    from config import settings
    from patient_tools import (
        tool_get_clinical_guidelines,
        tool_get_age_based_vaccine_schedule,
    )

logger = logging.getLogger("vaxora-care-planning-agent")

CARE_PLANNING_SYSTEM_PROMPT = """You are the CARE PLANNING AGENT for Vaxora, a national immunization platform.

You will receive a patient summary and the results of clinical guideline lookups.
Your job is to generate a personalized, evidence-based care plan.

Output EXACTLY this JSON schema (no prose, no markdown fences, no commentary):

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
- Reply with ONLY the JSON object.
- Only recommend actions supported by the guidelines provided.
- Allergy cross-reactivity must be a CRITICAL warning.
- If a condition has no matching guideline, note it in warnings — do not guess.
"""

KEY_EXTRACTION_PROMPT = """You are the CARE PLANNING AGENT for Vaxora.

Given a patient summary, list the clinical guideline keys you want to look up.
Guideline keys correspond to lowercased, underscore-joined condition or allergy titles.
Available keys include: diabetes, hypertension, asthma, penicillin_allergy, elderly_general.

Output ONLY a JSON array of strings, e.g. ["diabetes", "penicillin_allergy"].
No prose, no markdown fences.
"""


class CarePlanningAgent:
    name = "CarePlanningAgent"
    description = "Generates a personalized, guideline-grounded care plan from a patient summary."

    def __init__(self):
        self.base_url = settings.runpod_base_url.rstrip("/")
        self.model = settings.model_name
        self.api_key = settings.runpod_api_key

    async def _call_llm(self, messages: List[Dict[str, Any]], temperature: float = 0.2) -> Dict[str, Any]:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "reasoning_effort": "none",
        }

        max_retries = 4
        for attempt in range(max_retries):
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(
                    f"{self.base_url}/chat/completions", headers=headers, json=payload
                )
                if resp.status_code == 429:
                    retry_after = int(resp.headers.get("retry-after", "5"))
                    wait = max(retry_after, 3) + (2 ** attempt)
                    logger.warning(
                        f"[{self.name}] Rate limited (429). Waiting {wait}s "
                        f"before retry {attempt + 1}/{max_retries}..."
                    )
                    await asyncio.sleep(wait)
                    continue
                if resp.status_code >= 400:
                    logger.warning(
                        f"[{self.name}] LLM {resp.status_code}: {resp.text[:500]}"
                    )
                resp.raise_for_status()
                return resp.json()["choices"][0]["message"]

        raise RuntimeError(
            f"Max retries ({max_retries}) exceeded due to Groq rate limiting."
        )

    async def _extract_guideline_keys(self, patient_summary: Dict[str, Any]) -> List[str]:
        """Ask the LLM which guideline keys to look up."""
        conversation = [
            {"role": "system", "content": KEY_EXTRACTION_PROMPT},
            {"role": "user", "content": json.dumps(patient_summary, default=str)},
        ]
        try:
            msg = await self._call_llm(conversation, temperature=0.0)
            content = (msg.get("content") or "").strip()
            parsed = self._try_parse_json(content)
            if isinstance(parsed, list):
                return [str(k) for k in parsed if k]
        except Exception as e:
            logger.warning(f"[{self.name}] Key extraction failed: {e}")

        # Deterministic fallback — derive keys from the summary itself
        keys = []
        for cond in patient_summary.get("chronic_conditions") or []:
            if isinstance(cond, dict) and cond.get("title"):
                keys.append(str(cond["title"]).lower().replace(" ", "_"))
        for allergy in patient_summary.get("allergies") or []:
            if isinstance(allergy, dict) and allergy.get("allergen"):
                keys.append(str(allergy["allergen"]).lower() + "_allergy")
        return keys

    async def run(self, patient_summary: Dict[str, Any]) -> Dict[str, Any]:
        steps: List[Dict[str, Any]] = []

        # ---- Phase 1: LLM decides which guideline keys to fetch ----
        guideline_keys = await self._extract_guideline_keys(patient_summary)
        logger.info(f"[{self.name}] LLM requested guideline keys: {guideline_keys}")

        # ---- Phase 2: Deterministic tool invocation ----
        guideline_results: Dict[str, Any] = {}
        for key in guideline_keys:
            logger.info(f"[{self.name}] tool=get_clinical_guidelines ({key})")
            try:
                out = await tool_get_clinical_guidelines(key)
            except Exception as e:
                out = {"success": False, "error": str(e)}
            guideline_results[key] = out
            steps.append({"tool": "get_clinical_guidelines", "ok": out.get("success", True) if isinstance(out, dict) else True})

        age = (patient_summary.get("demographics") or {}).get("age_years") or 30
        logger.info(f"[{self.name}] tool=get_age_based_vaccine_schedule (age={age})")
        try:
            schedule = await tool_get_age_based_vaccine_schedule(int(age))
        except Exception as e:
            schedule = {"success": False, "error": str(e)}
        steps.append({"tool": "get_age_based_vaccine_schedule", "ok": schedule.get("success", True) if isinstance(schedule, dict) else True})

        # ---- Phase 3: LLM synthesizes the care plan ----
        combined = {
            "patient_summary": patient_summary,
            "clinical_guidelines": guideline_results,
            "age_based_vaccine_schedule": schedule,
        }

        conversation = [
            {"role": "system", "content": CARE_PLANNING_SYSTEM_PROMPT},
            {"role": "user", "content": "Inputs:\n" + json.dumps(combined, indent=2, default=str) + "\n\nNow output ONLY the care plan JSON."},
        ]

        try:
            msg = await self._call_llm(conversation)
        except Exception as e:
            return {
                "success": False,
                "error": f"LLM synthesis error: {e}",
                "steps": steps,
            }

        content = msg.get("content") or ""
        plan = self._try_parse_json(content)

        if isinstance(plan, dict) and "raw_text" in plan and len(plan) == 1:
            logger.warning(
                f"[{self.name}] JSON parse failed — raw content (first 500 chars): "
                f"{content[:500]}"
            )

        return {"success": True, "care_plan": plan, "raw": content, "steps": steps}

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
            if t.endswith("```"):
                t = t[:-3].strip()
        try:
            return json.loads(t)
        except Exception:
            pass
        first = t.find("{")
        last = t.rfind("}")
        if first != -1 and last > first:
            try:
                return json.loads(t[first:last + 1])
            except Exception:
                pass
        first = t.find("[")
        last = t.rfind("]")
        if first != -1 and last > first:
            try:
                return json.loads(t[first:last + 1])
            except Exception:
                pass
        return {"raw_text": text}


care_planning_agent = CarePlanningAgent()
