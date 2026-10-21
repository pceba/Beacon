import { useCallback, useMemo, useRef } from 'react';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { useRefetchOnFocus } from '../../../hooks/useRefetchOnFocus';
import { getCurrentUserId } from '../../../services/authService';
import { getJournalEntries } from '../../../services/journalService';
import { getNotes } from '../../../services/noteService';
import { JournalEntry, Note, TimelineEntry } from '../../../types/database';
import { timeOf } from '../../../utils/dates';
import { shortDay } from '../../../utils/labels';

export type Segment = 'reflections' | 'notes' | 'feed';

export type JournalRow =
  | { kind: 'reflection'; id: string; entry: JournalEntry }
  | { kind: 'note'; id: string; note: Note }
  | { kind: 'feed'; id: string; item: TimelineEntry };

const journalQueries = {
  entries: () =>
    queryOptions({ queryKey: ['journal_entries'] as const, queryFn: async () => getJournalEntries(await getCurrentUserId()) }),
  notes: () => queryOptions({ queryKey: ['notes'] as const, queryFn: async () => getNotes(await getCurrentUserId()) }),
};

const stamp = (iso: string) => {
  const date = new Date(iso);
  return `${shortDay(iso)} · ${timeOf(date.getHours() * 60 + date.getMinutes())}`;
};

const NO_ENTRIES: JournalEntry[] = [];
const NO_NOTES: Note[] = [];

export const useJournalData = (segment: Segment) => {
  const entriesQuery = useQuery(journalQueries.entries());
  const notesQuery = useQuery(journalQueries.notes());
  const queries = [entriesQuery, notesQuery];
  useRefetchOnFocus(queries);

  const entries = entriesQuery.data ?? NO_ENTRIES;
  const notes = notesQuery.data ?? NO_NOTES;

  const reflectionRows = useMemo<JournalRow[]>(() => entries.map((entry) => ({ kind: 'reflection', id: `reflection-${entry.id}`, entry })), [entries]);
  const noteRows = useMemo<JournalRow[]>(() => notes.map((note) => ({ kind: 'note', id: `note-${note.id}`, note })), [notes]);
  const feedRows = useMemo<JournalRow[]>(
    () =>
      [
        ...entries.map((entry) => ({
          sortKey: entry.created_at,
          item: {
            id: entry.id,
            type: 'journal' as const,
            title: entry.title || entry.content.slice(0, 48),
            subtitle: entry.content.slice(0, 120),
            timestamp: stamp(entry.created_at),
          },
        })),
        ...notes.map((note) => ({
          sortKey: note.created_at,
          item: {
            id: note.id,
            type: 'note' as const,
            title: note.title || note.content.slice(0, 48),
            subtitle: note.content.slice(0, 120),
            timestamp: stamp(note.created_at),
          },
        })),
      ]
        .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
        .map(({ item }) => ({ kind: 'feed', id: `${item.type}-${item.id}`, item })),
    [entries, notes],
  );

  const latest = useRef(queries);
  latest.current = queries;
  const refetchAll = useCallback(async () => {
    await Promise.all(latest.current.map((query) => query.refetch()));
  }, []);

  return {
    rows: segment === 'reflections' ? reflectionRows : segment === 'notes' ? noteRows : feedRows,
    hasEntries: entries.length > 0,
    hasNotes: notes.length > 0,
    loaded: !entriesQuery.isPending && !notesQuery.isPending,
    failed: entriesQuery.isError || notesQuery.isError,
    refetchAll,
  };
};
