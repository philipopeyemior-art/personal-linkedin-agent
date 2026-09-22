import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import crypto from 'crypto';

const PHILIP_USER_ID = '00000000-0000-0000-0000-000000000001';

function normalizeUserId(userId: string) {
  if (!userId || userId === 'philip') return PHILIP_USER_ID;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) return userId;
  return PHILIP_USER_ID;
}

function hashDraft(draftText: string, recipient: string, purpose: string) {
  return crypto.createHash('sha256').update(`${draftText}|${recipient}|${purpose}`).digest('hex');
}

export async function GET(req: NextRequest) {
  try {
    const userId = normalizeUserId(req.nextUrl.searchParams.get('user_id') || 'philip');
    const status = req.nextUrl.searchParams.get('status');
    const supabase = (() => {
      try { return createServerSupabase(); } catch { return null; }
    })();

    if (!supabase) {
      return NextResponse.json({ drafts: [], count: 0 });
    }

    let query = supabase
      .from('drafts')
      .select('*, contacts(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ drafts: data || [], count: data?.length || 0 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, drafts: [] }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, action, draft_text } = body; // action: approve, reject, edit, sent_manually
    const supabase = createServerSupabase();

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    // Fetch existing draft to check binding
    const { data: existing } = await supabase.from('drafts').select('*').eq('id', id).single();
    if (!existing) return NextResponse.json({ error: 'Draft not found' }, { status: 404 });

    let update: any = {};

    if (action === 'approve') {
      // Bind approval to exact draft text hash
      const hash = hashDraft(existing.draft_text, existing.contact_id, existing.purpose);
      update = {
        status: 'approved',
        approved_at: new Date().toISOString(),
      };
      // Store hash in audit? For MVP, just update
    } else if (action === 'reject') {
      update = { status: 'rejected' };
    } else if (action === 'edit') {
      if (!draft_text) return NextResponse.json({ error: 'draft_text required for edit' }, { status: 400 });
      // Editing invalidates approval
      update = {
        draft_text,
        status: 'pending',
        approved_at: null,
      };
    } else if (action === 'sent_manually') {
      update = {
        status: 'sent_manually',
        sent_at: new Date().toISOString(),
      };
    } else if (action === 'expired') {
      update = { status: 'expired' };
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { data, error } = await supabase.from('drafts').update(update).eq('id', id).select().single();
    if (error) throw error;

    // Audit log
    try {
      await supabase.from('audit_logs').insert({
        user_id: existing.user_id,
        action: `draft_${action}`,
        resource_type: 'draft',
        resource_id: id,
        details: { purpose: existing.purpose, action, draft_hash: hashDraft(existing.draft_text, existing.contact_id, existing.purpose) }
      });
    } catch {}

    return NextResponse.json({ draft: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
