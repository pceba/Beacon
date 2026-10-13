import { getStored, setStored } from './storage';

const KEY = 'lifepp_local_db';

type Row = Record<string, unknown>;
type DB = Record<string, Row[]>;

export type LocalQuery = {
  op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' | null;
  payload: Row | Row[] | null;
  filters: Array<{ op: 'eq' | 'gte'; col: string; value: unknown }>;
  order?: { col: string; ascending: boolean };
  single: boolean;
  maybeSingle: boolean;
  onConflict?: string;
};

const empty = (): LocalQuery => ({
  op: null,
  payload: null,
  filters: [],
  single: false,
  maybeSingle: false,
});

export const blankQuery = empty;

let chain: Promise<unknown> = Promise.resolve();

const enqueue = <T>(work: () => Promise<T>): Promise<T> => {
  const run = chain.then(work, work);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
};

const readDb = async (): Promise<DB> => {
  const raw = await getStored(KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as DB;
  } catch {
    return {};
  }
};

const writeDb = async (db: DB) => {
  await setStored(KEY, JSON.stringify(db));
};

const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `local-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;

const matches = (row: Row, filters: LocalQuery['filters']) =>
  filters.every((filter) => {
    const value = row[filter.col];
    if (filter.op === 'gte') return String(value ?? '') >= String(filter.value ?? '');
    return value === filter.value;
  });

const stamp = (table: string, payload: Row): Row => {
  const now = new Date().toISOString();
  const row = { ...payload };
  if (!row.id) row.id = newId();
  if (table === 'nutrition_logs' && !row.logged_at) row.logged_at = now;
  if (table === 'workouts' && !row.started_at) row.started_at = now;
  if (row.created_at === undefined && table !== 'nutrition_logs' && table !== 'workout_sets' && table !== 'workout_exercises') {
    row.created_at = now;
  }
  return row;
};

const shape = (rows: Row[], query: LocalQuery) => {
  if (query.maybeSingle) return { data: rows[0] ?? null, error: null };
  if (query.single) return { data: rows[0] ?? null, error: rows[0] ? null : { message: 'No row' } };
  return { data: rows, error: null };
};

// Para subir a Supabase lo que se guardó en local (services/localSync.ts).
export const readLocalDb = () => enqueue(readDb);

export const removeLocalRows = (table: string, ids: unknown[]) =>
  enqueue(async () => {
    if (ids.length === 0) return;
    const drop = new Set(ids);
    const db = await readDb();
    const rest = (db[table] ?? []).filter((row) => !drop.has(row.id));
    if (rest.length === 0) delete db[table];
    else db[table] = rest;
    await writeDb(db);
  });

export const runLocalQuery = (table: string, query: LocalQuery) =>
  enqueue(async () => {
    const db = await readDb();
    const rows = db[table] ?? [];
    const op = query.op ?? 'select';

    if (op === 'select') {
      let next = rows.filter((row) => matches(row, query.filters));
      if (query.order) {
        const { col, ascending } = query.order;
        next = [...next].sort((a, b) => {
          const result = String(a[col] ?? '').localeCompare(String(b[col] ?? ''));
          return ascending ? result : -result;
        });
      }
      return shape(next, query);
    }

    if (op === 'insert') {
      const created = stamp(table, (query.payload ?? {}) as Row);
      db[table] = [created, ...rows];
      await writeDb(db);
      return shape([created], { ...query, single: query.single || !query.maybeSingle });
    }

    if (op === 'update') {
      const updated: Row[] = [];
      db[table] = rows.map((row) => {
        if (!matches(row, query.filters)) return row;
        const next = { ...row, ...(query.payload as Row) };
        updated.push(next);
        return next;
      });
      await writeDb(db);
      return shape(updated, query);
    }

    if (op === 'delete') {
      db[table] = rows.filter((row) => !matches(row, query.filters));
      await writeDb(db);
      return { data: null, error: null };
    }

    const incoming = stamp(table, (query.payload ?? {}) as Row);
    const keys = (query.onConflict ?? 'id').split(',').map((key) => key.trim());
    const index = rows.findIndex((row) => keys.every((key) => row[key] === incoming[key]));
    if (index >= 0) {
      const merged = { ...rows[index], ...incoming, id: rows[index].id };
      db[table] = rows.map((row, i) => (i === index ? merged : row));
      await writeDb(db);
      return shape([merged], { ...query, single: true });
    }
    db[table] = [incoming, ...rows];
    await writeDb(db);
    return shape([incoming], { ...query, single: true });
  });
