import { useCallback, useEffect, useRef, useState } from 'react';
import { getStored, setStored } from '../../../lib/storage';

// Descanso entre series: 90 s por defecto, de 15 en 15 entre 30 y 300, y se recuerda.
// 0 guardado = sin descanso.

const KEY = 'lifepp_rest_seconds';
export const REST_DEFAULT = 90;
const MIN = 30;
const MAX = 300;

export type Rest = { endsAt: number; total: number };

const clamp = (value: number) => Math.min(MAX, Math.max(MIN, Math.round(value / 15) * 15));

export const useRestTimer = () => {
  const [rest, setRest] = useState<Rest | null>(null);
  const [seconds, setSeconds] = useState(REST_DEFAULT);
  const restRef = useRef(rest);
  const secondsRef = useRef(seconds);

  useEffect(() => {
    let active = true;
    getStored(KEY)
      .then((raw) => {
        if (!active || raw == null) return;
        const value = Number(raw);
        if (!Number.isFinite(value)) return;
        secondsRef.current = value <= 0 ? 0 : clamp(value);
        setSeconds(secondsRef.current);
      })
      .catch((error) => console.error(error));
    return () => {
      active = false;
    };
  }, []);

  const remember = useCallback((value: number) => {
    secondsRef.current = value;
    setSeconds(value);
    setStored(KEY, String(value)).catch((error) => console.error(error));
  }, []);

  const update = useCallback((next: Rest | null) => {
    restRef.current = next;
    setRest(next);
  }, []);

  const start = useCallback(() => {
    const total = secondsRef.current;
    if (total <= 0) return;
    update({ endsAt: Date.now() + total * 1000, total });
  }, [update]);

  const adjust = useCallback(
    (delta: number) => {
      const current = restRef.current;
      if (!current) return;
      const total = clamp(current.total + delta);
      remember(total);
      update({ endsAt: current.endsAt + (total - current.total) * 1000, total });
    },
    [remember, update],
  );

  const stop = useCallback(() => update(null), [update]);

  const toggleEnabled = useCallback(() => {
    if (secondsRef.current > 0) {
      remember(0);
      update(null);
    } else {
      remember(REST_DEFAULT);
    }
  }, [remember, update]);

  return { rest, seconds, start, adjust, stop, toggleEnabled };
};
