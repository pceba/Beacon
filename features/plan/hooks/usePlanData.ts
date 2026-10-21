import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRefetchOnFocus } from '../../../hooks/useRefetchOnFocus';
import { bucketByDay } from '../calendarLayout';
import { planQueries } from '../planQueries';
import { Range } from '../planPeriods';

// Eventos y tareas con fecha del rango (periodo visible ± 1), agrupados por día una sola vez.
export const usePlanData = ({ from, to }: Range, withOpenTasks: boolean) => {
  const events = useQuery(planQueries.events(from, to));
  const tasks = useQuery(planQueries.tasks(from, to));
  const open = useQuery({ ...planQueries.openTasks(), enabled: withOpenTasks });
  useRefetchOnFocus(withOpenTasks ? [events, tasks, open] : [events, tasks]);

  const buckets = useMemo(() => bucketByDay(events.data ?? [], tasks.data ?? []), [events.data, tasks.data]);
  const failed = (events.isError && !events.data) || (tasks.isError && !tasks.data);
  const { refetch: refetchEvents } = events;
  const { refetch: refetchTasks } = tasks;
  const { refetch: refetchOpen } = open;
  const refetch = useCallback(
    () => Promise.all([refetchEvents(), refetchTasks(), withOpenTasks ? refetchOpen() : null]),
    [refetchEvents, refetchTasks, refetchOpen, withOpenTasks],
  );

  return { buckets, openTasks: open.data, failed, refetch };
};
