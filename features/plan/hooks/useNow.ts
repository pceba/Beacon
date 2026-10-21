import { useEffect, useState } from 'react';
import { keyOf } from '../../../utils/dates';

const read = () => {
  const now = new Date();
  return { day: keyOf(now), minutes: now.getHours() * 60 + now.getMinutes() };
};

// Día y minuto actuales; se actualiza al cambiar de minuto (línea de ahora).
export const useNow = () => {
  const [now, setNow] = useState(read);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const tick = () => setNow((current) => {
      const next = read();
      return next.day === current.day && next.minutes === current.minutes ? current : next;
    });
    const timeout = setTimeout(() => {
      tick();
      interval = setInterval(tick, 60_000);
    }, 60_000 - (Date.now() % 60_000));
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, []);

  return now;
};
