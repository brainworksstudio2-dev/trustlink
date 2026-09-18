import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

// No-ops entirely until EXPO_PUBLIC_SENTRY_DSN is set — same pattern as
// every other optional integration in this app (Cloudinary, Google Maps,
// etc.): missing config degrades gracefully instead of crashing.
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.2,
    enabled: !__DEV__,
  });
}

export { Sentry };
