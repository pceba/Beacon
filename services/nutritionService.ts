import { MealTemplate, NutritionLog } from '../types/database';
import { supabase } from '../lib/supabase';
import { Range } from './range';

// range acota logged_at (ISO). limit, para sugerencias de lo último apuntado.
export const getNutritionLogs = async (userId: string, range?: Range, limit?: number): Promise<NutritionLog[]> => {
  let query = supabase.from('nutrition_logs').select('*').eq('user_id', userId);
  if (range?.from) query = query.gte('logged_at', range.from);
  if (range?.to) query = query.lte('logged_at', range.to);
  const ordered = query.order('logged_at', { ascending: false });
  const { data, error } = await (limit ? ordered.limit(limit) : ordered);
  if (error) throw error;
  return (data ?? []) as NutritionLog[];
};

export const getNutritionLogById = async (userId: string, id: string): Promise<NutritionLog | null> => {
  const { data, error } = await supabase.from('nutrition_logs').select('*').eq('user_id', userId).eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as NutritionLog | null) ?? null;
};

export const createNutritionLog = async (
  userId: string,
  payload: Omit<NutritionLog, 'id' | 'user_id' | 'logged_at'> & { logged_at?: string },
): Promise<NutritionLog> => {
  const { data, error } = await supabase.from('nutrition_logs').insert({ user_id: userId, ...payload }).select('*').single();
  if (error) throw error;
  return data as NutritionLog;
};

export const updateNutritionLog = async (
  userId: string,
  id: string,
  payload: Partial<Omit<NutritionLog, 'id' | 'user_id'>>,
): Promise<NutritionLog> => {
  const { data, error } = await supabase.from('nutrition_logs').update(payload).eq('user_id', userId).eq('id', id).select('*').single();
  if (error) throw error;
  return data as NutritionLog;
};

export const deleteNutritionLog = async (userId: string, id: string): Promise<void> => {
  const { error } = await supabase.from('nutrition_logs').delete().eq('user_id', userId).eq('id', id);
  if (error) throw error;
};

export const getMealTemplates = async (userId: string): Promise<MealTemplate[]> => {
  const { data, error } = await supabase.from('meal_templates').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MealTemplate[];
};

export const createMealTemplate = async (
  userId: string,
  payload: Omit<MealTemplate, 'id' | 'user_id' | 'created_at'>,
): Promise<MealTemplate> => {
  const { data, error } = await supabase.from('meal_templates').insert({ user_id: userId, ...payload }).select('*').single();
  if (error) throw error;
  return data as MealTemplate;
};

export const deleteMealTemplate = async (userId: string, id: string): Promise<void> => {
  const { error } = await supabase.from('meal_templates').delete().eq('user_id', userId).eq('id', id);
  if (error) throw error;
};
