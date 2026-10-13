import { Easing } from 'react-native-reanimated';

export const Motion = {
  pressIn: 120,
  pressOut: 160,
  progress: 700,
  easeOut: Easing.bezier(0.23, 1, 0.32, 1),
} as const;
