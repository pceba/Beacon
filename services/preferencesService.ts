import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'capalot_preferences';

export type Preferences = {
  displayName: string;
  waterMl: number;
  calories: number;
  sleepHours: number;
};

export const defaultPreferences: Preferences = {
  displayName: '',
  waterMl: 2000,
  calories: 2000,
  sleepHours: 7,
};

export const getPreferences = async (): Promise<Preferences> => {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return defaultPreferences;
  try {
    return { ...defaultPreferences, ...JSON.parse(raw) };
  } catch {
    return defaultPreferences;
  }
};

export const savePreferences = async (preferences: Preferences): Promise<void> => {
  await AsyncStorage.setItem(KEY, JSON.stringify(preferences));
};
