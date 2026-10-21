import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { keyOf } from '../utils/dates';

// Día local actual ('yyyy-MM-dd'). Se recalcula al enfocar la pantalla y al volver a la app,
// así una app abierta desde ayer pasa sola al día nuevo.
export const useDayKey = () => {
  const [dayKey, setDayKey] = useState(() => keyOf(new Date()));
  const sync = useCallback(() => {
    setDayKey(keyOf(new Date()));
  }, []);

  useFocusEffect(sync);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => subscription.remove();
  }, [sync]);

  return dayKey;
};
