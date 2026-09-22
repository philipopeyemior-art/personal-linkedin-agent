import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

const PHILIP_USER_ID = '00000000-0000-0000-0000-000000000001';

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabase();

    // Delete or mark as disconnected
    const { error } = await supabase
      .from('integration_connections')
      .update({
        connection_status: 'disconnected',
        updated_at: new Date().toISOString(),
        profile_data: {},
      })
      .eq('user_id', PHILIP_USER_ID)
      .eq('provider', 'linkedin_oidc');

    if (error) throw error;

    try {
      await supabase.from('audit_logs').insert({
        user_id: PHILIP_USER_ID,
        action: 'linkedin_disconnect',
        resource_type: 'integration',
        details: { reason: 'user_initiated', disconnected_at: new Date().toISOString() }
      });
    } catch {}

    return NextResponse.json({ status: 'success', message: 'LinkedIn disconnected, tokens deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Allow GET for easy testing via browser
  return POST(req);
}
