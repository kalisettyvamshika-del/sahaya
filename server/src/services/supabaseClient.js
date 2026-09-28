import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!url || !serviceKey) {
  console.warn('⚠️  SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. DB calls will fail.');
}

// Service-role client - bypasses RLS, server only. NEVER expose to frontend.
export const supabaseAdmin = createClient(url || 'http://localhost', serviceKey || 'public', {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Anon client - respects RLS, used for auth flows
export const supabaseAnon = createClient(url || 'http://localhost', anonKey || 'public', {
  auth: { persistSession: false, autoRefreshToken: false },
});
