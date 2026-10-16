import AsyncStorage from '@react-native-async-storage/async-storage';

// Almacenamiento del dispositivo. La app se llamó Capalot y luego Lifepp; las claves
// siguen siendo lifepp_* a propósito para no perder datos al cambiar de nombre (Beacon).
// La primera vez que arranca, mueve cada clave capalot_* a su nombre lifepp_* para no
// perder la base local, el usuario ni las preferencias.

const RENAMES: Record<string, string> = {
  lifepp_local_db: 'capalot_local_db',
  lifepp_user_id: 'capalot_user_id',
  lifepp_account_id: 'capalot_account_id',
  lifepp_legacy_claimed: 'capalot_legacy_claimed',
  lifepp_preferences: 'capalot_preferences',
};

let ready: Promise<void> | null = null;

const migrate = async () => {
  for (const [next, previous] of Object.entries(RENAMES)) {
    const old = await AsyncStorage.getItem(previous);
    if (old === null) continue;
    if ((await AsyncStorage.getItem(next)) === null) await AsyncStorage.setItem(next, old);
    await AsyncStorage.removeItem(previous);
  }
};

const storageReady = () => {
  ready ??= migrate().catch((error) => console.error('No se han podido migrar las claves locales', error));
  return ready;
};

export const getStored = async (key: string) => {
  await storageReady();
  return AsyncStorage.getItem(key);
};

export const setStored = async (key: string, value: string) => {
  await storageReady();
  await AsyncStorage.setItem(key, value);
};

export const removeStored = async (key: string) => {
  await storageReady();
  await AsyncStorage.removeItem(key);
};
