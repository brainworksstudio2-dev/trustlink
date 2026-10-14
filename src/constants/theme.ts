// Brand palette (see assets/table.csv): Deep Navy primary, Bright Teal
// secondary, Warm Orange accent ("gold" below, kept as the token name
// since it's referenced throughout the app -- only its value changed).
export const Colors = {
  primary: '#0A2540',
  primaryContainer: '#12456E',
  onPrimary: '#ffffff',
  onPrimaryFixed: '#0A2540',
  primaryFixedDim: '#9FC3E0',
  primaryFixed: '#D7E8F5',
  inversePrimary: '#9FC3E0',

  secondary: '#00B4D8',
  onSecondary: '#ffffff',
  secondaryContainer: '#CFF4FB',
  onSecondaryContainer: '#00616E',

  tertiary: '#574000',
  onTertiary: '#ffffff',
  tertiaryContainer: '#745600',
  onTertiaryContainer: '#fdcc5f',
  tertiaryFixedDim: '#efc054',

  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',

  background: '#F5F7FA',
  onBackground: '#0A2540',

  surface: '#F5F7FA',
  surfaceDim: '#DDE3EA',
  surfaceBright: '#F5F7FA',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#F1F4F7',
  surfaceContainer: '#EBEFF3',
  surfaceContainerHigh: '#E3E8ED',
  surfaceContainerHighest: '#DBE2E8',
  surfaceVariant: '#DBE2E8',
  surfaceTint: '#0A2540',

  onSurface: '#0A2540',
  onSurfaceVariant: '#4A5568',
  inverseSurface: '#16293F',
  inverseOnSurface: '#F0F3F6',

  outline: '#6B7280',
  outlineVariant: '#CBD2D9',

  gold: '#FF6B35',
  goldBg: 'rgba(255, 107, 53, 0.1)',

  availableGreen: '#006e28',
  availableBg: '#e8f5e9',
  busyOrange: '#e65100',
  busyBg: '#fff3e0',
};

export const Spacing = {
  xs: 4,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  containerMobile: 20,
};

export const Radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

export const Shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
};

export const Typography = {
  displaySm: { fontSize: 36, fontWeight: '800' as const, lineHeight: 44, letterSpacing: -1 },
  headlineLg: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40, letterSpacing: -0.64 },
  headlineLgMobile: { fontSize: 28, fontWeight: '700' as const, lineHeight: 36, letterSpacing: -0.56 },
  headlineMd: { fontSize: 24, fontWeight: '600' as const, lineHeight: 32, letterSpacing: -0.24 },
  headlineSm: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
  bodyLg: { fontSize: 18, fontWeight: '400' as const, lineHeight: 28 },
  bodyMd: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodySm: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  labelLg: { fontSize: 16, fontWeight: '700' as const, lineHeight: 20 },
  labelMd: { fontSize: 14, fontWeight: '600' as const, lineHeight: 16, letterSpacing: 0.7 },
  labelSm: { fontSize: 12, fontWeight: '500' as const, lineHeight: 14 },
};
