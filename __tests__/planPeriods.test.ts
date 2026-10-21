import {
  allDayLane,
  creationDay,
  dayMarks,
  durationOf,
  endAfter,
  MONTH_PAGES,
  MONTH_SPAN,
  monthAt,
  monthIndexOf,
  periodRange,
  periodTitle,
  tasksForDay,
  WEEK_SPAN,
  weekAt,
  weekIndexOf,
} from '../features/plan/planPeriods';
import { DayBucket } from '../features/plan/calendarLayout';
import { Event, Task } from '../types/database';
import { fromKey, keyOf } from '../utils/dates';

const event = (id: string, time: string | null = null): Event => ({
  id,
  user_id: 'u',
  title: id,
  description: null,
  event_date: '2026-10-21',
  event_time: time,
  end_time: null,
  location: null,
  created_at: '2026-10-01T00:00:00Z',
});

const task = (id: string, completed = false, deadline: string | null = '2026-10-21', priority: Task['priority'] = 'medium'): Task => ({
  id,
  user_id: 'u',
  title: id,
  description: null,
  deadline,
  completed,
  priority,
  created_at: '2026-10-01T00:00:00Z',
});

const today = fromKey('2026-10-21');

describe('pagers', () => {
  it('maps month pages around today', () => {
    expect(keyOf(monthAt(MONTH_SPAN, today))).toBe('2026-10-01');
    expect(keyOf(monthAt(MONTH_SPAN + 3, today))).toBe('2027-01-01');
    expect(monthIndexOf(fromKey('2026-09-30'), today)).toBe(MONTH_SPAN - 1);
    expect(monthIndexOf(fromKey('2040-01-01'), today)).toBe(MONTH_PAGES - 1);
  });

  it('maps week pages to mondays', () => {
    expect(keyOf(weekAt(WEEK_SPAN, today))).toBe('2026-10-19');
    expect(keyOf(weekAt(WEEK_SPAN - 1, today))).toBe('2026-10-12');
    expect(weekIndexOf(fromKey('2026-10-25'), today)).toBe(WEEK_SPAN);
    expect(weekIndexOf(fromKey('2026-10-26'), today)).toBe(WEEK_SPAN + 1);
    expect(weekIndexOf(fromKey('2026-03-30'), today)).toBe(WEEK_SPAN - 29);
  });
});

describe('periodRange', () => {
  it('covers the month grids of the previous and next month', () => {
    // Septiembre 2026 empieza en martes: su rejilla arranca el lunes 31 de agosto.
    // La de noviembre acaba el domingo 6 de diciembre.
    expect(periodRange('month', today)).toEqual({ from: '2026-08-31', to: '2026-12-06' });
  });

  it('covers the visible week and one on each side', () => {
    expect(periodRange('week', today)).toEqual({ from: '2026-10-12', to: '2026-11-01' });
    expect(periodRange('day', fromKey('2026-10-25'))).toEqual({ from: '2026-10-12', to: '2026-11-01' });
    expect(periodRange('list', fromKey('2026-10-26'))).toEqual({ from: '2026-10-19', to: '2026-11-08' });
  });
});

describe('periodTitle', () => {
  it('names the month or both months of a crossing week', () => {
    expect(periodTitle('month', today)).toBe('octubre 2026');
    expect(periodTitle('week', fromKey('2026-09-30'))).toBe('sep – oct 2026');
    expect(periodTitle('list', fromKey('2026-12-30'))).toBe('dic 2026 – ene 2027');
    expect(periodTitle('day', fromKey('2026-09-30'))).toBe('septiembre 2026');
  });
});

describe('creationDay', () => {
  it('uses the selected day when visible, else the first visible day', () => {
    expect(creationDay('week', today, '2026-10-23')).toBe('2026-10-23');
    expect(creationDay('week', today, '2026-10-30')).toBe('2026-10-19');
    expect(creationDay('month', fromKey('2026-11-01'), '2026-10-21')).toBe('2026-11-01');
    expect(creationDay('month', today, '2026-10-05')).toBe('2026-10-05');
    expect(creationDay('day', today, '2026-10-21')).toBe('2026-10-21');
  });
});

describe('dayMarks', () => {
  it('orders events, pending and done tasks and collapses the rest', () => {
    const bucket: DayBucket = { events: [event('a'), event('b')], tasks: [task('t', true), task('u')] };
    expect(dayMarks(bucket)).toEqual({ marks: ['event', 'event', 'task'], extra: 1 });
    expect(dayMarks({ events: [], tasks: [task('t', true)] })).toEqual({ marks: ['done'], extra: 0 });
    expect(dayMarks(undefined)).toEqual({ marks: [], extra: 0 });
  });
});

describe('allDayLane', () => {
  it('keeps untimed events and tasks, up to two', () => {
    const bucket: DayBucket = { events: [event('e', null), event('timed', '10:00')], tasks: [task('t')] };
    expect(allDayLane(bucket)).toEqual({
      items: [
        { kind: 'event', id: 'e', title: 'e' },
        { kind: 'task', id: 't', title: 't', done: false },
      ],
      extra: 0,
    });
  });

  it('collapses to one chip and +N when there are more than two', () => {
    const bucket: DayBucket = { events: [event('e')], tasks: [task('t'), task('u', true)] };
    const lane = allDayLane(bucket);
    expect(lane.items.map((item) => item.id)).toEqual(['e']);
    expect(lane.extra).toBe(2);
  });
});

describe('event times', () => {
  it('proposes an end one hour later, capped at 23:59', () => {
    expect(endAfter('10:15')).toBe('11:15');
    expect(endAfter('10:15', 90)).toBe('11:45');
    expect(endAfter('23:30')).toBe('23:59');
  });

  it('measures a duration only when the end is later', () => {
    expect(durationOf('10:00', '11:30')).toBe(90);
    expect(durationOf('10:00', '10:00')).toBeNull();
    expect(durationOf('10:00', '09:00')).toBeNull();
  });
});

describe('tasksForDay', () => {
  it('adds undated pending tasks only on today and sorts pending first by priority', () => {
    const dated = [task('done', true), task('low', false, '2026-10-21', 'low'), task('high', false, '2026-10-21', 'high')];
    const undated = [task('free', false, null), task('high', false, '2026-10-21', 'high')];
    expect(tasksForDay(dated, undated, '2026-10-21', '2026-10-21').map((item) => item.id)).toEqual(['high', 'free', 'low', 'done']);
    expect(tasksForDay(dated, undated, '2026-10-22', '2026-10-21').map((item) => item.id)).toEqual(['high', 'low', 'done']);
  });
});
