import uvicorn
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

# Internal service: browsers must reach the agents through the ASP.NET API, which
# authenticates the caller first. No browser origin is allowed to call this directly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_credentials=False,
    allow_methods=["POST", "GET"],
    allow_headers=["Authorization", "Content-Type", "X-Agent-Key"],
)


def verify_internal_caller(agent_key: Optional[str]) -> None:
    """
    Optional shared secret between the ASP.NET API and this service. When
    AGENT_SERVICE_KEY is configured, only callers presenting it may reach the agents.
    """
    expected = settings.agent_service_key
    if expected and agent_key != expected:
        raise HTTPException(status_code=401, detail="Unauthorized caller.")

class ChatRequest(BaseModel):
    messages: List[Dict[str, Any]]
    patientInfo: Optional[Dict[str, Any]] = None
    targetAgent: Optional[str] = None  # e.g. "BookingAgent" | "StaffSchedulingAgent"

@app.get("/api/agent/health")
async def health():
    return {
        "status": "healthy",
        "service": "Vaxora Multi-Agent Orchestrator",
        "registered_agents": list(orchestrator.agents.keys()),
        "model": settings.model_name,
        "runpod_endpoint": settings.runpod_base_url,
        "vaxora_api": settings.vaxora_api_base_url
    }

@app.post("/api/agent/chat")
async def chat_endpoint(
    req: ChatRequest,
    authorization: Optional[str] = Header(None),
    x_agent_key: Optional[str] = Header(None)
):
    verify_internal_caller(x_agent_key)

    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        
    try:
        if req.targetAgent and req.targetAgent in orchestrator.agents:
            agent = orchestrator.agents[req.targetAgent]
            result = await agent.run(
                messages=req.messages,
                token=token,
                patient_info=req.patientInfo
            )
        else:
            result = await orchestrator.process_message(
                messages=req.messages,
                token=token,
                patient_info=req.patientInfo
            )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("agent.main:app", host=settings.host, port=settings.port, reload=True)
