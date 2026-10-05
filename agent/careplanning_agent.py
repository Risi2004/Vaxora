"""
CarePlanningAgent — generates a personalized care plan from a patient summary.

Architecture note:
  Same as PatientDataAgent — tool invocation is deterministic to work around
  free-tier tool-calling instability on shared LLM providers. The LLM makes
  two real decisions:
    1. Which clinical guidelines to look up (given the patient's conditions/allergies)
    2. How to compose the final care plan

  Empty-patient safety: if PatientDataAgent flagged the patient as having no
  clinical data (has_clinical_data == False), this agent short-circuits and
  returns a deterministic minimal plan. This prevents the LLM from populating
  `upcoming_vaccines` from the generic age-based schedule for a brand-new
  account, which would be clinically misleading.

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
- IMPORTANT: If `patient_summary.has_clinical_data` is false, or the patient
  summary contains no chronic conditions, no allergies, no active medications,
  no vaccinations, and no visits, then:
    * DO NOT populate `upcoming_vaccines` from the age-based schedule.
    * DO NOT invent conditions, screenings, or referrals.
    * Return a minimal plan acknowledging the absence of clinical data.
  The age-based vaccine schedule is generic reference material, NOT a
  personalised recommendation.
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
        self.base_url = settings.openrouter_base_url.rstrip("/")
        self.model = settings.openrouter_model
        self.api_key = settings.openrouter_api_key

    async def _call_llm(self, messages: List[Dict[str, Any]], temperature: float = 0.2) -> Dict[str, Any]:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "reasoning_effort": "low",
        }

        max_retries = 6
        for attempt in range(max_retries):
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(
                    f"{self.base_url}/chat/completions", headers=headers, json=payload
                )
                if resp.status_code == 429:
                    retry_after = int(resp.headers.get("retry-after", "20"))
                    wait = max(retry_after, 20) + (5 * attempt)
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
            f"Max retries ({max_retries}) exceeded due to LLM rate limiting."
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

        # ---- Short-circuit for patients with no clinical data ----
        # Deterministic safety net. If PatientDataAgent reports no clinical
        # data (no history, no vaccinations, no visits), we do NOT run the
        # LLM. Otherwise the LLM would populate the age-based schedule into
        # upcoming_vaccines for a brand-new account, which is misleading.
        has_data = patient_summary.get("has_clinical_data")
        if has_data is False:
            logger.info(
                f"[{self.name}] Patient has no clinical data — returning minimal plan"
            )
            return {
                "success": True,
                "care_plan": self._minimal_plan(patient_summary),
                "raw": "",
                "steps": steps,
            }

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
            steps.append({
                "tool": "get_clinical_guidelines",
                "ok": out.get("success", True) if isinstance(out, dict) else True,
            })

        age = (patient_summary.get("demographics") or {}).get("age_years") or 30
        logger.info(f"[{self.name}] tool=get_age_based_vaccine_schedule (age={age})")
        try:
            schedule = await tool_get_age_based_vaccine_schedule(int(age))
        except Exception as e:
            schedule = {"success": False, "error": str(e)}
        steps.append({
            "tool": "get_age_based_vaccine_schedule",
            "ok": schedule.get("success", True) if isinstance(schedule, dict) else True,
        })

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
    def _minimal_plan(patient_summary: Dict[str, Any]) -> Dict[str, Any]:
        """Deterministic care plan for a patient with no clinical data.

        No LLM involved. Guarantees we never fabricate personalised
        recommendations for a brand-new account.
        """
        demo = patient_summary.get("demographics") or {}
        name = demo.get("name") or "This patient"
        age = demo.get("age_years")

        if age is not None:
            summary_text = (
                f"{name} is {age} years old and has no recorded clinical history — "
                f"no diagnoses, allergies, vaccinations, or prior visits are on file. "
                f"A personalised care plan can only be generated after a first consultation."
            )
        else:
            summary_text = (
                f"{name} has no recorded clinical history — no diagnoses, allergies, "
                f"vaccinations, or prior visits are on file. A personalised care plan "
                f"can only be generated after a first consultation."
            )

        return {
            "summary_text": summary_text,
            "immediate_actions": [
                {
                    "action": "Book a first health checkup",
                    "priority": "Medium",
                    "reason": (
                        "No clinical data is on file. A baseline consultation "
                        "is required before a personalised plan can be produced."
                    ),
                }
            ],
            "upcoming_vaccines": [],
            "lifestyle_recommendations": [
                "Maintain a balanced diet with fruit, vegetables, and whole grains.",
                "Aim for at least 150 minutes of moderate aerobic activity per week.",
                "Ensure adequate sleep and manage stress.",
            ],
            "recommended_screenings": [
                "Blood pressure check",
                "Body mass index (BMI) measurement",
            ],
            "referrals": [],
            "warnings": [
                {
                    "severity": "Info",
                    "message": (
                        "No clinical history is available for this patient. "
                        "The recommendations above are baseline general guidance "
                        "and not personalised to any condition."
                    ),
                }
            ],
            "follow_up_recommendation": (
                "Complete a first health checkup to establish a clinical baseline. "
                "A personalised care plan will be generated after that consultation."
            ),
        }

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
