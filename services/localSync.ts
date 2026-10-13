import { readLocalDb, removeLocalRows } from '../lib/localStore';
import { rawSupabase } from '../lib/supabase';
import { onAccountReady } from './authService';

// Lo que se guardó en capalot_local_db (sin conexión, o antes de tener cuenta)
// se sube a Supabase con el usuario de la sesión y se borra de local.
// Lo que falla (por ejemplo, un hijo cuyo padre no existe) se queda en local.

type Row = Record<string, unknown>;

// Columnas reales de cada tabla (capalot-setup.sql). El almacén local añade
// created_at en tablas que no lo tienen, así que se filtra.
const COLUMNS: Record<string, string[]> = {
  profiles: ['id', 'user_id', 'display_name', 'created_at'],
  body_metrics: ['id', 'user_id', 'date', 'weight_kg', 'body_fat_pct', 'notes', 'created_at'],
  water_logs: ['id', 'user_id', 'log_date', 'amount_ml', 'created_at'],
  mood_logs: ['id', 'user_id', 'log_date', 'mood_score', 'energy_score', 'notes', 'created_at'],
  nutrition_logs: ['id', 'user_id', 'logged_at', 'name', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'meal_type', 'notes'],
  meal_templates: ['id', 'user_id', 'name', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'meal_type', 'created_at'],
  workouts: ['id', 'user_id', 'started_at', 'name', 'notes', 'duration_minutes', 'completed'],
  workout_templates: ['id', 'user_id', 'name', 'description', 'created_at'],
  sleep_logs: ['id', 'user_id', 'bed_time', 'wake_time', 'quality_rating', 'notes', 'created_at'],
  habits: ['id', 'user_id', 'name', 'icon', 'color', 'frequency', 'created_at'],
  journal_entries: ['id', 'user_id', 'created_at', 'title', 'content', 'mood_score', 'tags'],
  notes: ['id', 'user_id', 'created_at', 'title', 'content'],
  tasks: ['id', 'user_id', 'title', 'description', 'deadline', 'completed', 'priority', 'created_at'],
  events: ['id', 'user_id', 'title', 'description', 'event_date', 'event_time', 'location', 'created_at'],
  goals: ['id', 'user_id', 'metric_type', 'target_value', 'period', 'created_at'],
  workout_exercises: ['id', 'workout_id', 'exercise_name', 'order_index', 'notes'],
  workout_template_exercises: [
    'id', 'template_id', 'exercise_name', 'order_index', 'default_sets', 'default_reps', 'default_weight_kg',
  ],
  habit_logs: ['id', 'habit_id', 'user_id', 'log_date', 'completed', 'notes'],
  workout_sets: ['id', 'exercise_id', 'set_number', 'reps', 'weight_kg', 'duration_seconds', 'completed'],
};

// Padres antes que hijos.
const ORDER = Object.keys(COLUMNS);

// Tablas con UNIQUE propio: se fusionan por esa clave y sin forzar el id local.
const CONFLICT: Record<string, string> = {
  water_logs: 'user_id,log_date',
  mood_logs: 'user_id,log_date',
  habit_logs: 'habit_id,log_date',
  profiles: 'user_id',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const newUuid = () =>
  globalThis.crypto?.randomUUID?.() ??
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    return (char === 'x' ? rand : (rand & 0x3) | 0x8).toString(16);
  });

let running: Promise<void> | null = null;

const flush = async (userId: string) => {
  const db = await readLocalDb();
  const tables = Object.keys(db).filter((table) => COLUMNS[table] && (db[table]?.length ?? 0) > 0);
  if (tables.length === 0) return;

  // El almacén local genera ids "local-..." cuando no hay crypto.randomUUID;
  // en Postgres son UUID, así que se cambian (también en las referencias).
  const remap = new Map<unknown, string>();
  for (const table of tables) {
    for (const row of db[table]) {
      if (typeof row.id !== 'string' || !UUID.test(row.id)) remap.set(row.id, newUuid());
    }
  }

  for (const table of ORDER) {
    const rows = db[table];
    if (!rows?.length) continue;
    const columns = COLUMNS[table];
    const conflict = CONFLICT[table];
    const uploaded: unknown[] = [];

    for (const row of rows) {
      const payload: Row = {};
      for (const column of columns) {
        if (!(column in row)) continue;
        const value = row[column];
        payload[column] = remap.has(value) ? remap.get(value) : value;
      }
      if (columns.includes('user_id')) payload.user_id = userId;
      if (conflict) delete payload.id;

      const { error } = await rawSupabase.from(table).upsert(payload, { onConflict: conflict ?? 'id' });
      if (!error) uploaded.push(row.id);
    }

    await removeLocalRows(table, uploaded);
  }
};

export const flushLocalData = (userId: string) => {
  running ??= flush(userId)
    .catch((error) => console.error('No se han podido subir los datos locales', error))
    .finally(() => {
      running = null;
    });
  return running;
};

onAccountReady((userId) => {
  void flushLocalData(userId);
});
