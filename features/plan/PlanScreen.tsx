import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InlineError } from '../../components/ui/InlineError';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { useDayKey } from '../../hooks/useDayKey';
import { selection } from '../../lib/haptics';
import { getStored, setStored } from '../../lib/storage';
import { PlanStackParamList, RootStackParamList } from '../../types/navigation';
import { addDays, fromKey, keyOf, timeOf } from '../../utils/dates';
import { monthDay } from '../../utils/labels';
import { AddChoiceSheet } from './components/AddChoiceSheet';
import { DayView } from './components/DayView';
import { ListView } from './components/ListView';
import { MonthView } from './components/MonthView';
import { PlanHeader } from './components/PlanHeader';
import { WeekView } from './components/WeekView';
import { usePlanData } from './hooks/usePlanData';
import { useTaskActions } from './hooks/useTaskActions';
import { creationDay, isPlanView, monthAt, monthIndexOf, periodRange, periodTitle, PlanView, weekAt, weekIndexOf } from './planPeriods';

const VIEW_KEY = 'lifepp_plan_view';

type Nav = NavigationProp<PlanStackParamList & Pick<RootStackParamList, 'AddTaskModal'>>;

// Plan como calendario (DESIGN.md §8): Mes · Semana · Día · Lista.
export const PlanScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const today = useDayKey();
  // Ancla fija de los pagers: sus páginas se cuentan desde el día en que se abrió Plan.
  const [origin] = useState(() => fromKey(keyOf(new Date())));
  const [view, setView] = useState<PlanView | null>(null);
  const [selected, setSelected] = useState(today);
  const [monthIndex, setMonthIndex] = useState(() => monthIndexOf(origin, origin));
  const [weekIndex, setWeekIndex] = useState(() => weekIndexOf(origin, origin));
  const [adding, setAdding] = useState(false);
  const actions = useTaskActions();

  useEffect(() => {
    let active = true;
    getStored(VIEW_KEY)
      .then((stored) => active && setView(isPlanView(stored) ? stored : 'month'))
      .catch((error) => {
        console.error(error);
        if (active) setView('month');
      });
    return () => {
      active = false;
    };
  }, []);

  const current = view ?? 'month';
  const anchor = useMemo(() => {
    if (current === 'month') return monthAt(monthIndex, origin);
    if (current === 'week') return weekAt(weekIndex, origin);
    return fromKey(selected);
  }, [current, monthIndex, origin, selected, weekIndex]);
  const range = useMemo(() => periodRange(current, anchor), [anchor, current]);
  const title = useMemo(() => periodTitle(current, anchor), [anchor, current]);
  const data = usePlanData(range, current === 'day' || current === 'list');

  const selectDay = useCallback(
    (key: string, next?: PlanView) => {
      const date = fromKey(key);
      setSelected(key);
      setMonthIndex(monthIndexOf(date, origin));
      setWeekIndex(weekIndexOf(date, origin));
      if (next) {
        setView(next);
        void setStored(VIEW_KEY, next).catch((error) => console.error(error));
      }
    },
    [origin],
  );

  const changeView = useCallback(
    (next: PlanView) => {
      const date = fromKey(selected);
      setMonthIndex(monthIndexOf(date, origin));
      setWeekIndex(weekIndexOf(date, origin));
      setView(next);
      void setStored(VIEW_KEY, next).catch((error) => console.error(error));
    },
    [origin, selected],
  );

  const goToday = useCallback(() => {
    selection();
    selectDay(today);
  }, [selectDay, today]);

  const onMonthIndex = useCallback((index: number) => {
    selection();
    setMonthIndex(index);
  }, []);

  const onWeekIndex = useCallback((index: number) => {
    selection();
    setWeekIndex(index);
  }, []);

  const openDay = useCallback(
    (key: string) => {
      selection();
      selectDay(key, 'day');
    },
    [selectDay],
  );

  const pickDay = useCallback(
    (key: string) => {
      selection();
      selectDay(key);
    },
    [selectDay],
  );

  const shiftBy = useCallback(
    (days: number) => {
      selection();
      selectDay(keyOf(addDays(fromKey(selected), days)));
    },
    [selectDay, selected],
  );
  const shiftDay = useCallback((direction: -1 | 1) => shiftBy(direction), [shiftBy]);
  const shiftWeek = useCallback((direction: -1 | 1) => shiftBy(direction * 7), [shiftBy]);

  const openEvent = useCallback((eventId: string) => navigation.navigate('EventDetailScreen', { eventId }), [navigation]);
  const createAt = useCallback(
    (date: string, minutes: number) => navigation.navigate('EventDetailScreen', { date, time: timeOf(minutes) }),
    [navigation],
  );

  const newDay = creationDay(current, anchor, selected);
  const addEvent = () => {
    setAdding(false);
    navigation.navigate('EventDetailScreen', { date: newDay });
  };
  const addTask = () => {
    setAdding(false);
    navigation.navigate('AddTaskModal', { date: newDay });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + Spacing.lg }]}>
      <PlanHeader title={title} view={current} onView={changeView} onToday={goToday} onAdd={() => setAdding(true)} />
      {data.failed ? (
        <View style={styles.error}>
          <InlineError title="No se ha podido cargar el plan" body="Revisa la conexión y vuelve a intentarlo." onRetry={() => void data.refetch()} />
        </View>
      ) : null}
      <View style={styles.body}>
        {view === 'month' ? (
          <MonthView
            index={monthIndex}
            todayDate={origin}
            buckets={data.buckets}
            today={today}
            selected={selected}
            onIndexChange={onMonthIndex}
            onDay={openDay}
          />
        ) : null}
        {view === 'week' ? (
          <WeekView index={weekIndex} todayDate={origin} buckets={data.buckets} onIndexChange={onWeekIndex} onSlot={createAt} onEvent={openEvent} onDay={openDay} />
        ) : null}
        {view === 'day' ? (
          <DayView
            selected={selected}
            buckets={data.buckets}
            openTasks={data.openTasks}
            actions={actions}
            onShiftDay={shiftDay}
            onSlot={createAt}
            onEvent={openEvent}
            onRefresh={data.refetch}
          />
        ) : null}
        {view === 'list' ? (
          <ListView
            selected={selected}
            today={today}
            buckets={data.buckets}
            openTasks={data.openTasks}
            actions={actions}
            onSelect={pickDay}
            onShiftWeek={shiftWeek}
            onEvent={openEvent}
            onRefresh={data.refetch}
          />
        ) : null}
      </View>
      <AddChoiceSheet visible={adding} dayLabel={monthDay(fromKey(newDay))} onEvent={addEvent} onTask={addTask} onClose={() => setAdding(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  body: { flex: 1 },
  error: { paddingHorizontal: Spacing.lg },
});
