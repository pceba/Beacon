import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, isToday } from 'date-fns';
import { rawSupabase } from '../lib/supabase';
import { getCurrentUserId, hasAccountSession } from './authService';
import { getHabitLogs, getHabits } from './habitService';
import { getMoodLog } from './moodService';
import { getNutritionLogs } from './nutritionService';
import { getPreferences } from './preferencesService';
import { getSleepLogs } from './sleepService';
import { createTask, getTasks } from './taskService';
import { getWaterLog } from './waterService';
import { getWorkouts } from './workoutService';
import { Task } from '../types/database';

// La llamada a la API de Anthropic vive en la Edge Function claude-sync
// (supabase/functions/claude-sync). Aquí no hay clave: solo la sesión de Supabase.
const FUNCTION_NAME = 'claude-sync';
const STATE_STORAGE = 'capalot_claude_state';
const CONSENT_STORAGE = 'capalot_claude_consent';
// Clave de la versión anterior (se pegaba en Ajustes). Se borra del dispositivo.
const LEGACY_KEY_STORAGE = 'capalot_claude_key';

// Sin "Sincronizar ahora", como mucho una llamada cada 2 h dentro del mismo día.
const COOLDOWN_MS = 2 * 60 * 60 * 1000;
// Tras un error sin retryAfter del servidor.
const ERROR_BACKOFF_MS = 15 * 60 * 1000;

export type ClaudeState = {
  lastSyncAt: string | null;
  lastHash: string;
  brief: string;
  error: string | null;
  retryAt: string | null;
  consent: boolean;
  account: boolean;
  configured: boolean;
};

type ClaudeReply = {
  brief: string;
  addTasks: Array<{ title: string; priority?: Task['priority']; deadline?: string | null }>;
};

type StoredState = Pick<ClaudeState, 'lastSyncAt' | 'lastHash' | 'brief' | 'error' | 'retryAt'>;

const emptyStored = (): StoredState => ({
  lastSyncAt: null,
  lastHash: '',
  brief: '',
  error: null,
  retryAt: null,
});

const hashString = (value: string) => {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 33) ^ value.charCodeAt(index);
  return (hash >>> 0).toString(16);
};

let legacyKeyRemoved = false;
const removeLegacyKey = async () => {
  if (legacyKeyRemoved) return;
  legacyKeyRemoved = true;
  await AsyncStorage.removeItem(LEGACY_KEY_STORAGE).catch(() => undefined);
};

export const getClaudeConsent = async () => (await AsyncStorage.getItem(CONSENT_STORAGE)) === 'yes';

export const setClaudeConsent = async (value: boolean) => {
  if (value) await AsyncStorage.setItem(CONSENT_STORAGE, 'yes');
  else await AsyncStorage.removeItem(CONSENT_STORAGE);
};

const readStored = async (): Promise<StoredState> => {
  const raw = await AsyncStorage.getItem(STATE_STORAGE);
  if (!raw) return emptyStored();
  try {
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    return {
      lastSyncAt: parsed.lastSyncAt ?? null,
      lastHash: parsed.lastHash ?? '',
      brief: parsed.brief ?? '',
      error: parsed.error ?? null,
      retryAt: parsed.retryAt ?? null,
    };
  } catch {
    return emptyStored();
  }
};

const saveStored = async (state: StoredState) => {
  await AsyncStorage.setItem(STATE_STORAGE, JSON.stringify(state));
};

export const getClaudeState = async (): Promise<ClaudeState> => {
  await removeLegacyKey();
  const [stored, consent, account] = await Promise.all([readStored(), getClaudeConsent(), hasAccountSession()]);
  return { ...stored, consent, account, configured: consent && account };
};

const buildSnapshot = async () => {
  const userId = await getCurrentUserId();
  const today = new Date();
  const todayKey = format(today, 'yyyy-MM-dd');
  const [preferences, tasks, habits, habitLogs, mood, water, meals, sleeps, workouts] = await Promise.all([
    getPreferences(),
    getTasks(userId),
    getHabits(userId),
    getHabitLogs(userId),
    getMoodLog(userId, today),
    getWaterLog(userId, today),
    getNutritionLogs(userId),
    getSleepLogs(userId),
    getWorkouts(userId),
  ]);

  const doneToday = new Set(
    habitLogs.filter((log) => log.completed && log.log_date.slice(0, 10) === todayKey).map((log) => log.habit_id),
  );
  const todayMeals = meals.filter((meal) => isToday(new Date(meal.logged_at)));
  const todaySleep = sleeps.find((sleep) => isToday(new Date(sleep.created_at)));
  const sleepHours = todaySleep
    ? Math.max(0, (new Date(todaySleep.wake_time).getTime() - new Date(todaySleep.bed_time).getTime()) / 3_600_000)
    : 0;

  return {
    date: todayKey,
    goals: {
      waterMl: preferences.waterMl,
      calories: preferences.calories,
      sleepHours: preferences.sleepHours,
    },
    today: {
      waterMl: water?.amount_ml ?? 0,
      mood: mood?.mood_score ?? null,
      calories: todayMeals.reduce((sum, meal) => sum + (meal.calories ?? 0), 0),
      sleepHours: Number(Math.min(sleepHours, 24).toFixed(1)),
      workout: workouts.some((workout) => isToday(new Date(workout.started_at))),
    },
    habits: habits.map((habit) => ({ name: habit.name, doneToday: doneToday.has(habit.id) })),
    tasks: tasks
      .filter((task) => !task.completed)
      .map((task) => ({
        title: task.title,
        priority: task.priority,
        deadline: task.deadline?.slice(0, 10) ?? null,
      })),
  };
};

