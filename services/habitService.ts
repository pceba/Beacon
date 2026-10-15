import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { Habit, HabitLog } from '../types/database';

export const getHabits = async (userId: string): Promise<Habit[]> => {
  const { data, error } = await supabase.from('habits').select('*').eq('user_id', userId).order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Habit[];
};

export const createHabit = async (
  userId: string,
  payload: Omit<Habit, 'id' | 'user_id' | 'created_at'>,
): Promise<Habit> => {
  const { data, error } = await supabase.from('habits').insert({ user_id: userId, ...payload }).select('*').single();
  if (error) throw error;
  return data as Habit;
};

export const updateHabit = async (userId: string, id: string, payload: Partial<Habit>): Promise<Habit> => {
  const { data, error } = await supabase.from('habits').update(payload).eq('user_id', userId).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Habit;
};

export const deleteHabit = async (userId: string, id: string): Promise<void> => {
  const { error } = await supabase.from('habits').delete().eq('user_id', userId).eq('id', id);
  if (error) throw error;
};

export const getHabitLogs = async (userId: string, date?: Date): Promise<HabitLog[]> => {
  let query = supabase.from('habit_logs').select('*').eq('user_id', userId).order('log_date', { ascending: false });
  if (date) query = query.eq('log_date', format(date, 'yyyy-MM-dd'));
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as HabitLog[];
};

export const logHabit = async (
  userId: string,
  payload: Omit<HabitLog, 'id' | 'user_id'>,
): Promise<HabitLog> => {
  const { data, error } = await supabase
    .from('habit_logs')
    .upsert({ user_id: userId, ...payload }, { onConflict: 'habit_id,log_date' })
    .select('*')
    .single();
  if (error) throw error;
  return data as HabitLog;
};

export const toggleHabit = async (userId: string, habitId: string, date: Date): Promise<HabitLog> => {
  const logDate = format(date, 'yyyy-MM-dd');
  const { data: existing, error: existingError } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('habit_id', habitId)
    .eq('log_date', logDate)
    .maybeSingle();
  if (existingError) throw existingError;
  return logHabit(userId, {
    habit_id: habitId,
    log_date: logDate,
    completed: !existing?.completed,
    notes: existing?.notes ?? null,
  });
};
