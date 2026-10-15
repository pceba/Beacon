import { Easing } from 'react-native-reanimated';

export const Motion = {
  enter: 220,
  exit: 160,
  pressIn: 120,
  pressOut: 160,
  progress: 700,
  pressScale: 0.97,
  easeOut: Easing.out(Easing.cubic),
  sheet: { damping: 22, stiffness: 220 },
} as const;