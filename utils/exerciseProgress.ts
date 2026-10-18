import { formatFlexible, formatNumber } from './format';

export type LoggedSet = {
  reps: number | null;
  weightKg: number | null;
  completed: boolean;
  order: number;
};

export type LoggedExercise = {
  workoutId: string;
  performedAt: string;
  name: string;
  sets: LoggedSet[];
};

export type SessionPoint = {
  workoutId: string;
  date: string;
  topWeight: number | null;
  e1rm: number | null;
  bestSet: { reps: number; weightKg: number } | null;
  sets: LoggedSet[];
};

export type Mark = { value: number; date: string };

export type ExerciseSummary = {
  key: string;
  name: string;
  sessions: number;
  lastDate: string;
  bestE1rm: Mark | null;
  bestWeight: Mark | null;
  change4w: number | null;
  series: SessionPoint[];
};

export const normalizeExerciseName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

export const epley = (weightKg: number, reps: number) => {
  if (!(weightKg > 0) || reps < 1 || reps > 12) return null;
  return weightKg * (1 + reps / 30);
};

const counted = (set: LoggedSet) => set.completed && set.weightKg != null && set.weightKg > 0;

const setE1rm = (set: LoggedSet) => {
  if (!counted(set) || set.reps == null) return null;
  return epley(set.weightKg as number, set.reps);
};

const dayKey = (iso: string) => iso.slice(0, 10);

const shiftDay = (iso: string, days: number) => {
  const [year, month, day] = dayKey(iso).split('-').map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const sessionFrom = (entry: LoggedExercise): SessionPoint => {
  const sets = [...entry.sets].sort((a, b) => a.order - b.order);
  let topWeight: number | null = null;
  let e1rm: number | null = null;
  let bestSet: SessionPoint['bestSet'] = null;
  sets.forEach((set) => {
    if (!counted(set)) return;
    const weight = set.weightKg as number;
    if (topWeight == null || weight > topWeight) topWeight = weight;
    const estimate = setE1rm(set);
    if (estimate != null && (e1rm == null || estimate > e1rm)) {
      e1rm = estimate;
      bestSet = { reps: set.reps as number, weightKg: weight };
    } else if (bestSet == null) {
      bestSet = { reps: set.reps ?? 0, weightKg: weight };
    }
  });
  return { workoutId: entry.workoutId, date: entry.performedAt, topWeight, e1rm, bestSet, sets };
};

const earlier = (current: Mark | null, value: number, date: string): Mark => {
  if (!current || value > current.value || (value === current.value && date < current.date)) return { value, date };
  return current;
};

export const exerciseSummaries = (entries: LoggedExercise[]): ExerciseSummary[] => {
  const groups = new Map<string, { name: string; nameAt: string; sessions: SessionPoint[] }>();

  entries.forEach((entry) => {
    const key = normalizeExerciseName(entry.name);
    if (!key) return;
    const session = sessionFrom(entry);
    const current = groups.get(key) ?? { name: entry.name.trim(), nameAt: entry.performedAt, sessions: [] };
    if (entry.performedAt >= current.nameAt) {
      current.name = entry.name.trim();
      current.nameAt = entry.performedAt;
    }
    if (session.topWeight != null) {
      const index = current.sessions.findIndex((item) => item.workoutId === session.workoutId);
      if (index >= 0) {
        const previous = current.sessions[index];
        current.sessions[index] = sessionFrom({
          workoutId: session.workoutId,
          performedAt: session.date > previous.date ? session.date : previous.date,
          name: entry.name,
          sets: [...previous.sets, ...session.sets],
        });
      } else {
        current.sessions.push(session);
      }
    }
    groups.set(key, current);
  });

  const summaries: ExerciseSummary[] = [];
  groups.forEach((group, key) => {
    if (group.sessions.length < 2) return;
    const series = [...group.sessions].sort((a, b) => a.date.localeCompare(b.date) || a.workoutId.localeCompare(b.workoutId));
    let bestE1rm: Mark | null = null;
    let bestWeight: Mark | null = null;
    series.forEach((session) => {
      if (session.e1rm != null) bestE1rm = earlier(bestE1rm, session.e1rm, dayKey(session.date));
      if (session.topWeight != null) bestWeight = earlier(bestWeight, session.topWeight, dayKey(session.date));
    });
    const latest = [...series].reverse().find((session) => session.e1rm != null);
    let change4w: number | null = null;
    if (latest?.e1rm != null) {
      const cutoff = shiftDay(latest.date, -28);
      const baseline = [...series].reverse().find((session) => session.e1rm != null && dayKey(session.date) <= cutoff);
      if (baseline?.e1rm != null) change4w = latest.e1rm - baseline.e1rm;
    }
    summaries.push({
      key,
      name: group.name,
      sessions: series.length,
      lastDate: dayKey(series[series.length - 1].date),
      bestE1rm,
      bestWeight,
      change4w,
      series,
    });
  });

  return summaries.sort((a, b) => b.lastDate.localeCompare(a.lastDate) || a.name.localeCompare(b.name));
};

export const lastPerformance = (entries: LoggedExercise[], exerciseName: string): LoggedSet[] | null => {
  const key = normalizeExerciseName(exerciseName);
  if (!key) return null;
  const matches = entries
    .filter((entry) => normalizeExerciseName(entry.name) === key)
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt));
  const latest = matches[0];
  if (!latest) return null;
  const sameWorkout = matches.filter((entry) => entry.workoutId === latest.workoutId);
  return sameWorkout
    .flatMap((entry) => entry.sets)
    .sort((a, b) => a.order - b.order);
};

export const formatLastTime = (sets: Array<Pick<LoggedSet, 'reps' | 'weightKg'>>) => {
  const usable = sets.filter((set) => set.weightKg != null && set.weightKg > 0);
  if (usable.length === 0) return null;
  const first = usable[0].weightKg as number;
  const sameWeight = usable.every((set) => set.weightKg === first);
  if (sameWeight) {
    const reps = usable.map((set) => formatNumber(set.reps ?? 0)).join(', ');
    return `La última vez: ${formatFlexible(first, 1)} kg × ${reps}`;
  }
  const parts = usable.map((set) => `${formatFlexible(set.weightKg as number, 1)} kg × ${formatNumber(set.reps ?? 0)}`);
  return `La última vez: ${parts.join(', ')}`;
};

export const formatBestSet = (set: { reps: number; weightKg: number } | null) => {
  if (!set) return 'Sin peso';
  if (set.reps > 0) return `${formatFlexible(set.weightKg, 1)} kg × ${formatNumber(set.reps)}`;
  return `${formatFlexible(set.weightKg, 1)} kg`;
};

export const maxE1rm = (entries: LoggedExercise[], exerciseName: string): number | null => {
  const key = normalizeExerciseName(exerciseName);
  if (!key) return null;
  let best: number | null = null;
  entries.forEach((entry) => {
    if (normalizeExerciseName(entry.name) !== key) return;
    entry.sets.forEach((set) => {
      const estimate = setE1rm(set);
      if (estimate != null && (best == null || estimate > best)) best = estimate;
    });
  });
  return best;
};

export const beatsBest = (best: number | null, weightKg: number, reps: number) => {
  const estimate = epley(weightKg, reps);
  if (estimate == null || best == null) return false;
  return estimate > best;
};
