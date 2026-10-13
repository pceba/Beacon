import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { SleepLog } from '../types/database';

export const getSleepLogs = async (userId: string): Promise<SleepLog[]> => {
  const { data, error } = await supabase.from('sleep_logs').select('*').eq('user_id', userId).order('bed_time', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SleepLog[];
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

export const getSleepLogByDate = async (userId: string, date: Date): Promise<SleepLog | null> => {
  const dateText = format(date, 'yyyy-MM-dd');
  const { data, error } = await supabase
    .from('sleep_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('bed_time', `${dateText}T00:00:00`)
    .lt('bed_time', `${dateText}T23:59:59`)
    .maybeSingle();
  if (error) throw error;
  return (data as SleepLog | null) ?? null;
};
