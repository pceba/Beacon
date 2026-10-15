import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { BookOpenText } from 'lucide-react-native';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { InlineError } from '../components/ui/InlineError';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Segmented } from '../components/ui/Segmented';
import { TimelineItem } from '../components/ui/TimelineItem';
import { Colors } from '../constants/colors';
import { Spacing, tabClearance } from '../constants/spacing';
import { Typography } from '../constants/typography';
import { getCurrentUserId } from '../services/authService';
import { getJournalEntries } from '../services/journalService';
import { getNotes } from '../services/noteService';
import { JournalEntry, Note, TimelineEntry } from '../types/database';
import { RootStackParamList } from '../types/navigation';
import { longDay, shortDay } from '../utils/labels';

type Segment = 'reflections' | 'notes' | 'feed';

export const JournalScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [segment, setSegment] = useState<Segment>('reflections');
  const [refreshing, setRefreshing] = useState(false);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setFailed(false);
    try {
      const userId = await getCurrentUserId();
      const [journalRows, noteRows] = await Promise.all([getJournalEntries(userId), getNotes(userId)]);
      setEntries(journalRows);
      setNotes(noteRows);
    } catch (error) {
      console.error(error);
      setFailed(true);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const feed = useMemo<Array<TimelineEntry & { sortKey: string }>>(
    () =>
      [
        ...entries.map((entry) => ({
          id: entry.id,
          type: 'journal' as const,
          title: entry.title || entry.content.slice(0, 48),
          subtitle: entry.content.slice(0, 120),
          timestamp: `${shortDay(entry.created_at)} · ${format(new Date(entry.created_at), 'HH:mm')}`,
          sortKey: entry.created_at,
        })),
        ...notes.map((note) => ({
          id: note.id,
          type: 'note' as const,
          title: note.title || note.content.slice(0, 48),
          subtitle: note.content.slice(0, 120),
          timestamp: `${shortDay(note.created_at)} · ${format(new Date(note.created_at), 'HH:mm')}`,
          sortKey: note.created_at,
        })),
      ].sort((a, b) => b.sortKey.localeCompare(a.sortKey)),
    [entries, notes],
  );

  const openComposer = () => {
    if (segment === 'notes') navigation.navigate('AddNoteModal');
    else navigation.navigate('AddReflectionModal');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.md }]}>
      <ScreenHeader
        title="Diario"
        action={
          segment === 'feed' || (segment === 'notes' ? notes.length === 0 : entries.length === 0)
            ? undefined
            : { label: segment === 'notes' ? 'Nota' : 'Escribir', onPress: openComposer }
        }
      />
      <Segmented
        value={segment}
        onChange={setSegment}
        options={[
          { value: 'reflections', label: 'Reflexiones' },
          { value: 'notes', label: 'Notas' },
          { value: 'feed', label: 'Todo' },
        ]}
      />

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.ink} />}
        contentContainerStyle={{ paddingTop: Spacing.sm, paddingBottom: tabClearance(insets.bottom), gap: Spacing.md }}
      >
        {failed ? (
          <InlineError title="No se ha podido cargar el diario" body="Tira hacia abajo o inténtalo otra vez." onRetry={() => void load(true)} />
        ) : null}
        {segment === 'reflections' && entries.length === 0 ? (
          <EmptyState icon={BookOpenText} title="Sin reflexiones" body="Escribe lo que ha pasado hoy." action={{ label: 'Escribir', onPress: openComposer }} />
        ) : null}
        {segment === 'reflections'
          ? entries.map((entry) => (
              <Card key={entry.id}>
                <Text style={styles.title}>{entry.title || entry.content.slice(0, 48)}</Text>
                <Text style={styles.meta}>{longDay(entry.created_at)}</Text>
                <Text style={styles.body}>{entry.content}</Text>
              </Card>
            ))
          : null}

        {segment === 'notes' && notes.length === 0 ? (
          <EmptyState icon={BookOpenText} title="Sin notas" body="Una frase basta." action={{ label: 'Nueva nota', onPress: openComposer }} />
        ) : null}
        {segment === 'notes'
          ? notes.map((note) => (
              <Card key={note.id}>
                <Text style={styles.title}>{note.title || 'Nota'}</Text>
                <Text style={styles.meta}>{longDay(note.created_at)}</Text>
                <Text style={styles.body}>{note.content}</Text>
              </Card>
            ))
          : null}

        {segment === 'feed' && feed.length === 0 ? (
          <EmptyState icon={BookOpenText} title="Nada escrito" body="Las reflexiones y las notas aparecen aquí." action={{ label: 'Escribir', onPress: () => navigation.navigate('AddReflectionModal') }} />
        ) : null}
        {segment === 'feed' ? feed.map((item) => <TimelineItem key={`${item.type}-${item.id}`} entry={item} />) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, paddingHorizontal: Spacing.lg, gap: Spacing.md },
  title: { color: Colors.ink, fontFamily: Typography.fontDisplay, fontSize: Typography.lg, lineHeight: 24 },
  meta: { color: Colors.text3, fontFamily: Typography.fontMedium, fontSize: Typography.xs, marginTop: 4, marginBottom: Spacing.sm },
  body: { color: Colors.text2, fontFamily: Typography.fontRegular, fontSize: Typography.md, lineHeight: 22 },
});
