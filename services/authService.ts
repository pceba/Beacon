import { getStored, setStored } from '../lib/storage';
import { rawSupabase } from '../lib/supabase';

// UUID que la app generaba antes de tener cuentas. Se mantiene para el modo
// local (sin conexión la primera vez) y para reclamar las filas antiguas.
const LEGACY_ID_KEY = 'lifepp_user_id';
// Último usuario con sesión: sin red, lo local se guarda con este id.
const LAST_ACCOUNT_KEY = 'lifepp_account_id';
// Marca de que las filas del UUID antiguo ya se reclamaron para esta cuenta.
const CLAIMED_KEY = 'lifepp_legacy_claimed';

const SIGN_IN_RETRY_MS = 60_000;

export type Identity = { userId: string; mode: 'account' | 'local' };

const createUuid = () =>
  globalThis.crypto?.randomUUID?.() ??
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });

const getLegacyId = async () => {
  const existing = await getStored(LEGACY_ID_KEY);
  if (existing) return existing;
  const newId = createUuid();
  await setStored(LEGACY_ID_KEY, newId);
  return newId;
};

const sessionUserId = async (): Promise<string | null> => {
  try {
    const { data } = await rawSupabase.auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
};

const claimLegacyRows = async (userId: string) => {
  if ((await getStored(CLAIMED_KEY)) === userId) return;
  const legacyId = await getStored(LEGACY_ID_KEY);
  if (!legacyId || legacyId === userId) {
    await setStored(CLAIMED_KEY, userId);
    return;
  }
  const { error } = await rawSupabase.rpc('claim_legacy_user', { legacy_id: legacyId });
  if (!error) await setStored(CLAIMED_KEY, userId);
};

let signingIn: Promise<string | null> | null = null;
let lastFailureAt = 0;

const signInAnonymously = async (): Promise<string | null> => {
  if (Date.now() - lastFailureAt < SIGN_IN_RETRY_MS) return null;
  try {
    const { data, error } = await rawSupabase.auth.signInAnonymously();
    const userId = data.user?.id ?? null;
    if (error || !userId) {
      lastFailureAt = Date.now();
      return null;
    }
    // Antes de devolver el id, para que nada se escriba con la cuenta nueva
    // mientras sus filas antiguas siguen con el UUID local.
    await claimLegacyRows(userId).catch(() => undefined);
    return userId;
  } catch {
    lastFailureAt = Date.now();
    return null;
  }
};

const accountReadyListeners = new Set<(userId: string) => void>();
let announcedFor: string | null = null;

// Se llama una vez por arranque y cuenta (sube los datos guardados en local).
export const onAccountReady = (listener: (userId: string) => void) => {
  accountReadyListeners.add(listener);
  return () => accountReadyListeners.delete(listener);
};

const markAccount = async (userId: string) => {
  if (announcedFor === userId) return;
  announcedFor = userId;
  await setStored(LAST_ACCOUNT_KEY, userId);
  claimLegacyRows(userId).catch(() => undefined);
  accountReadyListeners.forEach((listener) => listener(userId));
};

export const getIdentity = async (): Promise<Identity> => {
  const existing = await sessionUserId();
  if (existing) {
    await markAccount(existing);
    return { userId: existing, mode: 'account' };
  }

  signingIn ??= signInAnonymously().finally(() => {
    signingIn = null;
  });
  const created = await signingIn;
  if (created) {
    await markAccount(created);
    return { userId: created, mode: 'account' };
  }

  const lastAccount = await getStored(LAST_ACCOUNT_KEY);
  return { userId: lastAccount ?? (await getLegacyId()), mode: 'local' };
};

export const getCurrentUserId = async (): Promise<string> => (await getIdentity()).userId;

export const hasAccountSession = async () => Boolean(await sessionUserId());
