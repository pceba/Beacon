import { useEffect, useState } from 'react';

// Hora actual que cambia una vez por minuto (para «23 min» sin repintar cada segundo).
export const useMinuteTick = () => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
};
