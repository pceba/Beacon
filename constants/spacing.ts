export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  xxl: 40,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;

/** Space under scrolling content. The tab bar already includes the safe area. */
export const tabClearance = (_inset = 0) => 32;
