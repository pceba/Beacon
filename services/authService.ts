import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_ID_KEY = 'capalot_user_id';

const createUuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });

export const getCurrentUserId = async (): Promise<string> => {
  const existing = await AsyncStorage.getItem(USER_ID_KEY);
  if (existing) return existing;
  const newId = createUuid();
  await AsyncStorage.setItem(USER_ID_KEY, newId);
  return newId;
};
