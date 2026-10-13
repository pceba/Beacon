import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { blankQuery, LocalQuery, runLocalQuery } from './localStore';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const client = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

const note = (query: LocalQuery, prop: string, args: unknown[]): LocalQuery => {
  const next: LocalQuery = { ...query, filters: [...query.filters] };
  if (prop === 'select' && !next.op) next.op = 'select';
  if (prop === 'insert') {
    next.op = 'insert';
    next.payload = args[0] as LocalQuery['payload'];
  }
  if (prop === 'update') {
    next.op = 'update';
    next.payload = args[0] as LocalQuery['payload'];
  }
  if (prop === 'delete') next.op = 'delete';
  if (prop === 'upsert') {
    next.op = 'upsert';
    next.payload = args[0] as LocalQuery['payload'];
    next.onConflict = (args[1] as { onConflict?: string } | undefined)?.onConflict;
  }
  if (prop === 'eq' || prop === 'gte') next.filters.push({ op: prop, col: String(args[0]), value: args[1] });
  if (prop === 'order') {
    const options = args[1] as { ascending?: boolean } | undefined;
    next.order = { col: String(args[0]), ascending: options?.ascending !== false };
  }
  if (prop === 'maybeSingle') next.maybeSingle = true;
  if (prop === 'single') next.single = true;
  return next;
};

const wrap = (table: string, builder: object, query: LocalQuery): object =>
  new Proxy(builder, {
    get(target, prop, receiver) {
      if (prop === 'then') {
        const call = (target as PromiseLike<{ error?: unknown }>).then.bind(target);
        return (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
          const locally = async () => {
            try {
              resolve(await runLocalQuery(table, query));
            } catch (error) {
              reject?.(error);
            }
          };
          return call(
            async (result: { error?: unknown; data?: unknown }) => {
              if (result?.error) return locally();
              const remoteEmpty = !result || result.data == null || (Array.isArray(result.data) && result.data.length === 0);
              if (remoteEmpty && (query.op === 'select' || query.op === null)) {
                const local = await runLocalQuery(table, query);
                const localEmpty = local.data == null || (Array.isArray(local.data) && local.data.length === 0);
                if (!localEmpty) return resolve(local);
              }
              return resolve(result);
            },
            locally,
          );
        };
      }
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function') return value;
      return (...args: unknown[]) => {
        const next = value.apply(target, args);
        if (next && typeof next === 'object') return wrap(table, next, note(query, String(prop), args));
        return next;
      };
    },
  });

// Cliente sin el fallback local: para auth, Edge Functions y la subida de datos
// locales, donde un error tiene que ser un error y no acabar escrito en local.
export const rawSupabase = client;

const originalFrom = client.from.bind(client);

export const supabase: SupabaseClient = new Proxy(client, {
  get(target, prop, receiver) {
    if (prop === 'from') {
      return (table: string) => wrap(table, originalFrom(table) as object, blankQuery());
    }
    const value = Reflect.get(target, prop, receiver);
    return typeof value === 'function' ? value.bind(target) : value;
  },
}) as SupabaseClient;