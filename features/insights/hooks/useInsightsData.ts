import { useCallback, useMemo, useRef } from 'react';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { useDayKey } from '../../../hooks/useDayKey';
import { useRefetchOnFocus } from '../../../hooks/useRefetchOnFocus';
import { getCurrentUserId } from '../../../services/authService';
import { getBodyMetrics } from '../../../services/bodyMetricsService';
import { getHabitLogs } from '../../../services/habitService';
import { getMoodLogs } from '../../../services/moodService';
import { getNutritionLogs } from '../../../services/nutritionService';
import { getSleepLogs } from '../../../services/sleepService';
import { getWaterLogs } from '../../../services/waterService';
import { getStrengthEntries, getWorkouts } from '../../../services/workoutService';
import { addDays, fromKey, startOfDayIso } from '../../../utils/dates';
import { exerciseSummaries } from '../../../utils/exerciseProgress';
import { todayQueries } from '../../today/todayQueries';
import { buildInsights } from '../buildInsights';
import { Period, periodWindow, Snapshot } from '../insightsMath';

// Las columnas timestamptz se agrupan por su fecha UTC ('…'.slice(0, 10)): se pide un día
// de margen para no perder filas de primera hora en ninguna zona horaria.
const isoFrom = (day: string, marginDays = 1) => startOfDayIso(addDays(fromKey(day), -marginDays));

const userId = getCurrentUserId;

// Claves: [tabla, 'insights', desde, hasta]. Con el periodo anterior: sueño, agua, comida y ánimo.
// Solo con el periodo actual: entrenos, hábitos y peso.
const insightsQueries = {
  // El sueño cuenta por el día en que se apuntó; la noche puede empezar el día antes.
  sleeps: (from: string, to: string) =>
    queryOptions({ queryKey: ['sleep_logs', 'insights', from, to] as const, queryFn: async () => getSleepLogs(await userId(), { from: isoFrom(from, 2) }) }),
  waters: (from: string, to: string) =>
    queryOptions({ queryKey: ['water_logs', 'insights', from, to] as const, queryFn: async () => getWaterLogs(await userId(), { from, to }) }),
  meals: (from: string, to: string) =>
    queryOptions({ queryKey: ['nutrition_logs', 'insights', from, to] as const, queryFn: async () => getNutritionLogs(await userId(), { from: isoFrom(from) }) }),
  moods: (from: string, to: string) =>
    queryOptions({ queryKey: ['mood_logs', 'insights', from, to] as const, queryFn: async () => getMoodLogs(await userId(), { from, to }) }),
  workouts: (from: string, to: string) =>
    queryOptions({ queryKey: ['workouts', 'insights', from, to] as const, queryFn: async () => getWorkouts(await userId(), { from: isoFrom(from) }) }),
  habitLogs: (from: string, to: string) =>
    queryOptions({ queryKey: ['habit_logs', 'insights', from, to] as const, queryFn: async () => getHabitLogs(await userId(), { from, to }) }),
  metrics: (from: string, to: string) =>
    queryOptions({ queryKey: ['body_metrics', 'insights', from, to] as const, queryFn: async () => getBodyMetrics(await userId(), { from }) }),
  // Historial de fuerza completo (paginado en el servicio); no depende del periodo.
  strength: () =>
    queryOptions({
      queryKey: ['workout_sets', 'strength'] as const,
      queryFn: async () => getStrengthEntries(await userId()),
      meta: { tables: ['workouts', 'workout_exercises', 'workout_sets'] },
    }),
};

export const useInsightsData = (period: Period) => {
  const todayKey = useDayKey();
  const { currentFrom, previousFrom } = periodWindow(todayKey, period);

  const prefs = useQuery(todayQueries.preferences());
  const habits = useQuery(todayQueries.habits());
  const sleeps = useQuery(insightsQueries.sleeps(previousFrom, todayKey));
  const waters = useQuery(insightsQueries.waters(previousFrom, todayKey));
  const meals = useQuery(insightsQueries.meals(previousFrom, todayKey));
  const moods = useQuery(insightsQueries.moods(previousFrom, todayKey));
  const workouts = useQuery(insightsQueries.workouts(currentFrom, todayKey));
  const habitLogs = useQuery(insightsQueries.habitLogs(currentFrom, todayKey));
  const metrics = useQuery(insightsQueries.metrics(currentFrom, todayKey));
  const strength = useQuery(insightsQueries.strength());
  const queries = [prefs, habits, sleeps, waters, meals, moods, workouts, habitLogs, metrics, strength];

  useRefetchOnFocus(queries);

  const snapshot = useMemo(() => {
    if (!prefs.data || !habits.data || !sleeps.data || !waters.data || !meals.data || !moods.data || !workouts.data || !habitLogs.data || !metrics.data) {
      return null;
    }
    return buildInsights({
      period,
      end: fromKey(todayKey),
      prefs: prefs.data,
      sleeps: sleeps.data,
      waters: waters.data,
      meals: meals.data,
      workouts: workouts.data,
      habits: habits.data,
      habitLogs: habitLogs.data,
      metrics: metrics.data,
      moods: moods.data,
    });
  }, [habitLogs.data, habits.data, meals.data, metrics.data, moods.data, period, prefs.data, sleeps.data, todayKey, waters.data, workouts.data]);

  // Al cambiar de periodo se sigue viendo el anterior hasta que llega el nuevo.
  const shown = useRef<Snapshot | null>(null);
  if (snapshot) shown.current = snapshot;

  const strengthRows = useMemo(() => (strength.data ? exerciseSummaries(strength.data) : null), [strength.data]);

  const latest = useRef(queries);
  latest.current = queries;
  const refetchAll = useCallback(async () => {
    await Promise.all(latest.current.map((query) => query.refetch()));
  }, []);

  return {
    data: snapshot ?? shown.current,
    strength: strengthRows,
    failed: queries.some((query) => query.isError),
    refetchAll,
  };
};
