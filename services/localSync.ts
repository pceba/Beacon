import { readLocalDb, removeLocalRows } from '../lib/localStore';
import { invalidateAll } from '../lib/query';
import { unsupportedColumns } from '../lib/schemaCaps';
import { rawSupabase } from '../lib/supabase';
import { isUuid, uuid } from '../utils/uuid';
import { onAccountReady } from './authService';

// Lo que se guardó en local (sin conexión, o antes de tener cuenta) se sube a Supabase
// con el usuario de la sesión y se borra de local. Lo que falla (por ejemplo, un hijo
// cuyo padre no existe) se queda en local para el siguiente intento.

type Row = Record<string, unknown>;

// Columnas reales de cada tabla (supabase/schema.sql y migraciones), en orden de
// subida: padres antes que hijos. El almacén local añade created_at en tablas que no
// lo tienen, así que se filtra.
const COLUMNS: Record<string, string[]> = {
  profiles: ['id', 'user_id', 'display_name', 'created_at'],
  body_metrics: ['id', 'user_id', 'date', 'weight_kg', 'body_fat_pct', 'notes', 'created_at'],
  water_logs: ['id', 'user_id', 'log_date', 'amount_ml', 'created_at'],
  mood_logs: ['id', 'user_id', 'log_date', 'mood_score', 'energy_score', 'notes', 'created_at'],
  nutrition_logs: ['id', 'user_id', 'logged_at', 'name', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'meal_type', 'notes'],
  meal_templates: ['id', 'user_id', 'name', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'meal_type', 'created_at'],
  workout_templates: ['id', 'user_id', 'name', 'description', 'created_at'],
  workouts: ['id', 'user_id', 'started_at', 'name', 'notes', 'duration_minutes', 'completed', 'template_id'],
  sleep_logs: ['id', 'user_id', 'bed_time', 'wake_time', 'quality_rating', 'notes', 'created_at'],
  habits: ['id', 'user_id', 'name', 'icon', 'color', 'frequency', 'created_at'],
  journal_entries: ['id', 'user_id', 'created_at', 'title', 'content', 'mood_score', 'tags'],
  notes: ['id', 'user_id', 'created_at', 'title', 'content'],
  tasks: ['id', 'user_id', 'title', 'description', 'deadline', 'completed', 'priority', 'created_at'],
  events: ['id', 'user_id', 'title', 'description', 'event_date', 'event_time', 'end_time', 'location', 'created_at'],
  goals: ['id', 'user_id', 'metric_type', 'target_value', 'period', 'created_at'],
  workout_exercises: ['id', 'workout_id', 'exercise_name', 'order_index', 'notes'],
  workout_template_exercises: [
    'id', 'template_id', 'exercise_name', 'order_index', 'default_sets', 'default_reps', 'default_weight_kg',
  ],
  habit_logs: ['id', 'habit_id', 'user_id', 'log_date', 'completed', 'notes'],
  workout_sets: ['id', 'exercise_id', 'set_number', 'reps', 'weight_kg', 'duration_seconds', 'completed'],
};

const ORDER = Object.keys(COLUMNS);

// Tablas con UNIQUE propio: se fusionan por esa clave y sin forzar el id local.
const CONFLICT: Record<string, string> = {
  water_logs: 'user_id,log_date',
  mood_logs: 'user_id,log_date',
  habit_logs: 'habit_id,log_date',
  profiles: 'user_id',
};

const BATCH = 200;

let running: Promise<void> | null = null;

const upload = async (table: string, payloads: Row[], conflict: string) => {
  const { error } = await rawSupabase.from(table).upsert(payloads, { onConflict: conflict });
  return !error;
};

const flush = async (userId: string) => {
  const db = await readLocalDb();
  const tables = Object.keys(db).filter((table) => COLUMNS[table] && (db[table]?.length ?? 0) > 0);
  if (tables.length === 0) return;

  // Las versiones antiguas generaban ids "local-..." cuando no había crypto.randomUUID;
  // en Postgres son UUID, así que se cambian (también en las referencias).
  const remap = new Map<unknown, string>();
  for (const table of tables) {
    for (const row of db[table]) {
      if (!isUuid(row.id)) remap.set(row.id, uuid());
    }
  }

  for (const table of ORDER) {
    const rows = db[table];
    if (!rows?.length) continue;
    const skip = new Set(await unsupportedColumns(table));
    const columns = COLUMNS[table].filter((column) => !skip.has(column));
    const conflict = CONFLICT[table];

    const payloads = rows.map((row) => {
      const payload: Row = {};
      for (const column of columns) {
        if (!(column in row)) continue;
        const value = row[column];
        payload[column] = remap.has(value) ? remap.get(value) : value;
      }
      if (columns.includes('user_id')) payload.user_id = userId;
      if (conflict) delete payload.id;
      return payload;
    });

    // En un upsert por lotes, PostgREST pone NULL en las columnas que falten en alguna
    // fila; por eso se agrupan las filas con las mismas columnas.
    const groups = new Map<string, number[]>();
    payloads.forEach((payload, index) => {
      const signature = Object.keys(payload).sort().join(',');
      groups.set(signature, [...(groups.get(signature) ?? []), index]);
    });

    // Si un lote falla se reintenta fila a fila para no bloquear el resto.
    const uploaded: unknown[] = [];
    for (const indexes of groups.values()) {
      for (let start = 0; start < indexes.length; start += BATCH) {
        const slice = indexes.slice(start, start + BATCH);
        if (await upload(table, slice.map((index) => payloads[index]), conflict ?? 'id')) {
          uploaded.push(...slice.map((index) => rows[index].id));
          continue;
        }
        for (const index of slice) {
          if (await upload(table, [payloads[index]], conflict ?? 'id')) uploaded.push(rows[index].id);
        }
      }
    }

    await removeLocalRows(table, uploaded);
  }
};

export const flushLocalData = (userId: string) => {
  running ??= flush(userId)
    .then(() => invalidateAll())
    .catch((error) => console.error('No se han podido subir los datos locales', error))
    .finally(() => {
      running = null;
    });
  return running;
};

onAccountReady((userId) => {
  void flushLocalData(userId);
});
