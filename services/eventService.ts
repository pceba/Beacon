import { supabase } from '../lib/supabase';
import { withSupportedColumns } from '../lib/schemaCaps';
import { Event } from '../types/database';

type EventPayload = Omit<Event, 'id' | 'user_id' | 'created_at'>;

// Eventos entre dos días ('yyyy-MM-dd', inclusivo), por fecha y hora.
export const getEventsInRange = async (userId: string, from: string, to: string): Promise<Event[]> => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .gte('event_date', from)
    .lte('event_date', to)
    .order('event_date', { ascending: true })
    .order('event_time', { ascending: true, nullsFirst: true });
  if (error) throw error;
  return (data ?? []) as Event[];
};

export const getEventById = async (userId: string, id: string): Promise<Event | null> => {
  const { data, error } = await supabase.from('events').select('*').eq('user_id', userId).eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as Event | null) ?? null;
};

export const createEvent = async (userId: string, payload: EventPayload): Promise<Event> => {
  const row = await withSupportedColumns('events', { user_id: userId, ...payload });
  const { data, error } = await supabase.from('events').insert(row).select('*').single();
  if (error) throw error;
  return data as Event;
};

export const updateEvent = async (userId: string, id: string, payload: Partial<EventPayload>): Promise<Event> => {
  const row = await withSupportedColumns('events', payload);
  const { data, error } = await supabase.from('events').update(row).eq('user_id', userId).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Event;
};

export const deleteEvent = async (userId: string, id: string): Promise<void> => {
  const { error } = await supabase.from('events').delete().eq('user_id', userId).eq('id', id);
  if (error) throw error;
};
