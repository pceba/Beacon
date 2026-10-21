import { WorkoutSet } from '../../types/database';
import { beatsBest, epley, lastPerformance, LoggedExercise, LoggedSet, maxE1rm } from '../../utils/exerciseProgress';
import { formatFlexible } from '../../utils/format';
import { repsText, toReps, toWeightKg, weightText } from './numbers';
import { ExerciseDraft, SetDraft } from './sessionReducer';

// Cuentas de la sesión: volumen, récords, resumen y la columna «Anterior».

const volumeOf = (weight: number | null, reps: number | null) => (weight != null && reps != null && weight > 0 && reps > 0 ? weight * reps : 0);

// Volumen (kg) de filas guardadas: peso × reps de las series hechas.
export const rowsVolume = (sets: Array<Pick<WorkoutSet, 'weight_kg' | 'reps' | 'completed'>>) =>
  sets.reduce((sum, set) => (set.completed ? sum + volumeOf(set.weight_kg == null ? null : Number(set.weight_kg), set.reps) : sum), 0);

export const draftVolume = (exercises: ExerciseDraft[]) =>
  exercises.reduce(
    (sum, exercise) => sum + exercise.sets.reduce((inner, set) => (set.completed ? inner + volumeOf(toWeightKg(set.weight), toReps(set.reps)) : inner), 0),
    0,
  );

// Series que baten el mejor 1RM estimado conocido, en orden: cada récord sube el listón.
export const prSetIds = (sets: SetDraft[], best: number | null): string[] => {
  let current = best;
  const ids: string[] = [];
  sets.forEach((set) => {
    if (!set.completed) return;
    const weight = toWeightKg(set.weight);
    const reps = toReps(set.reps);
    if (weight == null || reps == null) return;
    if (beatsBest(current, weight, reps)) ids.push(set.id);
    const estimate = epley(weight, reps);
    if (estimate != null && current != null && estimate > current) current = estimate;
  });
  return ids;
};

export type SessionPr = { exerciseId: string; name: string; weightKg: number; reps: number };

export type SessionSummary = { durationMinutes: number; volumeKg: number; setsDone: number; prs: SessionPr[] };

// Un récord por ejercicio: la serie con el 1RM estimado más alto de las que baten la marca.
export const sessionPrs = (exercises: ExerciseDraft[], history: LoggedExercise[]): SessionPr[] => {
  const prs: SessionPr[] = [];
  exercises.forEach((exercise) => {
    const ids = new Set(prSetIds(exercise.sets, maxE1rm(history, exercise.name)));
    let top: SessionPr | null = null;
    let topEstimate = -1;
    for (const set of exercise.sets) {
      if (!ids.has(set.id)) continue;
      const weightKg = toWeightKg(set.weight) as number;
      const reps = toReps(set.reps) as number;
      const estimate = epley(weightKg, reps) ?? 0;
      if (estimate > topEstimate) {
        topEstimate = estimate;
        top = { exerciseId: exercise.id, name: exercise.name, weightKg, reps };
      }
    }
    if (top) prs.push(top);
  });
  return prs;
};

export const summarizeSession = (exercises: ExerciseDraft[], history: LoggedExercise[], minutes: number): SessionSummary => ({
  durationMinutes: minutes,
  volumeKg: draftVolume(exercises),
  setsDone: exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.completed).length, 0),
  prs: sessionPrs(exercises, history),
});

export const formatPr = (pr: SessionPr) => `${pr.name} · ${formatFlexible(pr.weightKg, 2)} kg × ${pr.reps}`;

// Historial para comparar: otras sesiones, anteriores a esta.
export const historyBefore = (entries: LoggedExercise[], workoutId: string, startedAt?: string | null) => {
  const limit = startedAt ? Date.parse(startedAt) : NaN;
  return entries.filter((entry) => {
    if (entry.workoutId === workoutId) return false;
    if (!Number.isFinite(limit)) return true;
    const at = Date.parse(entry.performedAt);
    return !Number.isFinite(at) || at < limit;
  });
};

// Series de la última sesión de ese ejercicio: las hechas o, si no se marcó ninguna, todas.
export const previousSession = (history: LoggedExercise[], name: string): LoggedSet[] | null => {
  const sets = lastPerformance(history, name);
  if (!sets?.length) return null;
  const done = sets.filter((set) => set.completed);
  return done.length ? done : sets;
};

export type Anterior = { label: string; weight: string; reps: string };

export const NO_ANTERIOR: Anterior = { label: '—', weight: '', reps: '' };

export const anteriorLabel = (set: Pick<LoggedSet, 'weightKg' | 'reps'>) => {
  const weight = set.weightKg != null && set.weightKg > 0 ? formatFlexible(set.weightKg, 2) : null;
  if (weight && set.reps != null) return `${weight} × ${set.reps}`;
  if (weight) return `${weight} kg`;
  if (set.reps != null) return `× ${set.reps}`;
  return '—';
};

// «Anterior» por posición: la serie 2 de hoy se compara con la serie 2 de la última vez.
export const anteriorRows = (previous: LoggedSet[] | null): Anterior[] =>
  (previous ?? []).map((set) => ({ label: anteriorLabel(set), weight: weightText(set.weightKg), reps: repsText(set.reps) }));
