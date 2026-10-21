import { uuid } from '../utils/uuid';

// Motor de consultas de la base local: imita lo que la app pide a PostgREST
// (filtros, orden, rango, columnas, upsert y borrado en cascada). Puro: trabaja
// sobre un Map en memoria y dice qué tablas ha cambiado; la persistencia va aparte.

export type Row = Record<string, unknown>;
export type Tables = Map<string, Row[]>;

export type CompareOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
export type Filter =
  | { op: CompareOp; col: string; value: unknown }
  | { op: 'in'; col: string; value: unknown[] }
  | { op: 'is'; col: string; value: null | boolean };

export type Order = { col: string; ascending: boolean; nullsFirst?: boolean };

export type LocalQuery = {
  op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' | null;
  payload: Row | Row[] | null;
  columns: string | null;
  returning: boolean;
  filters: Filter[];
  order: Order[];
  limit: number | null;
  range: { from: number; to: number } | null;
  single: boolean;
  maybeSingle: boolean;
  onConflict?: string;
  unsupported: string | null;
};

export type LocalResult = { data: unknown; error: { message: string } | null };

export const blankQuery = (): LocalQuery => ({
  op: null,
  payload: null,
  columns: null,
  returning: false,
  filters: [],
  order: [],
  limit: null,
  range: null,
  single: false,
  maybeSingle: false,
  unsupported: null,
});

// Hijos que se borran con el padre (igual que ON DELETE CASCADE en supabase/schema.sql).
const CASCADE: Record<string, Array<[string, string]>> = {
  workouts: [['workout_exercises', 'workout_id']],
  workout_exercises: [['workout_sets', 'exercise_id']],
  workout_templates: [['workout_template_exercises', 'template_id']],
  habits: [['habit_logs', 'habit_id']],
};

// Referencias que quedan a null (ON DELETE SET NULL).
const SET_NULL: Record<string, Array<[string, string]>> = {
  workout_templates: [['workouts', 'template_id']],
};

const DATETIME = /^\d{4}-\d{2}-\d{2}T/;

const compare = (a: unknown, b: unknown): number => {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  if (typeof a === 'number' && typeof b === 'string' && b.trim() !== '' && Number.isFinite(Number(b))) return a - Number(b);
  if (typeof a === 'string' && typeof b === 'string' && DATETIME.test(a) && DATETIME.test(b)) {
    const left = Date.parse(a);
    const right = Date.parse(b);
    if (Number.isFinite(left) && Number.isFinite(right)) return left - right;
  }
  const left = String(a);
  const right = String(b);
  return left < right ? -1 : left > right ? 1 : 0;
};

const isNil = (value: unknown) => value === null || value === undefined;

const equal = (a: unknown, b: unknown) => {
  if (isNil(a) || isNil(b)) return false;
  return compare(a, b) === 0;
};

export const matchesFilter = (row: Row, filter: Filter): boolean => {
  const value = row[filter.col];
  switch (filter.op) {
    case 'eq':
      return equal(value, filter.value);
    case 'neq':
      return !isNil(value) && !equal(value, filter.value);
    case 'in':
      return filter.value.some((item) => equal(value, item));
    case 'is':
      return filter.value === null ? isNil(value) : value === filter.value;
    default: {
      if (isNil(value) || isNil(filter.value)) return false;
      const result = compare(value, filter.value);
      if (filter.op === 'gt') return result > 0;
      if (filter.op === 'gte') return result >= 0;
      if (filter.op === 'lt') return result < 0;
      return result <= 0;
    }
  }
};

const matchesAll = (row: Row, filters: Filter[]) => filters.every((filter) => matchesFilter(row, filter));

export const sortRows = (rows: Row[], order: Order[]): Row[] => {
  if (order.length === 0) return rows;
  return [...rows].sort((a, b) => {
    for (const { col, ascending, nullsFirst } of order) {
      const left = a[col];
      const right = b[col];
      // Como Postgres: los null van al final en ascendente y al principio en descendente.
      const nullsOnTop = nullsFirst ?? !ascending;
      if (isNil(left) && isNil(right)) continue;
      if (isNil(left)) return nullsOnTop ? -1 : 1;
      if (isNil(right)) return nullsOnTop ? 1 : -1;
      const result = compare(left, right);
      if (result !== 0) return ascending ? result : -result;
    }
    return 0;
  });
};

const project = (row: Row, columns: string | null): Row => {
  if (!columns || columns.trim() === '*') return { ...row };
  const picked: Row = {};
  columns
    .split(',')
    .map((column) => column.trim())
    .filter(Boolean)
    .forEach((column) => {
      if (column === '*') Object.assign(picked, row);
      else picked[column] = row[column] ?? null;
    });
  return picked;
};

const window = (rows: Row[], query: LocalQuery) => {
  let next = rows;
  if (query.range) next = next.slice(query.range.from, query.range.to + 1);
  if (query.limit != null) next = next.slice(0, query.limit);
  return next;
};

