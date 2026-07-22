import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.length > 0 && value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value.trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceKey, { db: { schema: 'printing' } });

async function checkV2Orders() {
  const { data: orders } = await supabase
    .from('v2_orders')
    .select('id, order_code, customer_name, channel, original_legacy_id, created_at')
    .order('created_at', { ascending: false });

  console.log('Tổng số đơn trong v2_orders:', orders?.length);
  
  const channels: Record<string, number> = {};
  (orders || []).forEach(o => {
    channels[o.channel] = (channels[o.channel] || 0) + 1;
  });

  console.log('Thống kê theo channel:', channels);

  console.log('\n20 đơn đầu tiên đang hiển thị ở Sale Online (channel = sale_online / website):');
  const visible = (orders || []).filter(o => o.channel === 'sale_online' || o.channel === 'website').slice(0, 20);
  console.table(visible);
}

checkV2Orders();
