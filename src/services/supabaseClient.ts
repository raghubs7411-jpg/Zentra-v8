import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client — reads config from environment variables.
 * Copy .env.example to .env and fill in your project URL and anon key.
 *
 * Get these from: Supabase Dashboard → Settings → API
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase env vars not set. Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. App will fall back to localStorage mode.'
  );
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: { eventsPerSecond: 10 },
      },
    })
  : null;