const shape = (rows: Row[], query: LocalQuery): LocalResult => {
  const out = rows.map((row) => project(row, query.columns));
  if (query.maybeSingle) {
    if (out.length > 1) return { data: null, error: { message: 'Más de una fila' } };
    return { data: out[0] ?? null, error: null };
  }
  if (query.single) {
    if (out.length !== 1) return { data: null, error: { message: out.length ? 'Más de una fila' : 'No row' } };
    return { data: out[0], error: null };
  }
  return { data: out, error: null };
};

const written = (rows: Row[], query: LocalQuery): LocalResult => {
  if (!query.returning) return { data: null, error: null };
  return shape(rows, query);
};

const NO_CREATED_AT = new Set(['nutrition_logs', 'workout_sets', 'workout_exercises', 'workout_template_exercises', 'habit_logs', 'workouts']);

export const stamp = (table: string, payload: Row): Row => {
  const now = new Date().toISOString();
  const row = { ...payload };
  if (!row.id) row.id = uuid();
  if (table === 'nutrition_logs' && !row.logged_at) row.logged_at = now;
  if (table === 'workouts' && !row.started_at) row.started_at = now;
  if (row.created_at === undefined && !NO_CREATED_AT.has(table)) row.created_at = now;
  return row;
};

const asRows = (payload: LocalQuery['payload']): Row[] => (Array.isArray(payload) ? payload : payload ? [payload] : []);

const removeCascade = (tables: Tables, table: string, ids: Set<unknown>, changed: Set<string>) => {
  if (ids.size === 0) return;
  for (const [child, column] of CASCADE[table] ?? []) {
    const rows = tables.get(child);
    if (!rows?.length) continue;
    const dropped = new Set<unknown>();
    const kept = rows.filter((row) => {
      if (!ids.has(row[column])) return true;
      dropped.add(row.id);
      return false;
    });
    if (dropped.size === 0) continue;
    tables.set(child, kept);
    changed.add(child);
    removeCascade(tables, child, dropped, changed);
  }
  for (const [child, column] of SET_NULL[table] ?? []) {
    const rows = tables.get(child);
    if (!rows?.some((row) => ids.has(row[column]))) continue;
    tables.set(
      child,
      rows.map((row) => (ids.has(row[column]) ? { ...row, [column]: null } : row)),
    );
    changed.add(child);
  }
};

export const executeQuery = (tables: Tables, table: string, query: LocalQuery): { result: LocalResult; changed: string[] } => {
  if (query.unsupported) {
    return { result: { data: null, error: { message: `Operación no disponible sin conexión: ${query.unsupported}` } }, changed: [] };
  }
  const rows = tables.get(table) ?? [];
  const op = query.op ?? 'select';
  const changed = new Set<string>();

  if (op === 'select') {
    const found = window(sortRows(rows.filter((row) => matchesAll(row, query.filters)), query.order), query);
    return { result: shape(found, query), changed: [] };
  }

  if (op === 'insert') {
    const created = asRows(query.payload).map((row) => stamp(table, row));
    tables.set(table, [...created, ...rows]);
    changed.add(table);
    return { result: written(created, query), changed: [...changed] };
  }

  if (op === 'update') {
    const updated: Row[] = [];
    tables.set(
      table,
      rows.map((row) => {
        if (!matchesAll(row, query.filters)) return row;
        const next = { ...row, ...(query.payload as Row) };
        updated.push(next);
        return next;
      }),
    );
    if (updated.length) changed.add(table);
    return { result: written(updated, query), changed: [...changed] };
  }

  if (op === 'delete') {
    const dropped: Row[] = [];
    const kept = rows.filter((row) => {
      if (!matchesAll(row, query.filters)) return true;
      dropped.push(row);
      return false;
    });
    if (dropped.length) {
      tables.set(table, kept);
      changed.add(table);
      removeCascade(tables, table, new Set(dropped.map((row) => row.id)), changed);
    }
    return { result: written(dropped, query), changed: [...changed] };
  }

  // upsert
  const keys = (query.onConflict ?? 'id').split(',').map((key) => key.trim());
  let current = rows;
  const saved: Row[] = [];
  for (const payload of asRows(query.payload)) {
    const incoming = stamp(table, payload);
    const index = current.findIndex((row) => keys.every((key) => equal(row[key], incoming[key])));
    if (index >= 0) {
      const merged = { ...current[index], ...incoming, id: current[index].id, created_at: current[index].created_at ?? incoming.created_at };
      current = current.map((row, i) => (i === index ? merged : row));
      saved.push(merged);
    } else {
      current = [incoming, ...current];
      saved.push(incoming);
    }
  }
  tables.set(table, current);
  if (saved.length) changed.add(table);
  const single = !Array.isArray(query.payload);
  return { result: written(saved, { ...query, single: query.single || (single && query.returning && !query.maybeSingle) }), changed: [...changed] };
};
