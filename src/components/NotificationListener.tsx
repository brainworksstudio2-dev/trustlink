import { useEffect, useRef } from 'react';
import Toast from 'react-native-toast-message';
import { useRouter, usePathname } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

const SERVICE_LABELS: Record<string, string> = {
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  photography: 'Photography',
  carpentry: 'Carpentry',
  delivery: 'Delivery',
  pet: 'Pet Care',
  home: 'Home Repair',
  other: 'Service',
};

// Mounted once at the app root. Listens for realtime events relevant to the
// signed-in user (new booking requests, status changes on their own
// requests, new chat messages) and surfaces them as tappable toasts —
// regardless of which screen is currently open.
export default function NotificationListener() {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    let requestsChannel: ReturnType<typeof supabase.channel> | null = null;
    let messagesChannel: ReturnType<typeof supabase.channel> | null = null;
    let activeUserId: string | null = null;
    // Bumped on every setup() call so a slower, superseded call can tell it's
    // stale (e.g. two auth events firing back-to-back) and bail out instead
    // of racing the newer call for the same realtime channel names.
    let generation = 0;

    const teardown = () => {
      if (requestsChannel) supabase.removeChannel(requestsChannel);
      if (messagesChannel) supabase.removeChannel(messagesChannel);
      requestsChannel = null;
      messagesChannel = null;
    };

    const setup = async (session: Session | null) => {
      const nextUserId = session?.user.id ?? null;
      if (nextUserId === activeUserId) return; // duplicate fire for the same user, ignore
      activeUserId = nextUserId;

      const myGeneration = ++generation;
      teardown();
      if (!session) return;
      const myUserId = session.user.id;

      const { data: worker } = await supabase.from('workers').select('id').eq('user_id', myUserId).maybeSingle();

      if (myGeneration !== generation) return; // a newer setup() call has already taken over

      let nextRequestsChannel = supabase.channel(`notif:requests:${myUserId}`);

      if (worker) {
        nextRequestsChannel = nextRequestsChannel.on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'service_requests', filter: `worker_id=eq.${worker.id}` },
          (payload) => {
            const req = payload.new as any;
            Toast.show({
              type: 'notification',
              text1: 'New booking request',
              text2: `${SERVICE_LABELS[req.service_type] || req.service_type}${req.description ? ` · ${req.description}` : ''}`,
              props: { icon: 'briefcase' },
              onPress: () => router.push('/requests'),
            });
          }
        );

        nextRequestsChannel = nextRequestsChannel.on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'service_requests', filter: `worker_id=eq.${worker.id}` },
          (payload) => {
            const next = payload.new as any;
            const prev = payload.old as any;
            if (next.status !== 'cancelled' || next.status === prev?.status) return;
            Toast.show({
              type: 'notification',
              text1: 'Job cancelled',
              text2: 'The client cancelled this booking.',
              props: { icon: 'close-circle' },
              onPress: () => router.push('/requests'),
            });
          }
        );
      }

      nextRequestsChannel = nextRequestsChannel.on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'service_requests', filter: `user_id=eq.${myUserId}` },
        (payload) => {
          const next = payload.new as any;
          const prev = payload.old as any;
          if (!next.status || next.status === prev?.status) return;

          if (next.status === 'accepted') {
            Toast.show({
              type: 'notification',
              text1: 'Request accepted',
              text2: 'A professional confirmed your booking.',
              props: { icon: 'checkmark-done' },
              onPress: () => router.push('/requests'),
            });
          } else if (next.status === 'declined') {
            Toast.show({
              type: 'notification',
              text1: 'Request declined',
              text2: 'That professional could not take this job.',
              props: { icon: 'close-circle' },
              onPress: () => router.push('/requests'),
            });
          } else if (next.status === 'cancelled') {
            Toast.show({
              type: 'notification',
              text1: 'Request cancelled',
              text2: 'The professional can no longer take this job.',
              props: { icon: 'close-circle' },
              onPress: () => router.push('/requests'),
            });
          } else if (next.status === 'completed') {
            Toast.show({
              type: 'notification',
              text1: 'Job completed',
              text2: 'Leave a review to help others choose with confidence.',
              props: { icon: 'checkmark-done' },
              onPress: () => router.push('/requests'),
            });
          }
        }
      );
      let nextMessagesChannel = supabase
        .channel(`notif:messages:${myUserId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${myUserId}` },
          async (payload) => {
            const msg = payload.new as any;

            // Already viewing this exact conversation — the chat screen's
            // own realtime subscription already renders it, skip the toast.
            if (pathnameRef.current === `/chat/${msg.request_id}`) return;

            let senderName = 'New message';
            const { data: sender } = await supabase
              .from('users')
              .select('raw_user_meta_data')
              .eq('id', msg.sender_id)
              .maybeSingle();
            if (sender?.raw_user_meta_data?.full_name) senderName = sender.raw_user_meta_data.full_name;

            Toast.show({
              type: 'notification',
              text1: senderName,
              text2: msg.content,
              props: { icon: 'chatbubble-ellipses' },
              onPress: () =>
                router.push({
                  pathname: '/chat/[id]',
                  params: { id: msg.request_id, receiver_id: msg.sender_id, chat_title: senderName },
                }),
            });
          }
        );

      if (myGeneration !== generation) {
        // Superseded while building the channels — discard this attempt
        // instead of subscribing channels nothing will ever tear down.
        supabase.removeChannel(nextRequestsChannel);
        supabase.removeChannel(nextMessagesChannel);
        return;
      }

      requestsChannel = nextRequestsChannel;
      messagesChannel = nextMessagesChannel;
      requestsChannel.subscribe();
      messagesChannel.subscribe();
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setup(session);
    });

    return () => {
      subscription.unsubscribe();
      teardown();
    };
  }, []);

  return null;
}
