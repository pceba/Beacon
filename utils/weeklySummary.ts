// Resumen semanal calculado en el móvil, sin red ni coste.
// La semana va de lunes a domingo. El domingo se resume la semana en curso (hoy incluido);
// el lunes, la que acaba de terminar.

import { addDays, format, subDays } from 'date-fns';
import { Habit, HabitLog, MoodLog, SleepLog, WaterLog, Workout } from '../types/database';
import { habitStreak } from './streak';

export type WeeklyInput = {
  today: Date;
  sleeps: SleepLog[];
  waters: WaterLog[];
  workouts: Workout[];
  habits: Habit[];
  habitLogs: HabitLog[];
  moods: MoodLog[];
  sleepGoalHours: number;
  waterGoalMl: number;
};

export type Metric = {
  value: number | null; // null = sin datos
  previous: number | null;
  delta: number | null; // null si falta alguna de las dos semanas
};

export type WeeklySummary = {
  weekKey: string; // yyyy-MM-dd del lunes, para recordar si se cerró la tarjeta
  start: Date;
  end: Date;
  sleepHours: Metric;
  waterMl: Metric;
  workouts: Metric;
  habitRate: Metric; // 0-100
  mood: Metric; // 1-5
  bestStreak: { name: string; days: number } | null;
  headline: string;
  hasData: boolean;
};

const key = (date: Date) => format(date, 'yyyy-MM-dd');
const mean = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null);
const metric = (value: number | null, previous: number | null): Metric => ({
  value,
  previous,
  delta: value != null && previous != null ? value - previous : null,
});

// Lunes de la semana a resumir, o null si hoy no toca enseñarlo (solo domingo y lunes).
export const summaryWeekStart = (today: Date): Date | null => {
  const day = today.getDay(); // 0 domingo, 1 lunes
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (day === 0) return subDays(midnight, 6);
  if (day === 1) return subDays(midnight, 7);
  return null;
};

const daysOf = (start: Date) => Array.from({ length: 7 }, (_, index) => key(addDays(start, index)));

const sleepByWakeDay = (sleeps: SleepLog[]) => {
  const map = new Map<string, number>();
  for (const sleep of sleeps) {
    const hours = (new Date(sleep.wake_time).getTime() - new Date(sleep.bed_time).getTime()) / 3_600_000;
    if (hours <= 0 || hours > 16) continue;
    map.set(key(new Date(sleep.wake_time)), hours);
  }
  return map;
};

const periodStats = (input: WeeklyInput, start: Date, sleepMap: Map<string, number>) => {
  const days = daysOf(start);
  const daySet = new Set(days);
  const sleep = mean(days.map((day) => sleepMap.get(day)).filter((value): value is number => value != null));
  const water = mean(input.waters.filter((row) => daySet.has(row.log_date.slice(0, 10)) && row.amount_ml > 0).map((row) => row.amount_ml));
  const workoutCount = input.workouts.filter((row) => daySet.has(key(new Date(row.started_at)))).length;
  const mood = mean(input.moods.filter((row) => daySet.has(row.log_date.slice(0, 10)) && row.mood_score != null).map((row) => row.mood_score as number));

  // Solo cuentan los días en que el hábito ya existía.
  let possible = 0;
  let done = 0;
  for (const habit of input.habits) {
    const created = key(new Date(habit.created_at));
    for (const day of days) {
      if (day < created) continue;
      possible += 1;
    }
  }
  const doneSet = new Set(
    input.habitLogs.filter((log) => log.completed && daySet.has(log.log_date.slice(0, 10))).map((log) => `${log.habit_id}|${log.log_date.slice(0, 10)}`),
  );
  done = doneSet.size;
  const habitRate = possible > 0 ? Math.min(100, (done / possible) * 100) : null;
  const anyData = sleep != null || water != null || workoutCount > 0 || mood != null || done > 0;
  return {
    sleep,
    water,
    workouts: anyData ? workoutCount : null,
    habitRate,
    mood,
    anyData,
  };
};

const joinPhrases = (parts: string[]) => {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`;
};

const capital = (text: string) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);

const buildHeadline = (summary: Omit<WeeklySummary, 'headline'>, sleepGoalHours: number, waterGoalMl: number) => {
  if (!summary.hasData) return 'Esta semana no hay registros. La próxima empieza mañana.';
  const good: string[] = [];
  const improve: string[] = [];

  const { sleepHours, waterMl, workouts, habitRate } = summary;
  if (sleepHours.delta != null && sleepHours.delta >= 0.3) good.push('dormiste más');
  else if (sleepHours.value != null && sleepHours.value >= sleepGoalHours) good.push('dormiste lo que querías');
  else if (sleepHours.value != null && sleepHours.value < sleepGoalHours - 0.5) improve.push('te faltó sueño');

  if (workouts.value != null && workouts.value >= 3) good.push(`entrenaste ${workouts.value} veces`);
  else if (workouts.value === 0) improve.push('no entrenaste');

  if (habitRate.value != null && habitRate.value >= 70) good.push(`cumpliste el ${Math.round(habitRate.value)} % de tus hábitos`);
  else if (habitRate.value != null && habitRate.value < 40) improve.push('los hábitos se quedaron cortos');

  if (waterMl.value != null && waterMl.value >= waterGoalMl) good.push('bebiste agua de sobra');
  else if (waterMl.value != null && waterMl.value < waterGoalMl * 0.75) improve.push('bebiste poca agua');

  if (good.length && !improve.length) return `Buena semana: ${joinPhrases(good.slice(0, 3))}.`;
  if (good.length && improve.length) return `${capital(joinPhrases(good.slice(0, 2)))}, aunque ${improve[0]}.`;
  if (improve.length) return `Semana floja: ${joinPhrases(improve.slice(0, 2))}. La próxima sale mejor.`;
  return 'Semana tranquila, sin grandes cambios.';
};

export const weeklySummary = (input: WeeklyInput): WeeklySummary | null => {
  const start = summaryWeekStart(input.today);
  if (!start) return null;
  const previousStart = subDays(start, 7);
  const sleepMap = sleepByWakeDay(input.sleeps);
  const now = periodStats(input, start, sleepMap);
  const before = periodStats(input, previousStart, sleepMap);

  const end = addDays(start, 6);
  const streakDay = input.today.getDay() === 1 ? end : input.today;
  let bestStreak: WeeklySummary['bestStreak'] = null;
  for (const habit of input.habits) {
    const days = habitStreak(input.habitLogs, habit.id, streakDay);
    if (days >= 3 && (!bestStreak || days > bestStreak.days)) bestStreak = { name: habit.name, days };
  }

  const base = {
    weekKey: key(start),
    start,
    end,
    sleepHours: metric(now.sleep, before.sleep),
    waterMl: metric(now.water, before.water),
    workouts: metric(now.workouts, before.workouts),
    habitRate: metric(now.habitRate, before.habitRate),
    mood: metric(now.mood, before.mood),
    bestStreak,
    hasData: now.anyData,
  };
  return {
    ...base,
    headline: buildHeadline(base, input.sleepGoalHours, input.waterGoalMl),
  };
};
