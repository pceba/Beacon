import { Platform, ViewStyle } from 'react-native';

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 24,
  xxl: 32,
  s16: 16,
} as const;

export const Radius = {
  sm: 10,
  md: 14,
  lg: 18,
  sheet: 28,
  pill: 999,
  full: 999,
} as const;

export const cardShadow: ViewStyle =
  Platform.OS === 'android'
    ? { elevation: 2 }
    : Platform.OS === 'web'
      ? { boxShadow: '0 1px 2px rgba(16,19,24,0.04), 0 6px 16px rgba(16,19,24,0.04)' }
      : {
          shadowColor: '#101318',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        };

/** Space under scrolling content. The tab bar already includes the safe area. */
export const tabClearance = (_inset = 0) => 32;