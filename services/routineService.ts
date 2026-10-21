import { supabase } from '../lib/supabase';
import { Workout, WorkoutTemplate, WorkoutTemplateExercise } from '../types/database';
import { normalizeExerciseName } from '../utils/exerciseProgress';
import { uuid } from '../utils/uuid';
import { getRecentCompletedWorkouts, getWorkoutSession } from './workoutService';

// Rutinas (workout_templates + workout_template_exercises). Se guardan por lotes: la
// rutina, un borrado de los ejercicios quitados y un upsert con el orden de todos.

export type RoutineExerciseDraft = { id: string; name: string; sets: number; reps: number; weightKg: number | null };
export type RoutineDraft = { id: string | null; name: string; exercises: RoutineExerciseDraft[] };
export type RoutineSummary = WorkoutTemplate & { exerciseCount: number; lastDoneAt: string | null };

export const ROUTINE_LIMITS = { name: 60, sets: [1, 10], reps: [1, 30], weight: 999.99 } as const;

const clamp = (value: number, [min, max]: readonly [number, number]) => Math.min(max, Math.max(min, Math.round(value)));

const CHUNK = 100;

const exercisesOf = async (templateIds: string[]): Promise<WorkoutTemplateExercise[]> => {
  const rows: WorkoutTemplateExercise[] = [];
  for (let i = 0; i < templateIds.length; i += CHUNK) {
    const { data, error } = await supabase.from('workout_template_exercises').select('*').in('template_id', templateIds.slice(i, i + CHUNK));
    if (error) throw error;
    rows.push(...((data ?? []) as WorkoutTemplateExercise[]));
  }
  return rows.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
};

// Última vez: por workouts.template_id si la columna existe y está rellena; si no, por nombre.
export const lastDoneFor = (template: Pick<WorkoutTemplate, 'id' | 'name'>, workouts: Workout[]): string | null => {
  const name = normalizeExerciseName(template.name);
  const match = workouts.find((workout) => (workout.template_id ? workout.template_id === template.id : normalizeExerciseName(workout.name) === name));
  return match?.started_at ?? null;
};

export const getRoutines = async (userId: string): Promise<RoutineSummary[]> => {
  const { data, error } = await supabase.from('workout_templates').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  const templates = (data ?? []) as WorkoutTemplate[];
  if (templates.length === 0) return [];
  const [exercises, workouts] = await Promise.all([exercisesOf(templates.map((template) => template.id)), getRecentCompletedWorkouts(userId, 300)]);
  const counts = new Map<string, number>();
  exercises.forEach((row) => counts.set(row.template_id, (counts.get(row.template_id) ?? 0) + 1));
  return templates.map((template) => ({ ...template, exerciseCount: counts.get(template.id) ?? 0, lastDoneAt: lastDoneFor(template, workouts) }));
};

const requireRoutine = async (userId: string, id: string): Promise<WorkoutTemplate> => {
  const { data, error } = await supabase.from('workout_templates').select('*').eq('user_id', userId).eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Rutina no encontrada');
  return data as WorkoutTemplate;
};

export const getRoutine = async (userId: string, id: string): Promise<RoutineDraft> => {
  const template = await requireRoutine(userId, id);
  const rows = await exercisesOf([id]);
  return {
    id,
    name: template.name,
    exercises: rows.map((row) => ({
      id: row.id,
      name: row.exercise_name,
      sets: row.default_sets ?? 3,
      reps: row.default_reps ?? 10,
      weightKg: row.default_weight_kg == null ? null : Number(row.default_weight_kg),
    })),
  };
};

// «Guardar como rutina»: series hechas, reps y peso de la mejor serie de cada ejercicio.
export const routineDraftFromWorkout = async (userId: string, workoutId: string): Promise<RoutineDraft> => {
  const { workout, exercises } = await getWorkoutSession(userId, workoutId);
  return {
    id: null,
    name: workout.name,
    exercises: exercises.map((exercise) => {
      const done = exercise.sets.filter((set) => set.completed);
      const pool = done.length ? done : exercise.sets;
      const top = [...pool].sort((a, b) => Number(b.weight_kg ?? 0) - Number(a.weight_kg ?? 0))[0];
      return {
        id: uuid(),
        name: exercise.exercise_name,
        sets: clamp(pool.length || 3, ROUTINE_LIMITS.sets),
        reps: clamp(top?.reps ?? 10, ROUTINE_LIMITS.reps),
        weightKg: top?.weight_kg == null || Number(top.weight_kg) <= 0 ? null : Number(top.weight_kg),
      };
    }),
  };
};

const rowsFor = (templateId: string, exercises: RoutineExerciseDraft[]): WorkoutTemplateExercise[] =>
  exercises.map((exercise, index) => ({
    id: exercise.id,
    template_id: templateId,
    exercise_name: exercise.name.trim().slice(0, ROUTINE_LIMITS.name),
    order_index: index,
    default_sets: clamp(exercise.sets, ROUTINE_LIMITS.sets),
    default_reps: clamp(exercise.reps, ROUTINE_LIMITS.reps),
    default_weight_kg: exercise.weightKg == null ? null : Math.min(ROUTINE_LIMITS.weight, Math.max(0, Math.round(exercise.weightKg * 100) / 100)),
  }));

export const saveRoutine = async (userId: string, draft: RoutineDraft): Promise<string> => {
  const name = draft.name.trim().slice(0, ROUTINE_LIMITS.name);
  if (!name) throw new Error('Rutina sin nombre');
  const rows = (id: string) => rowsFor(id, draft.exercises);

  if (!draft.id) {
    const id = uuid();
    const { error } = await supabase.from('workout_templates').insert({ id, user_id: userId, name, description: null });
    if (error) throw error;
    if (draft.exercises.length) {
      const { error: rowsError } = await supabase.from('workout_template_exercises').insert(rows(id));
      if (rowsError) {
        await supabase.from('workout_templates').delete().eq('user_id', userId).eq('id', id);
        throw rowsError;
      }
    }
    return id;
  }

  const id = draft.id;
  await requireRoutine(userId, id);
  const { error } = await supabase.from('workout_templates').update({ name }).eq('user_id', userId).eq('id', id);
  if (error) throw error;
  const keep = new Set(draft.exercises.map((exercise) => exercise.id));
  const removed = (await exercisesOf([id])).filter((row) => !keep.has(row.id)).map((row) => row.id);
  if (removed.length) {
    const { error: deleteError } = await supabase.from('workout_template_exercises').delete().in('id', removed);
    if (deleteError) throw deleteError;
  }
  if (draft.exercises.length) {
    const { error: upsertError } = await supabase.from('workout_template_exercises').upsert(rows(id), { onConflict: 'id' });
    if (upsertError) throw upsertError;
  }
  return id;
};

export const duplicateRoutine = async (userId: string, id: string): Promise<string> => {
  const routine = await getRoutine(userId, id);
  const suffix = ' (copia)';
  return saveRoutine(userId, {
    id: null,
    name: `${routine.name.slice(0, ROUTINE_LIMITS.name - suffix.length)}${suffix}`,
    exercises: routine.exercises.map((exercise) => ({ ...exercise, id: uuid() })),
  });
};

// Borra la rutina y sus ejercicios (cascada); los entrenos hechos con ella se quedan.
export const deleteRoutine = async (userId: string, id: string): Promise<void> => {
  const { error } = await supabase.from('workout_templates').delete().eq('user_id', userId).eq('id', id);
  if (error) throw error;
};
