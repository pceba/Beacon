import AsyncStorage from '@react-native-async-storage/async-storage';
import { rawSupabase } from '../lib/supabase';
import { getIdentity } from './authService';

// Conector MCP para claude.ai: la app genera un token personal y muestra la URL
// del servidor lifepp-mcp con el token dentro. Claude usa tu plan; no hay API key.

const FUNCTION_PATH = '/functions/v1/lifepp-mcp';

export type ConnectorStatus = {
  account: boolean;
  active: boolean;
  createdAt: string | null;
  lastUsedAt: string | null;
};

export const connectorBaseUrl = () => `${process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''}${FUNCTION_PATH}`;

export const connectorUrl = (token: string) => `${connectorBaseUrl()}/${token}`;

const deviceTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

// Restos de la versión que llamaba a la API con una clave pegada en Ajustes.
let legacyCleaned = false;
const cleanLegacyClaudeKeys = async () => {
  if (legacyCleaned) return;
  legacyCleaned = true;
  await AsyncStorage.multiRemove(['capalot_claude_key', 'capalot_claude_state', 'capalot_claude_consent']).catch(() => undefined);
};

export const getConnectorStatus = async (): Promise<ConnectorStatus> => {
  await cleanLegacyClaudeKeys();
  const identity = await getIdentity();
  if (identity.mode !== 'account') return { account: false, active: false, createdAt: null, lastUsedAt: null };
  const { data, error } = await rawSupabase.rpc('mcp_token_status');
  if (error || !data) return { account: true, active: false, createdAt: null, lastUsedAt: null };
  const status = data as { active?: boolean; created_at?: string; last_used_at?: string | null };
  return {
    account: true,
    active: Boolean(status.active),
    createdAt: status.created_at ?? null,
    lastUsedAt: status.last_used_at ?? null,
  };
};

// Crea un token nuevo (el anterior deja de funcionar) y devuelve la URL del conector.
export const createConnectorUrl = async (): Promise<string> => {
  const identity = await getIdentity();
  if (identity.mode !== 'account') throw new Error('Necesitas conexión para crear el enlace.');
  const { data, error } = await rawSupabase.rpc('create_mcp_token', { p_tz: deviceTimeZone() });
  if (error || typeof data !== 'string') throw new Error('No se ha podido crear el enlace.');
  return connectorUrl(data);
};

export const revokeConnector = async () => {
  const { error } = await rawSupabase.rpc('revoke_mcp_token');
  if (error) throw new Error('No se ha podido desconectar.');
};
