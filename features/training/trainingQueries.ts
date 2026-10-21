import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { getCurrentUserId } from '../../services/authService';
import { getRoutine, getRoutines, routineDraftFromWorkout } from '../../services/routineService';
import { getActiveWorkout, getLastCompletedWorkout, getStrengthEntries, getWorkoutHistoryPage } from '../../services/workoutService';

// Claves [tabla, ...]; las que leen varias tablas lo dicen en meta.tables (lib/query.ts).

const DAY_MS = 24 * 60 * 60 * 1000;

const WORKOUT_TABLES = ['workouts', 'workout_exercises', 'workout_sets'] as const;
const ROUTINE_TABLES = ['workout_templates', 'workout_template_exercises', 'workouts'] as const;

export const trainingKeys = {
  // Misma clave que Datos (features/insights): comparten caché.
  strength: () => ['workout_sets', 'strength'] as const,
  active: (scope: 'recent' | 'any') => ['workouts', 'active', scope] as const,
  last: () => ['workouts', 'last-completed'] as const,
  history: () => ['workouts', 'history'] as const,
  routines: () => ['workout_templates', 'list'] as const,
  routine: (id: string) => ['workout_templates', 'detail', id] as const,
  routineFromWorkout: (workoutId: string) => ['workout_templates', 'from-workout', workoutId] as const,
};

export const trainingQueries = {
  strength: () =>
    queryOptions({
      queryKey: trainingKeys.strength(),
      queryFn: async () => getStrengthEntries(await getCurrentUserId()),
      meta: { tables: [...WORKOUT_TABLES] },
    }),
  // «recent»: solo lo empezado en las últimas 24 h (Hoy). «any»: cualquiera (Empezar).
  active: (scope: 'recent' | 'any') =>
    queryOptions({
      queryKey: trainingKeys.active(scope),
      queryFn: async () => getActiveWorkout(await getCurrentUserId(), scope === 'recent' ? new Date(Date.now() - DAY_MS).toISOString() : undefined),
    }),
  last: () =>
    queryOptions({
      queryKey: trainingKeys.last(),
      queryFn: async () => getLastCompletedWorkout(await getCurrentUserId()),
      meta: { tables: ['workouts', 'workout_exercises'] },
    }),
  routines: () =>
    queryOptions({
      queryKey: trainingKeys.routines(),
      queryFn: async () => getRoutines(await getCurrentUserId()),
      meta: { tables: [...ROUTINE_TABLES] },
    }),
  routine: (id: string) =>
    queryOptions({
      queryKey: trainingKeys.routine(id),
      queryFn: async () => getRoutine(await getCurrentUserId(), id),
      meta: { tables: ['workout_templates', 'workout_template_exercises'] },
      staleTime: 0,
    }),
  routineFromWorkout: (workoutId: string) =>
    queryOptions({
      queryKey: trainingKeys.routineFromWorkout(workoutId),
      queryFn: async () => routineDraftFromWorkout(await getCurrentUserId(), workoutId),
      meta: { tables: [...WORKOUT_TABLES] },
      staleTime: 0,
    }),
  history: () =>
    infiniteQueryOptions({
      queryKey: trainingKeys.history(),
      queryFn: async ({ pageParam }) => getWorkoutHistoryPage(await getCurrentUserId(), pageParam),
      initialPageParam: 0,
      getNextPageParam: (last, pages) => (last.hasMore ? pages.length : undefined),
      meta: { tables: [...WORKOUT_TABLES] },
    }),
};
