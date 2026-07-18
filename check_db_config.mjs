// check_db_config.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve('.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = Object.fromEntries(
  envContent.split('\n')
    .filter(line => line.includes('=') && !line.startsWith('#'))
    .map(line => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const sql = `
    SELECT 
        tc.table_schema, 
        tc.table_name, 
        kcu.column_name
    FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND ccu.table_schema = 'printing'
      AND ccu.table_name = 'partners'
  `;
  const { data, error } = await supabase.rpc('run_sql', { sql });
  if (error) {
    console.error('Lỗi chạy SQL:', error);
  } else {
    console.log('Các bảng liên kết khóa ngoại trỏ tới partners:', data);
  }
}

main().catch(console.error);
