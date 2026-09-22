import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

const PHILIP_USER_ID = '00000000-0000-0000-0000-000000000001';

export async function GET(req: NextRequest) {
  try {
    const supabase = (() => {
      try { return createServerSupabase(); } catch { return null; }
    })();

    const clientIdConfigured = !!process.env.LINKEDIN_CLIENT_ID;
    const clientSecretConfigured = !!process.env.LINKEDIN_CLIENT_SECRET;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI || (process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/linkedin/callback` : 'https://personal-linkedin-agent.vercel.app/api/auth/linkedin/callback');

    if (!supabase) {
      return NextResponse.json({
        connected: false,
        status: 'not_configured',
        message: 'Supabase not configured',
        oauth_configured: clientIdConfigured && clientSecretConfigured,
        client_id_configured: clientIdConfigured,
        redirect_uri: redirectUri,
        required_env: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET', 'LINKEDIN_REDIRECT_URI'],
        setup_guide: 'See docs/OAUTH_SETUP.md',
        docs: 'https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2'
      });
    }

    const { data, error } = await supabase
      .from('integration_connections')
      .select('*')
      .eq('user_id', PHILIP_USER_ID)
      .eq('provider', 'linkedin_oidc')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json({
        connected: false,
        status: 'not_connected',
        message: 'Not connected — click Connect LinkedIn to authorize',
        oauth_configured: clientIdConfigured && clientSecretConfigured,
        client_id_configured: clientIdConfigured,
        client_secret_configured: clientSecretConfigured,
        redirect_uri: redirectUri,
        required_env: clientIdConfigured ? [] : ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET', 'LINKEDIN_REDIRECT_URI'],
        setup_guide: 'See docs/OAUTH_SETUP.md',
        docs: 'https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2',
        capabilities: {
          real: ['OAuth login via OIDC (openid, profile, email)', 'Read lite profile via userinfo', 'Post as member via w_member_social (optional)'],
          blocked: ['Full connections list (requires partner approval, closed)', 'Real-time connection detection (no webhook for personal)', 'Read inbox (closed)', 'Automated DM sending (prohibited even for partners)'],
          fallback: ['Manual intake for connections/messages', 'Approval-required manual send via LinkedIn UI']
        }
      });
    }

    const profile = data.profile_data || {};
    const expiresAtStr = profile.expires_at;
    let isExpired = false;
    let expiresInDays: number | null = null;

    if (expiresAtStr) {
      try {
        const expiresAt = new Date(expiresAtStr);
        isExpired = new Date() > expiresAt;
        const diffMs = expiresAt.getTime() - Date.now();
        expiresInDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      } catch {}
    }

    const connected = data.connection_status === 'connected' && !isExpired;

    return NextResponse.json({
      connected,
      status: isExpired ? 'expired' : data.connection_status,
      message: isExpired ? 'Connection expired — please reconnect' : connected ? 'Connected' : 'Not connected',
      profile: {
        name: profile.name,
        given_name: profile.given_name,
        family_name: profile.family_name,
        email: profile.email,
        email_verified: profile.email_verified,
        picture: profile.picture,
        sub: profile.linkedin_sub,
        locale: profile.locale,
      },
      scopes: data.scopes || [],
      expires_at: profile.expires_at,
      expires_in_days: expiresInDays,
      is_expired: isExpired,
      last_sync: profile.last_sync,
      last_updated: data.updated_at,
      oauth_configured: clientIdConfigured && clientSecretConfigured,
      client_id_configured: clientIdConfigured,
      client_secret_configured: clientSecretConfigured,
      redirect_uri: redirectUri,
      integration_id: data.id,
      capabilities: {
        real: ['OAuth login via OIDC (openid, profile, email)', 'Read lite profile via userinfo', 'Post as member via w_member_social (optional)'],
        blocked: ['Full connections list (requires partner approval, closed)', 'Real-time connection detection (no webhook for personal)', 'Read inbox (closed)', 'Automated DM sending (prohibited even for partners)'],
        fallback: ['Manual intake for connections/messages', 'Approval-required manual send via LinkedIn UI']
      },
      docs: {
        oauth: 'https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2',
        messages: 'https://learn.microsoft.com/en-us/linkedin/shared/integrations/communications/messages',
        getting_access: 'https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, connected: false, status: 'error' }, { status: 500 });
  }
}
