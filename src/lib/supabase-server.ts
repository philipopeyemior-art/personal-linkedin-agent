import { createClient } from '@supabase/supabase-js';

export function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
  }

  // Prefer service role for server-side operations
  const key = serviceKey || anonKey;
  if (!key) {
    throw new Error('Supabase key missing');
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });
}

// Mock storage for demo when Supabase not configured
export const mockStorage = {
  contacts: [] as any[],
  drafts: [] as any[],
  interactions: [] as any[],
  followups: [] as any[],
  agent_runs: [] as any[],
};
