// Sends push notifications for the events NotificationListener already
// toasts in-app: a new booking request, a status change on a request, or a
// new chat message. This is what reaches a worker/client when the app is
// backgrounded or closed — the in-app toast only fires while it's open.
//
// Deploy: supabase functions deploy send-push-notification
// Wire up: Supabase Dashboard -> Database -> Webhooks -> create one each for:
//   - service_requests, on INSERT
//   - service_requests, on UPDATE
//   - messages, on INSERT
// all pointing at this function's URL. See the deployment instructions
// for exact steps.

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

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

async function getPushTokensForUser(userId: string): Promise<string[]> {
  const { data } = await supabaseAdmin.from('push_tokens').select('token').eq('user_id', userId);
  return (data || []).map((r: { token: string }) => r.token);
}

async function getWorkerUserId(workerId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from('workers').select('user_id').eq('id', workerId).single();
  return data?.user_id ?? null;
}

async function sendPush(tokens: string[], title: string, body: string, data: Record<string, unknown> = {}) {
  if (tokens.length === 0) return;
  const messages = tokens.map((to) => ({ to, title, body, data, sound: 'default' }));
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const { table, type, record, old_record } = payload;

    if (table === 'service_requests' && type === 'INSERT') {
      if (!record.worker_id) return new Response('ok');
      const workerUserId = await getWorkerUserId(record.worker_id);
      if (workerUserId) {
        const tokens = await getPushTokensForUser(workerUserId);
        const label = SERVICE_LABELS[record.service_type] || record.service_type;
        await sendPush(
          tokens,
          'New booking request',
          `${label}${record.description ? ` · ${record.description}` : ''}`,
          { screen: 'requests' }
        );
      }
    } else if (table === 'service_requests' && type === 'UPDATE') {
      if (!record.status || record.status === old_record?.status) return new Response('ok');

      if (record.status === 'accepted') {
        const tokens = await getPushTokensForUser(record.user_id);
        await sendPush(tokens, 'Request accepted', 'A professional confirmed your booking.', { screen: 'requests' });
      } else if (record.status === 'declined') {
        const tokens = await getPushTokensForUser(record.user_id);
        await sendPush(tokens, 'Request declined', 'That professional could not take this job.', { screen: 'requests' });
      } else if (record.status === 'completed') {
        const tokens = await getPushTokensForUser(record.user_id);
        await sendPush(tokens, 'Job completed', 'Leave a review to help others choose with confidence.', { screen: 'requests' });
      } else if (record.status === 'cancelled') {
        const clientTokens = await getPushTokensForUser(record.user_id);
        await sendPush(clientTokens, 'Request cancelled', 'This booking was cancelled.', { screen: 'requests' });

        if (record.worker_id) {
          const workerUserId = await getWorkerUserId(record.worker_id);
          if (workerUserId) {
            const workerTokens = await getPushTokensForUser(workerUserId);
            await sendPush(workerTokens, 'Job cancelled', 'The client cancelled this booking.', { screen: 'requests' });
          }
        }
      }
    } else if (table === 'messages' && type === 'INSERT') {
      const tokens = await getPushTokensForUser(record.receiver_id);
      await sendPush(tokens, 'New message', (record.content || 'You have a new message').slice(0, 120), {
        screen: 'chat',
        request_id: record.request_id,
        receiver_id: record.sender_id,
      });
    }

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response('error', { status: 500 });
  }
});
