from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # App
    app_name: str = "Philip's Personal LinkedIn AI Agent"
    version: str = "1.0.0"
    environment: str = "production"
    timezone: str = "Africa/Lagos"
    
    # Supabase
    supabase_url: str = os.getenv("NEXT_PUBLIC_SUPABASE_URL", os.getenv("SUPABASE_URL", ""))
    supabase_anon_key: str = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    # LinkedIn OAuth
    linkedin_client_id: str = os.getenv("LINKEDIN_CLIENT_ID", "")
    linkedin_client_secret: str = os.getenv("LINKEDIN_CLIENT_SECRET", "")
    linkedin_redirect_uri: str = os.getenv("LINKEDIN_REDIRECT_URI", "https://personal-linkedin-agent.vercel.app/api/auth/linkedin/callback")
    
    # OpenAI
    openai_api_key: Optional[str] = os.getenv("OPENAI_API_KEY")
    
    # Security
    encryption_key: str = os.getenv("ENCRYPTION_KEY", "default-32-char-encryption-key!!")
    agent_api_secret: str = os.getenv("AGENT_API_SECRET", "default-agent-secret")
    jwt_secret: str = os.getenv("JWT_SECRET", "default-jwt-secret-change-me")
    
    # Owner
    owner_user_id: str = "00000000-0000-0000-0000-000000000001"
    owner_email: str = "philip@phoslab.ai"
    
    # Rate limiting
    rate_limit_per_minute: int = 100
    
    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

# Constant for Philip
PHILIP_USER_ID = "00000000-0000-0000-0000-000000000001"

def normalize_user_id(user_id: str) -> str:
    if not user_id or user_id == "philip":
        return PHILIP_USER_ID
    # Check if UUID
    import re
    if re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', user_id, re.I):
        return user_id
    return PHILIP_USER_ID
