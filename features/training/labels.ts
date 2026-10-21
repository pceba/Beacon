import { formatNumber, formatRelative } from '../../utils/format';

const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const asDate = (iso: string) => new Date(iso);

// «jue 16»
export const weekdayDay = (iso: string) => {
  const date = asDate(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()}`;
};

// «jue 16 oct»
export const weekdayDayMonth = (iso: string) => {
  const date = asDate(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
};

export const exerciseCount = (count: number) => (count === 1 ? '1 ejercicio' : `${formatNumber(count)} ejercicios`);

// «5 ejercicios · hace 3 días» o «5 ejercicios · sin hacer».
export const routineMeta = (count: number, lastDoneAt: string | null, now = new Date()) =>
  `${exerciseCount(count)} · ${lastDoneAt ? formatRelative(lastDoneAt, now) : 'sin hacer'}`;

// «52 min · 4.250 kg»
export const historyMeta = (minutes: number | null, volumeKg: number) => {
  const parts: string[] = [];
  if (minutes != null && minutes > 0) parts.push(`${formatNumber(minutes)} min`);
  if (volumeKg > 0) parts.push(`${formatNumber(Math.round(volumeKg))} kg`);
  return parts.length ? parts.join(' · ') : '—';
};
