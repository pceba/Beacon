import { supabase } from '../lib/supabase';
import { JournalEntry } from '../types/database';

// El Diario enseña lo más reciente: con un año de entradas basta y la lista no crece sin fin.
const JOURNAL_LIMIT = 365;

export const getJournalEntries = async (userId: string): Promise<JournalEntry[]> => {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(JOURNAL_LIMIT);
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
