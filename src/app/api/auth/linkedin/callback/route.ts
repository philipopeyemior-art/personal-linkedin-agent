import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, getLinkedInUserInfo, encryptToken } from '@/lib/linkedin';
import { createServerSupabase } from '@/lib/supabase-server';

const PHILIP_USER_ID = '00000000-0000-0000-0000-000000000001';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const error = req.nextUrl.searchParams.get('error');
  const errorDescription = req.nextUrl.searchParams.get('error_description');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://personal-linkedin-agent.vercel.app';

  if (error) {
    // User denied or other error
    return NextResponse.redirect(`${appUrl}/settings?linkedin_error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}`);
  }

  if (!code || !state) {
    return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
  }

  // Validate state from cookie (CSRF protection)
  const cookieState = req.cookies.get('linkedin_oauth_state')?.value;
  if (!cookieState || cookieState !== state) {
    return NextResponse.json({ 
      error: 'Invalid state — possible CSRF attack',
      message: 'State mismatch. Please try connecting again without refreshing.',
      cookieState: cookieState ? 'present' : 'missing',
      queryState: state ? 'present' : 'missing'
    }, { status: 403 });
  }

  try {
    // Exchange code for tokens
    const tokenData = await exchangeCodeForToken(code);
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 5184000; // 60 days default
    const idToken = tokenData.id_token;

    if (!accessToken) {
      throw new Error('No access token returned');
    }

    // Get user info
    const userInfo = await getLinkedInUserInfo(accessToken);

    // Store encrypted tokens in Supabase
    const supabase = (() => {
      try { return createServerSupabase(); } catch { return null; }
    })();

    if (supabase) {
      try {
        const encAccess = encryptToken(accessToken);
        const encRefresh = refreshToken ? encryptToken(refreshToken) : null;
        const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

        // Check existing connection
        const { data: existing } = await supabase
          .from('integration_connections')
          .select('*')
          .eq('user_id', PHILIP_USER_ID)
          .eq('provider', 'linkedin_oidc')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        const connData = {
          user_id: PHILIP_USER_ID,
          provider: 'linkedin_oidc',
          scopes: ['openid', 'profile', 'email'],
          connection_status: 'connected',
          updated_at: new Date().toISOString(),
          profile_data: {
            linkedin_sub: userInfo.sub,
            name: userInfo.name,
            given_name: userInfo.given_name,
            family_name: userInfo.family_name,
            email: userInfo.email,
            email_verified: userInfo.email_verified,
            picture: userInfo.picture,
            locale: userInfo.locale,
            access_token_encrypted: encAccess,
            refresh_token_encrypted: encRefresh,
            expires_at: expiresAt,
            refresh_expires_at: refreshToken ? new Date(Date.now() + 31536000 * 1000).toISOString() : null,
            id_token: idToken,
            last_sync: new Date().toISOString(),
          }
        };

        if (existing) {
          await supabase.from('integration_connections').update(connData).eq('id', existing.id);
        } else {
          await supabase.from('integration_connections').insert(connData);
        }

        // Audit log
        try {
          await supabase.from('audit_logs').insert({
            user_id: PHILIP_USER_ID,
            action: 'linkedin_connect',
            resource_type: 'integration',
            details: { linkedin_sub: userInfo.sub, scopes: ['openid', 'profile', 'email'] }
          });
        } catch {}
      } catch (dbError: any) {
        console.error('DB store error:', dbError);
        // Don't fail OAuth if DB fails, just log
      }
    }

    // Clear state cookie and redirect to settings with success
    const response = NextResponse.redirect(`${appUrl}/settings?linkedin_connected=true&name=${encodeURIComponent(userInfo.name || '')}`);
    response.cookies.delete('linkedin_oauth_state');
    response.cookies.set('linkedin_connected', 'true', {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      maxAge: 86400,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(`${appUrl}/settings?linkedin_error=${encodeURIComponent('callback_failed')}&error_description=${encodeURIComponent(error.message)}`);
  }
}
