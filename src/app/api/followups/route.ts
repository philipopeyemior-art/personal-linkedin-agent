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

    if (!supabase) return NextResponse.json({ followups: [] });

    const { data, error } = await supabase
      .from('followups')
      .select('*, contacts(*)')
      .eq('user_id', userId)
      .order('due_at', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ followups: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, followups: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = normalizeUserId(body.user_id || 'philip');
    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from('followups')
      .insert({
        user_id: userId,
        contact_id: body.contact_id,
        due_at: body.due_at,
        reason: body.reason,
        status: 'open',
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ followup: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
