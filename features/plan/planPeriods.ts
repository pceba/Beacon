import { Task } from '../../types/database';
import { addDays, addMonths, daysBetween, fromKey, keyOf, minutesOf, mondayOf, monthStart, monthTitle, timeOf } from '../../utils/dates';
import { DayBucket, monthGrid } from './calendarLayout';

// Periodos de Plan (DESIGN.md §8): qué se ve, qué rango se pide y cómo se resumen los días.

export type PlanView = 'month' | 'week' | 'day' | 'list';

export const PLAN_VIEWS: readonly PlanView[] = ['month', 'week', 'day', 'list'];

export const isPlanView = (value: unknown): value is PlanView => PLAN_VIEWS.includes(value as PlanView);

// Páginas a cada lado del periodo de hoy en los pagers.
export const MONTH_SPAN = 24;
export const WEEK_SPAN = 104;
export const MONTH_PAGES = MONTH_SPAN * 2 + 1;
export const WEEK_PAGES = WEEK_SPAN * 2 + 1;

export const monthAt = (index: number, today: Date): Date => addMonths(today, index - MONTH_SPAN);

export const monthIndexOf = (day: Date, today: Date): number =>
  clamp((day.getFullYear() - today.getFullYear()) * 12 + day.getMonth() - today.getMonth() + MONTH_SPAN, 0, MONTH_PAGES - 1);

export const weekAt = (index: number, today: Date): Date => addDays(mondayOf(today), (index - WEEK_SPAN) * 7);

export const weekIndexOf = (day: Date, today: Date): number =>
  clamp(Math.round(daysBetween(mondayOf(today), mondayOf(day)) / 7) + WEEK_SPAN, 0, WEEK_PAGES - 1);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export type Range = { from: string; to: string };

// Rango que se pide: el periodo visible y uno a cada lado, para que deslizar ya tenga datos.
export const periodRange = (view: PlanView, anchor: Date): Range => {
  if (view === 'month') {
    const first = monthGrid(addMonths(anchor, -1))[0];
    const last = monthGrid(addMonths(anchor, 1))[41];
    return { from: keyOf(first), to: keyOf(last) };
  }
  const monday = mondayOf(anchor);
  return { from: keyOf(addDays(monday, -7)), to: keyOf(addDays(monday, 13)) };
};

// Título de la cabecera: el mes, o «sep – oct 2026» si la semana cruza meses.
export const periodTitle = (view: PlanView, anchor: Date): string => {
  if (view === 'month') return monthTitle(monthStart(anchor));
  if (view === 'week' || view === 'list') {
    const monday = mondayOf(anchor);
    return monthTitle(monday, addDays(monday, 6));
  }
  return monthTitle(anchor);
};

// Día para el que crea el +: el seleccionado si se ve, si no el primero visible.
export const creationDay = (view: PlanView, anchor: Date, selected: string): string => {
  if (view === 'day' || view === 'list') return selected;
  if (view === 'week') {
    const monday = mondayOf(anchor);
    const offset = daysBetween(monday, fromKey(selected));
    return offset >= 0 && offset < 7 ? selected : keyOf(monday);
  }
  const first = monthStart(anchor);
  const day = fromKey(selected);
  return day.getMonth() === first.getMonth() && day.getFullYear() === first.getFullYear() ? selected : keyOf(first);
};

export type Mark = 'event' | 'task' | 'done';

// Marcas de una celda del mes: eventos, luego tareas pendientes, luego hechas; «+N» para el resto.
export const dayMarks = (bucket: DayBucket | undefined, max = 3): { marks: Mark[]; extra: number } => {
  if (!bucket) return { marks: [], extra: 0 };
  const all: Mark[] = [
    ...bucket.events.map((): Mark => 'event'),
    ...bucket.tasks.filter((task) => !task.completed).map((): Mark => 'task'),
    ...bucket.tasks.filter((task) => task.completed).map((): Mark => 'done'),
  ];
  return { marks: all.slice(0, max), extra: Math.max(0, all.length - max) };
};

export type LaneItem = { kind: 'event'; id: string; title: string } | { kind: 'task'; id: string; title: string; done: boolean };

// Franja de todo el día: eventos sin hora y tareas del día. Con más de `max`, se enseñan
// max - 1 y una pastilla «+N», para que la franja no crezca.
export const allDayLane = (bucket: DayBucket | undefined, max = 2): { items: LaneItem[]; extra: number } => {
  if (!bucket) return { items: [], extra: 0 };
  const items: LaneItem[] = [
    ...bucket.events.filter((event) => !event.event_time).map((event): LaneItem => ({ kind: 'event', id: event.id, title: event.title })),
    ...bucket.tasks.map((task): LaneItem => ({ kind: 'task', id: task.id, title: task.title, done: task.completed })),
  ];
  if (items.length <= max) return { items, extra: 0 };
  return { items: items.slice(0, max - 1), extra: items.length - (max - 1) };
};

const LAST_MINUTE = 24 * 60 - 1;

// Fin propuesto: `duration` minutos después del inicio, sin pasar de las 23:59.
export const endAfter = (start: string, duration = 60): string => {
  const minutes = minutesOf(start) ?? 0;
  return timeOf(Math.min(LAST_MINUTE, minutes + Math.max(1, duration)));
};

// Duración entre dos horas 'HH:mm', o null si el fin no es posterior.
export const durationOf = (start: string, end: string): number | null => {
  const from = minutesOf(start);
  const to = minutesOf(end);
  return from != null && to != null && to > from ? to - from : null;
};

const priorityOrder: Record<Task['priority'], number> = { high: 0, medium: 1, low: 2 };

// Tareas de un día como en el Plan v1.2: las de esa fecha y, si es hoy, las pendientes sin fecha.
export const tasksForDay = (dated: Task[] | undefined, undated: Task[] | undefined, day: string, today: string): Task[] => {
  const list = [...(dated ?? [])];
  if (day === today) {
    const seen = new Set(list.map((task) => task.id));
    (undated ?? []).forEach((task) => {
      if (!task.deadline && !seen.has(task.id)) list.push(task);
    });
  }
  return list.sort((a, b) => Number(a.completed) - Number(b.completed) || priorityOrder[a.priority] - priorityOrder[b.priority]);
};
