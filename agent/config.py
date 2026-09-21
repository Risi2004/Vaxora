import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

# Automatically load environment variables from agent/.env
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)

class Settings(BaseModel):
    # LLM Provider: "runpod" or "google"
    llm_provider: str = os.getenv("LLM_PROVIDER", "runpod")
    
    # RunPod / Open-Source LLM Settings (strictly read from .env)
    runpod_base_url: str = os.getenv("RUNPOD_BASE_URL", "").rstrip("/")
    runpod_api_key: str = os.getenv("RUNPOD_API_KEY", "ollama")
    model_name: str = os.getenv("MODEL_NAME", "qwen2.5:7b")

    # Inventory Agents (Groq)
    groq_base_url: str = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/")
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    groq_model: str = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    
    # Google GenAI / ADK Settings
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    
    # Vaxora ASP.NET Core API Base URL
    vaxora_api_base_url: str = os.getenv("VAXORA_API_BASE_URL", "http://localhost:5004/api").rstrip("/")
    
    # Server port for the Agent FastAPI service
    port: int = int(os.getenv("PORT", "8001"))
    host: str = os.getenv("HOST", "0.0.0.0")

settings = Settings()
