import { habitStreak } from '../utils/streak';
import { HabitLog } from '../types/database';

const log = (habitId: string, date: string, completed = true): HabitLog => ({
  id: `${habitId}-${date}`,
  habit_id: habitId,
  user_id: 'u',
  log_date: date,
  completed,
  notes: null,
});

const today = new Date(2026, 9, 21, 12);

describe('habitStreak', () => {
  it('cuenta días seguidos hasta hoy', () => {
    const logs = [log('a', '2026-10-21'), log('a', '2026-10-20'), log('a', '2026-10-19'), log('a', '2026-10-17')];
    expect(habitStreak(logs, 'a', today)).toBe(3);
  });

  it('si hoy aún no está hecho, la racha sigue desde ayer', () => {
    const logs = [log('a', '2026-10-20'), log('a', '2026-10-19')];
    expect(habitStreak(logs, 'a', today)).toBe(2);
  });

  it('ignora otros hábitos, días no completados y la hora del log', () => {
    const logs = [log('a', '2026-10-21T08:00:00'), log('a', '2026-10-20', false), log('b', '2026-10-20')];
    expect(habitStreak(logs, 'a', today)).toBe(1);
  });

  it('sin registros es cero', () => {
    expect(habitStreak([], 'a', today)).toBe(0);
  });

  it('cruza meses y años', () => {
    const logs = [log('a', '2027-01-01'), log('a', '2026-12-31'), log('a', '2026-12-30')];
    expect(habitStreak(logs, 'a', new Date(2027, 0, 1, 12))).toBe(3);
  });
});
