import { supabase } from './supabase';

export const DELETION_GRACE_PERIOD_DAYS = 30;

export async function getDeletionStatus(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('deleted_at')
    .eq('id', userId)
    .maybeSingle();
  return data?.deleted_at ?? null;
}

export async function requestAccountDeletion(userId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
  await supabase.auth.signOut();
}

export async function restoreAccount(userId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ deleted_at: null })
    .eq('id', userId);
  if (error) throw error;
}

export function deletionCompletesAt(deletedAt: string): Date {
  const completesAt = new Date(deletedAt);
  completesAt.setDate(completesAt.getDate() + DELETION_GRACE_PERIOD_DAYS);
  return completesAt;
}
