import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  { db: { schema: 'printing' } }
);

interface LogParams {
  userId: string;
  userName: string;
  action: string;
  targetType: string;
  targetId?: string;
  description: string;
  details?: any;
}

export async function logActivity({
  userId,
  userName,
  action,
  targetType,
  targetId,
  description,
  details
}: LogParams) {
  try {
    await supabase.from('activity_logs').insert({
      user_id: userId,
      user_name: userName,
      action,
      target_type: targetType,
      target_id: targetId || null,
      description,
      details: details || null
    });
  } catch (err) {
    console.error('[activityLogger error]', err);
  }
}
