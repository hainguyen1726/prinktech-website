// update_legacy_orders.mjs
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
  console.log('Starting migration to tag standard orders as prinktech...');
  
  // 1. Lấy danh sách khách hàng lẻ (standard)
  const { data: partners, error: pErr } = await supabase
    .from('partners')
    .select('id, name')
    .eq('partner_type', 'standard');

  if (pErr) {
    console.error('Error fetching partners:', pErr);
    return;
  }

  const partnerIds = partners.map(p => p.id);
  console.log(`Found ${partners.length} standard partners:`, partners.map(p => p.name).join(', '));

  if (partnerIds.length === 0) {
    console.log('No standard partners found.');
    return;
  }

  // 2. Lấy danh sách đơn hàng của khách hàng lẻ
  const { data: orders, error: oErr } = await supabase
    .from('orders')
    .select('id, order_code, tags, partner_id')
    .in('partner_id', partnerIds);

  if (oErr) {
    console.error('Error fetching orders:', oErr);
    return;
  }

  console.log(`Found ${orders.length} orders belonging to standard partners.`);

  // 3. Cập nhật tag 'prinktech' cho các đơn hàng này
  let updatedCount = 0;
  for (const order of orders) {
    const currentTags = Array.isArray(order.tags) ? order.tags : [];
    if (!currentTags.includes('prinktech')) {
      const newTags = [...currentTags, 'prinktech'];
      const { error: uErr } = await supabase
        .from('orders')
        .update({ tags: newTags })
        .eq('id', order.id);

      if (uErr) {
        console.error(`Error updating order ${order.order_code}:`, uErr.message);
      } else {
        console.log(`✅ Added 'prinktech' tag to order ${order.order_code}.`);
        updatedCount++;
      }
    } else {
      console.log(`ℹ️ Order ${order.order_code} already has 'prinktech' tag.`);
    }
  }
  
  console.log(`Migration complete. Updated ${updatedCount} orders.`);
}

main().catch(console.error);
