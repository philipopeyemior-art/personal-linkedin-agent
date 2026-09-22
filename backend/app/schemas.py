from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List, Literal, Any
from datetime import datetime
from enum import Enum

class DraftStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    sent_manually = "sent_manually"
    sent_via_authorized_api = "sent_via_authorized_api"
    rejected = "rejected"
    expired = "expired"

class InteractionKind(str, Enum):
    connection = "connection"
    incoming_message = "incoming_message"
    outgoing_message = "outgoing_message"
    follow_up = "follow_up"
    note = "note"

class ContactBase(BaseModel):
    full_name: str = Field(..., max_length=100)
    headline: Optional[str] = Field(None, max_length=200)
    profile_url: Optional[str] = Field(None, max_length=500)
    relationship_notes: Optional[str] = Field(None, max_length=1000)
    linkedin_member_id: Optional[str] = None
    source: str = "manual"

class ContactCreate(ContactBase):
    user_id: str = "00000000-0000-0000-0000-000000000001"

class ContactResponse(ContactBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

class InteractionCreate(BaseModel):
    contact_id: str
    kind: InteractionKind
    source: str = "manual"
    external_event_id: Optional[str] = None
    content: Optional[str] = Field(None, max_length=5000)
    summary: Optional[str] = None
    occurred_at: Optional[datetime] = None
    user_id: str = "00000000-0000-0000-0000-000000000001"

class DraftCreate(BaseModel):
    contact_id: str
    purpose: str
    draft_text: str = Field(..., max_length=2000)
    status: DraftStatus = DraftStatus.pending
    requires_approval: bool = True
    interaction_id: Optional[str] = None
    user_id: str = "00000000-0000-0000-0000-000000000001"

class DraftResponse(BaseModel):
    id: str
    user_id: str
    contact_id: str
    purpose: str
    draft_text: str
    status: DraftStatus
    requires_approval: bool
    approved_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    created_at: datetime

class BriefingRequest(BaseModel):
    user_id: str = "philip"
    timezone: str = "Africa/Lagos"
    contacts: Optional[List[Any]] = None

class BriefingItem(BaseModel):
    contact_id: str
    reason: str
    draft: str
    requires_approval: bool = True
    context_summary: Optional[str] = None

class BriefingResponse(BaseModel):
    summary: str
    items: List[BriefingItem]
    generated_at: datetime
    timezone: str
    contacts_reviewed: int

class WelcomeRequest(BaseModel):
    contact_id: Optional[str] = None
    contact_data: Optional[ContactBase] = None
    full_name: Optional[str] = None
    headline: Optional[str] = None
    profile_url: Optional[str] = None
    relationship_notes: Optional[str] = None
    source: Optional[str] = "manual"
    extra_context: Optional[str] = None
    user_id: str = "philip"

class ReplyRequest(BaseModel):
    contact_id: Optional[str] = None
    contact_data: Optional[ContactBase] = None
    full_name: Optional[str] = None
    headline: Optional[str] = None
    incoming_message: str = Field(..., max_length=5000)
    conversation_history: Optional[List[Any]] = []
    user_id: str = "philip"
    source: Optional[str] = "manual"
    external_event_id: Optional[str] = None

class IntakeRequest(BaseModel):
    type: Literal["connection", "message", "note", "outgoing"] = "connection"
    full_name: Optional[str] = Field(None, max_length=100)
    headline: Optional[str] = Field(None, max_length=200)
    profile_url: Optional[str] = Field(None, max_length=500)
    relationship_notes: Optional[str] = Field(None, max_length=1000)
    content: Optional[str] = Field(None, max_length=5000)
    contact_id: Optional[str] = None
    user_id: str = "philip"
    source: str = "manual_intake"

class PolicyCheckResult(BaseModel):
    allowed: bool
    requires_approval: bool
    classification: str
    risk_level: Literal["low", "medium", "high"]
    reason: Optional[str] = None

class AgentRunCreate(BaseModel):
    user_id: str
    workflow_name: str
    status: str
    input_summary: Optional[Any] = None
    output_summary: Optional[Any] = None
    error_message: Optional[str] = None

class OAuthCallbackRequest(BaseModel):
    code: str
    state: str

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    timestamp: datetime
    timezone: str
    env: dict
