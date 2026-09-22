from supabase import create_client, Client
from .config import settings
from typing import Optional

_supabase_client: Optional[Client] = None
_service_client: Optional[Client] = None

def get_supabase() -> Optional[Client]:
    global _supabase_client
    if _supabase_client:
        return _supabase_client
    
    if not settings.supabase_url or not settings.supabase_anon_key:
        return None
    
    try:
        _supabase_client = create_client(settings.supabase_url, settings.supabase_anon_key)
        return _supabase_client
    except Exception as e:
        print(f"Supabase client error: {e}")
        return None

def get_service_supabase() -> Optional[Client]:
    global _service_client
    if _service_client:
        return _service_client
    
    url = settings.supabase_url
    key = settings.supabase_service_role_key or settings.supabase_anon_key
    
    if not url or not key:
        return None
    
    try:
        _service_client = create_client(url, key)
        return _service_client
    except Exception as e:
        print(f"Service Supabase client error: {e}")
        return None

def get_db():
    return get_service_supabase()
