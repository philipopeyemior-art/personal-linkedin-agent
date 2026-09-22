from fastapi import APIRouter, HTTPException
from ..schemas import ReplyRequest
from ..config import normalize_user_id
from ..database import get_service_supabase
from ..prompts import build_reply_prompt
from ..agent import generate_with_llm
from ..policy import check_draft_policy, classify_incoming_message, is_prompt_injection
from datetime import datetime

router = APIRouter()

@router.post("/reply")
async def generate_reply(req: ReplyRequest):
    try:
        user_id = normalize_user_id(req.user_id)
        supabase = get_service_supabase()
        
        contact = req.contact_data.dict() if req.contact_data else {"id": req.contact_id, "full_name": req.full_name or "Contact", "headline": req.headline or ""}
        history = req.conversation_history or []
        
        if supabase and req.contact_id:
            try:
                cdata = supabase.table("contacts").select("*").eq("id", req.contact_id).single().execute()
                if cdata.data:
                    contact = cdata.data
                interactions = supabase.table("interactions").select("*").eq("contact_id", req.contact_id).order("created_at", desc=True).limit(10).execute()
                if interactions.data:
                    history = interactions.data
            except Exception as e:
                print(f"Fetch error: {e}")
        
        classification = classify_incoming_message(req.incoming_message)
        is_injection = is_prompt_injection(req.incoming_message)
        if is_injection:
            classification = "sensitive_or_unclear"
        
        is_sensitive = classification in ['sales_or_negotiation', 'job_or_recruiter', 'sensitive_or_unclear']
        
        prompt = build_reply_prompt(contact, history, req.incoming_message)
        draft_text = await generate_with_llm(prompt, temperature=0.75, max_tokens=400)
        policy = check_draft_policy(draft_text, "reply", contact)
        
        interaction_id = None
        if supabase and req.contact_id:
            try:
                result = supabase.table("interactions").insert({
                    "user_id": user_id,
                    "contact_id": req.contact_id,
                    "kind": "incoming_message",
                    "source": req.source or "manual",
                    "external_event_id": req.external_event_id,
                    "content": req.incoming_message,
                    "summary": classification
                }).execute()
                if result.data:
                    interaction_id = result.data[0]["id"]
            except Exception as e:
                print(f"Interaction save error: {e}")
        
        saved_draft = None
        if supabase and req.contact_id:
            try:
                result = supabase.table("drafts").insert({
                    "user_id": user_id,
                    "contact_id": req.contact_id,
                    "interaction_id": interaction_id,
                    "purpose": f"reply_{classification}",
                    "draft_text": draft_text,
                    "status": "pending",
                    "requires_approval": True
                }).execute()
                if result.data:
                    saved_draft = result.data[0]
                
                supabase.table("agent_runs").insert({
                    "user_id": user_id,
                    "workflow_name": "reply",
                    "status": "success",
                    "input_summary": {"contact_id": req.contact_id, "classification": classification, "incoming_length": len(req.incoming_message), "is_injection": is_injection},
                    "output_summary": {"draft_length": len(draft_text), "policy": policy.dict(), "classification": classification}
                }).execute()
            except Exception as e:
                print(f"Draft save error: {e}")
        
        return {
            "status": "success",
            "classification": classification,
            "draft": {
                "id": saved_draft["id"] if saved_draft else f"temp-{int(datetime.utcnow().timestamp()*1000)}",
                "contact_id": req.contact_id,
                "purpose": f"reply_{classification}",
                "draft_text": draft_text,
                "requires_approval": True,
                "classification": classification,
                "risk_level": "medium" if is_sensitive else policy.risk_level
            },
            "policy": policy.dict(),
            "needs_review": is_sensitive or policy.risk_level != "low" or is_injection,
            "is_prompt_injection": is_injection,
            "contact": {"id": contact.get("id"), "full_name": contact.get("full_name")}
        }
    except Exception as e:
        print(f"Reply error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
