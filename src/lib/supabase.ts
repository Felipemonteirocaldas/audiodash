import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Only create a real client if credentials are properly configured
let supabase: SupabaseClient | null = null;
let isConfigured = false;

if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('example') && supabaseAnonKey !== 'dummy_key') {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    isConfigured = true;
    console.log('[Supabase] Client initialized with URL:', supabaseUrl);
  } catch (err) {
    console.error('[Supabase] Failed to create client:', err);
  }
} else {
  console.warn('[Supabase] Credentials not configured. Running in offline-only mode.');
}

export { supabase, isConfigured };
