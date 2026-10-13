import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { Event } from '../types/database';

export const getEvents = async (userId: string): Promise<Event[]> => {
  const { data, error } = await supabase.from('events').select('*').eq('user_id', userId).order('event_date', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Event[];
};

export const createEvent = async (
  userId: string,
  payload: Omit<Event, 'id' | 'user_id' | 'created_at'>,
): Promise<Event> => {
  const { data, error } = await supabase.from('events').insert({ user_id: userId, ...payload }).select('*').single();
  if (error) throw error;
  return data as Event;
};

export const updateEvent = async (
  userId: string,
  id: string,
  payload: Partial<Omit<Event, 'id' | 'user_id' | 'created_at'>>,
): Promise<Event> => {
  const { data, error } = await supabase.from('events').update(payload).eq('user_id', userId).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Event;
};

export const deleteEvent = async (userId: string, id: string): Promise<void> => {
  const { error } = await supabase.from('events').delete().eq('user_id', userId).eq('id', id);
  if (error) throw error;
};

export const getEventsByMonth = async (userId: string, date: Date): Promise<Event[]> => {
  const monthStart = format(new Date(date.getFullYear(), date.getMonth(), 1), 'yyyy-MM-dd');
  const monthEnd = format(new Date(date.getFullYear(), date.getMonth() + 1, 0), 'yyyy-MM-dd');
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .gte('event_date', monthStart)
    .lte('event_date', monthEnd)
    .order('event_date', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Event[];
};
