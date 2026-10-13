import { differenceInHours, format, subDays } from 'date-fns';
import { Colors } from '../constants/colors';
import { supabase } from '../lib/supabase';
import { BodyMetric, HabitLog, NutritionLog, SleepLog, Workout } from '../types/database';
import { BodyStats, HabitStats, NutritionStats, SleepStats, WorkoutStats } from '../types/stats';

const getStartDate = (days: number) => format(subDays(new Date(), days), 'yyyy-MM-dd');

export const getSleepStats = async (userId: string, days = 7): Promise<SleepStats> => {
  const { data, error } = await supabase.from('sleep_logs').select('*').eq('user_id', userId).gte('created_at', getStartDate(days));
  if (error) throw error;
  const logs = (data ?? []) as SleepLog[];
  const values = logs.map((log) => differenceInHours(new Date(log.wake_time), new Date(log.bed_time)));
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  return {
    averageHours: Number(avg.toFixed(1)),
    bestHours: Number((Math.max(...values, 0)).toFixed(1)),
    points: values.map((v, i) => ({ label: `${i + 1}`, value: Number(v.toFixed(1)) })),
  };
};

export const getNutritionStats = async (userId: string, days = 7): Promise<NutritionStats> => {
  const { data, error } = await supabase.from('nutrition_logs').select('*').eq('user_id', userId).gte('logged_at', getStartDate(days));
  if (error) throw error;
  const rows = (data ?? []) as NutritionLog[];
  const count = rows.length || 1;
  const averageCalories = rows.reduce((acc, row) => acc + row.calories, 0) / count;
  const averageProtein = rows.reduce((acc, row) => acc + row.protein_g, 0) / count;
  const carbs = rows.reduce((acc, row) => acc + row.carbs_g, 0);
  const fats = rows.reduce((acc, row) => acc + row.fat_g, 0);
  const proteins = rows.reduce((acc, row) => acc + row.protein_g, 0);

  return {
    averageCalories: Number(averageCalories.toFixed(0)),
    averageProtein: Number(averageProtein.toFixed(0)),
    caloriesByDay: rows.map((row, i) => ({ label: `${i + 1}`, value: row.calories })),
    macros: [
      { label: 'Protein', value: proteins, color: Colors.nutrition },
      { label: 'Carbs', value: carbs, color: Colors.gold },
      { label: 'Fat', value: fats, color: Colors.task },
    ],
  };
};

export const getWorkoutStats = async (userId: string, days = 30): Promise<WorkoutStats> => {
  const { data, error } = await supabase.from('workouts').select('*').eq('user_id', userId).gte('started_at', getStartDate(days));
  if (error) throw error;
  const rows = (data ?? []) as Workout[];
  const sessions = rows.length;
  const totalVolume = rows.reduce((acc, row) => acc + (row.duration_minutes ?? 0), 0);
  return {
    sessions,
    totalVolume,
    sessionsByWeek: rows.map((_, i) => ({ label: `W${i + 1}`, value: 1 })),
  };
};

export const getHabitStats = async (userId: string, days = 30): Promise<HabitStats> => {
  const { data, error } = await supabase.from('habit_logs').select('*').eq('user_id', userId).gte('log_date', getStartDate(days));
  if (error) throw error;
  const rows = (data ?? []) as HabitLog[];
  const completed = rows.filter((row) => row.completed).length;
  return {
    completionRate: rows.length ? Math.round((completed / rows.length) * 100) : 0,
    streakHeatmap: rows.map((row) => ({ date: row.log_date, completed: row.completed })),
  };
};

export const getBodyStats = async (userId: string): Promise<BodyStats> => {
  const { data, error } = await supabase.from('body_metrics').select('*').eq('user_id', userId).order('date', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as BodyMetric[];
  const first = rows[0]?.weight_kg ?? 0;
  const latest = rows[rows.length - 1]?.weight_kg ?? null;
  return {
    latestWeight: latest,
    changeFromStart: Number(((latest ?? 0) - first).toFixed(1)),
    points: rows.map((row, idx) => ({ label: `${idx + 1}`, value: row.weight_kg ?? 0 })),
  };
};
