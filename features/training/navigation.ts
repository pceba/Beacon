import { invalidateTables } from '../../lib/query';
import { navigationRef } from '../../navigation/navigationRef';

// Abrir el entreno desde fuera del navegador de la pantalla (Hoy, Datos, hojas).

export const openTrainingStart = (fromToday = true) => {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('LogWorkoutScreen', { fromToday });
};

export const openWorkout = (workoutId: string, mode: 'live' | 'edit' = 'live', fromToday?: boolean) => {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('WorkoutDetailScreen', { workoutId, mode, fromToday });
};

export const openWorkoutHistory = () => {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('WorkoutHistoryScreen');
};

// Tras escribir entrenos: Hoy, Datos y el progreso por ejercicio vuelven a leer.
export const refreshTraining = () => invalidateTables('workouts', 'workout_exercises', 'workout_sets');

export const refreshRoutines = () => invalidateTables('workout_templates', 'workout_template_exercises');
