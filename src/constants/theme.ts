export const Colors = {
  primary: '#003d9b',
  primaryContainer: '#0052cc',
  onPrimary: '#ffffff',
  onPrimaryFixed: '#001848',
  primaryFixedDim: '#b2c5ff',
  primaryFixed: '#dae2ff',
  inversePrimary: '#b2c5ff',

  secondary: '#006e28',
  onSecondary: '#ffffff',
  secondaryContainer: '#6ffb85',
  onSecondaryContainer: '#00732a',

  tertiary: '#574000',
  onTertiary: '#ffffff',
  tertiaryContainer: '#745600',
  onTertiaryContainer: '#fdcc5f',
  tertiaryFixedDim: '#efc054',

  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',

  background: '#f9f9ff',
  onBackground: '#041b3c',

  surface: '#f9f9ff',
  surfaceDim: '#cadaff',
  surfaceBright: '#f9f9ff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f1f3ff',
  surfaceContainer: '#e8edff',
  surfaceContainerHigh: '#e0e8ff',
  surfaceContainerHighest: '#d7e2ff',
  surfaceVariant: '#d7e2ff',
  surfaceTint: '#0c56d0',

  onSurface: '#041b3c',
  onSurfaceVariant: '#434654',
  inverseSurface: '#1d3052',
  inverseOnSurface: '#edf0ff',

  outline: '#737685',
  outlineVariant: '#c3c6d6',

  gold: '#AF861D',
  goldBg: 'rgba(175, 134, 29, 0.1)',

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
