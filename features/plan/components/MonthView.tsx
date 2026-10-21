import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../../constants/colors';
import { cardShadow, Radius, Spacing } from '../../../constants/spacing';
import { Type, tabular } from '../../../constants/typography';
import { DayBucket, monthGrid } from '../calendarLayout';
import { dayMarks, Mark, MONTH_PAGES, monthAt } from '../planPeriods';
import { WEEKDAY_LETTERS, keyOf } from '../../../utils/dates';
import { monthDay } from '../../../utils/labels';
import { formatNumber } from '../../../utils/format';
import { Pager } from './Pager';

type CellProps = {
  dayKey: string;
  date: number;
  label: string;
  inMonth: boolean;
  today: boolean;
  selected: boolean;
  bucket: DayBucket | undefined;
  onPress: (dayKey: string) => void;
};

const MarkView = ({ kind }: { kind: Mark }) => <View style={kind === 'event' ? styles.dot : kind === 'task' ? styles.square : styles.squareDone} />;

const MonthCell = memo(({ dayKey, date, label, inMonth, today, selected, bucket, onPress }: CellProps) => {
  const { marks, extra } = dayMarks(bucket);
  const count = (bucket?.events.length ?? 0) + (bucket?.tasks.length ?? 0);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count ? `${label}, ${count} en el plan` : label}
      accessibilityState={{ selected }}
      onPress={() => onPress(dayKey)}
      style={styles.cell}
    >
      <View style={[styles.number, today ? styles.numberToday : selected ? styles.numberSelected : null]}>
        <Text style={[styles.numberText, !inMonth ? styles.out : null, today ? styles.todayText : null]}>{formatNumber(date)}</Text>
      </View>
      <View style={styles.marks}>
        {marks.map((kind, index) => (
          <MarkView key={index} kind={kind} />
        ))}
        {extra > 0 ? <Text style={styles.more}>+{formatNumber(extra)}</Text> : null}
      </View>
    </Pressable>
  );
});

type PageProps = {
  page: number;
  todayDate: Date;
  buckets: Map<string, DayBucket>;
  today: string;
  selected: string;
  onDay: (dayKey: string) => void;
};

const MonthPage = memo(({ page, todayDate, buckets, today, selected, onDay }: PageProps) => {
  const month = useMemo(() => monthAt(page, todayDate), [page, todayDate]);
  const rows = useMemo(() => {
    const days = monthGrid(month);
    return Array.from({ length: 6 }, (_, row) => days.slice(row * 7, row * 7 + 7));
  }, [month]);
  return (
    <View style={styles.page}>
      <View style={styles.card}>
        {rows.map((row) => (
          <View key={keyOf(row[0])} style={styles.row}>
            {row.map((date) => {
              const key = keyOf(date);
              return (
                <MonthCell
                  key={key}
                  dayKey={key}
                  date={date.getDate()}
                  label={monthDay(date)}
                  inMonth={date.getMonth() === month.getMonth()}
                  today={key === today}
                  selected={key === selected}
                  bucket={buckets.get(key)}
                  onPress={onDay}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
});

type Props = {
  index: number;
  todayDate: Date;
  buckets: Map<string, DayBucket>;
  today: string;
  selected: string;
  onIndexChange: (index: number) => void;
  onDay: (dayKey: string) => void;
};

export const MonthView = ({ index, todayDate, buckets, today, selected, onIndexChange, onDay }: Props) => {
  const renderPage = useCallback(
    (page: number) => <MonthPage page={page} todayDate={todayDate} buckets={buckets} today={today} selected={selected} onDay={onDay} />,
    [buckets, onDay, selected, today, todayDate],
  );
  return (
    <View style={styles.root}>
      <View style={styles.letters}>
        {WEEKDAY_LETTERS.map((letter) => (
          <Text key={letter} style={styles.letter}>
            {letter}
          </Text>
        ))}
      </View>
      <Pager count={MONTH_PAGES} index={index} onIndexChange={onIndexChange} renderPage={renderPage} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  letters: { flexDirection: 'row', paddingHorizontal: Spacing.lg + 4, marginTop: Spacing.s16, marginBottom: 6 },
  letter: { flex: 1, textAlign: 'center', ...Type.label, color: Colors.text3 },
  page: { flex: 1, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  card: {
    flex: 1,
    maxHeight: 6 * 72 + 4,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: 4,
    paddingBottom: 4,
    overflow: 'hidden',
    ...cardShadow,
  },
  row: { flex: 1, flexDirection: 'row' },
  cell: { flex: 1, minHeight: 44, borderTopWidth: 1, borderTopColor: Colors.line, alignItems: 'center', paddingTop: 6, gap: 6 },
  number: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  numberToday: { backgroundColor: Colors.ink },
  numberSelected: { borderWidth: 1.5, borderColor: Colors.ink },
  numberText: { fontFamily: Type.bodyStrong.fontFamily, fontSize: 15, lineHeight: 20, ...tabular, color: Colors.ink },
  out: { color: Colors.text4 },
  todayText: { color: Colors.surface },
  marks: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent },
  square: { width: 6, height: 6, borderRadius: 1.5, backgroundColor: Colors.text2 },
  squareDone: { width: 6, height: 6, borderRadius: 1.5, backgroundColor: Colors.text4 },
  more: { fontFamily: Type.bodyStrong.fontFamily, fontSize: 10, lineHeight: 12, color: Colors.text3, ...tabular },
});
