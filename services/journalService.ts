import { supabase } from '../lib/supabase';
import { JournalEntry } from '../types/database';

export const getJournalEntries = async (userId: string): Promise<JournalEntry[]> => {
  const { data, error } = await supabase.from('journal_entries').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as JournalEntry[];
};

export const createJournalEntry = async (
  userId: string,
  payload: Omit<JournalEntry, 'id' | 'user_id' | 'created_at'>,
): Promise<JournalEntry> => {
  const { data, error } = await supabase.from('journal_entries').insert({ user_id: userId, ...payload }).select('*').single();
  if (error) throw error;
  return data as JournalEntry;
};

export const updateJournalEntry = async (
  userId: string,
  id: string,
  payload: Partial<Omit<JournalEntry, 'id' | 'user_id' | 'created_at'>>,
): Promise<JournalEntry> => {
  const { data, error } = await supabase.from('journal_entries').update(payload).eq('user_id', userId).eq('id', id).select('*').single();
  if (error) throw error;
  return data as JournalEntry;
};

export const deleteJournalEntry = async (userId: string, id: string): Promise<void> => {
  const { error } = await supabase.from('journal_entries').delete().eq('user_id', userId).eq('id', id);
  if (error) throw error;
};
