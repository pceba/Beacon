const fontRegular = 'Outfit_400Regular';
const fontMedium = 'Outfit_500Medium';
const fontBold = 'Outfit_600SemiBold';

export const Typography = {
  fontRegular,
  fontMedium,
  fontBold,
  fontDisplay: fontBold,
  fontDisplayRegular: fontRegular,
  xxl: 28,
  xl: 26,
  lg: 18,
  md: 16,
  sm: 14,
  xs: 12,
  lineHeightBody: 22,
  lineHeightTitle: 40,
} as const;

export const tabular = { fontVariant: ['tabular-nums' as const] };

export const Type = {
  display: { fontFamily: fontBold, fontSize: 56, lineHeight: 60, letterSpacing: -1.5 },
  title: { fontFamily: fontBold, fontSize: 32, lineHeight: 36, letterSpacing: -0.6 },
  headline: { fontFamily: fontBold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  section: { fontFamily: fontBold, fontSize: 17, lineHeight: 22, letterSpacing: 0 },
  body: { fontFamily: fontRegular, fontSize: 16, lineHeight: 22, letterSpacing: 0 },
  bodyStrong: { fontFamily: fontBold, fontSize: 16, lineHeight: 22, letterSpacing: 0 },
  caption: { fontFamily: fontMedium, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  label: { fontFamily: fontBold, fontSize: 11, lineHeight: 14, letterSpacing: 0.6, textTransform: 'uppercase' as const },
  overline: { fontFamily: fontBold, fontSize: 13, lineHeight: 18, letterSpacing: 0.8, textTransform: 'uppercase' as const },
} as const;
