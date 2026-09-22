import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

const PHILIP_USER_ID = '00000000-0000-0000-0000-000000000001';

function normalizeUserId(userId: string) {
  if (!userId || userId === 'philip') return PHILIP_USER_ID;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) return userId;
  return PHILIP_USER_ID;
}

export async function GET(req: NextRequest) {
  try {
    const userId = normalizeUserId(req.nextUrl.searchParams.get('user_id') || 'philip');
    const supabase = (() => {
      try { return createServerSupabase(); } catch { return null; }
    })();

    if (!supabase) {
      return NextResponse.json({
        contacts: 0,
        drafts: 0,
        pending: 0,
        approved: 0,
        sent: 0,
        followups: 0,
        interactions: 0,
        agent_runs: 0,
      });
    }

    const [contacts, drafts, followups, interactions, agentRuns] = await Promise.all([
      supabase.from('contacts').select('id', { count: 'exact' }).eq('user_id', userId),
      supabase.from('drafts').select('id, status', { count: 'exact' }).eq('user_id', userId),
      supabase.from('followups').select('id', { count: 'exact' }).eq('user_id', userId).eq('status', 'open'),
      supabase.from('interactions').select('id', { count: 'exact' }).eq('user_id', userId),
      supabase.from('agent_runs').select('id', { count: 'exact' }).eq('user_id', userId),
    ]);

    const draftsData = drafts.data || [];
    const pending = draftsData.filter((d: any) => d.status === 'pending').length;
    const approved = draftsData.filter((d: any) => d.status === 'approved').length;
    const sent = draftsData.filter((d: any) => d.status === 'sent_manually' || d.status === 'sent_via_authorized_api').length;

    return NextResponse.json({
      contacts: contacts.count || 0,
      drafts: drafts.count || 0,
      pending,
      approved,
      sent,
      followups: followups.count || 0,
      interactions: interactions.count || 0,
      agent_runs: agentRuns.count || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
