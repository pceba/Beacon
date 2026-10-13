import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, isToday } from 'date-fns';
import { Platform } from 'react-native';
import { getCurrentUserId } from './authService';
import { getHabitLogs, getHabits } from './habitService';
import { getMoodLog } from './moodService';
import { getNutritionLogs } from './nutritionService';
import { getPreferences } from './preferencesService';
import { getSleepLogs } from './sleepService';
import { createTask, getTasks } from './taskService';
import { getWaterLog } from './waterService';
import { getWorkouts } from './workoutService';
import { Task } from '../types/database';

const KEY_STORAGE = 'capalot_claude_key';
const STATE_STORAGE = 'capalot_claude_state';
const MODEL = 'claude-sonnet-4-5';
const PROXY_URL = 'http://127.0.0.1:8787/messages';

export type ClaudeState = {
  lastSyncAt: string | null;
  lastHash: string;
  brief: string;
  error: string | null;
  configured: boolean;
};

type ClaudeReply = {
  brief: string;
  addTasks: Array<{ title: string; priority?: Task['priority']; deadline?: string | null }>;
};

const emptyState = (configured: boolean): ClaudeState => ({
  lastSyncAt: null,
  lastHash: '',
  brief: '',
  error: null,
  configured,
});

const hashString = (value: string) => {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 33) ^ value.charCodeAt(index);
  return (hash >>> 0).toString(16);
};

export const getClaudeKey = async () => (await AsyncStorage.getItem(KEY_STORAGE))?.trim() ?? '';

export const saveClaudeKey = async (key: string) => {
  const trimmed = key.trim();
  if (!trimmed) {
    await AsyncStorage.removeItem(KEY_STORAGE);
    return;
  }
  await AsyncStorage.setItem(KEY_STORAGE, trimmed);
};

export const getClaudeState = async (): Promise<ClaudeState> => {
  const configured = Boolean(await getClaudeKey());
  const raw = await AsyncStorage.getItem(STATE_STORAGE);
  if (!raw) return emptyState(configured);
  try {
    return { ...emptyState(configured), ...JSON.parse(raw), configured };
  } catch {
    return emptyState(configured);
  }
};

const saveState = async (state: ClaudeState) => {
  await AsyncStorage.setItem(STATE_STORAGE, JSON.stringify(state));
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

const extractJson = (text: string): ClaudeReply => {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return { brief: '', addTasks: [] };
  const parsed = JSON.parse(text.slice(start, end + 1)) as Partial<ClaudeReply>;
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

const postMessages = async (apiKey: string, snapshot: unknown) => {
  const body = JSON.stringify({
    model: MODEL,
    max_tokens: 700,
    system: [
      'Mantienes al día las tareas de esta persona a partir del JSON que recibes.',
      'Responde solo con JSON: {"brief":"una frase en español, factual","addTasks":[{"title":"","priority":"low|medium|high","deadline":"yyyy-mm-dd"|null}]}.',
      'addTasks solo si falta un compromiso claro que no esté ya en tasks. Si no falta nada, addTasks va vacío.',
      'No inventes hábitos, citas médicas ni objetivos. No pidas borrar ni completar nada.',
    ].join(' '),
    messages: [{ role: 'user', content: JSON.stringify(snapshot) }],
  });

  const headers = {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  };

  const direct = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers, body }).catch(() => null);
  const response =
    direct && direct.ok
      ? direct
      : Platform.OS === 'web'
        ? await fetch(PROXY_URL, { method: 'POST', headers, body })
        : direct;

  if (!response) throw new Error('Sin conexión con Claude');
  const payload = (await response.json()) as { content?: Array<{ text?: string }>; error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message || 'Claude no ha respondido');
  const text = payload.content?.map((block) => block.text || '').join('\n') ?? '';
  return extractJson(text);
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

export const syncWithClaude = async (): Promise<ClaudeState & { changed: boolean }> => {
  const apiKey = await getClaudeKey();
  if (!apiKey) return { ...emptyState(false), changed: false };
  if (syncing) {
    const current = await getClaudeState();
    return { ...current, changed: false };
  }

  syncing = true;
  try {
    const snapshot = await buildSnapshot();
    const digest = hashString(JSON.stringify(snapshot));
    const previous = await getClaudeState();
    if (previous.lastHash === digest && !previous.error) return { ...previous, configured: true, changed: false };

    const reply = await postMessages(apiKey, snapshot);
    const changed = await applyTasks(reply);
    const nextSnapshot = changed ? await buildSnapshot() : snapshot;
    const next: ClaudeState = {
      lastSyncAt: new Date().toISOString(),
      lastHash: hashString(JSON.stringify(nextSnapshot)),
      brief: reply.brief,
      error: null,
      configured: true,
    };
    await saveState(next);
    return { ...next, changed };
  } catch (error) {
    const next: ClaudeState = {
      ...(await getClaudeState()),
      configured: true,
      error: error instanceof Error ? error.message : 'No se ha podido sincronizar',
    };
    await saveState(next);
    return { ...next, changed: false };
  } finally {
    syncing = false;
  }
};
