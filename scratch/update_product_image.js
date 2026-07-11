const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually to get Supabase credentials
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    // remove quotes if any
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    env[key] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'printing' }
});

async function main() {
  const slug = 'tem-decal-binh-giu-nhiet-uv-dtf-noi';
  const newImageUrl = '/images/hero_official_mockup.webp';
  
  console.log(`Updating image_url for product slug "${slug}" to "${newImageUrl}"...`);
  
  const { data, error } = await supabase
    .from('web_products')
    .update({ image_url: newImageUrl })
    .eq('slug', slug)
    .select();
    
  if (error) {
    console.error('Update failed:', error);
    process.exit(1);
  }
  
  console.log('Update successful! Result:', data);
}

main();
