import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '../../../components/ui/Card';
import { Colors } from '../../../constants/colors';
import { Type, tabular } from '../../../constants/typography';
import { Event } from '../../../types/database';

type RowProps = { event: Event; onPress: (id: string) => void };

const AgendaRow = memo(({ event, onPress }: RowProps) => {
  const time = event.event_time?.slice(0, 5);
  const end = time ? event.end_time?.slice(0, 5) : undefined;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={time ? `${event.title}, ${time}` : event.title} onPress={() => onPress(event.id)} style={styles.row}>
      <Text style={styles.time}>{time || '—'}</Text>
      <View style={styles.bar} />
      <View style={styles.copy}>
        <Text style={styles.title}>{event.title}</Text>
        {end || event.location ? <Text style={styles.meta}>{[end ? `Hasta ${end}` : null, event.location].filter(Boolean).join(' · ')}</Text> : null}
      </View>
    </Pressable>
  );
});

type Props = { events: Event[]; onEvent: (id: string) => void };

// Agenda del día de Lista: hora a la izquierda, barra de color y título.
export const AgendaCard = memo(({ events, onEvent }: Props) => (
  <Card inset>
    {events.length === 0 ? <Text style={styles.empty}>Nada en la agenda.</Text> : null}
    {events.map((event) => (
      <AgendaRow key={event.id} event={event} onPress={onEvent} />
    ))}
  </Card>
));

const styles = StyleSheet.create({
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center' },
  time: { width: 64, textAlign: 'right', paddingRight: 10, ...Type.caption, ...tabular, fontFamily: Type.bodyStrong.fontFamily, color: Colors.text3 },
  bar: { width: 3, alignSelf: 'stretch', borderRadius: 2, marginRight: 10, backgroundColor: Colors.accent },
  copy: { flex: 1, gap: 2, paddingVertical: 10 },
  title: { ...Type.bodyStrong, color: Colors.ink },
  meta: { ...Type.caption, color: Colors.text3 },
  empty: { ...Type.body, color: Colors.text3, paddingVertical: 14 },
});
