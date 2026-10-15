const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const asDate = (value: string | Date) => {
  if (value instanceof Date) return value;
  return new Date(`${value.slice(0, 10)}T12:00:00`);
};

export const weekdayName = (date: Date) => WEEKDAYS[date.getDay()];

export const monthDay = (date: Date) => `${date.getDate()} de ${MONTHS[date.getMonth()]}`;

export const weekdayHeading = (date: Date) =>
  `${WEEKDAYS[date.getDay()]} ${date.getDate()} de ${MONTHS[date.getMonth()]}`;

export const shortDay = (value: string | Date) => {
  const date = asDate(value);
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
};

export const longDay = (value: string | Date) => {
  const date = asDate(value);
  return `${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`;
};

const MEALS: Record<string, string> = {
  breakfast: 'Desayuno',
  lunch: 'Comida',
  dinner: 'Cena',
  snack: 'Snack',
};

const ENTRIES: Record<string, string> = {
  sleep: 'Sueño',
  workout: 'Entreno',
  nutrition: 'Comida',
  habit: 'Hábito',
  journal: 'Diario',
  task: 'Tarea',
  note: 'Nota',
};

export const mealLabel = (type: string) => MEALS[type] ?? type;

export const entryLabel = (type: string) => ENTRIES[type] ?? type;
