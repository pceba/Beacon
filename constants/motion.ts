import { Easing, ReduceMotion } from 'react-native-reanimated';

export const Motion = {
  enter: 220,
  exit: 160,
  pressIn: 120,
  pressOut: 160,
  progress: 700,
  pressScale: 0.97,
  easeOut: Easing.out(Easing.cubic),
  reduced: 120,
  // Fundido para «reducir movimiento». Reanimated salta las animaciones con esa opción
  // del sistema, así que este se marca como Never para que el fundido sí se vea.
  reducedFade: { duration: 120, reduceMotion: ReduceMotion.Never },
  // Hojas (DESIGN.md §9): sin muelle. Abrir decelera, cerrar acelera.
  sheetOpen: { duration: 240, easing: Easing.bezier(0.2, 0, 0, 1) },
  sheetClose: { duration: 180, easing: Easing.bezier(0.4, 0, 1, 1) },
  scrimIn: { duration: 200, easing: Easing.bezier(0.2, 0, 0, 1) },
  scrimOut: { duration: 180, easing: Easing.bezier(0.4, 0, 1, 1) },
} as const;
