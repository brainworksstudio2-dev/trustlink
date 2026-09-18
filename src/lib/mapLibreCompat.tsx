// @maplibre/maplibre-react-native touches TurboModuleRegistry.getEnforcing(...)
// at the TOP LEVEL of its own modules — so a plain `import` crashes the
// instant this package is even referenced, not just when a map is rendered.
// That's fine in a real build, but in Expo Go (or any environment without
// the native module) it turns into a synchronous throw during static module
// evaluation — which doesn't just break the screen that imported it, it can
// take down anything that statically imports THAT screen too (e.g. a whole
// tab navigator, if one of its tabs is a map screen).
//
// require() inside a try/catch, done once here, contains the crash to this
// one module. Every map screen imports from here instead of the package
// directly, checks `isMapLibreAvailable`, and renders <MapUnavailable /> when
// it's false.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import type * as MapLibreTypes from '@maplibre/maplibre-react-native';

let mod: typeof MapLibreTypes | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  mod = require('@maplibre/maplibre-react-native');
} catch {
  mod = null;
}

export const isMapLibreAvailable = mod !== null;

export const MapLibreMap = mod?.Map as typeof MapLibreTypes.Map;
export const Camera = mod?.Camera as typeof MapLibreTypes.Camera;
export const Marker = mod?.Marker as typeof MapLibreTypes.Marker;
export const UserLocation = mod?.UserLocation as typeof MapLibreTypes.UserLocation;
export const GeoJSONSource = mod?.GeoJSONSource as typeof MapLibreTypes.GeoJSONSource;
export const Layer = mod?.Layer as typeof MapLibreTypes.Layer;

export type CameraRef = MapLibreTypes.CameraRef;

// Drop-in placeholder that fills the same space a <MapLibreMap> would.
export function MapUnavailable({ style }: { style?: any }) {
  return (
    <View style={[styles.container, style]}>
      <Ionicons name="map-outline" size={28} color={Colors.outline} />
      <Text style={styles.title}>Map unavailable in Expo Go</Text>
      <Text style={styles.subtitle}>Open this app from a development or production build to see the map.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    padding: Spacing.lg,
    gap: 6,
  },
  title: { ...Typography.labelMd, color: Colors.onSurfaceVariant, fontWeight: '700', textAlign: 'center' },
  subtitle: { ...Typography.bodySm, color: Colors.outline, textAlign: 'center', maxWidth: 260 },
});
