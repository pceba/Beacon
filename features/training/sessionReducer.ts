import { Workout, WorkoutExercise, WorkoutSet } from '../../types/database';
import { repsText, toReps, toWeightKg, weightText } from './numbers';

// Estado de la sesión que se edita en pantalla. Puro: cada cambio devuelve un estado
// nuevo y deja intactos los ejercicios que no toca (las tarjetas memorizadas no se repintan).

export type SetDraft = {
  id: string;
  number: number;
  weight: string;
  reps: string;
  completed: boolean;
  // Valor propuesto (de la rutina, de la sesión repetida o de la serie anterior): se ve en gris.
  proposed: boolean;
};

export type ExerciseDraft = { id: string; name: string; notes: string | null; sets: SetDraft[] };

export type SessionWorkout = {
  id: string;
  name: string;
  notes: string | null;
  startedAt: string;
  completed: boolean;
  durationMinutes: number | null;
};

export type SessionState = { workout: SessionWorkout | null; exercises: ExerciseDraft[] };

export type SetValues = { weight_kg: number | null; reps: number | null; completed: boolean };

export type SessionAction =
  | { type: 'load'; state: SessionState }
  | { type: 'patchWorkout'; patch: Partial<Pick<SessionWorkout, 'name' | 'notes' | 'completed' | 'durationMinutes'>> }
  | { type: 'insertExercises'; exercises: ExerciseDraft[]; index?: number }
  | { type: 'removeExercise'; exerciseId: string }
  | { type: 'moveExercise'; exerciseId: string; delta: number }
  | { type: 'patchExercise'; exerciseId: string; patch: Partial<Pick<ExerciseDraft, 'name' | 'notes'>> }
  | { type: 'insertSet'; exerciseId: string; set: SetDraft; index?: number }
  | { type: 'removeSet'; exerciseId: string; setId: string }
  | { type: 'editSet'; exerciseId: string; setId: string; field: 'weight' | 'reps'; text: string }
  | { type: 'patchSet'; exerciseId: string; setId: string; patch: Partial<SetDraft> }
  | { type: 'finish'; doneIds: string[]; dropIds: string[] };

export const EMPTY_SESSION: SessionState = { workout: null, exercises: [] };

export const hasValues = (set: SetDraft) => set.weight.trim() !== '' || set.reps.trim() !== '';

export const setValues = (set: SetDraft): SetValues => ({
  weight_kg: toWeightKg(set.weight),
  reps: toReps(set.reps),
  completed: set.completed,
});

export const draftFromSet = (row: WorkoutSet): SetDraft => ({
  id: row.id,
  number: row.set_number,
  weight: weightText(row.weight_kg),
  reps: repsText(row.reps),
  completed: !!row.completed,
  proposed: !row.completed && (row.weight_kg != null || row.reps != null),
});

export const draftFromRows = (workout: Workout, exercises: Array<WorkoutExercise & { sets: WorkoutSet[] }>): SessionState => ({
  workout: {
    id: workout.id,
    name: workout.name,
    notes: workout.notes,
    startedAt: workout.started_at,
    completed: !!workout.completed,
    durationMinutes: workout.duration_minutes,
  },
  exercises: exercises.map((exercise) => ({
    id: exercise.id,
    name: exercise.exercise_name,
    notes: exercise.notes,
    sets: exercise.sets.map(draftFromSet),
  })),
});

export const newExerciseDraft = (id: string, name: string, setIds: string[]): ExerciseDraft => ({
  id,
  name,
  notes: null,
  sets: setIds.map((setId, index) => ({ id: setId, number: index + 1, weight: '', reps: '', completed: false, proposed: false })),
});

// «+ Añadir serie»: copia kg y reps de la última serie, sin marcar y en gris.
export const newSetAfter = (exercise: ExerciseDraft, id: string): SetDraft => {
  const last = exercise.sets[exercise.sets.length - 1];
  const number = exercise.sets.reduce((max, set) => Math.max(max, set.number), 0) + 1;
  return {
    id,
    number,
    weight: last?.weight ?? '',
    reps: last?.reps ?? '',
    completed: false,
    proposed: last ? hasValues(last) : false,
  };
};

export const exerciseRow = (workoutId: string, exercise: ExerciseDraft, index: number): WorkoutExercise => ({
  id: exercise.id,
  workout_id: workoutId,
  exercise_name: exercise.name,
  order_index: index,
  notes: exercise.notes,
});

