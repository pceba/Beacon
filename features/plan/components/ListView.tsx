import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { Colors } from '../../../constants/colors';
import { Spacing, tabClearance } from '../../../constants/spacing';
import { Type } from '../../../constants/typography';
import { Task } from '../../../types/database';
import { fromKey } from '../../../utils/dates';
import { formatNumber } from '../../../utils/format';
import { weekdayName } from '../../../utils/labels';
import { DayBucket } from '../calendarLayout';
import { TaskActions } from '../hooks/useTaskActions';
import { tasksForDay } from '../planPeriods';
import { AgendaCard } from './AgendaCard';
import { TasksCard } from './TasksCard';
import { WeekStrip } from './WeekStrip';

type Props = {
  selected: string;
  today: string;
  buckets: Map<string, DayBucket>;
  openTasks: Task[] | undefined;
  actions: TaskActions;
  onSelect: (dayKey: string) => void;
  onShiftWeek: (direction: -1 | 1) => void;
  onEvent: (id: string) => void;
  onRefresh: () => Promise<unknown>;
};

// Lista: el Plan v1.2 tal cual (tira semanal, agenda y tareas del día).
export const ListView = ({ selected, today, buckets, openTasks, actions, onSelect, onShiftWeek, onEvent, onRefresh }: Props) => {
  const [refreshing, setRefreshing] = useState(false);
  const bucket = buckets.get(selected);
  const tasks = useMemo(() => tasksForDay(bucket?.tasks, openTasks, selected, today), [bucket, openTasks, selected, today]);
  const date = fromKey(selected);

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
      <WeekStrip selected={selected} buckets={buckets} onSelect={onSelect} onShift={onShiftWeek} />
      <Text style={styles.section}>
        {weekdayName(date)} {formatNumber(date.getDate())}
      </Text>
      <AgendaCard events={bucket?.events ?? EMPTY} onEvent={onEvent} />
      <TasksCard day={selected} today={today} tasks={tasks} actions={actions} />
    </ScrollView>
  );
};

const EMPTY: never[] = [];

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.s16, paddingBottom: tabClearance() + Spacing.xl, gap: Spacing.lg },
  section: { ...Type.section, color: Colors.ink, textTransform: 'capitalize' },
});
