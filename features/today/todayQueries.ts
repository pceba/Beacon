import { queryOptions } from '@tanstack/react-query';
import { getCurrentUserId } from '../../services/authService';
import { getHabitLogs, getHabits } from '../../services/habitService';
import { getMoodLog } from '../../services/moodService';
import { getNutritionLogs } from '../../services/nutritionService';
import { getPreferences } from '../../services/preferencesService';
import { getSleepLogCreatedSince } from '../../services/sleepService';
import { getOpenTasks } from '../../services/taskService';
import { getWaterLog } from '../../services/waterService';
import { getWorkouts } from '../../services/workoutService';
import { addDays, fromKey, keyOf, startOfDayIso } from '../../utils/dates';

// Hoy solo lee lo del día, los hábitos con un año de historial (rachas) y las tareas abiertas.
// `day` es el 'yyyy-MM-dd' local de hoy.

// Días de historial de hábitos: rachas de hasta un año y la mini semana.
const STREAK_DAYS = 366;

export const habitLogsFrom = (day: string) => keyOf(addDays(fromKey(day), -STREAK_DAYS));

export const todayKeys = {
  preferences: () => ['preferences'] as const,
  mood: (day: string) => ['mood_logs', 'day', day] as const,
  water: (day: string) => ['water_logs', 'day', day] as const,
  sleep: (day: string) => ['sleep_logs', 'since', day] as const,
  meals: (day: string) => ['nutrition_logs', 'since', day] as const,
  workouts: (day: string) => ['workouts', 'since', day] as const,
  habits: () => ['habits'] as const,
  habitLogs: (day: string) => ['habit_logs', 'since', habitLogsFrom(day)] as const,
  openTasks: () => ['tasks', 'open'] as const,
};

const since = (day: string) => startOfDayIso(fromKey(day));

export const todayQueries = {
  preferences: () => queryOptions({ queryKey: todayKeys.preferences(), queryFn: getPreferences }),
  mood: (day: string) =>
    queryOptions({ queryKey: todayKeys.mood(day), queryFn: async () => getMoodLog(await getCurrentUserId(), fromKey(day)) }),
  water: (day: string) =>
    queryOptions({ queryKey: todayKeys.water(day), queryFn: async () => getWaterLog(await getCurrentUserId(), fromKey(day)) }),
  sleep: (day: string) =>
    queryOptions({ queryKey: todayKeys.sleep(day), queryFn: async () => getSleepLogCreatedSince(await getCurrentUserId(), since(day)) }),
  meals: (day: string) =>
    queryOptions({ queryKey: todayKeys.meals(day), queryFn: async () => getNutritionLogs(await getCurrentUserId(), { from: since(day) }) }),
  workouts: (day: string) =>
    queryOptions({ queryKey: todayKeys.workouts(day), queryFn: async () => getWorkouts(await getCurrentUserId(), { from: since(day) }) }),
  habits: () => queryOptions({ queryKey: todayKeys.habits(), queryFn: async () => getHabits(await getCurrentUserId()) }),
  habitLogs: (day: string) =>
    queryOptions({
      queryKey: todayKeys.habitLogs(day),
      queryFn: async () => getHabitLogs(await getCurrentUserId(), { from: habitLogsFrom(day) }),
    }),
  openTasks: () => queryOptions({ queryKey: todayKeys.openTasks(), queryFn: async () => getOpenTasks(await getCurrentUserId()) }),
};
