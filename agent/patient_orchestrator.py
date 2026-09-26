"""
Patient Care Orchestrator — sequences the two patient agents.

Flow:
    PatientDataAgent  →  CarePlanningAgent  →  combined result

The orchestrator's job is control flow: it decides WHEN to run each agent
and passes structured data between them. This is the file the FastAPI
endpoint and the ASP.NET Core backend call.
"""
import logging
import time
from typing import Dict, Any, Optional

try:
    from .patientdata_agent import patient_data_agent
    from .careplanning_agent import care_planning_agent
except ImportError:
    from patientdata_agent import patient_data_agent
    from careplanning_agent import care_planning_agent

logger = logging.getLogger("vaxora-patient-orchestrator")


async def run_patient_care_workflow(
    patient_profile_id: str,
    token: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Run the full two-agent patient care workflow.
    Returns:
        {
          "success": bool,
          "patient_profile_id": str,
          "patient_summary": {...} | None,
          "care_plan": {...} | None,
          "steps": [ { agent, ok, duration_ms, error? }, ... ],
          "duration_ms": int,
          "error": str | None
        }
    """
    started = time.time()
    steps = []

    # ---------- STEP 1: PatientDataAgent ----------
    t0 = time.time()
    try:
        data_result = await patient_data_agent.run(patient_profile_id, token=token)
    except Exception as e:
        logger.exception("PatientDataAgent crashed")
        return {
            "success": False,
            "patient_profile_id": patient_profile_id,
            "patient_summary": None,
            "care_plan": None,
            "steps": [{"agent": "PatientDataAgent", "ok": False, "error": str(e), "duration_ms": int((time.time()-t0)*1000)}],
            "duration_ms": int((time.time()-started)*1000),
            "error": f"PatientDataAgent failed: {e}",
        }
    steps.append({
        "agent": "PatientDataAgent",
        "ok": data_result.get("success", False),
        "duration_ms": int((time.time()-t0)*1000),
        "tools_used": [s.get("tool") for s in data_result.get("steps", [])],
    })
    if not data_result.get("success"):
        return {
            "success": False,
            "patient_profile_id": patient_profile_id,
            "patient_summary": None,
            "care_plan": None,
            "steps": steps,
            "duration_ms": int((time.time()-started)*1000),
            "error": data_result.get("error", "PatientDataAgent returned no summary."),
        }

    patient_summary = data_result.get("summary")

    # ---------- STEP 2: CarePlanningAgent ----------
    t1 = time.time()
    try:
        plan_result = await care_planning_agent.run(patient_summary or {})
    except Exception as e:
        logger.exception("CarePlanningAgent crashed")
        steps.append({"agent": "CarePlanningAgent", "ok": False, "error": str(e), "duration_ms": int((time.time()-t1)*1000)})
        return {
            "success": False,
            "patient_profile_id": patient_profile_id,
            "patient_summary": patient_summary,
            "care_plan": None,
            "steps": steps,
            "duration_ms": int((time.time()-started)*1000),
            "error": f"CarePlanningAgent failed: {e}",
        }

    steps.append({
        "agent": "CarePlanningAgent",
        "ok": plan_result.get("success", False),
        "duration_ms": int((time.time()-t1)*1000),
        "tools_used": [s.get("tool") for s in plan_result.get("steps", [])],
    })

    return {
        "success": plan_result.get("success", False),
        "patient_profile_id": patient_profile_id,
        "patient_summary": patient_summary,
        "care_plan": plan_result.get("care_plan"),
        "steps": steps,
        "duration_ms": int((time.time()-started)*1000),
        "error": plan_result.get("error"),
    }
