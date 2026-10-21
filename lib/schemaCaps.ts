import { getStored, setStored } from './storage';
import { rawSupabase } from './supabase';

// Columnas que llegan con 20261021120000_calendar_workouts.sql. Mientras la migración no
// esté aplicada, PostgREST rechaza cualquier petición que las nombre y el proxy acabaría
// guardando en local en silencio, así que no se envían hasta saber que existen.

export type NewColumn = 'events.end_time' | 'workouts.template_id';

const NEW_COLUMNS: readonly NewColumn[] = ['events.end_time', 'workouts.template_id'];
const KEY = 'lifepp_schema_caps';
const MISSING = new Set(['42703', 'PGRST204', 'PGRST200']);

const known = new Map<NewColumn, Promise<boolean>>();

const readStored = async (): Promise<Record<string, boolean>> => {
  try {
    const raw = await getStored(KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
};

const remember = async (column: NewColumn, value: boolean) => {
  const stored = await readStored();
  if (stored[column] === value) return;
  await setStored(KEY, JSON.stringify({ ...stored, [column]: value }));
};

const probe = async (column: NewColumn): Promise<{ value: boolean; sure: boolean }> => {
  const [table, name] = column.split('.');
  try {
    const { error } = await rawSupabase.from(table).select(name).limit(1);
    if (!error) {
      void remember(column, true);
      return { value: true, sure: true };
    }
    if (MISSING.has(error.code ?? '') || /column/i.test(error.message ?? '')) {
      void remember(column, false);
      return { value: false, sure: true };
    }
  } catch {
    // Sin red: se decide con lo último que se supo.
  }
  // Sin dato ni red se guarda con la columna; la subida la quita si el servidor no la tiene.
  return { value: (await readStored())[column] ?? true, sure: false };
};

// Una respuesta del servidor vale para todo el arranque; una suposición sin red, no.
export const hasColumn = (column: NewColumn): Promise<boolean> => {
  let pending = known.get(column);
  if (!pending) {
    pending = probe(column).then(({ value, sure }) => {
      if (!sure) known.delete(column);
      return value;
    });
    known.set(column, pending);
  }
  return pending;
};

// Quita del payload las columnas nuevas que el servidor todavía no tiene.
export const withSupportedColumns = async <T extends Record<string, unknown>>(table: string, payload: T): Promise<T> => {
  const next = { ...payload };
  for (const column of Object.keys(payload)) {
    const key = `${table}.${column}` as NewColumn;
    if (NEW_COLUMNS.includes(key) && !(await hasColumn(key))) delete next[column];
  }
  return next;
};

// Para la subida de datos locales: columnas de una tabla que el servidor no acepta aún.
export const unsupportedColumns = async (table: string): Promise<string[]> => {
  const missing: string[] = [];
  for (const key of NEW_COLUMNS) {
    const [owner, column] = key.split('.');
    if (owner === table && !(await hasColumn(key))) missing.push(column);
  }
  return missing;
};
