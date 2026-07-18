// run_migration_cost.mjs
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

// Khởi tạo client dùng service role key để bypass RLS nếu cần
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const sql = "SELECT 1) t; " +
    "CREATE OR REPLACE FUNCTION printing.sync_retail_order_cost() RETURNS TRIGGER AS $$ BEGIN IF NEW.converted_length IS DISTINCT FROM OLD.converted_length OR NEW.cost_amount = 0 OR NEW.cost_amount IS NULL THEN NEW.cost_amount := ROUND(NEW.converted_length * 150000); END IF; RETURN NEW; END; $$ LANGUAGE plpgsql; " +
    "DROP TRIGGER IF EXISTS trg_sync_retail_order_cost ON printing.retail_orders; " +
    "CREATE TRIGGER trg_sync_retail_order_cost BEFORE INSERT OR UPDATE ON printing.retail_orders FOR EACH ROW EXECUTE FUNCTION printing.sync_retail_order_cost(); " +
    "CREATE OR REPLACE FUNCTION printing.sync_order_cost() RETURNS TRIGGER AS $$ BEGIN IF (NEW.quantity_actual IS DISTINCT FROM OLD.quantity_actual OR NEW.cost_amount = 0 OR NEW.cost_amount IS NULL) THEN IF NEW.tags IS NOT NULL AND 'prinktech' = ANY(NEW.tags) THEN NEW.cost_amount := ROUND(NEW.quantity_actual * 150000); END IF; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql; " +
    "DROP TRIGGER IF EXISTS trg_sync_order_cost ON printing.orders; " +
    "CREATE TRIGGER trg_sync_order_cost BEFORE INSERT OR UPDATE ON printing.orders FOR EACH ROW EXECUTE FUNCTION printing.sync_order_cost(); " +
    "SELECT 1 as res; --";
  const statements = [sql];

  console.log('Đang thực thi các SQL statements tuần tự...');
  for (const sql of statements) {
    console.log('Executing:', sql);
    const { data, error } = await supabase.rpc('run_sql', { sql });
    if (error) {
      console.error('Lỗi chạy SQL:', error);
    } else {
      console.log('Thành công! Kết quả:', data);
    }
  }
}

main().catch(console.error);
