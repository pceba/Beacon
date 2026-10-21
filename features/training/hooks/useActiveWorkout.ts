import { useQuery } from '@tanstack/react-query';
import { Workout } from '../../../types/database';
import { trainingQueries } from '../trainingQueries';

// Entreno en curso empezado en las últimas 24 h, o null. Consulta barata (limit 5).
export const useActiveWorkout = (): Workout | null => {
  const { data } = useQuery(trainingQueries.active('recent'));
  return data ?? null;
};
