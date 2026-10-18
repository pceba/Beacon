import { supabase } from '../lib/supabase';
import { Workout, WorkoutExercise, WorkoutSet, WorkoutTemplate, WorkoutTemplateExercise } from '../types/database';
import { LoggedExercise } from '../utils/exerciseProgress';

export const getWorkouts = async (userId: string): Promise<Workout[]> => {
  const { data, error } = await supabase.from('workouts').select('*').eq('user_id', userId).order('started_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Workout[];
};

export const createWorkout = async (
  userId: string,
  payload: Omit<Workout, 'id' | 'user_id' | 'started_at'> & { started_at?: string },
): Promise<Workout> => {
  const { data, error } = await supabase.from('workouts').insert({ user_id: userId, ...payload }).select('*').single();
  if (error) throw error;
  return data as Workout;
};

export const updateWorkout = async (userId: string, id: string, payload: Partial<Workout>): Promise<Workout> => {
  const { data, error } = await supabase.from('workouts').update(payload).eq('user_id', userId).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Workout;
};

export const deleteWorkout = async (userId: string, id: string): Promise<void> => {
  const { error } = await supabase.from('workouts').delete().eq('user_id', userId).eq('id', id);
  if (error) throw error;
};

export const getStrengthEntries = async (userId: string): Promise<LoggedExercise[]> => {
  const workouts = await getWorkouts(userId);
  const byId = new Map(workouts.map((workout) => [workout.id, workout]));
  const { data: exercises, error } = await supabase.from('workout_exercises').select('*');
  if (error) throw error;
  const { data: sets, error: setsError } = await supabase.from('workout_sets').select('*');
  if (setsError) throw setsError;
  const setsByExercise = new Map<string, WorkoutSet[]>();
  ((sets ?? []) as WorkoutSet[]).forEach((set) => {
    const list = setsByExercise.get(set.exercise_id) ?? [];
    list.push(set);
    setsByExercise.set(set.exercise_id, list);
  });
  return ((exercises ?? []) as WorkoutExercise[])
    .filter((exercise) => byId.has(exercise.workout_id))
    .map((exercise) => ({
      workoutId: exercise.workout_id,
      performedAt: byId.get(exercise.workout_id)?.started_at ?? '',
      name: exercise.exercise_name,
      sets: (setsByExercise.get(exercise.id) ?? [])
        .sort((a, b) => a.set_number - b.set_number)
        .map((set) => ({
          reps: set.reps,
          weightKg: set.weight_kg,
          completed: set.completed,
          order: set.set_number,
        })),
    }));
};

export const getWorkoutExercises = async (userId: string, workoutId: string): Promise<Array<WorkoutExercise & { sets: WorkoutSet[] }>> => {
  const workout = await getWorkoutById(userId, workoutId);
  if (!workout) return [];
  const { data, error } = await supabase.from('workout_exercises').select('*').eq('workout_id', workoutId).order('order_index', { ascending: true });
  if (error) throw error;
  const exercises = (data ?? []) as WorkoutExercise[];
  const detailed: Array<WorkoutExercise & { sets: WorkoutSet[] }> = [];
  for (const exercise of exercises) {
    const { data: setRows, error: setError } = await supabase
      .from('workout_sets')
      .select('*')
      .eq('exercise_id', exercise.id)
      .order('set_number', { ascending: true });
    if (setError) throw setError;
    detailed.push({ ...exercise, sets: (setRows ?? []) as WorkoutSet[] });
  }
  return detailed;
};

export const getWorkoutById = async (userId: string, id: string): Promise<Workout | null> => {
  const { data, error } = await supabase.from('workouts').select('*').eq('user_id', userId).eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as Workout | null) ?? null;
};

export const addExercise = async (
  userId: string,
  workoutId: string,
  payload: Omit<WorkoutExercise, 'id' | 'workout_id'>,
): Promise<WorkoutExercise> => {
  await getWorkoutById(userId, workoutId);
  const { data, error } = await supabase.from('workout_exercises').insert({ workout_id: workoutId, ...payload }).select('*').single();
  if (error) throw error;
  return data as WorkoutExercise;
};

