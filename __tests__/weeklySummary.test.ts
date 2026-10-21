import { summaryWeekStart, weeklySummary, WeeklyInput } from '../utils/weeklySummary';

const keyOf = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const day = (base: Date, offset: number) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset, 12);

// Lunes 19 de octubre de 2026: se resume la semana del 12 al 18; la anterior es del 5 al 11.
const monday = new Date(2026, 9, 19, 9);
const weekStart = new Date(2026, 9, 12, 12);

const input = (overrides: Partial<WeeklyInput> = {}): WeeklyInput => ({
  today: monday,
  sleeps: [],
  waters: [],
  workouts: [],
  habits: [],
  habitLogs: [],
  moods: [],
  sleepGoalHours: 7,
  waterGoalMl: 2000,
  ...overrides,
});

const sleep = (wakeDay: Date, hours: number) => {
  const wake = new Date(wakeDay);
  wake.setHours(7, 0, 0, 0);
  return {
    id: keyOf(wakeDay),
    user_id: 'u',
    bed_time: new Date(wake.getTime() - hours * 3_600_000).toISOString(),
    wake_time: wake.toISOString(),
    quality_rating: null,
    notes: null,
    created_at: wake.toISOString(),
  };
};

describe('summaryWeekStart', () => {
  it('solo enseña el resumen domingo y lunes', () => {
    expect(keyOf(summaryWeekStart(monday) as Date)).toBe('2026-10-12');
    expect(keyOf(summaryWeekStart(new Date(2026, 9, 18, 10)) as Date)).toBe('2026-10-12');
    expect(summaryWeekStart(new Date(2026, 9, 21, 10))).toBeNull();
  });
});

describe('weeklySummary', () => {
  it('sin datos devuelve la frase de semana vacía', () => {
    const summary = weeklySummary(input());
    expect(summary?.hasData).toBe(false);
    expect(summary?.headline).toBe('Esta semana no hay registros. La próxima empieza mañana.');
  });

  it('compara con la semana anterior', () => {
    const sleeps = [
      ...Array.from({ length: 7 }, (_, index) => sleep(day(weekStart, index), 8)),
      ...Array.from({ length: 7 }, (_, index) => sleep(day(weekStart, index - 7), 7)),
    ];
    const workouts = [0, 2, 4].map((offset) => ({
      id: `w${offset}`,
      user_id: 'u',
      started_at: day(weekStart, offset).toISOString(),
      name: 'Torso',
      notes: null,
      duration_minutes: 60,
      completed: true,
    }));
    const summary = weeklySummary(input({ sleeps, workouts }));
    expect(summary?.weekKey).toBe('2026-10-12');
    expect(summary?.sleepHours.value).toBeCloseTo(8, 5);
    expect(summary?.sleepHours.delta).toBeCloseTo(1, 5);
    expect(summary?.workouts.value).toBe(3);
    expect(summary?.headline).toBe('Buena semana: dormiste más y entrenaste 3 veces.');
  });

  it('el porcentaje de hábitos solo cuenta días desde que existe el hábito', () => {
    const habits = [{ id: 'h', user_id: 'u', name: 'Leer', icon: null, color: '#000', frequency: 'daily', created_at: day(weekStart, 4).toISOString() }];
    const habitLogs = [4, 5, 6].map((offset) => ({
      id: `l${offset}`,
      habit_id: 'h',
      user_id: 'u',
      log_date: keyOf(day(weekStart, offset)),
      completed: true,
      notes: null,
    }));
    const summary = weeklySummary(input({ habits, habitLogs }));
    expect(summary?.habitRate.value).toBe(100);
    expect(summary?.bestStreak).toEqual({ name: 'Leer', days: 3 });
  });
});
