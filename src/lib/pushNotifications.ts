import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// While the app is foregrounded, NotificationListener already shows the
// same event as an in-app toast (it's driven by the same Realtime events
// this push is triggered from) — so suppress the native banner here to
// avoid showing both at once. This handler only runs while JS is alive;
// when the app is backgrounded or killed, the OS shows its own system
// notification regardless of what's returned here.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

// Remote push tokens aren't available in Expo Go as of SDK 53+ — this is
// expected there, so every failure here is swallowed rather than surfaced
// as an error. It works normally in a development or production build.
export async function registerForPushNotificationsAsync(userId: string): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

    await supabase.from('push_tokens').upsert({
      user_id: userId,
      token: tokenResponse.data,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // No native push capability available (Expo Go, simulator, permission
    // denied, etc.) — the app works fine without it, just without pushes.
  }
}

export async function unregisterPushToken(): Promise<void> {
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await supabase.from('push_tokens').delete().eq('token', tokenResponse.data);
  } catch {
    // best-effort cleanup only
  }
}
