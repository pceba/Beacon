import { ChartBar } from '../../components/charts/ColumnChart';
import { HabitRow } from '../../components/charts/HabitGrid';
import { ChartPoint } from '../../components/charts/LineChart';
import { TrainDay } from '../../components/charts/TrainingStrip';
import { addDays, fromKey, keyOf } from '../../utils/dates';
import { formatFlexible, formatNumber } from '../../utils/format';

export type Period = '7' | '30' | '90';
export type Tone = 'up' | 'down' | 'flat';
export type Day = { date: Date; key: string };

export type Kpi = {
  label: string;
  color: string;
  value: string;
  unit: string;
  spark: Array<number | null>;
  delta: string | null;
  tone: Tone;
  empty: boolean;
  emptyNote: string;
};

export type Snapshot = {
  period: Period;
  range: string;
  goalLabel: string;
  goal: number;
  kpis: Kpi[];
  sleepBars: ChartBar[];
  sleepMeta: string;
  hasSleep: boolean;
  habitRate: number;
  habitDays: string[];
  habits: HabitRow[];
  weightValue: number | null;
  weightPhrase: string | null;
  weightTone: Tone;
  weightPoints: ChartPoint[];
  weightStart: string;
  weightEnd: string;
  trainMeta: string;
  trainDays: TrainDay[];
  trainBars: ChartBar[];
  trainCount: number;
};

export const DAY = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const periodDays = (period: Period) => (period === '7' ? 7 : period === '30' ? 30 : 91);

// Periodo elegido (acaba hoy) y el anterior, del mismo largo, con el que se compara.
export const periodWindow = (todayKey: string, period: Period) => {
  const count = periodDays(period);
  const end = fromKey(todayKey);
  return {
    end,
    currentFrom: keyOf(addDays(end, -(count - 1))),
    previousFrom: keyOf(addDays(end, -(2 * count - 1))),
  };
};

export const hoursBetween = (bed: string, wake: string) => {
  const hours = (new Date(wake).getTime() - new Date(bed).getTime()) / 3_600_000;
  if (!Number.isFinite(hours) || hours <= 0) return 0;
  return Math.min(hours, 24);
};

export const mean = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

export const spanOf = (end: Date, count: number): Day[] =>
  Array.from({ length: count }, (_, index) => {
    const date = addDays(end, index - (count - 1));
    return { date, key: keyOf(date) };
  });

export const rangeLabel = (start: Date, end: Date) => {
  const left = formatNumber(start.getDate());
  const right = formatNumber(end.getDate());
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${left} – ${right} ${MONTHS[end.getMonth()]}`;
  }
  return `${left} ${MONTHS[start.getMonth()]} – ${right} ${MONTHS[end.getMonth()]}`;
};

export const toneOf = (delta: number): Tone => (Math.abs(delta) < 0.05 ? 'flat' : delta > 0 ? 'up' : 'down');

export const signed = (delta: number, digits: number) => `${delta > 0 ? '+' : '−'}${formatFlexible(Math.abs(delta), digits)}`;

export const periodTail = (period: Period) => (period === '7' ? 'vs. semana pasada' : period === '30' ? 'vs. mes pasado' : 'vs. hace 3 meses');

export const periodPhrase = (period: Period) => (period === '7' ? 'esta semana' : period === '30' ? 'este mes' : 'en 3 meses');

export const emptyNote = (period: Period) =>
  period === '7' ? 'Sin registros esta semana' : period === '30' ? 'Sin registros este mes' : 'Sin registros en 3 meses';

export const chunks = <T,>(items: T[], size: number) => {
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += size) groups.push(items.slice(index, index + size));
  return groups;
};

export const valuesOf = (days: Day[], map: Map<string, number>) => days.flatMap((day) => (map.has(day.key) ? [map.get(day.key) as number] : []));
