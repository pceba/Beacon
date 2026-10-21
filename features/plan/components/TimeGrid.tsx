import React, { memo, useMemo } from 'react';
import { GestureResponderEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../../constants/colors';
import { Type, tabular } from '../../../constants/typography';
import { Event } from '../../../types/database';
import { timeOf } from '../../../utils/dates';
import { HOUR_HEIGHT, layoutDay, PlacedEvent, snapMinutes } from '../calendarLayout';

// Rejilla horaria de Semana y Día (DESIGN.md §8.3): 48 por hora, columna de horas de 40.

export const GUTTER = 40;

const pad = (hour: number) => String(hour).padStart(2, '0');

export const HourLines = memo(({ from, to }: { from: number; to: number }) => (
  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {Array.from({ length: to - from + 1 }, (_, index) => (
      <View key={index} style={[styles.hour, { top: index * HOUR_HEIGHT }]}>
        {from + index < 24 ? <Text style={styles.hourText}>{pad(from + index)}</Text> : null}
      </View>
    ))}
  </View>
));

type BlockProps = {
  placed: PlacedEvent;
  offset: number;
  detailed: boolean;
  onPress: (id: string) => void;
};

const EventBlock = memo(({ placed, offset, detailed, onPress }: BlockProps) => {
  const { event, start, end, column, columns } = placed;
  const hasEnd = !!event.end_time;
  const time = detailed && hasEnd ? `${timeOf(start)} – ${timeOf(end)}` : timeOf(start);
  const meta = detailed && event.location ? `${time} · ${event.location}` : time;
  // Un bloque que comparte columna de Semana no cabe en dos líneas: el título se corta en una.
  const shared = !detailed && columns > 1;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${meta}`}
      onPress={() => onPress(event.id)}
      style={[
        styles.blockWrap,
        { top: placed.top - offset, height: placed.height, left: `${(column / columns) * 100}%`, width: `${100 / columns}%` },
      ]}
    >
      <View style={styles.block}>
        <Text numberOfLines={placed.height > 36 && !shared ? 2 : 1} style={styles.blockTitle}>
          {event.title}
        </Text>
        {placed.height > 30 && !(shared && columns > 2) ? (
          <Text numberOfLines={1} style={styles.blockTime}>
            {meta}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

export const NowLine = memo(({ minutes, from }: { minutes: number; from: number }) => (
  <View pointerEvents="none" style={[styles.now, { top: ((minutes - from * 60) / 60) * HOUR_HEIGHT - 1 }]}>
    <View style={styles.nowDot} />
  </View>
));

type ColumnProps = {
  dayKey: string;
  events: Event[] | undefined;
  from: number;
  to: number;
  nowMinutes: number | null;
  detailed?: boolean;
  onSlot: (dayKey: string, minutes: number) => void;
  onEvent: (id: string) => void;
};

// Una columna de día: tocar un hueco crea a esa hora (15 min), tocar un bloque lo abre.
export const DayColumn = memo(({ dayKey, events, from, to, nowMinutes, detailed = false, onSlot, onEvent }: ColumnProps) => {
  const placed = useMemo(() => layoutDay(events ?? []), [events]);
  const offset = from * HOUR_HEIGHT;
  const onPress = (event: GestureResponderEvent) => {
    // En web onPress llega con el click del DOM, que no trae locationY.
    const native = event.nativeEvent as GestureResponderEvent['nativeEvent'] & { offsetY?: number };
    const y = Number.isFinite(native.locationY) ? native.locationY : native.offsetY;
    if (y == null || !Number.isFinite(y)) return;
    onSlot(dayKey, snapMinutes(y + offset));
  };
  const showNow = nowMinutes != null && nowMinutes >= from * 60 && nowMinutes <= to * 60;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Crear evento"
      accessibilityHint="Toca una hora para crear un evento"
      onPress={onPress}
      style={[styles.column, { height: (to - from) * HOUR_HEIGHT }]}
    >
      {placed.map((item) => (
        <EventBlock key={item.event.id} placed={item} offset={offset} detailed={detailed} onPress={onEvent} />
      ))}
      {showNow ? <NowLine minutes={nowMinutes} from={from} /> : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  hour: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderTopColor: Colors.line },
  hourText: { position: 'absolute', left: 0, top: -8, width: GUTTER - 6, textAlign: 'right', fontSize: 11, lineHeight: 14, fontFamily: Type.caption.fontFamily, color: Colors.text4, ...tabular },
  column: { flex: 1, position: 'relative' },
  blockWrap: { position: 'absolute', paddingHorizontal: 1 },
  block: {
    flex: 1,
    backgroundColor: Colors.accentSoft,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
    paddingHorizontal: 4,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  blockTitle: { fontFamily: Type.bodyStrong.fontFamily, fontSize: 12, lineHeight: 14, color: Colors.ink },
  blockTime: { fontFamily: Type.caption.fontFamily, fontSize: 11, lineHeight: 14, color: Colors.text2, ...tabular },
  now: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: Colors.danger },
  nowDot: { position: 'absolute', left: -4, top: -3, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.danger },
});
