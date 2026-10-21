import { AppState, Platform } from 'react-native';
import { focusManager, Query, QueryClient } from '@tanstack/react-query';

// Caché de datos de toda la app (TanStack Query). Convención de claves:
// [tabla, ...parámetros]. Las consultas que leen varias tablas lo declaran en
// meta.tables. Tras escribir, se invalida por tabla con invalidateTables().

export type Table =
  | 'body_metrics'
  | 'events'
  | 'goals'
  | 'habit_logs'
  | 'habits'
  | 'journal_entries'
  | 'meal_templates'
  | 'mood_logs'
  | 'notes'
  | 'nutrition_logs'
  | 'preferences'
  | 'profiles'
  | 'sleep_logs'
  | 'tasks'
  | 'water_logs'
  | 'workout_exercises'
  | 'workout_sets'
  | 'workout_template_exercises'
  | 'workout_templates'
  | 'workouts';

declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: { tables?: Table[] };
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Los datos vienen de Supabase o, sin red, del almacén local: siempre se puede
      // preguntar, así que no se pausa por falta de conexión.
      networkMode: 'always',
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnReconnect: false,
    },
    mutations: { networkMode: 'always' },
  },
});

const tablesOf = (query: Query): string[] => query.meta?.tables ?? [String(query.queryKey[0])];

export const invalidateTables = (...tables: Table[]) =>
  queryClient.invalidateQueries({ predicate: (query) => tablesOf(query).some((table) => tables.includes(table as Table)) });

export const invalidateAll = () => queryClient.invalidateQueries();

// Al volver a la app se refresca lo que esté viejo (en web lo hace el propio foco de ventana).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
}
