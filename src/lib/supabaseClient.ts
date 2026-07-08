import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Client dùng cho Client Components (Browser-side)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-supabase-url.supabase.co', 
  supabaseAnonKey || 'placeholder-anon-key', 
  {
    db: {
      schema: 'printing'
    }
  }
);
