import { Event, Task } from '../../types/database';
import { addDays, dayOf, minutesOf, mondayOf, monthStart } from '../../utils/dates';

// Cálculos puros del calendario (DESIGN.md §8): rejilla del mes, días agrupados y
// posición de los eventos con hora en la columna de horas.

export const HOUR_HEIGHT = 48;
export const DAY_MINUTES = 24 * 60;
const DEFAULT_MINUTES = 60;
// Un evento de 15 min sigue siendo tocable.
export const MIN_BLOCK = 22;

// 42 días (6 semanas, de lunes a domingo) que pintan un mes.
export const monthGrid = (month: Date): Date[] => {
  const first = mondayOf(monthStart(month));
  return Array.from({ length: 42 }, (_, index) => addDays(first, index));
};

export const weekDays = (anyDay: Date): Date[] => {
  const first = mondayOf(anyDay);
  return Array.from({ length: 7 }, (_, index) => addDays(first, index));
};

export type DayBucket = { events: Event[]; tasks: Task[] };

const byTime = (a: Event, b: Event) => (minutesOf(a.event_time) ?? -1) - (minutesOf(b.event_time) ?? -1) || a.title.localeCompare(b.title);

// Agrupa una vez eventos y tareas con fecha por día ('yyyy-MM-dd').
export const bucketByDay = (events: Event[], tasks: Task[]): Map<string, DayBucket> => {
  const map = new Map<string, DayBucket>();
  const bucket = (key: string) => {
    let current = map.get(key);
    if (!current) {
      current = { events: [], tasks: [] };
      map.set(key, current);
    }
    return current;
  };
  events.forEach((event) => bucket(dayOf(event.event_date)).events.push(event));
  tasks.forEach((task) => {
    if (task.deadline) bucket(dayOf(task.deadline)).tasks.push(task);
  });
  map.forEach((value) => value.events.sort(byTime));
  return map;
};

// Inicio y fin en minutos. Sin fin, o con un fin que no es posterior, dura una hora.
export const eventSpan = (event: Pick<Event, 'event_time' | 'end_time'>): { start: number; end: number } | null => {
  const start = minutesOf(event.event_time);
  if (start == null) return null;
  const end = minutesOf(event.end_time);
  const finish = end != null && end > start ? end : start + DEFAULT_MINUTES;
  return { start, end: Math.min(finish, DAY_MINUTES) };
};

export type PlacedEvent = {
  event: Event;
  start: number;
  end: number;
  top: number;
  height: number;
  // Columna y número de columnas de su grupo de solapes: left = column / columns.
  column: number;
  columns: number;
};

// Eventos con hora de un día, colocados lado a lado cuando se solapan. Los que se
// solapan entre sí (también de forma encadenada) forman un grupo que reparte el ancho.
export const layoutDay = (events: Event[], hourHeight = HOUR_HEIGHT): PlacedEvent[] => {
  const spans = events
    .map((event) => ({ event, span: eventSpan(event) }))
    .filter((item): item is { event: Event; span: { start: number; end: number } } => item.span != null)
    .sort((a, b) => a.span.start - b.span.start || b.span.end - a.span.end || a.event.id.localeCompare(b.event.id));

  const placed: PlacedEvent[] = [];
  let group: PlacedEvent[] = [];
  let columnEnds: number[] = [];
  let groupEnd = -1;

  const closeGroup = () => {
    group.forEach((item) => {
      item.columns = columnEnds.length;
    });
    group = [];
    columnEnds = [];
  };

  spans.forEach(({ event, span }) => {
    if (span.start >= groupEnd) {
      closeGroup();
      groupEnd = span.end;
    } else {
      groupEnd = Math.max(groupEnd, span.end);
    }
    let column = columnEnds.findIndex((end) => end <= span.start);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(span.end);
    } else {
      columnEnds[column] = span.end;
    }
    const item: PlacedEvent = {
      event,
      start: span.start,
      end: span.end,
      top: (span.start / 60) * hourHeight,
      height: Math.max(MIN_BLOCK, ((span.end - span.start) / 60) * hourHeight),
      column,
      columns: 1,
    };
    group.push(item);
    placed.push(item);
  });
  closeGroup();
  return placed;
};

// Minuto tocado en la columna de horas, redondeado a 15 min.
export const snapMinutes = (offsetY: number, hourHeight = HOUR_HEIGHT, step = 15): number => {
  const raw = (offsetY / hourHeight) * 60;
  const snapped = Math.floor(raw / step) * step;
  return Math.max(0, Math.min(DAY_MINUTES - step, snapped));
};

// Horas que enseña Día: las de sus eventos con una de margen, y al menos 8-20 h.
export const visibleHours = (placed: Array<Pick<PlacedEvent, 'start' | 'end'>>, now?: number): { from: number; to: number } => {
  let from = 8;
  let to = 20;
  placed.forEach((item) => {
    from = Math.min(from, Math.floor(item.start / 60) - 1);
    to = Math.max(to, Math.ceil(item.end / 60) + 1);
  });
  if (now != null) {
    from = Math.min(from, Math.floor(now / 60) - 1);
    to = Math.max(to, Math.ceil(now / 60) + 1);
  }
  return { from: Math.max(0, from), to: Math.min(24, to) };
};
