// check_table_columns.mjs
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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  db: {
    schema: 'printing'
  }
});

async function main() {
  const { data: p1 } = await supabase
    .from('partners')
    .select('*')
    .eq('id', 'cf133c4d-f5a4-46ca-ac10-ba26d923d71c')
    .single();

  const { data: p2 } = await supabase
    .from('partners')
    .select('*')
    .eq('id', 'c0bfb508-441a-4f3b-a3bc-63e02a18fc35')
    .single();

  console.log('Partner 1 (cf133c4d-f5a4-46ca-ac10-ba26d923d71c):');
  console.log(p1);
  console.log('Partner 2 (c0bfb508-441a-4f3b-a3bc-63e02a18fc35):');
  console.log(p2);
}

main().catch(console.error);
