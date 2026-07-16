import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminOrStaff } from '@/lib/adminAuth';

const mktSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  { db: { schema: 'marketing' } }
);

// PATCH /api/admin/sale-online/revenues/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminOrStaff(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });

  const { id } = await params;
  const body = await req.json();

  const { data, error } = await mktSupabase
    .from('sale_revenues')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// DELETE /api/admin/sale-online/revenues/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminOrStaff(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });

  const { id } = await params;
  const { error } = await mktSupabase.from('sale_revenues').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
