import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '../../../components/ui/Card';
import { TimelineItem } from '../../../components/ui/TimelineItem';
import { Colors } from '../../../constants/colors';
import { Spacing } from '../../../constants/spacing';
import { Type } from '../../../constants/typography';
import { JournalEntry, Note, TimelineEntry } from '../../../types/database';
import { longDay } from '../../../utils/labels';
import { JournalRow } from '../hooks/useJournalData';

const EntryCard = memo(({ title, createdAt, content }: { title: string; createdAt: string; content: string }) => (
  <Card>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.meta}>{longDay(createdAt)}</Text>
    <Text style={styles.body}>{content}</Text>
  </Card>
));

const ReflectionCard = memo(({ entry }: { entry: JournalEntry }) => (
  <EntryCard title={entry.title || entry.content.slice(0, 48)} createdAt={entry.created_at} content={entry.content} />
));

const NoteCard = memo(({ note }: { note: Note }) => <EntryCard title={note.title || 'Nota'} createdAt={note.created_at} content={note.content} />);

const FeedItem = memo(({ item }: { item: TimelineEntry }) => <TimelineItem entry={item} />);

export const JournalRowView = memo(({ row }: { row: JournalRow }) => {
  if (row.kind === 'reflection') return <ReflectionCard entry={row.entry} />;
  if (row.kind === 'note') return <NoteCard note={row.note} />;
  return <FeedItem item={row.item} />;
});

export const RowGap = () => <View style={styles.gap} />;

const styles = StyleSheet.create({
  title: { ...Type.section, fontSize: 18, lineHeight: 24, color: Colors.ink },
  meta: { ...Type.caption, fontSize: 12, color: Colors.text3, marginTop: 4, marginBottom: Spacing.sm },
  body: { ...Type.body, color: Colors.text2 },
  gap: { height: Spacing.md },
});
