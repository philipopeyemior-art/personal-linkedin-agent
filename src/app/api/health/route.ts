import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'personal-linkedin-agent',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    timezone: 'Africa/Lagos',
    env: {
      supabase_configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      openai_configured: !!process.env.OPENAI_API_KEY,
    }
  });
}
