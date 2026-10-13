import { MealTemplate, NutritionLog } from '../types/database';
import { supabase } from '../lib/supabase';

export const getNutritionLogs = async (userId: string): Promise<NutritionLog[]> => {
  const { data, error } = await supabase.from('nutrition_logs').select('*').eq('user_id', userId).order('logged_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as NutritionLog[];
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