const sanitizeReply = (raw: unknown): ClaudeReply => {
  const parsed = (raw && typeof raw === 'object' ? raw : {}) as Partial<ClaudeReply>;
  const addTasks = Array.isArray(parsed.addTasks) ? parsed.addTasks : [];
  return {
    brief: typeof parsed.brief === 'string' ? parsed.brief.trim().slice(0, 180) : '',
    addTasks: addTasks
      .filter((task) => task && typeof task.title === 'string' && task.title.trim())
      .slice(0, 5)
      .map((task) => ({
        title: task.title.trim().slice(0, 80),
        priority: task.priority === 'high' || task.priority === 'low' ? task.priority : 'medium',
        deadline: typeof task.deadline === 'string' && /^\d{4}-\d{2}-\d{2}/.test(task.deadline) ? task.deadline.slice(0, 10) : null,
      })),
  };
};

class SyncError extends Error {
  retryAfterMs: number;
  constructor(message: string, retryAfterMs = ERROR_BACKOFF_MS) {
    super(message);
    this.retryAfterMs = retryAfterMs;
  }
}

const callClaude = async (snapshot: unknown): Promise<ClaudeReply> => {
  const { data, error } = await rawSupabase.functions.invoke(FUNCTION_NAME, { body: { snapshot } });
  if (!error) return sanitizeReply(data);

  // FunctionsHttpError trae la Response del servidor en context.
  const context = (error as { context?: unknown }).context;
  if (context && typeof (context as Response).json === 'function') {
    const body = (await (context as Response).json().catch(() => ({}))) as { error?: string; retryAfter?: number };
    const seconds = Number(body.retryAfter);
    throw new SyncError(
      body.error || 'Claude no ha respondido',
      Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : ERROR_BACKOFF_MS,
    );
  }
  throw new SyncError('Sin conexión con Claude');
};

const applyTasks = async (reply: ClaudeReply) => {
  if (reply.addTasks.length === 0) return false;
  const userId = await getCurrentUserId();
  const existing = await getTasks(userId);
  const known = new Set(existing.map((task) => task.title.trim().toLowerCase()));
  let changed = false;
  for (const task of reply.addTasks) {
    const key = task.title.toLowerCase();
    if (known.has(key)) continue;
    known.add(key);
    await createTask(userId, {
      title: task.title,
      description: null,
      deadline: task.deadline ?? null,
      completed: false,
      priority: task.priority ?? 'medium',
    });
    changed = true;
  }
  return changed;
};

let syncing = false;

export const syncWithClaude = async (
  options: { manual?: boolean } = {},
): Promise<ClaudeState & { changed: boolean }> => {
  const current = await getClaudeState();
  if (!current.consent) return { ...current, changed: false };
  if (!current.account) {
    return { ...current, error: 'Sin cuenta en este momento: se sincroniza cuando haya conexión.', changed: false };
  }
  if (syncing) return { ...current, changed: false };

  const now = Date.now();
  if (!options.manual && current.retryAt && new Date(current.retryAt).getTime() > now) {
    return { ...current, changed: false };
  }

  syncing = true;
  try {
    const snapshot = await buildSnapshot();
    const digest = hashString(JSON.stringify(snapshot));
    if (current.lastHash === digest && !current.error) return { ...current, changed: false };

    const lastSync = current.lastSyncAt ? new Date(current.lastSyncAt) : null;
    const coolingDown =
      lastSync !== null && isToday(lastSync) && now - lastSync.getTime() < COOLDOWN_MS && !current.error;
    if (!options.manual && coolingDown) return { ...current, changed: false };

    const reply = await callClaude(snapshot);
    const changed = await applyTasks(reply);
    const nextSnapshot = changed ? await buildSnapshot() : snapshot;
    const next: StoredState = {
      lastSyncAt: new Date().toISOString(),
      lastHash: hashString(JSON.stringify(nextSnapshot)),
      brief: reply.brief,
      error: null,
      retryAt: null,
    };
    await saveStored(next);
    return { ...current, ...next, changed };
  } catch (error) {
    const retryAfterMs = error instanceof SyncError ? error.retryAfterMs : ERROR_BACKOFF_MS;
    const next: StoredState = {
      ...(await readStored()),
      error: error instanceof Error ? error.message : 'No se ha podido sincronizar',
      retryAt: new Date(Date.now() + retryAfterMs).toISOString(),
    };
    await saveStored(next);
    return { ...current, ...next, changed: false };
  } finally {
    syncing = false;
  }
};
