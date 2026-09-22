export type DraftStatus = 'pending' | 'approved' | 'sent_manually' | 'sent_via_authorized_api' | 'rejected' | 'expired';
export type InteractionKind = 'connection' | 'incoming_message' | 'outgoing_message' | 'follow_up' | 'note';

export interface Contact {
  id: string;
  user_id: string;
  linkedin_member_id?: string | null;
  profile_url?: string | null;
  full_name?: string | null;
  headline?: string | null;
  relationship_notes?: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface Interaction {
  id: string;
  user_id: string;
  contact_id: string;
  kind: InteractionKind;
  source: string;
  external_event_id?: string | null;
  occurred_at?: string | null;
  content?: string | null;
  summary?: string | null;
  created_at: string;
}

export interface Draft {
  id: string;
  user_id: string;
  contact_id: string;
  interaction_id?: string | null;
  purpose: string;
  draft_text: string;
  status: DraftStatus;
  requires_approval: boolean;
  approved_at?: string | null;
  sent_at?: string | null;
  expires_at?: string | null;
  created_at: string;
  contacts?: Contact;
}

export interface FollowUp {
  id: string;
  user_id: string;
  contact_id: string;
  due_at: string;
  reason: string;
  status: string;
  created_at: string;
  contacts?: Contact;
}

export interface AgentRun {
  id: string;
  user_id: string;
  workflow_name: string;
  status: string;
  input_summary?: any;
  output_summary?: any;
  error_message?: string | null;
  started_at: string;
  completed_at?: string | null;
}

export interface BriefingItem {
  contact_id: string;
  contact_name?: string;
  reason: string;
  draft: string;
  requires_approval: boolean;
  context_summary?: string;
}
