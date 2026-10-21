import { bucketByDay, eventSpan, HOUR_HEIGHT, layoutDay, MIN_BLOCK, monthGrid, snapMinutes, visibleHours, weekDays } from '../features/plan/calendarLayout';
import { Event, Task } from '../types/database';
import { keyOf } from '../utils/dates';

const event = (id: string, time: string | null, end: string | null = null, date = '2026-10-21'): Event => ({
  id,
  user_id: 'u',
  title: id,
  description: null,
  event_date: date,
  event_time: time,
  end_time: end,
  location: null,
  created_at: '2026-10-01T00:00:00Z',
});

const task = (id: string, deadline: string | null, completed = false): Task => ({
  id,
  user_id: 'u',
  title: id,
  description: null,
  deadline,
  completed,
  priority: 'medium',
  created_at: '2026-10-01T00:00:00Z',
});

describe('monthGrid y weekDays', () => {
  it('octubre de 2026 empieza el lunes 28 de septiembre y tiene 6 semanas', () => {
    const grid = monthGrid(new Date(2026, 9, 21));
    expect(grid).toHaveLength(42);
    expect(keyOf(grid[0])).toBe('2026-09-28');
    expect(keyOf(grid[41])).toBe('2026-11-08');
    expect(grid.every((day, index) => (day.getDay() + 6) % 7 === index % 7)).toBe(true);
  });

  it('la semana va de lunes a domingo, también si hoy es domingo', () => {
    expect(weekDays(new Date(2026, 9, 25)).map(keyOf)).toEqual([
      '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25',
    ]);
  });
});

describe('eventSpan', () => {
  it('sin hora de fin dura una hora', () => {
    expect(eventSpan(event('a', '10:00:00'))).toEqual({ start: 600, end: 660 });
  });

  it('una columna end_time ausente (migración sin aplicar) se trata como null', () => {
    const { end_time: _ignored, ...withoutEnd } = event('a', '10:00:00');
    expect(eventSpan(withoutEnd as Event)).toEqual({ start: 600, end: 660 });
  });

  it('ignora un fin anterior al inicio y corta a medianoche', () => {
    expect(eventSpan(event('a', '10:00', '09:00'))).toEqual({ start: 600, end: 660 });
    expect(eventSpan(event('a', '23:30', null))).toEqual({ start: 1410, end: 1440 });
    expect(eventSpan(event('a', null))).toBeNull();
  });
});

describe('layoutDay', () => {
  it('coloca un evento solo a todo el ancho', () => {
    const [placed] = layoutDay([event('a', '09:00', '10:30')]);
    expect(placed).toMatchObject({ column: 0, columns: 1, top: 9 * HOUR_HEIGHT, height: 1.5 * HOUR_HEIGHT });
  });

  it('pone lado a lado los que se solapan', () => {
    const placed = layoutDay([event('a', '10:00', '11:00'), event('b', '10:30', '11:15')]);
    expect(placed.map((item) => [item.event.id, item.column, item.columns])).toEqual([
      ['a', 0, 2],
      ['b', 1, 2],
    ]);
  });

  it('reutiliza columnas libres dentro de un grupo encadenado', () => {
    const placed = layoutDay([event('a', '09:00', '10:00'), event('b', '09:30', '10:30'), event('c', '10:00', '11:00'), event('d', '12:00', '13:00')]);
    const byId = Object.fromEntries(placed.map((item) => [item.event.id, item]));
    expect([byId.a.column, byId.b.column, byId.c.column]).toEqual([0, 1, 0]);
    expect([byId.a.columns, byId.b.columns, byId.c.columns]).toEqual([2, 2, 2]);
    expect([byId.d.column, byId.d.columns]).toEqual([0, 1]);
  });

  it('tres a la vez reparten en tres columnas', () => {
    const placed = layoutDay([event('a', '09:00', '10:00'), event('b', '09:30', '10:30'), event('c', '09:45', '10:15')]);
    expect(placed.map((item) => item.column)).toEqual([0, 1, 2]);
    expect(placed.every((item) => item.columns === 3)).toBe(true);
  });

  it('los que solo se tocan no se solapan', () => {
    const placed = layoutDay([event('a', '09:00', '10:00'), event('b', '10:00', '11:00')]);
    expect(placed.map((item) => item.columns)).toEqual([1, 1]);
  });

  it('da una altura mínima tocable a eventos muy cortos y omite los de sin hora', () => {
    const placed = layoutDay([event('a', '09:00', '09:10'), event('b', null)]);
    expect(placed).toHaveLength(1);
    expect(placed[0].height).toBe(MIN_BLOCK);
  });
});

describe('bucketByDay', () => {
  it('agrupa eventos ordenados por hora (sin hora primero) y tareas con fecha', () => {
    const buckets = bucketByDay(
      [event('tarde', '18:00'), event('todo', null), event('mañana', '09:00'), event('otro', '10:00', null, '2026-10-22')],
      [task('t1', '2026-10-21'), task('t2', null), task('t3', '2026-10-21T00:00:00', true)],
    );
    expect(buckets.get('2026-10-21')?.events.map((item) => item.id)).toEqual(['todo', 'mañana', 'tarde']);
    expect(buckets.get('2026-10-21')?.tasks.map((item) => item.id)).toEqual(['t1', 't3']);
    expect(buckets.get('2026-10-22')?.events).toHaveLength(1);
    expect(buckets.has('')).toBe(false);
  });
});

describe('snapMinutes y visibleHours', () => {
  it('redondea el toque a 15 minutos hacia abajo', () => {
    expect(snapMinutes(10 * HOUR_HEIGHT + HOUR_HEIGHT * 0.3)).toBe(615);
    expect(snapMinutes(-20)).toBe(0);
    expect(snapMinutes(30 * HOUR_HEIGHT)).toBe(1425);
  });

  it('enseña al menos de 8 a 20 y amplía con margen de una hora', () => {
    expect(visibleHours([])).toEqual({ from: 8, to: 20 });
    expect(visibleHours([{ start: 6 * 60 + 30, end: 7 * 60 }, { start: 21 * 60, end: 22 * 60 + 15 }])).toEqual({ from: 5, to: 24 });
  });
});
