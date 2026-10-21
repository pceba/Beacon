import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { getCurrentUserId } from '../../services/authService';
import { getEventsInRange } from '../../services/eventService';
import { getOpenTasks, getTasksByDeadline } from '../../services/taskService';

// Claves [tabla, ...parámetros]; las tareas abiertas comparten clave con Hoy.
export const planKeys = {
  events: (from: string, to: string) => ['events', 'range', from, to] as const,
  tasks: (from: string, to: string) => ['tasks', 'deadline', from, to] as const,
  openTasks: () => ['tasks', 'open'] as const,
};

export const planQueries = {
  events: (from: string, to: string) =>
    queryOptions({
      queryKey: planKeys.events(from, to),
      queryFn: async () => getEventsInRange(await getCurrentUserId(), from, to),
      meta: { tables: ['events'] },
      placeholderData: keepPreviousData,
    }),
  tasks: (from: string, to: string) =>
    queryOptions({
      queryKey: planKeys.tasks(from, to),
      queryFn: async () => getTasksByDeadline(await getCurrentUserId(), from, to),
      meta: { tables: ['tasks'] },
      placeholderData: keepPreviousData,
    }),
  openTasks: () =>
    queryOptions({
      queryKey: planKeys.openTasks(),
      queryFn: async () => getOpenTasks(await getCurrentUserId()),
      meta: { tables: ['tasks'] },
    }),
};
