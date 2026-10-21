import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Card } from '../../../components/ui/Card';
import { Colors } from '../../../constants/colors';
import { cardShadow, Spacing, tabClearance } from '../../../constants/spacing';
import { Type } from '../../../constants/typography';
import { Task } from '../../../types/database';
import { fromKey } from '../../../utils/dates';
import { formatNumber } from '../../../utils/format';
import { weekdayName } from '../../../utils/labels';
import { DayBucket, HOUR_HEIGHT, layoutDay, visibleHours } from '../calendarLayout';
import { useNow } from '../hooks/useNow';
import { useSwipe } from '../hooks/useSwipe';
import { TaskActions } from '../hooks/useTaskActions';
import { allDayLane, tasksForDay } from '../planPeriods';
import { AllDayLane } from './AllDayLane';
import { TasksCard } from './TasksCard';
import { DayColumn, GUTTER, HourLines } from './TimeGrid';

type Props = {
  selected: string;
  buckets: Map<string, DayBucket>;
  openTasks: Task[] | undefined;
  actions: TaskActions;
  onShiftDay: (direction: -1 | 1) => void;
  onSlot: (dayKey: string, minutes: number) => void;
  onEvent: (id: string) => void;
  onRefresh: () => Promise<unknown>;
};

// Día: franja de todo el día, horas con eventos ±1 h y la tarjeta de tareas de siempre.
export const DayView = ({ selected, buckets, openTasks, actions, onShiftDay, onSlot, onEvent, onRefresh }: Props) => {
  const [refreshing, setRefreshing] = useState(false);
  const now = useNow();
  const swipe = useSwipe(onShiftDay);
  const bucket = buckets.get(selected);
  const isToday = selected === now.day;
  const date = fromKey(selected);

  const placed = useMemo(() => layoutDay(bucket?.events ?? []), [bucket]);
  const hours = useMemo(() => visibleHours(placed, isToday ? now.minutes : undefined), [placed, isToday, now.minutes]);
  const hasLane = useMemo(() => allDayLane(bucket).items.length > 0, [bucket]);
  const tasks = useMemo(() => tasksForDay(bucket?.tasks, openTasks, selected, now.day), [bucket, openTasks, selected, now.day]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={Colors.ink} />}
    >
      <View {...swipe} style={styles.swipeArea}>
        <View style={styles.head}>
          <Pressable accessibilityRole="button" accessibilityLabel="Día anterior" onPress={() => onShiftDay(-1)} style={styles.arrow}>
            <ChevronLeft color={Colors.text2} size={20} />
          </Pressable>
          <Text style={styles.title} accessibilityRole="header">
            {weekdayName(date)} {formatNumber(date.getDate())}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Día siguiente" onPress={() => onShiftDay(1)} style={styles.arrow}>
            <ChevronRight color={Colors.text2} size={20} />
          </Pressable>
        </View>

        <Card style={styles.card}>
          {hasLane ? (
            <View style={styles.lane}>
              <Text style={styles.laneLabel}>todo</Text>
              <AllDayLane dayKey={selected} bucket={bucket} onEvent={onEvent} />
            </View>
          ) : null}
          {placed.length > 0 ? (
            <View style={[styles.grid, { height: (hours.to - hours.from) * HOUR_HEIGHT }]}>
              <HourLines from={hours.from} to={hours.to} />
              <View style={styles.column}>
                <DayColumn
                  dayKey={selected}
                  events={bucket?.events}
                  from={hours.from}
                  to={hours.to}
                  nowMinutes={isToday ? now.minutes : null}
                  detailed
                  onSlot={onSlot}
                  onEvent={onEvent}
                />
              </View>
            </View>
          ) : null}
          {!hasLane && placed.length === 0 ? <Text style={styles.empty}>Nada en la agenda.</Text> : null}
        </Card>
      </View>

      <TasksCard day={selected} today={now.day} tasks={tasks} actions={actions} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: tabClearance() + Spacing.xl, gap: Spacing.lg },
  swipeArea: { gap: Spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', ...cardShadow },
  title: { ...Type.section, color: Colors.ink, textTransform: 'capitalize' },
  card: { paddingTop: Spacing.sm, paddingBottom: Spacing.sm, paddingLeft: 0, paddingRight: 14 },
  lane: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  laneLabel: { width: GUTTER, paddingRight: 6, textAlign: 'right', fontSize: 10, lineHeight: 12, fontFamily: Type.caption.fontFamily, color: Colors.text4 },
  grid: { marginTop: 10, marginBottom: 4 },
  column: { flex: 1, flexDirection: 'row', marginLeft: GUTTER },
  empty: { ...Type.body, color: Colors.text3, paddingVertical: 6, paddingLeft: 16 },
});
