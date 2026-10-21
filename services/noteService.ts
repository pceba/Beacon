import { supabase } from '../lib/supabase';
import { Note } from '../types/database';

export const getNotes = async (userId: string): Promise<Note[]> => {
  const { data, error } = await supabase.from('notes').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Note[];
};

export const createNote = async (
  userId: string,
  payload: Omit<Note, 'id' | 'user_id' | 'created_at'>,
): Promise<Note> => {
  const { data, error } = await supabase.from('notes').insert({ user_id: userId, ...payload }).select('*').single();
  if (error) throw error;
  return data as Note;
};
