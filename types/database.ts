export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  created_at: string;
}

export interface BodyMetric {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  notes: string | null;
  created_at: string;
}

export interface WaterLog {
  id: string;
  user_id: string;
  log_date: string;
  amount_ml: number;
  created_at: string;
}

export interface MoodLog {
  id: string;
  user_id: string;
  log_date: string;
  mood_score: number | null;
  energy_score: number | null;
  notes: string | null;
  created_at: string;
}

export interface NutritionLog {
  id: string;
  user_id: string;
  logged_at: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_type: string;
  notes: string | null;
}

export interface MealTemplate {
  id: string;
  user_id: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_type: string;
  created_at: string;
}

export interface Workout {
  id: string;
  user_id: string;
  started_at: string;
  name: string;
  notes: string | null;
  duration_minutes: number | null;
  completed: boolean;
  // 20261021120000_calendar_workouts.sql; falta (undefined) si no está aplicada.
  template_id?: string | null;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_name: string;
  order_index: number;
  notes: string | null;
}

export interface WorkoutSet {
  id: string;
  exercise_id: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  completed: boolean;
}

export interface WorkoutTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface WorkoutTemplateExercise {
  id: string;
  template_id: string;
  exercise_name: string;
  order_index: number;
  default_sets: number;
  default_reps: number;
  default_weight_kg: number | null;
}

export interface SleepLog {
  id: string;
  user_id: string;
  bed_time: string;
  wake_time: string;
  quality_rating: number | null;
  notes: string | null;
  created_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string;
  frequency: string;
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  log_date: string;
  completed: boolean;
  notes: string | null;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  created_at: string;
  title: string | null;
  content: string;
  mood_score: number | null;
  tags: string[];
}

export interface Note {
  id: string;
  user_id: string;
  created_at: string;
  title: string | null;
  content: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
}

export interface Event {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  // 20261021120000_calendar_workouts.sql; falta (undefined) si no está aplicada.
  end_time?: string | null;
  location: string | null;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  metric_type: string;
  target_value: number;
  period: 'daily' | 'weekly';
  created_at: string;
}

export interface TimelineEntry {
  id: string;
  type: 'sleep' | 'workout' | 'nutrition' | 'habit' | 'journal' | 'task' | 'note';
  title: string;
  subtitle?: string;
  timestamp?: string;
}
