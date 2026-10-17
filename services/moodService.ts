import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { MoodLog } from '../types/database';
import { moodScale } from '../utils/mood';

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

export const getMoodLogs = async (userId: string): Promise<MoodLog[]> => {
  const { data, error } = await supabase.from('mood_logs').select('*').eq('user_id', userId).order('log_date', { ascending: true });
  if (error) throw error;
  return (data ?? []) as MoodLog[];
};

export const migrateMoodScores = async (userId: string): Promise<void> => {
  const { data, error } = await supabase.from('mood_logs').select('id,mood_score,energy_score').eq('user_id', userId);
  if (error) throw error;
  for (const row of (data ?? []) as Array<{ id: string; mood_score: number | null; energy_score: number | null }>) {
    const mood = moodScale(row.mood_score);
    const energy = moodScale(row.energy_score);
    if (mood === row.mood_score && energy === row.energy_score) continue;
    const { error: updateError } = await supabase
      .from('mood_logs')
      .update({ mood_score: mood, energy_score: energy })
      .eq('user_id', userId)
      .eq('id', row.id);
    if (updateError) throw updateError;
  }

  const journals = await supabase.from('journal_entries').select('id,mood_score').eq('user_id', userId);
  if (journals.error) throw journals.error;
  for (const row of (journals.data ?? []) as Array<{ id: string; mood_score: number | null }>) {
    const mood = moodScale(row.mood_score);
    if (mood === row.mood_score) continue;
    const { error: updateError } = await supabase.from('journal_entries').update({ mood_score: mood }).eq('user_id', userId).eq('id', row.id);
    if (updateError) throw updateError;
  }
};
