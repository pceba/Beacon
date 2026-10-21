import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '../../../components/ui/Card';
import { Colors } from '../../../constants/colors';
import { Radius } from '../../../constants/spacing';
import { Type, tabular } from '../../../constants/typography';
import { WEEKDAY_LETTERS, fromKey, keyOf } from '../../../utils/dates';
import { formatNumber } from '../../../utils/format';
import { weekdayName } from '../../../utils/labels';
import { DayBucket, weekDays } from '../calendarLayout';
import { useSwipe } from '../hooks/useSwipe';

const dotsOf = (bucket: DayBucket | undefined): string[] => {
  if (!bucket) return [];
  const colors: string[] = [];
  if (bucket.events.length) colors.push(Colors.accent);
  if (bucket.tasks.some((task) => !task.completed)) colors.push(Colors.danger);
  if (bucket.tasks.some((task) => task.completed)) colors.push(Colors.food);
  return colors;
};

type DayProps = { date: Date; dayKey: string; letter: string; on: boolean; bucket: DayBucket | undefined; onSelect: (dayKey: string) => void };

const StripDay = memo(({ date, dayKey, letter, on, bucket, onSelect }: DayProps) => (
  <Pressable
    accessibilityRole="tab"
    accessibilityLabel={`${weekdayName(date)} ${date.getDate()}`}
    accessibilityState={{ selected: on }}
    onPress={() => onSelect(dayKey)}
    style={[styles.day, on ? styles.dayOn : null]}
  >
    <Text style={[styles.letter, on ? styles.onText : null]}>{letter}</Text>
    <Text style={[styles.number, on ? styles.onText : null]}>{formatNumber(date.getDate())}</Text>
    <View style={styles.dots}>
      {dotsOf(bucket).map((color) => (
        <View key={color} style={[styles.dot, { backgroundColor: on ? Colors.surface : color }]} />
      ))}
    </View>
  </Pressable>
));

type Props = {
  selected: string;
  buckets: Map<string, DayBucket>;
  onSelect: (dayKey: string) => void;
  // Deslizar: -1 semana anterior, 1 siguiente.
  onShift: (direction: -1 | 1) => void;
};

// Tira semanal de Lista (Plan v1.2). Deslizar en horizontal cambia de semana.
export const WeekStrip = memo(({ selected, buckets, onSelect, onShift }: Props) => {
  const days = useMemo(() => weekDays(fromKey(selected)), [selected]);
  const swipe = useSwipe(onShift);

  return (
    <View {...swipe}>
      <Card>
        <View style={styles.week}>
          {days.map((date, index) => {
            const key = keyOf(date);
            return (
              <StripDay key={key} date={date} dayKey={key} letter={WEEKDAY_LETTERS[index]} on={key === selected} bucket={buckets.get(key)} onSelect={onSelect} />
            );
          })}
        </View>
      </Card>
    </View>
  );
});

const styles = StyleSheet.create({
  week: { flexDirection: 'row', gap: 2 },
  day: { flex: 1, minHeight: 64, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dayOn: { backgroundColor: Colors.ink },
  letter: { fontFamily: Type.bodyStrong.fontFamily, fontSize: 11, color: Colors.text3 },
  number: { ...tabular, fontFamily: Type.bodyStrong.fontFamily, fontSize: 18, color: Colors.ink },
  onText: { color: Colors.surface },
  dots: { flexDirection: 'row', gap: 2, height: 4 },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
