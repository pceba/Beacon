import { withSupportedColumns } from '../lib/schemaCaps';
import { supabase } from '../lib/supabase';
import { Workout, WorkoutExercise, WorkoutSet } from '../types/database';
import { LoggedExercise } from '../utils/exerciseProgress';
import { uuid } from '../utils/uuid';
import { Range } from './range';

// Entrenos, ejercicios y series. Los hijos se protegen por su padre (RLS en Supabase);
// borrar un entreno o un ejercicio borra sus hijos (ON DELETE CASCADE y la misma regla
// en la base local). Los ids se generan en el móvil para escribir por lotes.

export type ExerciseWithSets = WorkoutExercise & { sets: WorkoutSet[] };

// Nota de los entrenos rápidos («me he movido») de la celda Movimiento de Hoy.
export const QUICK_MOVE_NOTE = 'rapido';
export const isQuickMove = (workout: Pick<Workout, 'notes'>) => workout.notes === QUICK_MOVE_NOTE;

const CHUNK = 100;

export const chunk = <T,>(items: T[]): T[][] => {
  const parts: T[][] = [];
  for (let i = 0; i < items.length; i += CHUNK) parts.push(items.slice(i, i + CHUNK));
  return parts;
};

const selectIn = async <T,>(table: string, column: string, ids: string[]): Promise<T[]> => {
  const rows: T[] = [];
  for (const part of chunk([...new Set(ids)])) {
    const { data, error } = await supabase.from(table).select('*').in(column, part);
    if (error) throw error;
    rows.push(...((data ?? []) as T[]));
  }
  return rows;
};

// range acota started_at (ISO).
export const getWorkouts = async (userId: string, range?: Range): Promise<Workout[]> => {
  let query = supabase.from('workouts').select('*').eq('user_id', userId);
  if (range?.from) query = query.gte('started_at', range.from);
  if (range?.to) query = query.lte('started_at', range.to);
  const { data, error } = await query.order('started_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Workout[];
};

export const getWorkoutById = async (userId: string, id: string): Promise<Workout | null> => {
  const { data, error } = await supabase.from('workouts').select('*').eq('user_id', userId).eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as Workout | null) ?? null;
};

// Para escribir en hijos: el entreno tiene que existir y ser de este usuario.
export const requireWorkout = async (userId: string, id: string): Promise<Workout> => {
  const workout = await getWorkoutById(userId, id);
  if (!workout) throw new Error('Entreno no encontrado');
  return workout;
};

type NewWorkout = Omit<Workout, 'id' | 'user_id' | 'started_at'> & { id?: string; started_at?: string };

// template_id solo se envía si existe la columna (migración 20261021120000).
export const createWorkout = async (userId: string, payload: NewWorkout): Promise<Workout> => {
  const { template_id, ...rest } = payload;
  const row = await withSupportedColumns('workouts', {
    ...rest,
    id: payload.id ?? uuid(),
    user_id: userId,
    ...(template_id ? { template_id } : {}),
  });
  const { data, error } = await supabase.from('workouts').insert(row).select('*').single();
  if (error) throw error;
  return data as Workout;
};

export const updateWorkout = async (userId: string, id: string, patch: Partial<Omit<Workout, 'id' | 'user_id'>>): Promise<void> => {
  const row = await withSupportedColumns('workouts', patch as Record<string, unknown>);
  const { error } = await supabase.from('workouts').update(row).eq('user_id', userId).eq('id', id);
  if (error) throw error;
};

export const deleteWorkout = async (userId: string, id: string): Promise<void> => {
  const { error } = await supabase.from('workouts').delete().eq('user_id', userId).eq('id', id);
  if (error) throw error;
};

// Ejercicios con sus series: una consulta para los ejercicios y otra (por lotes de ids) para las series.
const loadExercises = async (workoutIds: string[]): Promise<ExerciseWithSets[]> => {
  if (workoutIds.length === 0) return [];
  const exercises = await selectIn<WorkoutExercise>('workout_exercises', 'workout_id', workoutIds);
  const sets = await selectIn<WorkoutSet>('workout_sets', 'exercise_id', exercises.map((exercise) => exercise.id));
  const byExercise = new Map<string, WorkoutSet[]>();
  sets.forEach((set) => byExercise.set(set.exercise_id, [...(byExercise.get(set.exercise_id) ?? []), set]));
  return exercises
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .map((exercise) => ({ ...exercise, sets: (byExercise.get(exercise.id) ?? []).sort((a, b) => a.set_number - b.set_number) }));
};

export const getWorkoutExercises = async (userId: string, workoutId: string): Promise<ExerciseWithSets[]> => {
  await requireWorkout(userId, workoutId);
  return loadExercises([workoutId]);
};

export const getWorkoutSession = async (userId: string, workoutId: string) => {
  const workout = await requireWorkout(userId, workoutId);
  return { workout, exercises: await loadExercises([workoutId]) };
};

