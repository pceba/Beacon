import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { WaterLog } from '../types/database';
import { Range } from './range';

// range acota log_date ('yyyy-MM-dd').
export const getWaterLogs = async (userId: string, range?: Range): Promise<WaterLog[]> => {
  let query = supabase.from('water_logs').select('*').eq('user_id', userId);
  if (range?.from) query = query.gte('log_date', range.from);
  if (range?.to) query = query.lte('log_date', range.to);
  const { data, error } = await query.order('log_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as WaterLog[];
};

export const getWaterLog = async (userId: string, date: Date): Promise<WaterLog | null> => {
  const logDate = format(date, 'yyyy-MM-dd');
  const { data, error } = await supabase.from('water_logs').select('*').eq('user_id', userId).eq('log_date', logDate).maybeSingle();
  if (error) throw error;
  return (data as WaterLog | null) ?? null;
};

export const upsertWaterLog = async (userId: string, log_date: string, amount_ml: number): Promise<WaterLog> => {
  const { data, error } = await supabase
    .from('water_logs')
    .upsert({ user_id: userId, log_date, amount_ml }, { onConflict: 'user_id,log_date' })
    .select('*')
    .single();
  if (error) throw error;
  return data as WaterLog;
};

export const addWater = async (userId: string, date: Date, amountToAdd: number): Promise<WaterLog> => {
  const logDate = format(date, 'yyyy-MM-dd');
  const current = await getWaterLog(userId, date);
  const next = (current?.amount_ml ?? 0) + amountToAdd;
  return upsertWaterLog(userId, logDate, next);
};
