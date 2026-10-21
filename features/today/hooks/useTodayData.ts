import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDayKey } from '../../../hooks/useDayKey';
import { useRefetchOnFocus } from '../../../hooks/useRefetchOnFocus';
import { queryClient } from '../../../lib/query';
import { toast } from '../../../lib/toast';
import { defaultPreferences } from '../../../services/preferencesService';
import { Habit, HabitLog, NutritionLog, Task, Workout } from '../../../types/database';
import { addDays, dayOf, fromKey, keyOf } from '../../../utils/dates';
import { dayBrief } from '../../../utils/dayBrief';
import { moodScale } from '../../../utils/mood';
import { todayKeys, todayQueries } from '../todayQueries';

const NO_HABITS: Habit[] = [];
const NO_LOGS: HabitLog[] = [];
const NO_MEALS: NutritionLog[] = [];
const NO_TASKS: Task[] = [];
const NO_WORKOUTS: Workout[] = [];

export type HabitItem = {
  habit: Habit;
  done: boolean;
  streak: number;
  // Últimos 7 días, de más antiguo a hoy: '1' hecho, '0' no. Cadena para que la fila memorizada compare barato.
  marks: string;
};

export const sleepHours = (bed: string, wake: string) => {
  const hours = (new Date(wake).getTime() - new Date(bed).getTime()) / 3_600_000;
  if (!Number.isFinite(hours) || hours <= 0) return 0;
  return Number(Math.min(hours, 24).toFixed(1));
};

const streakOf = (done: Set<string>, today: Date) => {
  let cursor = done.has(keyOf(today)) ? today : addDays(today, -1);
  let count = 0;
  while (done.has(keyOf(cursor))) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
};

export const useTodayData = () => {
  const todayKey = useDayKey();
  const prefsQuery = useQuery(todayQueries.preferences());
  const moodQuery = useQuery(todayQueries.mood(todayKey));
  const waterQuery = useQuery(todayQueries.water(todayKey));
  const sleepQuery = useQuery(todayQueries.sleep(todayKey));
  const mealsQuery = useQuery(todayQueries.meals(todayKey));
  const workoutsQuery = useQuery(todayQueries.workouts(todayKey));
  const habitsQuery = useQuery(todayQueries.habits());
  const habitLogsQuery = useQuery(todayQueries.habitLogs(todayKey));
  const tasksQuery = useQuery(todayQueries.openTasks());
  const queries = [prefsQuery, moodQuery, waterQuery, sleepQuery, mealsQuery, workoutsQuery, habitsQuery, habitLogsQuery, tasksQuery];

  useRefetchOnFocus(queries);

  // Si al montar ya estaba todo en caché, no se repite la entrada escalonada.
  const [cached] = useState(() =>
    [
      todayKeys.preferences(),
      todayKeys.mood(todayKey),
      todayKeys.water(todayKey),
      todayKeys.sleep(todayKey),
      todayKeys.meals(todayKey),
      todayKeys.workouts(todayKey),
      todayKeys.habits(),
      todayKeys.habitLogs(todayKey),
      todayKeys.openTasks(),
    ].every((key) => queryClient.getQueryData(key) !== undefined),
  );

  // Una vez pintado, un día nuevo (claves nuevas aún sin datos) no vuelve al esqueleto.
  const loaded = useRef(false);
  if (queries.every((query) => !query.isPending)) loaded.current = true;
  const ready = loaded.current;
  const errorAt = Math.max(...queries.map((query) => query.errorUpdatedAt));
  useEffect(() => {
    if (errorAt > 0) toast.show({ message: 'No se ha podido cargar. Tira hacia abajo para reintentar.', kind: 'error' });
  }, [errorAt]);

  const latest = useRef(queries);
  latest.current = queries;
  const refetchAll = useCallback(async () => {
    await Promise.all(latest.current.map((query) => query.refetch()));
  }, []);

  const prefs = prefsQuery.data ?? defaultPreferences;
  const mood = moodScale(moodQuery.data?.mood_score);
  const waterMl = waterQuery.data?.amount_ml ?? 0;
  const sleepLog = sleepQuery.data ?? null;
  const sleep = sleepLog ? sleepHours(sleepLog.bed_time, sleepLog.wake_time) : 0;
  const meals = mealsQuery.data ?? NO_MEALS;
  const workouts = workoutsQuery.data ?? NO_WORKOUTS;
  const habits = habitsQuery.data ?? NO_HABITS;
  const habitLogs = habitLogsQuery.data ?? NO_LOGS;
  const openTasks = tasksQuery.data ?? NO_TASKS;

  const calories = useMemo(() => meals.reduce((sum, meal) => sum + (meal.calories ?? 0), 0), [meals]);
  const moved = workouts.length > 0;

  const habitItems = useMemo<HabitItem[]>(() => {
    const today = fromKey(todayKey);
    const week = Array.from({ length: 7 }, (_, index) => keyOf(addDays(today, index - 6)));
    const doneByHabit = new Map<string, Set<string>>();
    habitLogs.forEach((log) => {
      if (!log.completed) return;
      const days = doneByHabit.get(log.habit_id) ?? new Set<string>();
      days.add(dayOf(log.log_date));
      doneByHabit.set(log.habit_id, days);
    });
    return habits.map((habit) => {
      const done = doneByHabit.get(habit.id) ?? new Set<string>();
      return {
        habit,
        done: done.has(todayKey),
        streak: streakOf(done, today),
        marks: week.map((day) => (done.has(day) ? '1' : '0')).join(''),
      };
    });
  }, [habitLogs, habits, todayKey]);

  const habitsDone = habitItems.filter((item) => item.done).length;

  const tasks = useMemo(
    () => openTasks.filter((task) => !task.deadline || task.deadline.slice(0, 10) <= todayKey).slice(0, 5),
    [openTasks, todayKey],
  );

  const brief = useMemo(
    () =>
      dayBrief({
        todayKey,
        waterMl,
        waterGoalMl: prefs.waterMl,
        sleepHours: sleep,
        sleepGoalHours: prefs.sleepHours,
        moved,
        calories,
        pendingHabits: habitItems.filter((item) => !item.done).map((item) => item.habit.name),
        habitsTotal: habitItems.length,
        tasks: openTasks,
      }),
    [calories, habitItems, moved, openTasks, prefs.sleepHours, prefs.waterMl, sleep, todayKey, waterMl],
  );

  const checks = [waterMl >= prefs.waterMl, sleep >= prefs.sleepHours, moved, calories > 0, ...habitItems.map((item) => item.done)];

  return {
    todayKey,
    ready,
    cached,
    refetchAll,
    prefs,
    mood,
    waterMl,
    sleep,
    sleepId: sleepLog?.id ?? null,
    calories,
    moved,
    habitItems,
    habitsDone,
    tasks,
    brief,
    doneCount: checks.filter(Boolean).length,
    checkCount: checks.length,
  };
};
