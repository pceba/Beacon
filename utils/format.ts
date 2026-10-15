const group = (intPart: string) => intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const split = (value: number, digits: number) => {
  const negative = value < 0;
  const rounded = Math.round(Math.abs(value) * 10 ** digits) / 10 ** digits;
  const [intPart, decPart = ''] = rounded.toFixed(digits).split('.');
  return { negative, intPart, decPart };
};

export const formatNumber = (value: number, digits = 0) => {
  if (!Number.isFinite(value)) return '—';
  const { negative, intPart, decPart } = split(value, digits);
  const body = digits > 0 ? `${group(intPart)},${decPart}` : group(intPart);
  return negative ? `-${body}` : body;
};

export const formatFlexible = (value: number, maxDigits = 2) => {
  if (!Number.isFinite(value)) return '—';
  const { negative, intPart, decPart } = split(value, maxDigits);
  const trimmed = decPart.replace(/0+$/, '');
  const body = trimmed ? `${group(intPart)},${trimmed}` : group(intPart);
  return negative ? `-${body}` : body;
};

export const formatWater = (ml: number) => {
  if (!Number.isFinite(ml)) return '—';
  if (Math.abs(ml) < 1000) return `${formatNumber(Math.round(ml), 0)} ml`;
  return `${formatFlexible(ml / 1000, 2)} L`;
};

export const formatLiters = formatWater;

export const formatHours = (hours: number) => `${formatFlexible(hours, 1)} h`;

export const formatDuration = (hours: number) => {
  if (!Number.isFinite(hours) || hours <= 0) return '0 min';
  const total = Math.round(hours * 60);
  const whole = Math.floor(total / 60);
  const minutes = total % 60;
  if (whole <= 0) return `${minutes} min`;
  if (minutes === 0) return `${whole} h`;
  return `${whole} h ${minutes} min`;
};

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export const formatRelative = (input: Date | string, now = new Date()) => {
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '';
  const dayDiff = Math.round((startOfDay(date) - startOfDay(now)) / 86_400_000);
  if (dayDiff === 0) {
    const minutes = Math.round((now.getTime() - date.getTime()) / 60_000);
    if (minutes >= 0 && minutes < 1) return 'ahora';
    if (minutes >= 1 && minutes < 60) return `hace ${formatNumber(minutes, 0)} min`;
    const hours = Math.round(minutes / 60);
    if (hours >= 1 && hours < 24) return `hace ${formatNumber(hours, 0)} h`;
    return 'hoy';
  }
  if (dayDiff === 1) return 'mañana';
  if (dayDiff === -1) return 'ayer';
  if (dayDiff > 1 && dayDiff < 7) return `en ${formatNumber(dayDiff, 0)} días`;
  if (dayDiff < -1 && dayDiff > -7) return `hace ${formatNumber(Math.abs(dayDiff), 0)} días`;
  return `${formatNumber(date.getDate(), 0)} ${MONTHS[date.getMonth()]}`;
};
