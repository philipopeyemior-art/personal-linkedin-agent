from fastapi import APIRouter, HTTPException
from ..schemas import WelcomeRequest
from ..config import normalize_user_id
from ..database import get_service_supabase
from ..prompts import build_welcome_prompt
from ..agent import generate_with_llm
from ..policy import check_draft_policy
from datetime import datetime, timedelta

router = APIRouter()

@router.post("/welcome")
async def generate_welcome(req: WelcomeRequest):
    try:
        user_id = normalize_user_id(req.user_id)
        supabase = get_service_supabase()
        
        contact = req.contact_data.dict() if req.contact_data else None
        
        if req.contact_id and supabase:
            try:
                data = supabase.table("contacts").select("*").eq("id", req.contact_id).single().execute()
                if data.data:
                    contact = data.data
            except Exception as e:
                print(f"Fetch contact error: {e}")
        
        if not contact:
            contact = {
                "id": req.contact_id or "temp",
                "full_name": req.full_name or "there",
                "headline": req.headline or "",
                "profile_url": req.profile_url or "",
                "relationship_notes": req.relationship_notes or "",
                "source": req.source or "manual"
            }
        
        # Idempotency check
        if supabase and contact.get("id") and contact["id"] != "temp":
            try:
                recent = supabase.table("drafts").select("id, created_at").eq("contact_id", contact["id"]).eq("purpose", "welcome").gte("created_at", (datetime.utcnow() - timedelta(hours=24)).isoformat()).execute()
                if recent.data and len(recent.data) > 0:
                    return {
                        "status": "already_processed",
                        "message": "Welcome already generated in last 24h",
                        "draft_id": recent.data[0]["id"]
                    }
            except Exception as e:
                print(f"Idempotency check error: {e}")
        
        prompt = build_welcome_prompt(contact, req.extra_context or "")
        draft_text = await generate_with_llm(prompt, temperature=0.8, max_tokens=300)
        policy = check_draft_policy(draft_text, "welcome", contact)
        
        if not policy.allowed:
            return {
                "status": "policy_rejected",
                "reason": policy.reason,
                "classification": policy.classification,
                "draft_text": draft_text
            }
        
        saved_draft = None
        if supabase and contact.get("id") and contact["id"] != "temp":
            try:
                result = supabase.table("drafts").insert({
                    "user_id": user_id,
                    "contact_id": contact["id"],
                    "purpose": "welcome",
                    "draft_text": draft_text,
                    "status": "pending",
                    "requires_approval": policy.requires_approval
                }).execute()
                if result.data:
                    saved_draft = result.data[0]
                
                supabase.table("agent_runs").insert({
                    "user_id": user_id,
                    "workflow_name": "welcome",
                    "status": "success" if policy.allowed else "policy_blocked",
                    "input_summary": {"contact_id": contact["id"], "source": contact.get("source")},
                    "output_summary": {"draft_length": len(draft_text), "policy": policy.dict()}
                }).execute()
            except Exception as e:
                print(f"DB save error: {e}")
        
        return {
            "status": "success",
            "draft": {
                "id": saved_draft["id"] if saved_draft else f"temp-{int(datetime.utcnow().timestamp()*1000)}",
                "contact_id": contact.get("id"),
                "purpose": "welcome",
                "draft_text": draft_text,
                "requires_approval": policy.requires_approval,
                "classification": policy.classification,
                "risk_level": policy.risk_level
            },
            "policy": policy.dict(),
            "contact": {
                "id": contact.get("id"),
                "full_name": contact.get("full_name"),
                "headline": contact.get("headline")
            }
        }
    except Exception as e:
        print(f"Welcome error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
