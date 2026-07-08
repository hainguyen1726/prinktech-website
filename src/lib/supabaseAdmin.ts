import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Client dùng cho Server-side (Bypass RLS)
export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder-supabase-url.supabase.co', 
  supabaseServiceKey || 'placeholder-service-role-key', 
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'printing'
    }
  }
);