export const setRow = (exerciseId: string, set: SetDraft): WorkoutSet => ({
  id: set.id,
  exercise_id: exerciseId,
  set_number: set.number,
  ...setValues(set),
  duration_seconds: null,
});

// Qué hacer al terminar: series marcadas, con valores sin marcar y vacías.
export const planFinish = (exercises: ExerciseDraft[]) => {
  const unticked: string[] = [];
  const empty: string[] = [];
  let done = 0;
  exercises.forEach((exercise) =>
    exercise.sets.forEach((set) => {
      if (set.completed) done += 1;
      else if (hasValues(set)) unticked.push(set.id);
      else empty.push(set.id);
    }),
  );
  return { unticked, empty, done };
};

// Ejercicios que se quedan sin series si se quitan `dropIds`.
export const exercisesLeftEmpty = (exercises: ExerciseDraft[], dropIds: string[]) => {
  const drop = new Set(dropIds);
  return exercises.filter((exercise) => exercise.sets.every((set) => drop.has(set.id))).map((exercise) => exercise.id);
};

const mapExercise = (state: SessionState, id: string, update: (exercise: ExerciseDraft) => ExerciseDraft): SessionState => {
  let changed = false;
  const exercises = state.exercises.map((exercise) => {
    if (exercise.id !== id) return exercise;
    changed = true;
    return update(exercise);
  });
  return changed ? { ...state, exercises } : state;
};

const mapSet = (exercise: ExerciseDraft, id: string, update: (set: SetDraft) => SetDraft): ExerciseDraft => ({
  ...exercise,
  sets: exercise.sets.map((set) => (set.id === id ? update(set) : set)),
});

const insertAt = <T,>(list: T[], items: T[], index?: number) => {
  const at = index == null ? list.length : Math.max(0, Math.min(index, list.length));
  return [...list.slice(0, at), ...items, ...list.slice(at)];
};

export const sessionReducer = (state: SessionState, action: SessionAction): SessionState => {
  switch (action.type) {
    case 'load':
      return action.state;
    case 'patchWorkout':
      return state.workout ? { ...state, workout: { ...state.workout, ...action.patch } } : state;
    case 'insertExercises': {
      const known = new Set(state.exercises.map((exercise) => exercise.id));
      const fresh = action.exercises.filter((exercise) => !known.has(exercise.id));
      return fresh.length ? { ...state, exercises: insertAt(state.exercises, fresh, action.index) } : state;
    }
    case 'removeExercise': {
      const exercises = state.exercises.filter((exercise) => exercise.id !== action.exerciseId);
      return exercises.length === state.exercises.length ? state : { ...state, exercises };
    }
    case 'moveExercise': {
      const from = state.exercises.findIndex((exercise) => exercise.id === action.exerciseId);
      const to = from + action.delta;
      if (from < 0 || to < 0 || to >= state.exercises.length) return state;
      const exercises = [...state.exercises];
      const [moved] = exercises.splice(from, 1);
      exercises.splice(to, 0, moved);
      return { ...state, exercises };
    }
    case 'patchExercise':
      return mapExercise(state, action.exerciseId, (exercise) => ({ ...exercise, ...action.patch }));
    case 'insertSet':
      return mapExercise(state, action.exerciseId, (exercise) =>
        exercise.sets.some((set) => set.id === action.set.id) ? exercise : { ...exercise, sets: insertAt(exercise.sets, [action.set], action.index) },
      );
    case 'removeSet':
      return mapExercise(state, action.exerciseId, (exercise) => ({ ...exercise, sets: exercise.sets.filter((set) => set.id !== action.setId) }));
    case 'editSet':
      return mapExercise(state, action.exerciseId, (exercise) =>
        mapSet(exercise, action.setId, (set) => ({ ...set, [action.field]: action.text, proposed: false })),
      );
    case 'patchSet':
      return mapExercise(state, action.exerciseId, (exercise) => mapSet(exercise, action.setId, (set) => ({ ...set, ...action.patch })));
    case 'finish': {
      const done = new Set(action.doneIds);
      const drop = new Set(action.dropIds);
      const exercises = state.exercises
        .map((exercise) => ({
          ...exercise,
          sets: exercise.sets
            .filter((set) => !drop.has(set.id))
            .map((set) => (done.has(set.id) ? { ...set, completed: true, proposed: false } : set)),
        }))
        .filter((exercise) => exercise.sets.length > 0);
      return { workout: state.workout ? { ...state.workout, completed: true } : null, exercises };
    }
    default:
      return state;
  }
};
