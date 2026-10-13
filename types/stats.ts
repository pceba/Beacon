export interface SleepStats {
  averageHours: number;
  bestHours: number;
  points: { label: string; value: number }[];
}

export interface NutritionStats {
  averageCalories: number;
  averageProtein: number;
  caloriesByDay: { label: string; value: number }[];
  macros: { label: string; value: number; color: string }[];
}

export interface WorkoutStats {
  sessions: number;
  totalVolume: number;
  sessionsByWeek: { label: string; value: number }[];
}

export interface HabitStats {
  completionRate: number;
  streakHeatmap: { date: string; completed: boolean }[];
}

export interface BodyStats {
  latestWeight: number | null;
  changeFromStart: number;
  points: { label: string; value: number }[];
}
