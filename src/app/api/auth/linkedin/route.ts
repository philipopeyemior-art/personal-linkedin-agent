import { NextRequest, NextResponse } from 'next/server';
import { generateState, getLinkedInAuthUrl } from '@/lib/linkedin';

export async function GET(req: NextRequest) {
  try {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    
    if (!clientId) {
      return NextResponse.json({
        error: 'LinkedIn OAuth not configured',
        message: 'Set LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_REDIRECT_URI in Vercel env vars. See docs/OAUTH_SETUP.md',
        setup_guide: '/docs/OAUTH_SETUP.md',
        required_env: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET', 'LINKEDIN_REDIRECT_URI'],
        docs: 'https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2'
      }, { status: 500 });
    }

    const state = generateState();
    
    // Store state in secure cookie for CSRF protection
    const response = NextResponse.json({
      auth_url: getLinkedInAuthUrl(state),
      state,
      message: 'Redirect to auth_url to connect LinkedIn'
    });

    // For API usage, also return redirect option
    const redirect = req.nextUrl.searchParams.get('redirect');
    if (redirect === 'true') {
      const authUrl = getLinkedInAuthUrl(state);
      const redirectResponse = NextResponse.redirect(authUrl);
      redirectResponse.cookies.set('linkedin_oauth_state', state, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 600, // 10 min
        path: '/',
      });
      return redirectResponse;
    }

    response.cookies.set('linkedin_oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
