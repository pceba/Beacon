import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../../constants/colors';
import { Type, tabular } from '../../../constants/typography';
import { formatNumber } from '../../../utils/format';
import { DayBucket } from '../calendarLayout';
import { allDayLane, LaneItem } from '../planPeriods';

type Props = {
  dayKey: string;
  bucket: DayBucket | undefined;
  // Máximo de pastillas antes de «+N»; sin él caben todas (Día).
  max?: number;
  onEvent: (id: string) => void;
  // Abre Día en ese día (tareas y «+N»).
  onDay?: (dayKey: string) => void;
};

const HIT = { top: 12, bottom: 12, left: 2, right: 2 };

const Chip = ({ item, onPress }: { item: LaneItem; onPress?: () => void }) => {
  const event = item.kind === 'event';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={event ? item.title : `Tarea ${item.title}`}
      disabled={!onPress}
      hitSlop={HIT}
      onPress={onPress}
      style={[styles.chip, event ? styles.event : styles.task]}
    >
      {!event ? <View style={[styles.square, item.done ? styles.squareDone : null]} /> : null}
      <Text numberOfLines={1} style={[styles.text, event ? styles.eventText : styles.taskText, !event && item.done ? styles.done : null]}>
        {item.title}
      </Text>
    </Pressable>
  );
};

// Franja de todo el día (DESIGN.md §8.3): eventos sin hora y tareas con esa fecha.
export const AllDayLane = memo(({ dayKey, bucket, max, onEvent, onDay }: Props) => {
  const lane = useMemo(() => (max ? allDayLane(bucket, max) : allDayLane(bucket, Number.MAX_SAFE_INTEGER)), [bucket, max]);
  const openDay = onDay ? () => onDay(dayKey) : undefined;
  return (
    <View style={[styles.lane, max ? null : styles.wrap]}>
      {lane.items.map((item) => (
        <Chip key={`${item.kind}-${item.id}`} item={item} onPress={item.kind === 'event' ? () => onEvent(item.id) : openDay} />
      ))}
      {lane.extra > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${formatNumber(lane.extra)} más, abrir el día`}
          hitSlop={HIT}
          onPress={openDay}
          style={[styles.chip, styles.task]}
        >
          <Text style={[styles.text, styles.taskText, tabular]}>+{formatNumber(lane.extra)}</Text>
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  lane: { flex: 1, gap: 2 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chip: { height: 20, borderRadius: 6, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', gap: 3, overflow: 'hidden', maxWidth: '100%' },
  event: { backgroundColor: Colors.accentSoft },
  task: { backgroundColor: Colors.fill },
  square: { width: 6, height: 6, borderRadius: 1.5, backgroundColor: Colors.text2 },
  squareDone: { backgroundColor: Colors.text4 },
  text: { fontFamily: Type.bodyStrong.fontFamily, fontSize: 10, lineHeight: 12, flexShrink: 1 },
  eventText: { color: Colors.accent },
  taskText: { color: Colors.text2 },
  done: { color: Colors.text4, textDecorationLine: 'line-through' },
});
