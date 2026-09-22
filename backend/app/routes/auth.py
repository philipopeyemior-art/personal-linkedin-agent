from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
import secrets
import httpx
from datetime import datetime, timedelta
from ..config import settings, PHILIP_USER_ID, normalize_user_id
from ..database import get_service_supabase
from ..security import generate_state, encrypt_token, decrypt_token

router = APIRouter()

# In-memory state store for MVP (use Redis or DB in production)
state_store = {}

@router.get("/linkedin")
async def linkedin_auth(request: Request):
    if not settings.linkedin_client_id or not settings.linkedin_client_secret:
        raise HTTPException(status_code=500, detail="LinkedIn OAuth not configured — set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET")
    
    state = generate_state()
    # Store state with expiry
    state_store[state] = {
        "created_at": datetime.utcnow(),
        "ip": request.client.host if request.client else "unknown"
    }
    
    auth_url = (
        f"https://www.linkedin.com/oauth/v2/authorization"
        f"?response_type=code"
        f"&client_id={settings.linkedin_client_id}"
        f"&redirect_uri={settings.linkedin_redirect_uri}"
        f"&scope=openid%20profile%20email"
        f"&state={state}"
    )
    
    return {"auth_url": auth_url, "state": state}

@router.get("/linkedin/callback")
async def linkedin_callback(request: Request, code: str = None, state: str = None, error: str = None, error_description: str = None):
    if error:
        return {
            "status": "error",
            "error": error,
            "error_description": error_description,
            "message": f"Authorization failed: {error} — {error_description}"
        }
    
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state")
    
    # Validate state
    stored = state_store.get(state)
    if not stored:
        raise HTTPException(status_code=403, detail="Invalid state — possible CSRF attack. Please try again.")
    
    # Check expiry (10 min)
    if datetime.utcnow() - stored["created_at"] > timedelta(minutes=10):
        del state_store[state]
        raise HTTPException(status_code=403, detail="State expired — please try again.")
    
    # One-time use
    del state_store[state]
    
    # Exchange code for token
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://www.linkedin.com/oauth/v2/accessToken",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": settings.linkedin_client_id,
                    "client_secret": settings.linkedin_client_secret,
                    "redirect_uri": settings.linkedin_redirect_uri
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=400, detail=f"Token exchange failed: {resp.text}")
            
            token_data = resp.json()
            access_token = token_data.get("access_token")
            refresh_token = token_data.get("refresh_token")
            expires_in = token_data.get("expires_in", 5184000)
            id_token = token_data.get("id_token")
            
            # Get userinfo
            userinfo_resp = await client.get(
                "https://api.linkedin.com/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            if userinfo_resp.status_code != 200:
                raise HTTPException(status_code=400, detail=f"Userinfo failed: {userinfo_resp.text}")
            
            userinfo = userinfo_resp.json()
            
            # Store encrypted tokens
            supabase = get_service_supabase()
            if supabase:
                try:
                    # Encrypt tokens
                    enc_access = encrypt_token(access_token)
                    enc_refresh = encrypt_token(refresh_token) if refresh_token else None
                    
                    # Upsert integration connection
                    existing = supabase.table("integration_connections").select("*").eq("user_id", PHILIP_USER_ID).eq("provider", "linkedin_oidc").execute()
                    
                    conn_data = {
                        "user_id": PHILIP_USER_ID,
                        "provider": "linkedin_oidc",
                        "scopes": ["openid", "profile", "email"],
                        "connection_status": "connected",
                        "updated_at": datetime.utcnow().isoformat()
                    }
                    # Store encrypted tokens in profile_data for MVP (in production use separate secure table)
                    conn_data["profile_data"] = {
                        "linkedin_sub": userinfo.get("sub"),
                        "name": userinfo.get("name"),
                        "email": userinfo.get("email"),
                        "picture": userinfo.get("picture"),
                        "access_token_encrypted": enc_access,
                        "refresh_token_encrypted": enc_refresh,
                        "expires_at": (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat(),
                        "id_token": id_token
                    }
                    
                    if existing.data and len(existing.data) > 0:
                        supabase.table("integration_connections").update(conn_data).eq("id", existing.data[0]["id"]).execute()
                    else:
                        supabase.table("integration_connections").insert(conn_data).execute()
                    
                    # Audit log
                    try:
                        supabase.table("audit_logs").insert({
                            "user_id": PHILIP_USER_ID,
                            "action": "linkedin_connect",
                            "resource_type": "integration",
                            "resource_id": None,
                            "details": {"linkedin_sub": userinfo.get("sub"), "scopes": ["openid", "profile", "email"]}
                        }).execute()
                    except:
                        pass
                        
                except Exception as e:
                    print(f"DB store error: {e}")
            
            # Redirect to frontend with success
            frontend_url = settings.linkedin_redirect_uri.replace("/api/auth/linkedin/callback", "/settings?linkedin_connected=true")
            # For FastAPI standalone, redirect to a success page
            return {
                "status": "success",
                "message": "LinkedIn connected successfully",
                "profile": {
                    "sub": userinfo.get("sub"),
                    "name": userinfo.get("name"),
                    "email": userinfo.get("email"),
                    "picture": userinfo.get("picture")
                },
                "scopes": ["openid", "profile", "email"],
                "expires_in": expires_in,
                "redirect_url": frontend_url
            }
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"OAuth callback error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/linkedin/disconnect")
async def linkedin_disconnect():
    supabase = get_service_supabase()
    if supabase:
        try:
            supabase.table("integration_connections").update({
                "connection_status": "disconnected",
                "updated_at": datetime.utcnow().isoformat(),
                "profile_data": {}
            }).eq("user_id", PHILIP_USER_ID).eq("provider", "linkedin_oidc").execute()
            
            supabase.table("audit_logs").insert({
                "user_id": PHILIP_USER_ID,
                "action": "linkedin_disconnect",
                "resource_type": "integration",
                "details": {"reason": "user_initiated"}
            }).execute()
        except Exception as e:
            print(f"Disconnect DB error: {e}")
    
    return {"status": "success", "message": "LinkedIn disconnected, tokens deleted"}

@router.get("/linkedin/status")
async def linkedin_status():
    supabase = get_service_supabase()
    if not supabase:
        return {
            "connected": False,
            "status": "not_configured",
            "message": "Supabase not configured"
        }
    
    try:
        result = supabase.table("integration_connections").select("*").eq("user_id", PHILIP_USER_ID).eq("provider", "linkedin_oidc").order("updated_at", desc=True).limit(1).execute()
        if not result.data or len(result.data) == 0:
            return {
                "connected": False,
                "status": "not_connected",
                "message": "Not connected"
            }
        
        conn = result.data[0]
        profile = conn.get("profile_data", {})
        expires_at_str = profile.get("expires_at")
        is_expired = False
        if expires_at_str:
            try:
                expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00").replace("+00:00", ""))
                is_expired = datetime.utcnow() > expires_at
            except:
                pass
        
        return {
            "connected": conn.get("connection_status") == "connected" and not is_expired,
            "status": "expired" if is_expired else conn.get("connection_status"),
            "profile": {
                "name": profile.get("name"),
                "email": profile.get("email"),
                "picture": profile.get("picture"),
                "sub": profile.get("linkedin_sub")
            },
            "scopes": conn.get("scopes", []),
            "expires_at": profile.get("expires_at"),
            "is_expired": is_expired,
            "last_updated": conn.get("updated_at")
        }
    except Exception as e:
        print(f"Status error: {e}")
        return {
            "connected": False,
            "status": "error",
            "message": str(e)
        }
