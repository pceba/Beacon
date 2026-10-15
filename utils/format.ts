const numberFormat = (digits: number) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const formatNumber = (value: number, digits = 0) => numberFormat(digits).format(value);

export const formatLiters = (ml: number) => `${formatNumber(ml / 1000, 1)} L`;

export const formatHours = (hours: number) => {
  const digits = Number.isInteger(hours) ? 0 : 1;
  return `${formatNumber(hours, digits)} h`;
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export const formatRelative = (input: Date | string, now = new Date()) => {
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '';
  const dayDiff = Math.round((startOfDay(date) - startOfDay(now)) / 86_400_000);
  if (dayDiff === 0) {
    const minutes = Math.round((now.getTime() - date.getTime()) / 60_000);
    if (minutes >= 0 && minutes < 1) return 'ahora';
    if (minutes >= 1 && minutes < 60) return `hace ${minutes} min`;
    const hours = Math.round(minutes / 60);
    if (hours >= 1 && hours < 24) return `hace ${hours} h`;
    return 'hoy';
  }
  if (dayDiff === 1) return 'mañana';
  if (dayDiff === -1) return 'ayer';
  if (dayDiff > 1 && dayDiff < 7) return `en ${dayDiff} días`;
  if (dayDiff < -1 && dayDiff > -7) return `hace ${Math.abs(dayDiff)} días`;
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(date);
};