import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { blankQuery, LocalQuery } from './localQuery';
import { runLocalQuery } from './localStore';

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

const COMPARE = new Set(['eq', 'neq', 'gt', 'gte', 'lt', 'lte']);
// Métodos del builder que no cambian qué filas se piden.
const NEUTRAL = new Set(['abortSignal', 'returns', 'overrideTypes', 'throwOnError', 'setHeader']);

// Repite en una LocalQuery lo que se pide a PostgREST, para poder responder igual
// desde la base local. Lo que el motor local no sabe hacer queda marcado y, sin
// conexión, devuelve un error en vez de un resultado equivocado.
export const note = (query: LocalQuery, prop: string, args: unknown[]): LocalQuery => {
  const next: LocalQuery = { ...query, filters: [...query.filters], order: [...query.order] };
  switch (prop) {
    case 'select':
      if (next.op) next.returning = true;
      else next.op = 'select';
      next.columns = typeof args[0] === 'string' ? args[0] : '*';
      return next;
    case 'insert':
    case 'update':
    case 'upsert':
      next.op = prop;
      next.payload = args[0] as LocalQuery['payload'];
      if (prop === 'upsert') next.onConflict = (args[1] as { onConflict?: string } | undefined)?.onConflict;
      return next;
    case 'delete':
      next.op = 'delete';
      return next;
    case 'in':
      next.filters.push({ op: 'in', col: String(args[0]), value: Array.isArray(args[1]) ? args[1] : [] });
      return next;
    case 'is':
      next.filters.push({ op: 'is', col: String(args[0]), value: args[1] as null | boolean });
      return next;
    case 'order': {
      const options = args[1] as { ascending?: boolean; nullsFirst?: boolean } | undefined;
      next.order.push({ col: String(args[0]), ascending: options?.ascending !== false, nullsFirst: options?.nullsFirst });
      return next;
    }
    case 'limit':
      next.limit = Number(args[0]);
      return next;
    case 'range':
      next.range = { from: Number(args[0]), to: Number(args[1]) };
      return next;
    case 'single':
      next.single = true;
      return next;
    case 'maybeSingle':
      next.maybeSingle = true;
      return next;
    default:
      if (COMPARE.has(prop)) {
        next.filters.push({ op: prop as 'eq', col: String(args[0]), value: args[1] });
        return next;
      }
      if (!NEUTRAL.has(prop)) next.unsupported = prop;
      return next;
  }
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