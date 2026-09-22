import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = typeof window !== 'undefined' || (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder')
  : null as any;

// Server client with service role for API routes
export function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !serviceKey) {
    console.warn('Supabase env vars missing');
    return null;
  }
  
  return createClient(url, serviceKey, {
    auth: { persistSession: false }
  });
}
