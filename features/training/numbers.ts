import { formatFlexible } from '../../utils/format';

// Campos de kg y reps: se escriben con coma o punto, se guardan como número y se
// muestran con coma. weight_kg es NUMERIC(5,2) y reps INTEGER en la base.

const MAX_WEIGHT = 999.99;
const MAX_REPS = 9999;

// Deja solo cifras y un separador decimal (siempre coma), con hasta `decimals` decimales.
export const sanitizeDecimal = (text: string, decimals = 2): string => {
  let out = '';
  let separator = false;
  let fraction = 0;
  for (const char of text) {
    if (char >= '0' && char <= '9') {
      if (separator) {
        if (fraction >= decimals) continue;
        fraction += 1;
      }
      out += char;
    } else if ((char === ',' || char === '.') && !separator && decimals > 0) {
      separator = true;
      out += ',';
    }
  }
  return out.slice(0, 7);
};

export const parseDecimal = (text: string): number | null => {
  const trimmed = text.trim().replace(',', '.');
  if (!trimmed || trimmed === '.') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= 0 ? value : null;
};

export const toWeightKg = (text: string): number | null => {
  const value = parseDecimal(text);
  if (value == null) return null;
  return Math.min(MAX_WEIGHT, Math.round(value * 100) / 100);
};

export const toReps = (text: string): number | null => {
  const value = parseDecimal(text);
  if (value == null) return null;
  return Math.min(MAX_REPS, Math.round(value));
};

export const weightText = (value: number | null | undefined): string => (value == null ? '' : formatFlexible(Number(value), 2));

export const repsText = (value: number | null | undefined): string => (value == null ? '' : String(Math.round(Number(value))));

const pad = (value: number) => String(value).padStart(2, '0');

// Cronómetro del entreno: «05:12» o «1:05:12».
export const formatElapsed = (totalSeconds: number): string => {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${pad(minutes)}:${pad(rest)}`;
};

// Descanso: «1:24».
export const formatRest = (totalSeconds: number): string => {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  return `${Math.floor(seconds / 60)}:${pad(seconds % 60)}`;
};

export const minutesSince = (iso: string, now = Date.now()): number => {
  const start = Date.parse(iso);
  if (!Number.isFinite(start)) return 0;
  return Math.max(0, Math.floor((now - start) / 60_000));
};

// Duración que se guarda al terminar: minutos desde started_at, como mínimo 1.
export const durationMinutes = (iso: string, now = Date.now()): number => {
  const start = Date.parse(iso);
  if (!Number.isFinite(start)) return 1;
  return Math.max(1, Math.round((now - start) / 60_000));
};
