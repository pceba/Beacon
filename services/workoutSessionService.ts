import { supabase } from '../lib/supabase';
import { WorkoutExercise, WorkoutSet, Workout } from '../types/database';
import { uuid } from '../utils/uuid';
import {
  chunk,
  createWorkout,
  deleteWorkout,
  ExerciseWithSets,
  getWorkoutSession,
  requireWorkout,
  updateWorkout,
} from './workoutService';

// Escrituras de la sesión (en lote, con ids ya generados).

export const insertExercises = async (userId: string, workoutId: string, items: ExerciseWithSets[]): Promise<void> => {
  if (items.length === 0) return;
  await requireWorkout(userId, workoutId);
  const exercises = items.map(({ sets: _sets, ...exercise }) => ({ ...exercise, workout_id: workoutId }));
  const { error } = await supabase.from('workout_exercises').insert(exercises);
  if (error) throw error;
  const sets = items.flatMap((item) => item.sets);
  if (sets.length === 0) return;
  const { error: setsError } = await supabase.from('workout_sets').insert(sets);
  if (setsError) {
    await supabase.from('workout_exercises').delete().in('id', exercises.map((exercise) => exercise.id));
    throw setsError;
  }
};

export const updateExercise = async (id: string, patch: Partial<Pick<WorkoutExercise, 'exercise_name' | 'notes' | 'order_index'>>) => {
  const { error } = await supabase.from('workout_exercises').update(patch).eq('id', id);
  if (error) throw error;
};

// Guarda order_index de todos los ejercicios del entreno en una sola petición.
export const saveExerciseOrder = async (rows: WorkoutExercise[]) => {
  if (rows.length === 0) return;
  const { error } = await supabase.from('workout_exercises').upsert(rows.map((row, index) => ({ ...row, order_index: index })), { onConflict: 'id' });
  if (error) throw error;
};

export const deleteExercise = async (id: string) => {
  const { error } = await supabase.from('workout_exercises').delete().eq('id', id);
  if (error) throw error;
};

export const insertSets = async (rows: WorkoutSet[]) => {
  if (rows.length === 0) return;
  const { error } = await supabase.from('workout_sets').insert(rows);
  if (error) throw error;
};

export const updateSet = async (id: string, patch: Partial<Pick<WorkoutSet, 'weight_kg' | 'reps' | 'completed' | 'set_number'>>) => {
  const { error } = await supabase.from('workout_sets').update(patch).eq('id', id);
  if (error) throw error;
};

const updateSets = async (ids: string[], patch: Partial<Pick<WorkoutSet, 'completed'>>) => {
  for (const part of chunk(ids)) {
    const { error } = await supabase.from('workout_sets').update(patch).in('id', part);
    if (error) throw error;
  }
};

export const deleteSets = async (ids: string[]) => {
  for (const part of chunk(ids)) {
    const { error } = await supabase.from('workout_sets').delete().in('id', part);
    if (error) throw error;
  }
};

type Finish = { doneIds: string[]; dropSetIds: string[]; dropExerciseIds: string[]; durationMinutes: number; name: string };

export const finishWorkout = async (userId: string, workoutId: string, plan: Finish) => {
  await requireWorkout(userId, workoutId);
  await updateSets(plan.doneIds, { completed: true });
  await deleteSets(plan.dropSetIds);
  for (const part of chunk(plan.dropExerciseIds)) {
    const { error } = await supabase.from('workout_exercises').delete().in('id', part);
    if (error) throw error;
  }
  await updateWorkout(userId, workoutId, { completed: true, duration_minutes: plan.durationMinutes, name: plan.name });
};

// Crea el entreno y sus ejercicios y series en tres peticiones. Si algo falla, lo deshace.
export const createWorkoutWithExercises = async (
  userId: string,
  meta: { name: string; notes: string | null; template_id?: string | null },
  items: ExerciseWithSets[],
): Promise<Workout> => {
  const workout = await createWorkout(userId, { ...meta, duration_minutes: null, completed: false });
  try {
    await insertExercises(userId, workout.id, items.map((item) => ({ ...item, workout_id: workout.id })));
  } catch (error) {
    await deleteWorkout(userId, workout.id).catch(() => undefined);
    throw error;
  }
  return workout;
};

// Copia ejercicios y series como valores propuestos (sin marcar).
const copyExercises = (source: Array<{ name: string; sets: Array<Pick<WorkoutSet, 'reps' | 'weight_kg'>> }>): ExerciseWithSets[] =>
  source.map((exercise, index) => {
    const id = uuid();
    return {
      id,
      workout_id: '',
      exercise_name: exercise.name,
      order_index: index,
      notes: null,
      sets: exercise.sets.map((set, setIndex) => ({
        id: uuid(),
        exercise_id: id,
        set_number: setIndex + 1,
        reps: set.reps,
        weight_kg: set.weight_kg,
        duration_seconds: null,
        completed: false,
      })),
    };
  });

export const createWorkoutFromWorkout = async (userId: string, sourceId: string): Promise<Workout> => {
  const { workout, exercises } = await getWorkoutSession(userId, sourceId);
  const items = copyExercises(
    exercises.map((exercise) => {
      const done = exercise.sets.filter((set) => set.completed);
      return { name: exercise.exercise_name, sets: done.length ? done : exercise.sets };
    }),
  );
  return createWorkoutWithExercises(userId, { name: workout.name, notes: null, template_id: workout.template_id ?? null }, items);
};

export const createWorkoutFromTemplate = async (userId: string, templateId: string): Promise<Workout> => {
  const { data: template, error } = await supabase.from('workout_templates').select('*').eq('user_id', userId).eq('id', templateId).maybeSingle();
  if (error) throw error;
  if (!template) throw new Error('Rutina no encontrada');
  const { data: rows, error: rowsError } = await supabase.from('workout_template_exercises').select('*').eq('template_id', templateId);
  if (rowsError) throw rowsError;
  const ordered = [...((rows ?? []) as Array<{ exercise_name: string; order_index: number; default_sets: number; default_reps: number; default_weight_kg: number | null }>)].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
  );
  const items = copyExercises(
    ordered.map((row) => ({
      name: row.exercise_name,
      sets: Array.from({ length: Math.max(1, row.default_sets ?? 1) }, () => ({ reps: row.default_reps, weight_kg: row.default_weight_kg })),
    })),
  );
  return createWorkoutWithExercises(userId, { name: template.name, notes: template.description ?? null, template_id: templateId }, items);
};
