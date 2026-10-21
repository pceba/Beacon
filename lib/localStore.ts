import { AppState, Platform } from 'react-native';
import { getManyStored, getStored, removeManyStored, removeStored, setManyStored, setStored } from './storage';
import { blankQuery, executeQuery, LocalQuery, LocalResult, Row, Tables } from './localQuery';

// Base local (sin conexión o antes de tener cuenta). Se carga una vez en memoria y se
// guarda por tablas (lifepp_local_db:<tabla>) con un pequeño retardo, así una escritura
// no vuelve a serializar todo. La primera vez migra la clave única antigua.

export { blankQuery };
export type { LocalQuery, LocalResult, Row };

const LEGACY_KEY = 'lifepp_local_db';
const PREFIX = 'lifepp_local_db:';
const INDEX_KEY = `${PREFIX}__tables`;
const FLUSH_MS = 300;

let tables: Tables | null = null;
let loading: Promise<Tables> | null = null;
const dirty = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;
let writing: Promise<void> = Promise.resolve();

const parseRows = <T = Row>(raw: string | null): T[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const persistAll = async (next: Tables) => {
  const names = [...next.keys()].filter((name) => (next.get(name)?.length ?? 0) > 0);
  await setManyStored([...names.map((name): [string, string] => [PREFIX + name, JSON.stringify(next.get(name))]), [INDEX_KEY, JSON.stringify(names)]]);
};

const load = async (): Promise<Tables> => {
  const next: Tables = new Map();
  const legacy = await getStored(LEGACY_KEY);
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy) as Record<string, Row[]>;
      Object.entries(parsed).forEach(([name, rows]) => {
        if (Array.isArray(rows) && rows.length) next.set(name, rows);
      });
    } catch {
      // Una base local ilegible no debe bloquear la app: se empieza vacía.
    }
    // Primero se escribe el formato nuevo y solo después se borra la clave antigua.
    await persistAll(next);
    await removeStored(LEGACY_KEY);
    return next;
  }
  const names = parseRows<unknown>(await getStored(INDEX_KEY)).filter((name): name is string => typeof name === 'string');
  const stored = await getManyStored(names.map((name) => PREFIX + name));
  names.forEach((name) => {
    const rows = parseRows(stored[PREFIX + name] ?? null);
    if (rows.length) next.set(name, rows);
  });
  return next;
};

const ensure = (): Promise<Tables> => {
  if (tables) return Promise.resolve(tables);
  loading ??= load()
    .then((loaded) => {
      tables = loaded;
      return loaded;
    })
    .finally(() => {
      loading = null;
    });
  return loading;
};

const writeDirty = async () => {
  if (!tables || dirty.size === 0) return;
  const names = [...dirty];
  dirty.clear();
  const sets: Array<[string, string]> = [];
  const removes: string[] = [];
  names.forEach((name) => {
    const rows = tables?.get(name) ?? [];
    if (rows.length) sets.push([PREFIX + name, JSON.stringify(rows)]);
    else {
      tables?.delete(name);
      removes.push(PREFIX + name);
    }
  });
  const index = [...tables.keys()].filter((name) => (tables?.get(name)?.length ?? 0) > 0);
  sets.push([INDEX_KEY, JSON.stringify(index)]);
  await setManyStored(sets);
  await removeManyStored(removes);
};

export const flushLocalStore = (): Promise<void> => {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  writing = writing.then(writeDirty, writeDirty).catch((error) => console.error('No se ha podido guardar la base local', error));
  return writing;
};

const markDirty = (names: string[]) => {
  if (names.length === 0) return;
  names.forEach((name) => dirty.add(name));
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flushLocalStore(), FLUSH_MS);
};

AppState.addEventListener('change', (state) => {
  if (state !== 'active') void flushLocalStore();
});
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => void flushLocalStore());
}

export const runLocalQuery = async (table: string, query: LocalQuery): Promise<LocalResult> => {
  const current = await ensure();
  const { result, changed } = executeQuery(current, table, query);
  markDirty(changed);
  return result;
};

// Para subir a Supabase lo guardado en local (services/localSync.ts). Copia: quien la
// recorre no ve cambios a medias.
export const readLocalDb = async (): Promise<Record<string, Row[]>> => {
  const current = await ensure();
  return Object.fromEntries([...current.entries()].map(([name, rows]) => [name, [...rows]]));
};

export const removeLocalRows = async (table: string, ids: unknown[]) => {
  if (ids.length === 0) return;
  const current = await ensure();
  const drop = new Set(ids);
  current.set(
    table,
    (current.get(table) ?? []).filter((row) => !drop.has(row.id)),
  );
  markDirty([table]);
};

export const localRowCount = async (): Promise<Record<string, number>> => {
  const current = await ensure();
  return Object.fromEntries([...current.entries()].map(([name, rows]) => [name, rows.length]));
};

// Solo para tests: vuelve a leer de AsyncStorage en la próxima consulta.
export const resetLocalStoreForTests = () => {
  tables = null;
  loading = null;
  dirty.clear();
  if (timer) clearTimeout(timer);
  timer = null;
};
