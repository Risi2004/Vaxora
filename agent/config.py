import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

# Automatically load environment variables from agent/.env
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)

class Settings(BaseModel):
    # OpenRouter LLM Settings
    openrouter_base_url: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
    openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "")
    openrouter_model: str = os.getenv("OPENROUTER_MODEL", "qwen/qwen3.8-27b")
    
    # Vaxora ASP.NET Core API Base URL
    vaxora_api_base_url: str = os.getenv("VAXORA_API_BASE_URL", "http://localhost:5004/api").rstrip("/")
    
    # Server port for the Agent FastAPI service
    port: int = int(os.getenv("PORT", "8001"))
    host: str = os.getenv("HOST", "0.0.0.0")

    # Shared secret the ASP.NET API presents when calling this internal service.
    # Leave empty to disable the check (local development).
    agent_service_key: str = os.getenv("AGENT_SERVICE_KEY", "")

settings = Settings()
