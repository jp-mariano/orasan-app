import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase admin client using the service role key
 * This bypasses Row Level Security (RLS) and should only be used server-side
 * for administrative operations like account deletion
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase credentials. NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set.'
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
