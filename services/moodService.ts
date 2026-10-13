import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { MoodLog } from '../types/database';

export const getMoodLog = async (userId: string, date: Date): Promise<MoodLog | null> => {
  const logDate = format(date, 'yyyy-MM-dd');
  const { data, error } = await supabase.from('mood_logs').select('*').eq('user_id', userId).eq('log_date', logDate).maybeSingle();
  if (error) throw error;
  return (data as MoodLog | null) ?? null;
};

export const upsertMoodLog = async (
  userId: string,
  payload: Pick<MoodLog, 'mood_score' | 'energy_score' | 'notes'> & { log_date: string },
): Promise<MoodLog> => {
  const { data, error } = await supabase
    .from('mood_logs')
    .upsert({ user_id: userId, ...payload }, { onConflict: 'user_id,log_date' })
    .select('*')
    .single();
  if (error) throw error;
  return data as MoodLog;
};
