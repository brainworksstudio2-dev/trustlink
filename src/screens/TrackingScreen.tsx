import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MapLibreMap, Camera, Marker, MapUnavailable, isMapLibreAvailable } from '../lib/mapLibreCompat';
import * as Location from 'expo-location';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { haversineDistanceKm } from '../lib/geo';
import { MAP_STYLE_URL } from '../lib/mapStyle';
import { startBackgroundTracking, stopBackgroundTracking } from '../lib/backgroundLocationTask';

// MVP ETA: straight-line distance over an assumed average speed.
// No directions API required. Swap AVERAGE_SPEED_KMH for a real routing
// call later if road-accurate ETAs are needed.
const AVERAGE_SPEED_KMH = 30;
const DEFAULT_ZOOM = 14;

type SharingState = 'off' | 'starting' | 'foreground-only' | 'foreground-and-background';

const ACTIVE_STATUSES = new Set(['accepted']);

export default function TrackingScreen() {
  const router = useRouter();
  const { id: requestId } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [request, setRequest] = useState<any | null>(null);
  const [isWorkerSide, setIsWorkerSide] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [sharing, setSharing] = useState<SharingState>('off');
  const watchSubRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      const { data } = await supabase
        .from('service_requests')
        .select('*, workers(id, name, avatar_url, phone_number, user_id)')
        .eq('id', requestId)
        .single();

      if (data) {
        setRequest(data);
        setIsWorkerSide(!!session && session.user.id === data.workers?.user_id);
      }
      setLoading(false);

      channel = supabase
        .channel(`tracking:${requestId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'service_requests', filter: `id=eq.${requestId}` },
          (payload) => {
            setRequest((prev: any) => ({ ...prev, ...payload.new }));
          }
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [requestId]);

  const stopSharing = React.useCallback(async () => {
    watchSubRef.current?.remove();
    watchSubRef.current = null;
    await stopBackgroundTracking();
    setSharing('off');
  }, []);

  const startSharing = React.useCallback(async () => {
    if (!requestId) return;
    setLocationError(null);
    setSharing('starting');

    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') {
      setLocationError('Location permission is required to share your position with the client.');
      setSharing('off');
      return;
    }

    // Foreground watch drives the on-screen marker immediately, regardless
    // of whether background tracking is also available.
    const sub = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 8000, distanceInterval: 25 },
      (loc) => {
        supabase
          .from('service_requests')
          .update({
            worker_current_lat: loc.coords.latitude,
            worker_current_lng: loc.coords.longitude,
            worker_location_updated_at: new Date().toISOString(),
          })
          .eq('id', requestId)
          .then();
      }
    );
    watchSubRef.current = sub;

    // Background permission is requested separately — foreground sharing
    // still works fine if this is denied, we just can't continue updating
    // once the app is backgrounded/locked.
    const bg = await Location.requestBackgroundPermissionsAsync();
    if (bg.status === 'granted') {
      const started = await startBackgroundTracking(requestId);
      setSharing(started ? 'foreground-and-background' : 'foreground-only');
    } else {
      setSharing('foreground-only');
    }
  }, [requestId]);

  // Auto-stop when the job leaves the active state (completed/declined/etc).
  useEffect(() => {
    if (!isWorkerSide || !request) return;
    if (!ACTIVE_STATUSES.has(request.status) && sharing !== 'off') {
      stopSharing();
    }
  }, [isWorkerSide, request?.status, sharing, stopSharing]);

  // Screen unmount: stop everything rather than leaving a dangling watch.
  useEffect(() => {
    return () => {
      watchSubRef.current?.remove();
      watchSubRef.current = null;
      stopBackgroundTracking();
    };
  }, []);

  if (loading || !request) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  const destLat = request.latitude;
  const destLng = request.longitude;
  const workerLat = request.worker_current_lat;
  const workerLng = request.worker_current_lng;
  const hasWorkerLocation = workerLat != null && workerLng != null;
  const hasDestination = destLat != null && destLng != null;

  const distanceKm =
    hasWorkerLocation && hasDestination
      ? haversineDistanceKm(workerLat, workerLng, destLat, destLng)
      : null;
  const etaMinutes =
    distanceKm != null ? Math.max(1, Math.round((distanceKm / AVERAGE_SPEED_KMH) * 60)) : null;

  const centerLngLat: [number, number] = hasWorkerLocation
    ? [workerLng, workerLat]
    : hasDestination
    ? [destLng, destLat]
    : [0, 0];

  const isSharingOn = sharing === 'foreground-only' || sharing === 'foreground-and-background';
  const isJobActive = ACTIVE_STATUSES.has(request.status);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backCircle} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {isWorkerSide ? 'Heading to client' : `${request.workers?.name || 'Your pro'} is on the way`}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {!isMapLibreAvailable ? (
        <MapUnavailable style={styles.map} />
      ) : (
        <MapLibreMap style={styles.map} mapStyle={MAP_STYLE_URL}>
          <Camera center={centerLngLat} zoom={DEFAULT_ZOOM} duration={800} />
          {hasWorkerLocation && (
            <Marker lngLat={[workerLng, workerLat]}>
              <View style={styles.workerMarker}>
                <Ionicons name="briefcase" size={16} color={Colors.onPrimary} />
              </View>
            </Marker>
          )}
          {hasDestination && (
            <Marker lngLat={[destLng, destLat]}>
              <View style={styles.destMarker} />
            </Marker>
          )}
        </MapLibreMap>
      )}

      <View style={styles.infoCard}>
        {locationError ? (
          <Text style={styles.errorText}>{locationError}</Text>
        ) : !hasWorkerLocation ? (
          <Text style={styles.etaText}>
            Waiting for {isWorkerSide ? 'your' : "the pro's"} location…
          </Text>
        ) : (
          <>
            <Text style={styles.etaLabel}>Estimated arrival</Text>
            <Text style={styles.etaText}>
              {etaMinutes} min{etaMinutes === 1 ? '' : 's'} away
              {distanceKm != null ? ` · ${distanceKm.toFixed(1)} km` : ''}
            </Text>
          </>
        )}

        {isWorkerSide && isJobActive && (
          <View style={styles.shareRow}>
            {isSharingOn ? (
              <>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveBadgeText}>
                    LIVE{sharing === 'foreground-only' ? ' · keep app open' : ''}
                  </Text>
                </View>
                <TouchableOpacity style={styles.stopBtn} onPress={stopSharing}>
                  <Text style={styles.stopBtnText}>Stop Sharing</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={startSharing}
                disabled={sharing === 'starting'}
              >
                {sharing === 'starting' ? (
                  <ActivityIndicator size="small" color={Colors.onPrimary} />
                ) : (
                  <>
                    <Ionicons name="navigate" size={16} color={Colors.onPrimary} />
                    <Text style={styles.shareBtnText}>Share My Live Location</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: Spacing.containerMobile,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant + '22',
    zIndex: 1,
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...Typography.headlineSm, color: Colors.onSurface, fontWeight: '700', flex: 1, textAlign: 'center', marginHorizontal: Spacing.sm },
  map: { flex: 1 },
  workerMarker: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.onPrimary,
    ...Shadow.md,
  },
  destMarker: {
    width: 18,
    height: 18,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondary,
    borderWidth: 3,
    borderColor: Colors.onPrimary,
    ...Shadow.sm,
  },
  infoCard: {
    position: 'absolute',
    left: Spacing.containerMobile,
    right: Spacing.containerMobile,
    bottom: Spacing.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    ...Shadow.modal,
  },
  etaLabel: { ...Typography.labelSm, color: Colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 1 },
  etaText: { ...Typography.headlineSm, color: Colors.onSurface, fontWeight: '700', marginTop: 4 },
  errorText: { ...Typography.bodySm, color: Colors.error },
  shareRow: { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.outlineVariant + '22' },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    height: 46,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
  },
  shareBtnText: { ...Typography.labelMd, color: Colors.onPrimary, fontWeight: '700' },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: Colors.secondary + '18',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
    marginBottom: Spacing.sm,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.secondary },
  liveBadgeText: { ...Typography.labelSm, color: Colors.secondary, fontWeight: '700' },
  stopBtn: {
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.error + '60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBtnText: { ...Typography.labelMd, color: Colors.error, fontWeight: '700' },
});
