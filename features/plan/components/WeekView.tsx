import React, { memo, useCallback, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../../constants/colors';
import { Spacing } from '../../../constants/spacing';
import { Type, tabular } from '../../../constants/typography';
import { WEEKDAY_LETTERS, fromKey, keyOf } from '../../../utils/dates';
import { formatNumber } from '../../../utils/format';
import { weekdayName } from '../../../utils/labels';
import { DayBucket, HOUR_HEIGHT, weekDays } from '../calendarLayout';
import { useNow } from '../hooks/useNow';
import { allDayLane, WEEK_PAGES, weekAt, weekIndexOf } from '../planPeriods';
import { AllDayLane } from './AllDayLane';
import { Pager } from './Pager';
import { DayColumn, GUTTER, HourLines } from './TimeGrid';

type Handlers = {
  onSlot: (dayKey: string, minutes: number) => void;
  onEvent: (id: string) => void;
  onDay: (dayKey: string) => void;
};

type PageProps = Handlers & {
  page: number;
  todayDate: Date;
  buckets: Map<string, DayBucket>;
  today: string;
  // Solo la semana de hoy lo recibe: las demás no se repintan cada minuto.
  nowMinutes: number | null;
};

const WeekPage = memo(({ page, todayDate, buckets, today, nowMinutes, onSlot, onEvent, onDay }: PageProps) => {
  const days = useMemo(() => weekDays(weekAt(page, todayDate)).map((date) => ({ date, key: keyOf(date) })), [page, todayDate]);
  const scroll = useRef<ScrollView>(null);
  const placedOnce = useRef(false);
  const hasLane = days.some(({ key }) => allDayLane(buckets.get(key)).items.length > 0);

  // Al abrir, una hora antes de ahora. En web el scroll ignora scrollTo hasta el frame siguiente al layout.
  const onLayout = useCallback(() => {
    if (placedOnce.current) return;
    placedOnce.current = true;
    const now = new Date();
    const y = Math.max(0, (now.getHours() - 1 + now.getMinutes() / 60) * HOUR_HEIGHT);
    requestAnimationFrame(() => scroll.current?.scrollTo({ y, animated: false }));
  }, []);

  return (
    <View style={styles.page}>
      <View style={styles.head}>
        {days.map(({ date, key }, index) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={`${weekdayName(date)} ${date.getDate()}`}
            onPress={() => onDay(key)}
            style={styles.headDay}
          >
            <Text style={styles.letter}>{WEEKDAY_LETTERS[index]}</Text>
            <View style={[styles.num, key === today ? styles.numToday : null]}>
              <Text style={[styles.numText, key === today ? styles.numTodayText : null]}>{formatNumber(date.getDate())}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      {hasLane ? (
        <View style={styles.lane}>
          <Text style={styles.laneLabel}>todo</Text>
          {days.map(({ key }) => (
            <View key={key} style={styles.laneDay}>
              <AllDayLane dayKey={key} bucket={buckets.get(key)} max={2} onEvent={onEvent} onDay={onDay} />
            </View>
          ))}
        </View>
      ) : null}
      <ScrollView ref={scroll} onLayout={onLayout} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.grid}>
          <HourLines from={0} to={24} />
          <View style={styles.columns}>
            {days.map(({ key }) => (
              <DayColumn
                key={key}
                dayKey={key}
                events={buckets.get(key)?.events}
                from={0}
                to={24}
                nowMinutes={nowMinutes != null && key === today ? nowMinutes : null}
                onSlot={onSlot}
                onEvent={onEvent}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
});

type Props = Handlers & {
  index: number;
  todayDate: Date;
  buckets: Map<string, DayBucket>;
  onIndexChange: (index: number) => void;
};

export const WeekView = ({ index, todayDate, buckets, onIndexChange, onSlot, onEvent, onDay }: Props) => {
  const now = useNow();
  const todayPage = useMemo(() => weekIndexOf(fromKey(now.day), todayDate), [now.day, todayDate]);
  const renderPage = useCallback(
    (page: number) => (
      <WeekPage
        page={page}
        todayDate={todayDate}
        buckets={buckets}
        today={now.day}
        nowMinutes={page === todayPage ? now.minutes : null}
        onSlot={onSlot}
        onEvent={onEvent}
        onDay={onDay}
      />
    ),
    [buckets, now.day, now.minutes, onDay, onEvent, onSlot, todayDate, todayPage],
  );
  return <Pager count={WEEK_PAGES} index={index} onIndexChange={onIndexChange} renderPage={renderPage} />;
};

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  head: { flexDirection: 'row', paddingLeft: GUTTER },
  headDay: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 2 },
  letter: { ...Type.label, color: Colors.text3 },
  num: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  numToday: { backgroundColor: Colors.ink },
  numText: { fontFamily: Type.bodyStrong.fontFamily, fontSize: 15, lineHeight: 20, color: Colors.ink, ...tabular },
  numTodayText: { color: Colors.surface },
  lane: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.line, gap: 2 },
  laneLabel: { width: GUTTER - 2, alignSelf: 'center', fontSize: 10, lineHeight: 12, fontFamily: Type.caption.fontFamily, color: Colors.text4 },
  laneDay: { flex: 1, minWidth: 0 },
  scroll: { paddingTop: 10, paddingBottom: Spacing.xl },
  grid: { height: 24 * HOUR_HEIGHT },
  columns: { flex: 1, flexDirection: 'row', marginLeft: GUTTER },
});