// Entreno en curso: sin terminar y que no sea un movimiento rápido. `since` acota started_at.
export const getActiveWorkout = async (userId: string, since?: string): Promise<Workout | null> => {
  let query = supabase.from('workouts').select('*').eq('user_id', userId).eq('completed', false);
  if (since) query = query.gte('started_at', since);
  const { data, error } = await query.order('started_at', { ascending: false }).limit(5);
  if (error) throw error;
  return ((data ?? []) as Workout[]).find((workout) => !isQuickMove(workout)) ?? null;
};

const recentCompleted = async (userId: string, limit: number): Promise<Workout[]> => {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', userId)
    .eq('completed', true)
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as Workout[]).filter((workout) => !isQuickMove(workout));
};

export const getRecentCompletedWorkouts = recentCompleted;

// Último entreno terminado con ejercicios, para «Repetir el último».
export const getLastCompletedWorkout = async (userId: string): Promise<{ workout: Workout; exerciseCount: number } | null> => {
  const candidates = await recentCompleted(userId, 10);
  if (candidates.length === 0) return null;
  const exercises = await selectIn<WorkoutExercise>('workout_exercises', 'workout_id', candidates.map((workout) => workout.id));
  for (const workout of candidates) {
    const count = exercises.filter((exercise) => exercise.workout_id === workout.id).length;
    if (count > 0) return { workout, exerciseCount: count };
  }
  return null;
};

export const HISTORY_PAGE = 30;

export type HistoryItem = Workout & { volumeKg: number };

// Una página del historial (30 entrenos terminados) con su volumen, calculado solo para esa página.
export const getWorkoutHistoryPage = async (userId: string, page: number): Promise<{ items: HistoryItem[]; hasMore: boolean }> => {
  const from = page * HISTORY_PAGE;
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', userId)
    .eq('completed', true)
    .order('started_at', { ascending: false })
    .range(from, from + HISTORY_PAGE - 1);
  if (error) throw error;
  const raw = (data ?? []) as Workout[];
  const workouts = raw.filter((workout) => !isQuickMove(workout));
  const exercises = await selectIn<WorkoutExercise>('workout_exercises', 'workout_id', workouts.map((workout) => workout.id));
  const sets = await selectIn<WorkoutSet>('workout_sets', 'exercise_id', exercises.map((exercise) => exercise.id));
  const workoutOf = new Map(exercises.map((exercise) => [exercise.id, exercise.workout_id]));
  const volume = new Map<string, number>();
  sets.forEach((set) => {
    const workoutId = workoutOf.get(set.exercise_id);
    if (!workoutId || !set.completed || set.weight_kg == null || set.reps == null) return;
    volume.set(workoutId, (volume.get(workoutId) ?? 0) + Number(set.weight_kg) * set.reps);
  });
  return { items: workouts.map((workout) => ({ ...workout, volumeKg: volume.get(workout.id) ?? 0 })), hasMore: raw.length === HISTORY_PAGE };
};

// Supabase devuelve como mucho 1.000 filas por consulta: se pide por páginas. La base local
// también respeta range, pero el proxy puede mezclar respuestas (una página remota vacía cae
// a la local), así que se corta en cuanto una página repite filas o no viene llena.
const PAGE = 1000;
const selectAll = async <T extends { id: string }>(table: string): Promise<T[]> => {
  const rows: T[] = [];
  const seen = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select('*').order('id', { ascending: true }).range(from, from + PAGE - 1);
    if (error) throw error;
    const page = (data ?? []) as T[];
    const fresh = page.filter((row) => !seen.has(row.id));
    fresh.forEach((row) => seen.add(row.id));
    rows.push(...fresh);
    if (page.length !== PAGE || fresh.length < page.length) break;
  }
  return rows;
};

// Historial de fuerza completo (Datos, progreso por ejercicio, «Anterior» y recientes del selector).
export const getStrengthEntries = async (userId: string): Promise<LoggedExercise[]> => {
  const workouts = await getWorkouts(userId);
  const byId = new Map(workouts.map((workout) => [workout.id, workout]));
  const exercises = await selectAll<WorkoutExercise>('workout_exercises');
  const sets = await selectAll<WorkoutSet>('workout_sets');
  const setsByExercise = new Map<string, WorkoutSet[]>();
  sets.forEach((set) => {
    const list = setsByExercise.get(set.exercise_id) ?? [];
    list.push(set);
    setsByExercise.set(set.exercise_id, list);
  });
  return exercises
    .filter((exercise) => byId.has(exercise.workout_id))
    .map((exercise) => ({
      workoutId: exercise.workout_id,
      performedAt: byId.get(exercise.workout_id)?.started_at ?? '',
      name: exercise.exercise_name,
      sets: (setsByExercise.get(exercise.id) ?? [])
        .sort((a, b) => a.set_number - b.set_number)
        .map((set) => ({
          reps: set.reps,
          weightKg: set.weight_kg == null ? null : Number(set.weight_kg),
          completed: set.completed,
          order: set.set_number,
        })),
    }));
};
