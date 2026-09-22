from fastapi import APIRouter
from datetime import datetime
from ..config import settings

router = APIRouter()

@router.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "personal-linkedin-agent-python",
        "version": settings.version,
        "timestamp": datetime.utcnow().isoformat(),
        "timezone": settings.timezone,
        "env": {
            "supabase_configured": bool(settings.supabase_url and settings.supabase_anon_key),
            "openai_configured": bool(settings.openai_api_key and not settings.openai_api_key.startswith("sk-placeholder")),
            "linkedin_configured": bool(settings.linkedin_client_id and settings.linkedin_client_secret)
        }
    }
