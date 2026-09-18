import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import { Colors } from '../src/constants/theme';
import { toastConfig } from '../src/components/AppToast';
import { AppAlertHost } from '../src/components/AppAlert';
import NotificationListener from '../src/components/NotificationListener';
import WorkerPresenceTracker from '../src/components/WorkerPresenceTracker';
import PushNotificationRegistrar from '../src/components/PushNotificationRegistrar';
import { stopBackgroundTracking } from '../src/lib/backgroundLocationTask';
// Side-effect only import: registers the background location TaskManager
// task at module scope, before anything could try to start it.
import '../src/lib/backgroundLocationTask';
// Side-effect only import: initializes Sentry (no-op until a DSN is set).
import '../src/lib/sentry';
import { supabase } from '../src/lib/supabase';

export default function RootLayout() {
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        stopBackgroundTracking();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      />
      <NotificationListener />
      <WorkerPresenceTracker />
      <PushNotificationRegistrar />
      <AppAlertHost />
      <Toast config={toastConfig} />
    </SafeAreaProvider>
  );
}
