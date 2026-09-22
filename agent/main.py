import uvicorn
import json
import base64
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

try:
    from .config import settings
    from .orchestrator import orchestrator
    from .bookingagent import booking_agent
except ImportError:
    from config import settings
    from orchestrator import orchestrator
    from bookingagent import booking_agent

app = FastAPI(title="Vaxora Google ADK Multi-Agent API", version="1.0.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    messages: List[Dict[str, Any]]
    patientInfo: Optional[Dict[str, Any]] = None
    targetAgent: Optional[str] = None # Optional override, e.g. "BookingAgent"


# =====================================================
# INVENTORY AGENTS — JWT helper (ADDED)
# =====================================================
def _extract_user_id_from_token(token: Optional[str]) -> Optional[str]:
    """Best-effort JWT payload decode to get user id (sub / nameid). No verification — backend already verified."""
    if not token:
        return None
    try:
        parts = token.split(".")
        if len(parts) < 2:
            return None
        padded = parts[1] + "=" * (-len(parts[1]) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded))
        return payload.get("sub") or payload.get("nameid") or payload.get("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")
    except Exception:
        return None


INVENTORY_AGENT_NAMES = {"RestockAgent", "ExpiryAgent"}


async def _run_agent(agent, messages, token, patient_info, user_id):
    """
    Dispatch to the correct agent with the correct kwargs.
    - Inventory agents accept user_id + user_info
    - Booking agent accepts patient_info
    """
    if agent.name in INVENTORY_AGENT_NAMES:
        return await agent.run(
            messages=messages,
            token=token,
            user_id=user_id,
            user_info=patient_info,
        )
    # Fallback: teammate's BookingAgent (patient_info)
    return await agent.run(
        messages=messages,
        token=token,
        patient_info=patient_info,
    )


@app.get("/api/agent/health")
async def health():
    return {
        "status": "healthy",
        "service": "Vaxora Multi-Agent Orchestrator",
        "registered_agents": list(orchestrator.agents.keys()),
        "model": settings.model_name,
        "runpod_endpoint": settings.runpod_base_url,
        # === INVENTORY AGENTS (ADDED) ===
        "groq_endpoint": settings.groq_base_url,
        "groq_model": settings.groq_model,
        "vaxora_api": settings.vaxora_api_base_url
    }

@app.post("/api/agent/chat")
async def chat_endpoint(
    req: ChatRequest,
    authorization: Optional[str] = Header(None)
):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]

    # === INVENTORY AGENTS: extract user id from JWT (ADDED) ===
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
            # Orchestrator internally routes; pass both so it can forward correctly
            result = await orchestrator.process_message(
                messages=req.messages,
                token=token,
                patient_info=req.patientInfo,
                user_id=user_id,
            )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=True)