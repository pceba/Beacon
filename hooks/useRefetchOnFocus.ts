import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';

type Refetchable = { isStale: boolean; refetch: () => Promise<unknown> };

// Las pestañas no se desmontan: al volver a enfocarlas se piden otra vez solo las
// consultas que ya han caducado (staleTime). El primer foco lo cubre el montaje.
export const useRefetchOnFocus = (queries: Refetchable[]) => {
  const latest = useRef(queries);
  latest.current = queries;
  const focused = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!focused.current) {
        focused.current = true;
        return;
      }
      latest.current.forEach((query) => {
        if (query.isStale) void query.refetch();
      });
    }, []),
  );
};
