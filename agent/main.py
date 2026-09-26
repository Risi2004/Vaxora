import uvicorn
import json
import base64
import logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")

from fastapi import FastAPI, Header, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

try:
    from .config import settings
    from .orchestrator import orchestrator
    from .bookingagent import booking_agent
    from .patient_orchestrator import run_patient_care_workflow
except ImportError:
    from config import settings
    from orchestrator import orchestrator
    from bookingagent import booking_agent
    from patient_orchestrator import run_patient_care_workflow

app = FastAPI(title="Vaxora Google ADK Multi-Agent API", version="1.0.0")

# Internal service: browsers must reach the agents through the ASP.NET API, which
# authenticates the caller first. No browser origin is allowed to call this directly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_credentials=False,
    allow_methods=["POST", "GET"],
    allow_headers=["Authorization", "Content-Type", "X-Agent-Key"],
)

# HTTPBearer security scheme — gives Swagger the Authorize button
bearer_scheme = HTTPBearer(auto_error=False)


def verify_internal_caller(agent_key: Optional[str]) -> None:
    """
    Optional shared secret between the ASP.NET API and this service. When
    AGENT_SERVICE_KEY is configured, only callers presenting it may reach the agents.
    """
    expected = getattr(settings, "agent_service_key", None)
    if expected and agent_key != expected:
        raise HTTPException(status_code=401, detail="Unauthorized caller.")


class ChatRequest(BaseModel):
    messages: List[Dict[str, Any]]
    patientInfo: Optional[Dict[str, Any]] = None
    targetAgent: Optional[str] = None  # e.g. "BookingAgent" | "RestockAgent" | "ExpiryAgent" | "StaffSchedulingAgent"


class PatientCarePlanRequest(BaseModel):
    patient_profile_id: str


def _extract_user_id_from_token(token: Optional[str]) -> Optional[str]:
    if not token:
        return None
    try:
        parts = token.split(".")
        if len(parts) < 2:
            return None
        padded = parts[1] + "=" * (-len(parts[1]) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded))
        return payload.get("sub") or payload.get("nameid")
    except Exception:
        return None


def _extract_bearer_token(authorization: Optional[str]) -> Optional[str]:
    """
    Forgiving token extraction:
    - "Bearer xxx" -> xxx
    - "bearer xxx" -> xxx
    - "xxx"        -> xxx  (raw token fallback)
    """
    if not authorization:
        return None
    auth = authorization.strip()
    if auth.startswith('"') and auth.endswith('"'):
        auth = auth[1:-1].strip()
    if auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    return auth


INVENTORY_AGENT_NAMES = {"RestockAgent", "ExpiryAgent"}


async def _run_agent(agent, messages, token, patient_info, user_id):
    """Dispatch to the correct agent with the correct kwargs."""
    if agent.name in INVENTORY_AGENT_NAMES:
        return await agent.run(
            messages=messages,
            token=token,
            user_id=user_id,
            user_info=patient_info,
        )
    # Fallback for BookingAgent / StaffSchedulingAgent
    try:
        return await agent.run(
            messages=messages,
            token=token,
            patient_info=patient_info,
        )
    except TypeError:
        return await agent.run(messages=messages, token=token)


@app.get("/api/agent/health")
async def health():
    result = {
        "status": "healthy",
        "service": "Vaxora Multi-Agent Orchestrator",
        "registered_agents": list(orchestrator.agents.keys()),
        "model": settings.model_name,
        "runpod_endpoint": settings.runpod_base_url,
        "vaxora_api": settings.vaxora_api_base_url,
    }
    # Surface Groq settings if the merged config exposes them
    try:
        result["groq_endpoint"] = settings.groq_base_url
        result["groq_model"] = settings.groq_model
    except AttributeError:
        pass
    return result


@app.post("/api/agent/chat")
async def chat_endpoint(
    req: ChatRequest,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    authorization: Optional[str] = Header(None),
    x_agent_key: Optional[str] = Header(None),
):
    verify_internal_caller(x_agent_key)

    logger = logging.getLogger("vaxora-main")

    # Prefer HTTPBearer (from Swagger's Authorize button), fall back to raw header
    token = None
    if credentials and credentials.credentials:
        token = credentials.credentials
    else:
        token = _extract_bearer_token(authorization)

    logger.info(f"Received auth header: {'present' if (credentials or authorization) else 'MISSING'}")
    logger.info(f"Extracted token: {'yes (' + str(len(token)) + ' chars)' if token else 'NONE'}")

    user_id = _extract_user_id_from_token(token)

    try:
        if req.targetAgent and req.targetAgent in orchestrator.agents:
            agent = orchestrator.agents[req.targetAgent]
            result = await _run_agent(
                agent,
                messages=req.messages,
                token=token,
                patient_info=req.patientInfo,
                user_id=user_id,
            )
        else:
            result = await orchestrator.process_message(
                messages=req.messages,
                token=token,
                patient_info=req.patientInfo,
                user_id=user_id,
            )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/agent/patient-care-plan")
async def patient_care_plan_endpoint(
    req: PatientCarePlanRequest,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    authorization: Optional[str] = Header(None),
    x_agent_key: Optional[str] = Header(None),
):
    """
    Runs the two-agent workflow: PatientDataAgent -> CarePlanningAgent.
    Requires a bearer token so the agents can call the Vaxora API on behalf
    of the current user, and the internal X-Agent-Key header when configured.
    """
    verify_internal_caller(x_agent_key)

    # Prefer HTTPBearer (from Swagger's Authorize button), fall back to raw header
    token = None
    if credentials and credentials.credentials:
        token = credentials.credentials
    else:
        token = _extract_bearer_token(authorization)

    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token.")

    if not req.patient_profile_id:
        raise HTTPException(status_code=400, detail="patient_profile_id is required.")

    try:
        result = await run_patient_care_workflow(
            patient_profile_id=req.patient_profile_id,
            token=token,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        reload_excludes=["*.db", "*.db-journal", "*.db-wal", "*.pyc", "__pycache__/*", "workflow_state.db", ".env"],
    )
# Reload triggered for model update
    