export const updateExercise = async (userId: string, id: string, payload: Partial<WorkoutExercise>): Promise<WorkoutExercise> => {
  const { data: exercise, error: findError } = await supabase.from('workout_exercises').select('id, workout_id').eq('id', id).single();
  if (findError) throw findError;
  await getWorkoutById(userId, exercise.workout_id);
  const { data, error } = await supabase.from('workout_exercises').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data as WorkoutExercise;
};

export const deleteExercise = async (userId: string, id: string): Promise<void> => {
  const { data: exercise, error: findError } = await supabase.from('workout_exercises').select('id, workout_id').eq('id', id).single();
  if (findError) throw findError;
  await getWorkoutById(userId, exercise.workout_id);
  const { error } = await supabase.from('workout_exercises').delete().eq('id', id);
  if (error) throw error;
};

export const addSet = async (
  userId: string,
  exerciseId: string,
  payload: Omit<WorkoutSet, 'id' | 'exercise_id'>,
): Promise<WorkoutSet> => {
  const { data: exercise, error: findError } = await supabase.from('workout_exercises').select('id, workout_id').eq('id', exerciseId).single();
  if (findError) throw findError;
  await getWorkoutById(userId, exercise.workout_id);
  const { data, error } = await supabase.from('workout_sets').insert({ exercise_id: exerciseId, ...payload }).select('*').single();
  if (error) throw error;
  return data as WorkoutSet;
};

export const updateSet = async (userId: string, id: string, payload: Partial<WorkoutSet>): Promise<WorkoutSet> => {
  const { data: setRow, error: setError } = await supabase.from('workout_sets').select('id, exercise_id').eq('id', id).single();
  if (setError) throw setError;
  const { data: exercise, error: exerciseError } = await supabase
    .from('workout_exercises')
    .select('id, workout_id')
    .eq('id', setRow.exercise_id)
    .single();
  if (exerciseError) throw exerciseError;
  await getWorkoutById(userId, exercise.workout_id);
  const { data, error } = await supabase.from('workout_sets').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data as WorkoutSet;
};

export const deleteSet = async (userId: string, id: string): Promise<void> => {
  const { data: setRow, error: setError } = await supabase.from('workout_sets').select('id, exercise_id').eq('id', id).single();
  if (setError) throw setError;
  const { data: exercise, error: exerciseError } = await supabase
    .from('workout_exercises')
    .select('id, workout_id')
    .eq('id', setRow.exercise_id)
    .single();
  if (exerciseError) throw exerciseError;
  await getWorkoutById(userId, exercise.workout_id);
  const { error } = await supabase.from('workout_sets').delete().eq('id', id);
  if (error) throw error;
};

export const getWorkoutTemplates = async (userId: string): Promise<WorkoutTemplate[]> => {
  const { data, error } = await supabase.from('workout_templates').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as WorkoutTemplate[];
};

export const createWorkoutTemplate = async (
  userId: string,
  payload: Omit<WorkoutTemplate, 'id' | 'user_id' | 'created_at'>,
): Promise<WorkoutTemplate> => {
  const { data, error } = await supabase.from('workout_templates').insert({ user_id: userId, ...payload }).select('*').single();
  if (error) throw error;
  return data as WorkoutTemplate;
};

export const createWorkoutFromTemplate = async (userId: string, templateId: string): Promise<Workout> => {
  const { data: template, error: templateError } = await supabase
    .from('workout_templates')
    .select('*')
    .eq('user_id', userId)
    .eq('id', templateId)
    .single();
  if (templateError) throw templateError;

  const workout = await createWorkout(userId, {
    name: template.name,
    notes: template.description,
    duration_minutes: null,
    completed: false,
  });

  const { data: exercises, error: exercisesError } = await supabase
    .from('workout_template_exercises')
    .select('*')
    .eq('template_id', templateId)
    .order('order_index', { ascending: true });
  if (exercisesError) throw exercisesError;

  for (const exercise of (exercises ?? []) as WorkoutTemplateExercise[]) {
    const createdExercise = await addExercise(userId, workout.id, {
      exercise_name: exercise.exercise_name,
      order_index: exercise.order_index,
      notes: null,
    });
    for (let i = 1; i <= exercise.default_sets; i += 1) {
      await addSet(userId, createdExercise.id, {
        set_number: i,
        reps: exercise.default_reps,
        weight_kg: exercise.default_weight_kg,
        duration_seconds: null,
        completed: false,
      });
    }
  }

  return workout;
};
