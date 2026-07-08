import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Client kết nối Supabase dành riêng cho schema 'marketing'
export const supabaseMarketing = createClient(
  supabaseUrl || 'https://placeholder-supabase-url.supabase.co', 
  supabaseServiceKey || 'placeholder-service-role-key', 
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'marketing'
    }
  }
);
