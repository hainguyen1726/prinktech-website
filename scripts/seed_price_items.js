const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value.trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'printing' },
});

const priceItemsToSeed = [
  {
    material_name: 'In theo mét dài (Khổ 60cm)',
    unit: 'mét',
    sort_order: 1,
    price_sheet: [
      { min: 1, max: 1.9, price: 290000 },
      { min: 2, max: 5, price: 250000 },
      { min: 6, max: 20, price: 190000 },
      { min: 21, max: 30, price: 170000 },
      { min: 30, max: 49, price: 160000 },
      { min: 50, max: null, price: 145000 },
    ]
  },
  {
    material_name: 'In tờ A4 (20×28cm)',
    unit: 'tờ',
    sort_order: 2,
    price_sheet: [
      { min: 1, max: 4, price: 45000 },
      { min: 5, max: 49, price: 39000 },
      { min: 50, max: null, price: 28000 },
    ]
  },
  {
    material_name: 'In tờ A3 (29×40cm)',
    unit: 'tờ',
    sort_order: 3,
    price_sheet: [
      { min: 1, max: 4, price: 80000 },
      { min: 5, max: 49, price: 65000 },
      { min: 50, max: null, price: 50000 },
    ]
  },
  {
    material_name: 'Tem nhỏ (dưới 3×3cm) – Cắt bế sẵn',
    unit: 'chiếc',
    sort_order: 4,
    price_sheet: [
      { min: 20, max: 49, price: 2500 },
      { min: 50, max: 100, price: 1600 },
      { min: 200, max: 999, price: 1100 },
      { min: 1000, max: null, price: 500 },
    ]
  },
  {
    material_name: 'Tem trung bình (4×4–5×5cm) – Cắt bế sẵn',
    unit: 'chiếc',
    sort_order: 5,
    price_sheet: [
      { min: 20, max: 49, price: 4000 },
      { min: 50, max: 199, price: 2800 },
      { min: 200, max: 999, price: 1900 },
      { min: 1000, max: null, price: 1300 },
    ]
  },
  {
    material_name: 'Tem lớn (6×6–8×8cm) – Cắt bế sẵn',
    unit: 'chiếc',
    sort_order: 6,
    price_sheet: [
      { min: 20, max: 49, price: 7000 },
      { min: 50, max: 199, price: 4800 },
      { min: 200, max: 999, price: 3200 },
      { min: 1000, max: null, price: 2400 },
    ]
  }
];

async function run() {
  console.log('Seeding / updating web_price_items in Supabase...');
  for (const item of priceItemsToSeed) {
    const { data: existing } = await supabaseAdmin
      .from('web_price_items')
      .select('id')
      .eq('material_name', item.material_name)
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin
        .from('web_price_items')
        .update({
          unit: item.unit,
          price_sheet: item.price_sheet,
          sort_order: item.sort_order,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
      if (error) console.error('Error updating:', item.material_name, error);
      else console.log('Updated:', item.material_name);
    } else {
      const { error } = await supabaseAdmin
        .from('web_price_items')
        .insert(item);
      if (error) console.error('Error inserting:', item.material_name, error);
      else console.log('Inserted:', item.material_name);
    }
  }
  console.log('Done!');
}

run();
