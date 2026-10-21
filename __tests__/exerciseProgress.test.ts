import {
  beatsBest,
  epley,
  exerciseSummaries,
  formatLastTime,
  lastPerformance,
  LoggedExercise,
  maxE1rm,
  normalizeExerciseName,
} from '../utils/exerciseProgress';

const set = (weightKg: number | null, reps: number | null, order: number, completed = true) => ({ weightKg, reps, order, completed });

const entry = (workoutId: string, performedAt: string, name: string, sets: LoggedExercise['sets']): LoggedExercise => ({
  workoutId,
  performedAt,
  name,
  sets,
});

describe('normalizeExerciseName', () => {
  it('ignora mayúsculas y espacios', () => {
    expect(normalizeExerciseName('  Press   Banca ')).toBe('press banca');
  });
});

describe('epley', () => {
  it('estima 1RM entre 1 y 12 repeticiones', () => {
    expect(epley(100, 1)).toBeCloseTo(103.33, 2);
    expect(epley(100, 10)).toBeCloseTo(133.33, 2);
  });

  it('no estima fuera de rango ni sin peso', () => {
    expect(epley(100, 13)).toBeNull();
    expect(epley(0, 5)).toBeNull();
    expect(epley(100, 0)).toBeNull();
  });
});

describe('exerciseSummaries', () => {
  const entries = [
    entry('w1', '2026-09-01T18:00:00Z', 'Sentadilla', [set(80, 5, 1), set(85, 5, 2)]),
    entry('w2', '2026-09-20T18:00:00Z', 'sentadilla', [set(90, 5, 1)]),
    entry('w3', '2026-10-10T18:00:00Z', 'Sentadilla ', [set(95, 5, 1), set(100, 3, 2, false)]),
    entry('w3', '2026-10-10T18:00:00Z', 'Dominadas', [set(null, 8, 1)]),
  ];

  it('agrupa por nombre normalizado y usa el nombre más reciente', () => {
    const [squat] = exerciseSummaries(entries);
    expect(squat.key).toBe('sentadilla');
    expect(squat.name).toBe('Sentadilla');
    expect(squat.sessions).toBe(3);
    expect(squat.lastDate).toBe('2026-10-10');
  });

  it('las series sin marcar no cuentan para el récord', () => {
    const [squat] = exerciseSummaries(entries);
    expect(squat.bestWeight).toEqual({ value: 95, date: '2026-10-10' });
  });

  it('calcula el cambio a 4 semanas con la sesión base anterior al corte', () => {
    const [squat] = exerciseSummaries(entries);
    expect(squat.change4w).toBeCloseTo((95 - 85) * (1 + 5 / 30), 5);
  });

  it('descarta ejercicios sin peso o con una sola sesión', () => {
    expect(exerciseSummaries(entries).map((item) => item.key)).toEqual(['sentadilla']);
  });
});

describe('lastPerformance y récords', () => {
  const entries = [
    entry('w1', '2026-10-01T18:00:00Z', 'Press banca', [set(60, 8, 1)]),
    entry('w2', '2026-10-08T18:00:00Z', 'Press banca', [set(62.5, 8, 2), set(62.5, 7, 1)]),
  ];

  it('devuelve las series de la última sesión en orden', () => {
    expect(lastPerformance(entries, 'press banca')?.map((item) => item.reps)).toEqual([7, 8]);
    expect(lastPerformance(entries, 'Remo')).toBeNull();
  });

  it('formatea «La última vez» con coma decimal', () => {
    expect(formatLastTime([set(62.5, 7, 1), set(62.5, 8, 2)])).toBe('La última vez: 62,5 kg × 7, 8');
    expect(formatLastTime([set(null, 7, 1)])).toBeNull();
  });

  it('detecta un nuevo récord estimado', () => {
    const best = maxE1rm(entries, 'Press banca');
    expect(best).toBeCloseTo(62.5 * (1 + 8 / 30), 5);
    expect(beatsBest(best, 65, 8)).toBe(true);
    expect(beatsBest(best, 60, 8)).toBe(false);
    expect(beatsBest(null, 60, 8)).toBe(false);
  });
});
