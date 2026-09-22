from fastapi import APIRouter, HTTPException
from ..schemas import BriefingRequest, BriefingResponse, BriefingItem
from ..config import normalize_user_id
from ..database import get_service_supabase
from ..prompts import build_briefing_prompt
from ..agent import generate_with_llm
from datetime import datetime
import json

router = APIRouter()

@router.post("/briefing", response_model=dict)
async def generate_briefing(req: BriefingRequest):
    try:
        user_id = normalize_user_id(req.user_id)
        supabase = get_service_supabase()
        
        contacts = req.contacts or []
        
        if not contacts and supabase:
            try:
                contacts_data = supabase.table("contacts").select("*, interactions(created_at, kind, content, summary)").eq("user_id", user_id).limit(20).execute()
                if contacts_data.data:
                    contacts = [
                        {
                            **c,
                            "last_interaction": c.get("interactions", [{}])[0].get("created_at") if c.get("interactions") else None,
                            "interaction_count": len(c.get("interactions", []))
                        }
                        for c in contacts_data.data
                    ]
                # Overdue followups
                followups = supabase.table("followups").select("*, contacts(*)").eq("user_id", user_id).eq("status", "open").lte("due_at", datetime.utcnow().isoformat()).limit(10).execute()
                if followups.data:
                    for f in followups.data:
                        if not any(c.get("id") == f.get("contact_id") for c in contacts):
                            contacts.append({
                                **(f.get("contacts") or {}),
                                "followup_reason": f.get("reason"),
                                "followup_due": f.get("due_at")
                            })
            except Exception as e:
                print(f"DB fetch error: {e}")
        
        if not contacts:
            return {
                "status": "success",
                "briefing": {
                    "summary": "No contacts to review today. Add some connections to get started!",
                    "items": [],
                    "generated_at": datetime.utcnow().isoformat(),
                    "timezone": req.timezone
                }
            }
        
        contacts_to_review = [
            c for c in contacts
            if c.get("followup_reason") or not c.get("last_interaction") or (
                c.get("last_interaction") and 
                (datetime.utcnow().timestamp() - datetime.fromisoformat(c["last_interaction"].replace("Z", "+00:00")).timestamp()) > 7*24*3600
            )
        ][:10]
        
        prompt = build_briefing_prompt(contacts_to_review)
        llm_response = await generate_with_llm(prompt, json_mode=True, temperature=0.7, max_tokens=1500)
        
        try:
            import re
            json_match = re.search(r'\{[\s\S]*\}', llm_response)
            briefing_data = json.loads(json_match.group(0) if json_match else llm_response)
        except:
            briefing_data = {
                "summary": f"You have {len(contacts_to_review)} contacts to review today.",
                "items": [
                    {
                        "contact_id": c.get("id"),
                        "reason": c.get("followup_reason", "long_time_no_talk"),
                        "draft": f"Hey {c.get('full_name', 'there').split(' ')[0]}! It's been a while — how have things been? I've been building some interesting AI automation projects and would love to catch up!",
                        "requires_approval": True,
                        "context_summary": c.get("followup_reason", "No recent interaction")
                    }
                    for c in contacts_to_review[:3]
                ]
            }
        
        if supabase:
            for item in briefing_data.get("items", []):
                if item.get("contact_id") and item.get("draft"):
                    try:
                        supabase.table("drafts").insert({
                            "user_id": user_id,
                            "contact_id": item["contact_id"],
                            "purpose": f"briefing_{item.get('reason', 'reconnection')}",
                            "draft_text": item["draft"],
                            "status": "pending",
                            "requires_approval": True
                        }).execute()
                    except Exception as e:
                        print(f"Save draft error: {e}")
            try:
                supabase.table("agent_runs").insert({
                    "user_id": user_id,
                    "workflow_name": "morning_briefing",
                    "status": "success",
                    "input_summary": {"contacts_reviewed": len(contacts_to_review), "timezone": req.timezone},
                    "output_summary": briefing_data
                }).execute()
            except Exception as e:
                print(f"Agent run log error: {e}")
        
        return {
            "status": "success",
            "briefing": {
                **briefing_data,
                "generated_at": datetime.utcnow().isoformat(),
                "timezone": req.timezone,
                "contacts_reviewed": len(contacts_to_review)
            }
        }
    except Exception as e:
        print(f"Briefing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/briefing")
async def get_briefing(user_id: str = "philip", timezone: str = "Africa/Lagos"):
    return await generate_briefing(BriefingRequest(user_id=user_id, timezone=timezone))
