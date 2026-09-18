import { useEffect } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { haversineDistanceKm } from '../lib/geo';
import { Session } from '@supabase/supabase-js';

// Distance/time thresholds a plain watchPositionAsync already applies, plus
// a client-side check on top so a flurry of GPS callbacks within those
// windows never turns into a flurry of writes.
const MIN_METERS_BETWEEN_WRITES = 40;
const MIN_MS_BETWEEN_WRITES = 25000;

// Mounted once at the app root. While the signed-in user is a worker marked
// `available`, periodically upserts their rough current position into
// worker_locations so customers can find them via nearby_workers(). Reacts
// live to the `available` toggle (WorkerRegistrationScreen) via realtime, so
// flipping it off mid-session stops broadcasting immediately. This is
// presence for discovery, not job tracking — that's TrackingScreen +
// service_requests, entirely separate code path.
export default function WorkerPresenceTracker() {
  useEffect(() => {
    let workerId: string | null = null;
    let locationSub: Location.LocationSubscription | null = null;
    let workerChannel: ReturnType<typeof supabase.channel> | null = null;
    let activeUserId: string | null = null;
    let generation = 0;
    let lastWrite: { lat: number; lng: number; at: number } | null = null;

    const stopWatching = async () => {
      locationSub?.remove();
      locationSub = null;
      lastWrite = null;
      if (workerId) {
        await supabase.from('worker_locations').update({ is_sharing: false }).eq('worker_id', workerId);
      }
    };

    const startWatching = async () => {
      if (locationSub) return; // already watching
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return; // graceful no-op — ambient feature, not user-initiated

      locationSub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 25000, distanceInterval: 40 },
        async (loc) => {
          if (!workerId) return;
          const { latitude, longitude, heading, speed, accuracy } = loc.coords;

          const now = Date.now();
          if (lastWrite) {
            const movedKm = haversineDistanceKm(lastWrite.lat, lastWrite.lng, latitude, longitude);
            const elapsedMs = now - lastWrite.at;
            if (movedKm * 1000 < MIN_METERS_BETWEEN_WRITES && elapsedMs < MIN_MS_BETWEEN_WRITES) {
              return;
            }
          }
          lastWrite = { lat: latitude, lng: longitude, at: now };

          await supabase.from('worker_locations').upsert({
            worker_id: workerId,
            latitude,
            longitude,
            heading: heading ?? null,
            speed: speed ?? null,
            accuracy: accuracy ?? null,
            is_sharing: true,
            updated_at: new Date().toISOString(),
          });
        }
      );
    };

    const teardown = async () => {
      if (workerChannel) supabase.removeChannel(workerChannel);
      workerChannel = null;
      await stopWatching();
      workerId = null;
    };

    const setup = async (session: Session | null) => {
      const nextUserId = session?.user.id ?? null;
      if (nextUserId === activeUserId) return;
      activeUserId = nextUserId;

      const myGeneration = ++generation;
      await teardown();
      if (!session) return;

      const { data: worker } = await supabase
        .from('workers')
        .select('id, available')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (myGeneration !== generation || !worker) return;
      workerId = worker.id;

      if (worker.available) {
        await startWatching();
      }

      workerChannel = supabase
        .channel(`presence:worker:${worker.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'workers', filter: `id=eq.${worker.id}` },
          (payload) => {
            const isAvailable = (payload.new as any).available;
            if (isAvailable) {
              startWatching();
            } else {
              stopWatching();
            }
          }
        )
        .subscribe();
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
