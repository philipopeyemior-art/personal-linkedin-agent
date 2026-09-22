from fastapi import APIRouter, HTTPException
from ..schemas import IntakeRequest
from ..config import normalize_user_id
from ..database import get_service_supabase
from datetime import datetime

router = APIRouter()

@router.post("/intake")
async def intake(req: IntakeRequest):
    try:
        user_id = normalize_user_id(req.user_id)
        supabase = get_service_supabase()
        
        if not supabase:
            return {
                "status": "success_mock",
                "message": "Intake received (mock - no DB configured)",
                "contact": {"id": f"mock-{int(datetime.utcnow().timestamp()*1000)}", "full_name": req.full_name}
            }
        
        contact = None
        
        if req.contact_id:
            try:
                result = supabase.table("contacts").select("*").eq("id", req.contact_id).single().execute()
                if result.data:
                    contact = result.data
            except Exception as e:
                print(f"Fetch contact error: {e}")
        
        if not contact and req.full_name:
            existing = None
            if req.profile_url:
                try:
                    result = supabase.table("contacts").select("*").eq("profile_url", req.profile_url).eq("user_id", user_id).single().execute()
                    existing = result.data
                except:
                    pass
            
            if existing:
                contact = existing
                if req.relationship_notes or req.headline:
                    try:
                        supabase.table("contacts").update({
                            "headline": req.headline or existing.get("headline"),
                            "relationship_notes": req.relationship_notes or existing.get("relationship_notes"),
                            "updated_at": datetime.utcnow().isoformat()
                        }).eq("id", existing["id"]).execute()
                    except Exception as e:
                        print(f"Update error: {e}")
            else:
                try:
                    result = supabase.table("contacts").insert({
                        "user_id": user_id,
                        "full_name": req.full_name,
                        "headline": req.headline,
                        "profile_url": req.profile_url,
                        "relationship_notes": req.relationship_notes,
                        "source": req.source
                    }).execute()
                    if result.data:
                        contact = result.data[0]
                except Exception as e:
                    print(f"Insert error: {e}")
                    raise HTTPException(status_code=500, detail=str(e))
        
        if not contact:
            raise HTTPException(status_code=400, detail="Contact not found and full_name required to create")
        
        if req.type and req.content:
            kind_map = {
                "connection": "connection",
                "message": "incoming_message",
                "note": "note",
                "outgoing": "outgoing_message"
            }
            try:
                supabase.table("interactions").insert({
                    "user_id": user_id,
                    "contact_id": contact["id"],
                    "kind": kind_map.get(req.type, "note"),
                    "source": req.source,
                    "content": req.content,
                    "occurred_at": datetime.utcnow().isoformat()
                }).execute()
            except Exception as e:
                print(f"Interaction insert error: {e}")
        
        return {
            "status": "success",
            "contact": contact,
            "message": f"Contact {contact['id']} processed successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Intake error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
