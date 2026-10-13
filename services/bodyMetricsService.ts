import { supabase } from '../lib/supabase';
import { BodyMetric } from '../types/database';

export const getBodyMetrics = async (userId: string): Promise<BodyMetric[]> => {
  const { data, error } = await supabase.from('body_metrics').select('*').eq('user_id', userId).order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as BodyMetric[];
};

export const createBodyMetric = async (
  userId: string,
  payload: Omit<BodyMetric, 'id' | 'user_id' | 'created_at'>,
): Promise<BodyMetric> => {
  const { data, error } = await supabase.from('body_metrics').insert({ user_id: userId, ...payload }).select('*').single();
  if (error) throw error;
  return data as BodyMetric;
};

export const updateBodyMetric = async (
  userId: string,
  id: string,
  payload: Partial<Omit<BodyMetric, 'id' | 'user_id' | 'created_at'>>,
): Promise<BodyMetric> => {
  const { data, error } = await supabase.from('body_metrics').update(payload).eq('user_id', userId).eq('id', id).select('*').single();
  if (error) throw error;
  return data as BodyMetric;
};

export const deleteBodyMetric = async (userId: string, id: string): Promise<void> => {
  const { error } = await supabase.from('body_metrics').delete().eq('user_id', userId).eq('id', id);
  if (error) throw error;
};
