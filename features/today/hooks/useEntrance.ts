import { useEffect, useMemo, useState } from 'react';
import { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useReduceMotion } from '../../../hooks/useReduceMotion';

// Entrada escalonada de Hoy: solo la primera vez que se pinta con datos en este montaje y
// solo si no venían ya de la caché. Lo que aparece después entra con un fundido corto.
export const useEntrance = (cached: boolean, ready: boolean) => {
  const reduce = useReduceMotion();
  const [cascade, setCascade] = useState(!cached);

  useEffect(() => {
    if (ready && cascade) setCascade(false);
  }, [cascade, ready]);

  return useMemo(() => {
    const short = reduce ? FadeIn.duration(120) : FadeInDown.duration(120);
    const enter = (index: number) => (cascade && !reduce ? FadeInDown.duration(220).delay(index * 40) : short);
    return {
      reduce,
      enter,
      exit: reduce ? FadeOut.duration(120) : FadeOut.duration(160),
      layout: reduce ? undefined : LinearTransition.duration(220),
    };
  }, [cascade, reduce]);
};

export type Entrance = ReturnType<typeof useEntrance>;
