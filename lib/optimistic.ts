import { QueryKey } from '@tanstack/react-query';
import { invalidateTables, queryClient, Table } from './query';
import { toast } from './toast';

type Options<T, R> = {
  key: QueryKey;
  apply: (current: T | undefined) => T | undefined;
  run: () => Promise<R>;
  // Tras guardar (p. ej. cambiar la fila provisional por la del servidor).
  commit?: (current: T | undefined, result: R) => T | undefined;
  // Si falla. Por defecto vuelve a lo que había antes de apply.
  revert?: (current: T | undefined, previous: T | undefined) => T | undefined;
  tables: Table[];
  error: string;
};

let running = 0;
const pending = new Set<Table>();

// Cambia la caché al momento, guarda en segundo plano y, si falla, deshace con un toast.
// Las tablas se invalidan cuando ya no queda ninguna escritura en curso, para que una
// recarga no pise un cambio que aún se está guardando.
export const optimistic = async <T, R>({ key, apply, run, commit, revert, tables, error }: Options<T, R>): Promise<R | undefined> => {
  running += 1;
  tables.forEach((table) => pending.add(table));
  try {
    await queryClient.cancelQueries({ queryKey: key });
    const previous = queryClient.getQueryData<T>(key);
    queryClient.setQueryData<T>(key, apply);
    try {
      const result = await run();
      if (commit) queryClient.setQueryData<T>(key, (current) => commit(current, result));
      return result;
    } catch (cause) {
      console.error(cause);
      queryClient.setQueryData<T>(key, (current) => (revert ? revert(current, previous) : previous));
      toast.show({ message: error, kind: 'error' });
      return undefined;
    }
  } finally {
    running -= 1;
    if (running === 0) {
      const list = [...pending];
      pending.clear();
      void invalidateTables(...list);
    }
  }
};
