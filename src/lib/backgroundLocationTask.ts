import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export const BACKGROUND_LOCATION_TASK = 'trustlink-job-location-tracking';

const ACTIVE_REQUEST_KEY = 'trustlink:activeTrackingRequestId';

// Persisted (not just in-memory) because a background task can be relaunched
// by the OS in a fresh JS context after the app process was killed, while
// the foreground service keeps location updates flowing.
export async function setActiveTrackingRequestId(requestId: string | null): Promise<void> {
  if (requestId) {
    await AsyncStorage.setItem(ACTIVE_REQUEST_KEY, requestId);
  } else {
    await AsyncStorage.removeItem(ACTIVE_REQUEST_KEY);
  }
}

async function getActiveTrackingRequestId(): Promise<string | null> {
  return AsyncStorage.getItem(ACTIVE_REQUEST_KEY);
}

// Must be defined at module scope — imported once (for its side effect) from
// app/_layout.tsx so the task is registered before anything might start it.
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('Background location task error:', error.message);
    return;
  }

  const requestId = await getActiveTrackingRequestId();
  if (!requestId) return;

  const { locations } = (data as { locations: Location.LocationObject[] }) ?? { locations: [] };
  const latest = locations[locations.length - 1];
  if (!latest) return;

  const { error: updateError } = await supabase
    .from('service_requests')
    .update({
      worker_current_lat: latest.coords.latitude,
      worker_current_lng: latest.coords.longitude,
      worker_location_updated_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (updateError) {
    console.warn('Background location write failed:', updateError.message);
  }
});

export async function startBackgroundTracking(requestId: string): Promise<boolean> {
  const { status } = await Location.getBackgroundPermissionsAsync();
  if (status !== 'granted') return false;

  await setActiveTrackingRequestId(requestId);

  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (alreadyStarted) return true;

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 10000,
    distanceInterval: 30,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'TrustLink — sharing your location',
      notificationBody: 'The client can see you on the way. Tap to open TrustLink.',
    },
  });
  return true;
}

export async function stopBackgroundTracking(): Promise<void> {
  await setActiveTrackingRequestId(null);
  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
  if (alreadyStarted) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
}
