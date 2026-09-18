import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { registerForPushNotificationsAsync, unregisterPushToken } from '../lib/pushNotifications';
import { Session } from '@supabase/supabase-js';

// Mounted once at the app root. Registers/unregisters this device's Expo
// push token as the user signs in/out, and routes to the right screen when
// a push notification is tapped (mirrors NotificationListener's in-app
// toast onPress destinations, for when the app was backgrounded/closed).
export default function PushNotificationRegistrar() {
  const router = useRouter();

  useEffect(() => {
    let activeUserId: string | null = null;

    const setup = async (session: Session | null) => {
      const nextUserId = session?.user.id ?? null;
      if (nextUserId === activeUserId) return;
      const wasLoggedIn = !!activeUserId;
      activeUserId = nextUserId;

      if (session) {
        registerForPushNotificationsAsync(session.user.id);
      } else if (wasLoggedIn) {
        unregisterPushToken();
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setup(session));

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      if (!data?.screen) return;
      if (data.screen === 'requests') {
        router.push('/requests');
      } else if (data.screen === 'chat' && data.request_id) {
        router.push({
          pathname: '/chat/[id]',
          params: { id: data.request_id, receiver_id: data.receiver_id, chat_title: 'Chat' },
        });
      }
    });

    return () => {
      subscription.unsubscribe();
      responseSub.remove();
    };
  }, [router]);

  return null;
}
