import { useCallback, useEffect, useMemo, useState } from 'react';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { light } from '../../../lib/haptics';
import { getStored, setStored } from '../../../lib/storage';
import { getCurrentUserId } from '../../../services/authService';
import { getMoodLogs } from '../../../services/moodService';
import { getSleepLogs } from '../../../services/sleepService';
import { getWaterLogs } from '../../../services/waterService';
import { getWorkouts } from '../../../services/workoutService';
import { addDays, fromKey, keyOf, startOfDayIso } from '../../../utils/dates';
import { summaryWeekStart, weeklySummary } from '../../../utils/weeklySummary';
import { todayQueries } from '../todayQueries';

// Se puede cerrar por semana.
const DISMISS_KEY = 'lifepp_weekly_dismissed';

// Semana resumida y la anterior (para comparar), de `from` ('yyyy-MM-dd') a hoy.
const weeklyQueries = {
  // El sueño cuenta por día de despertar: la noche del primer día empieza el día antes.
  sleep: (from: string) =>
    queryOptions({
      queryKey: ['sleep_logs', 'weekly', from] as const,
      queryFn: async () => getSleepLogs(await getCurrentUserId(), { from: startOfDayIso(addDays(fromKey(from), -1)) }),
    }),
  water: (from: string, to: string) =>
    queryOptions({
      queryKey: ['water_logs', 'weekly', from, to] as const,
      queryFn: async () => getWaterLogs(await getCurrentUserId(), { from, to }),
    }),
  workouts: (from: string) =>
    queryOptions({
      queryKey: ['workouts', 'weekly', from] as const,
      queryFn: async () => getWorkouts(await getCurrentUserId(), { from: startOfDayIso(fromKey(from)) }),
    }),
  moods: (from: string, to: string) =>
    queryOptions({
      queryKey: ['mood_logs', 'weekly', from, to] as const,
      queryFn: async () => getMoodLogs(await getCurrentUserId(), { from, to }),
    }),
};

// Solo domingo y lunes, y solo si no se ha cerrado esta semana.
export const useWeeklySummary = (todayKey: string) => {
  const start = summaryWeekStart(fromKey(todayKey));
  const weekKey = start ? keyOf(start) : null;
  const from = start ? keyOf(addDays(start, -7)) : todayKey;

  // undefined mientras se lee el almacén.
  const [dismissed, setDismissed] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!weekKey) return undefined;
    let alive = true;
    getStored(DISMISS_KEY)
      .then((value) => {
        if (alive) setDismissed(value ?? null);
      })
      .catch((error) => console.error('Resumen semanal', error));
    return () => {
      alive = false;
    };
  }, [weekKey]);

  const enabled = weekKey != null && dismissed !== undefined && dismissed !== weekKey;
  const sleeps = useQuery({ ...weeklyQueries.sleep(from), enabled });
  const waters = useQuery({ ...weeklyQueries.water(from, todayKey), enabled });
  const workouts = useQuery({ ...weeklyQueries.workouts(from), enabled });
  const moods = useQuery({ ...weeklyQueries.moods(from, todayKey), enabled });
  const habits = useQuery({ ...todayQueries.habits(), enabled });
  const habitLogs = useQuery({ ...todayQueries.habitLogs(todayKey), enabled });
  const prefs = useQuery({ ...todayQueries.preferences(), enabled });

  const summary = useMemo(() => {
    if (!enabled || !sleeps.data || !waters.data || !workouts.data || !moods.data || !habits.data || !habitLogs.data || !prefs.data) return null;
    const next = weeklySummary({
      today: fromKey(todayKey),
      sleeps: sleeps.data,
      waters: waters.data,
      workouts: workouts.data,
      habits: habits.data,
      habitLogs: habitLogs.data,
      moods: moods.data,
      sleepGoalHours: prefs.data.sleepHours,
      waterGoalMl: prefs.data.waterMl,
    });
    return next?.hasData ? next : null;
  }, [enabled, habitLogs.data, habits.data, moods.data, prefs.data, sleeps.data, todayKey, waters.data, workouts.data]);

  const dismiss = useCallback(() => {
    if (!weekKey) return;
    light();
    setDismissed(weekKey);
    void setStored(DISMISS_KEY, weekKey);
  }, [weekKey]);

  return { summary, dismiss };
};
