// Fechas de la app: días locales como 'yyyy-MM-dd', semanas que empiezan en lunes.
// Se trabaja a mediodía para que los cambios de hora no muevan el día.

const pad = (value: number) => String(value).padStart(2, '0');

export const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const;

export const WEEKDAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;

// 'yyyy-MM-dd' del día local de la fecha.
export const keyOf = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// Día de un timestamp o fecha guardada ('2026-10-21T08:00:00…' → '2026-10-21').
export const dayOf = (value: string | null | undefined): string => value?.slice(0, 10) ?? '';

export const atNoon = (date: Date): Date => {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  return next;
};

// 'yyyy-MM-dd' → fecha local a mediodía.
export const fromKey = (key: string): Date => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1, 12);
};

export const addDays = (date: Date, days: number): Date => {
  const next = atNoon(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const addMonths = (date: Date, months: number): Date => new Date(date.getFullYear(), date.getMonth() + months, 1, 12);

export const mondayOf = (date: Date): Date => addDays(date, -((date.getDay() + 6) % 7));

export const monthStart = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1, 12);

export const monthEnd = (date: Date): Date => new Date(date.getFullYear(), date.getMonth() + 1, 0, 12);

// Diferencia en días naturales entre dos fechas (b - a).
export const daysBetween = (a: Date, b: Date): number => Math.round((atNoon(b).getTime() - atNoon(a).getTime()) / 86_400_000);

export const sameDay = (a: Date, b: Date): boolean => keyOf(a) === keyOf(b);

// Inicio del día local en ISO, para filtrar columnas timestamptz.
export const startOfDayIso = (date: Date): string => new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();

// «octubre 2026», o «sep – oct 2026» si el periodo cruza meses.
export const monthTitle = (from: Date, to: Date = from): string => {
  if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
    return `${MONTHS[from.getMonth()]} ${from.getFullYear()}`;
  }
  const short = (date: Date) => MONTHS[date.getMonth()].slice(0, 3);
  if (from.getFullYear() === to.getFullYear()) return `${short(from)} – ${short(to)} ${to.getFullYear()}`;
  return `${short(from)} ${from.getFullYear()} – ${short(to)} ${to.getFullYear()}`;
};

// 'HH:mm[:ss]' → minutos desde medianoche, o null.
export const minutesOf = (time: string | null | undefined): number | null => {
  if (!time) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes >= 0 && minutes < 24 * 60 ? minutes : null;
};

// minutos → 'HH:mm'.
export const timeOf = (minutes: number): string => `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;
