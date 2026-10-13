import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { WaterLog } from '../types/database';

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
