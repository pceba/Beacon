import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getStored, setStored } from '../lib/storage';
import { openToday } from '../navigation/navigationRef';

const KEY = 'lifepp_reminders';
const CHANNEL = 'lifepp';

export type ReminderSlot = { enabled: boolean; time: string };

export type ReminderSettings = {
  water: ReminderSlot;
  habits: ReminderSlot;
  tasks: ReminderSlot;
};

const COPY = {
  water: { id: 'lifepp-water', title: 'Bebe agua' },
  habits: { id: 'lifepp-habits', title: 'Te quedan hábitos por marcar' },
  tasks: { id: 'lifepp-tasks', title: 'Mira tus tareas de hoy' },
} as const;

export const defaultReminders: ReminderSettings = {
  water: { enabled: false, time: '17:00' },
  habits: { enabled: false, time: '21:30' },
  tasks: { enabled: false, time: '09:00' },
};

const keys = ['water', 'habits', 'tasks'] as const;

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export const parseReminderTime = (value: string) => {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute, label: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` };
};

const normalize = (raw: Partial<ReminderSettings> | null): ReminderSettings => {
  const next = { ...defaultReminders };
  for (const key of keys) {
    const slot = raw?.[key];
    if (!slot) continue;
    const time = parseReminderTime(slot.time ?? '')?.label ?? defaultReminders[key].time;
    next[key] = { enabled: slot.enabled === true, time };
  }
  return next;
};

export const getReminders = async (): Promise<ReminderSettings> => {
  const raw = await getStored(KEY);
  if (!raw) return defaultReminders;
  try {
    return normalize(JSON.parse(raw) as Partial<ReminderSettings>);
  } catch {
    return defaultReminders;
  }
};

const ensureChannel = async () => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Recordatorios',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
};

const ensurePermission = async () => {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
};

const scheduleAll = async (settings: ReminderSettings) => {
  if (Platform.OS === 'web') return;
  await ensureChannel();
  for (const key of keys) {
    const spec = COPY[key];
    await Notifications.cancelScheduledNotificationAsync(spec.id).catch(() => undefined);
    const slot = settings[key];
    if (!slot.enabled) continue;
    const time = parseReminderTime(slot.time);
    if (!time) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: spec.id,
      content: { title: spec.title, data: { screen: 'Today' } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: time.hour,
        minute: time.minute,
        channelId: CHANNEL,
      },
    });
  }
};

export const applyReminders = async (settings: ReminderSettings) => {
  const normalized = normalize(settings);
  if (Object.values(normalized).some((slot) => slot.enabled)) {
    const granted = await ensurePermission();
    if (!granted) return null;
  }
  await setStored(KEY, JSON.stringify(normalized));
  await scheduleAll(normalized);
  return normalized;
};

export const syncReminders = async () => {
  const settings = await getReminders();
  if (Platform.OS === 'web') return;
  if (!Object.values(settings).some((slot) => slot.enabled)) return;
  const current = await Notifications.getPermissionsAsync();
  if (!current.granted) return;
  await scheduleAll(settings);
};

const goToToday = () => {
  if (openToday()) return;
  const timer = setInterval(() => {
    if (openToday()) clearInterval(timer);
  }, 150);
  setTimeout(() => clearInterval(timer), 3000);
};

const openedFromReminder = (response: Notifications.NotificationResponse | null) =>
  response?.notification.request.content.data?.screen === 'Today';

export const bindReminderOpen = () => {
  if (Platform.OS === 'web') return () => undefined;
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    if (openedFromReminder(response)) goToToday();
  });
  Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (!openedFromReminder(response) || !response) return;
      if (Date.now() - response.notification.date > 15_000) return;
      goToToday();
    })
    .catch((error) => console.error(error));
  return () => sub.remove();
};
