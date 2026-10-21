import { supabase } from '../lib/supabase';
import { SleepLog } from '../types/database';
import { Range } from './range';

// range acota bed_time (ISO).
export const getSleepLogs = async (userId: string, range?: Range): Promise<SleepLog[]> => {
  let query = supabase.from('sleep_logs').select('*').eq('user_id', userId);
  if (range?.from) query = query.gte('bed_time', range.from);
  if (range?.to) query = query.lte('bed_time', range.to);
  const { data, error } = await query.order('bed_time', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SleepLog[];
};

export const getSleepLogById = async (userId: string, id: string): Promise<SleepLog | null> => {
  const { data, error } = await supabase.from('sleep_logs').select('*').eq('user_id', userId).eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as SleepLog | null) ?? null;
};

// Sueño apuntado hoy (Hoy lo crea con created_at de hoy aunque la noche empiece ayer).
export const getSleepLogCreatedSince = async (userId: string, sinceIso: string): Promise<SleepLog | null> => {
  const { data, error } = await supabase
    .from('sleep_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  return ((data ?? [])[0] as SleepLog | undefined) ?? null;
};

export const createSleepLog = async (
  userId: string,
  payload: Omit<SleepLog, 'id' | 'user_id' | 'created_at'>,
): Promise<SleepLog> => {
  const { data, error } = await supabase.from('sleep_logs').insert({ user_id: userId, ...payload }).select('*').single();
  if (error) throw error;
  return data as SleepLog;
};

export const updateSleepLog = async (
  userId: string,
  id: string,
  payload: Partial<Omit<SleepLog, 'id' | 'user_id' | 'created_at'>>,
): Promise<SleepLog> => {
  const { data, error } = await supabase.from('sleep_logs').update(payload).eq('user_id', userId).eq('id', id).select('*').single();
  if (error) throw error;
  return data as SleepLog;
};

export const deleteSleepLog = async (userId: string, id: string): Promise<void> => {
  const { error } = await supabase.from('sleep_logs').delete().eq('user_id', userId).eq('id', id);
  if (error) throw error;
};
