import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Linking, SafeAreaView, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker, Region } from 'react-native-maps';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type ExploreScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Main'>;
};

import { supabase } from '../lib/supabase';

// Map category -> icon name
const CATEGORY_ICON: Record<string, string> = {
  Electricians: 'flash',
  Plumbers: 'water',
  Carpenters: 'hammer',
  Cleanings: 'sparkles',
  Mechanics: 'car',
  Photographers: 'camera',
  Locksmiths: 'key',
};

const getCategoryIcon = (category: string): string => {
  if (!category) return 'construct';
  // Try exact match first, then partial
  if (CATEGORY_ICON[category]) return CATEGORY_ICON[category];
  const key = Object.keys(CATEGORY_ICON).find(k =>
    category.toLowerCase().includes(k.toLowerCase().replace(/s$/, ''))
  );
  return key ? CATEGORY_ICON[key] : 'construct';
};

const generateMockLocation = (baseLat: number, baseLng: number) => {
  const latOffset = (Math.random() - 0.5) * 0.05; // ~2.5km offset
  const lngOffset = (Math.random() - 0.5) * 0.05;
  return {
    latitude: baseLat + latOffset,
    longitude: baseLng + lngOffset,
  };
};

const { width, height } = Dimensions.get('window');

export default function ExploreScreen({ navigation }: ExploreScreenProps) {
  const [selectedFilter, setSelectedFilter] = useState('All Pros');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [workersData, setWorkersData] = useState<any[]>([]);
  const [filterChips, setFilterChips] = useState<string[]>(['All Pros']);
  const [selectedWorker, setSelectedWorker] = useState<any | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      let baseLat = 40.7128; // Default NY
      let baseLng = -74.0060;

      if (status === 'granted') {
        try {
          let loc = await Location.getCurrentPositionAsync({});
          setLocation(loc);
          baseLat = loc.coords.latitude;
          baseLng = loc.coords.longitude;
        } catch (err) {
          console.warn("Could not get location", err);
        }
      }

      // Fetch workers from Supabase
      try {
        const { data, error } = await supabase.from('workers').select('*');
        if (error) {
          console.error("Error fetching workers:", error);
        } else if (data) {
          // Generate random locations for workers that have no real coordinates
          const updatedWorkers = data.map((w: any) => ({
            ...w,
            coordinate:
              w.latitude && w.longitude
                ? { latitude: w.latitude, longitude: w.longitude }
                : generateMockLocation(baseLat, baseLng),
          }));
          setWorkersData(updatedWorkers);

          // Build dynamic filter chips from actual category values
          const categories = Array.from(
            new Set(data.map((w: any) => w.category).filter(Boolean))
          ) as string[];
          setFilterChips(['All Pros', ...categories]);
        }
      } catch (err) {
        console.error("Fetch exception:", err);
      }
      
      setIsLoadingLocation(false);
    })();
  }, []);

  const filteredWorkers = workersData.filter((worker) => {
    if (selectedFilter === 'All Pros') return true;
    return worker.category === selectedFilter;
  });

  const handleCall = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Linking.openURL('tel:1234567890');
    }
  };

  const handleWhatsApp = (whatsapp: string) => {
    if (whatsapp) {
      Linking.openURL(`https://wa.me/${whatsapp}`);
    } else {
      Linking.openURL('https://wa.me/1234567890');
    }
  };

  const handleViewProfile = (worker: any) => {
    navigation.navigate('WorkerProfile', { worker });
  };

  const mapRegion: Region = {
    latitude: location ? location.coords.latitude : 40.7128,
    longitude: location ? location.coords.longitude : -74.0060,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  return (
    <View style={styles.container}>
      {viewMode === 'map' ? (
        <View style={styles.mapContainer}>
          {isLoadingLocation ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Locating nearby pros...</Text>
            </View>
          ) : (
            <MapView 
              style={styles.map} 
              initialRegion={mapRegion}
              showsUserLocation={true}
              showsMyLocationButton={false}
              onPress={() => setSelectedWorker(null)} // Click map to dismiss selected
            >
              {filteredWorkers.map(worker => (
                <Marker
                  key={worker.id}
                  coordinate={worker.coordinate}
                  onPress={(e) => {
                    e.stopPropagation();
                    setSelectedWorker(worker);
                  }}
                >
                  <View style={[styles.markerContainer, selectedWorker?.id === worker.id && styles.markerSelected]}>
                    <Ionicons 
                      name={getCategoryIcon(worker.category) as any} 
                      size={18} 
                      color={selectedWorker?.id === worker.id ? Colors.onPrimary : Colors.primary} 
                    />
                  </View>
                </Marker>
              ))}
            </MapView>
          )}
        </View>
      ) : (
        <SafeAreaView style={styles.listSafeContainer}>
          <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
            {/* Top padding to account for floating header */}
            <View style={{ height: 160 }} />
            {filteredWorkers.map((worker) => (
              <View key={worker.id} style={styles.card}>
                <View style={styles.topRow}>
                  <View style={styles.avatarContainer}>
                    <Image source={{ uri: worker.avatar_url }} style={styles.avatar} />
                    <View style={styles.verifiedIconContainer}>
                      <Ionicons name="checkmark-circle" size={16} color={Colors.gold} />
                    </View>
                  </View>
                  <View style={styles.detailsContainer}>
                    <View style={styles.nameRow}>
                      <Text style={styles.workerName}>{worker.name}</Text>
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={14} color={Colors.gold} />
                        <Text style={styles.ratingText}>{worker.rating}</Text>
                      </View>
                    </View>
                    <Text style={styles.workerSpecialty}>{worker.specialty}</Text>
                    <View style={styles.metaRow}>
                      <View style={[styles.availabilityBadge, worker.available ? styles.badgeGreen : styles.badgeOrange]}>
                        <Text style={[styles.availabilityText, worker.available ? styles.textGreen : styles.textOrange]}>
                          {worker.availability_text || (worker.available ? 'Available Now' : 'Unavailable')}
                        </Text>
                      </View>
                      <Text style={styles.distanceText}>• {worker.distance}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.actionBtnOutline} onPress={() => handleCall(worker.phone_number)} activeOpacity={0.8}>
                    <Ionicons name="call" size={16} color={Colors.primary} />
                    <Text style={styles.actionBtnOutlineText}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtnWhatsApp} onPress={() => handleWhatsApp(worker.whatsapp_number)} activeOpacity={0.8}>
                    <Ionicons name="logo-whatsapp" size={16} color="#075E54" />
                    <Text style={styles.actionBtnWhatsAppText}>WhatsApp</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => handleViewProfile(worker)} activeOpacity={0.9}>
                  <Text style={styles.primaryBtnText}>View Profile</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      )}

      {/* Floating Top Bar (Always visible) */}
      <SafeAreaView style={styles.floatingHeaderArea} pointerEvents="box-none">
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Nearby Pros</Text>
          <TouchableOpacity 
            style={styles.toggleBtn}
            onPress={() => {
              setViewMode(viewMode === 'map' ? 'list' : 'map');
              setSelectedWorker(null);
            }}
          >
            <Ionicons name={viewMode === 'map' ? 'list' : 'map'} size={20} color={Colors.primary} />
            <Text style={styles.toggleBtnText}>{viewMode === 'map' ? 'List View' : 'Map View'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollView}>
            {filterChips.map((chip) => {
              const isActive = selectedFilter === chip;
              return (
                <TouchableOpacity
                  key={chip}
                  style={[styles.chip, isActive && styles.chipActive]}
                  onPress={() => setSelectedFilter(chip)}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{chip}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* Selected Worker Bottom Card */}
      {viewMode === 'map' && selectedWorker && (
        <View style={styles.selectedWorkerCardContainer}>
          <View style={styles.selectedCard}>
            <TouchableOpacity 
              style={styles.closeCardBtn}
              onPress={() => setSelectedWorker(null)}
            >
              <Ionicons name="close" size={20} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
            
            <View style={styles.topRow}>
              <View style={styles.avatarContainer}>
                <Image source={{ uri: selectedWorker.avatar_url }} style={styles.avatar} />
                <View style={styles.verifiedIconContainer}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.gold} />
                </View>
              </View>
              <View style={styles.detailsContainer}>
                <View style={styles.nameRow}>
                  <Text style={styles.workerName}>{selectedWorker.name}</Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color={Colors.gold} />
                    <Text style={styles.ratingText}>{selectedWorker.rating}</Text>
                  </View>
                </View>
                <Text style={styles.workerSpecialty}>{selectedWorker.specialty}</Text>
                <Text style={[styles.distanceText, { marginTop: 4 }]}>{selectedWorker.distance} • {selectedWorker.rate}</Text>
              </View>
            </View>
            
            <TouchableOpacity style={styles.primaryBtn} onPress={() => handleViewProfile(selectedWorker)} activeOpacity={0.9}>
              <Text style={styles.primaryBtnText}>View Full Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    width: width,
    height: height,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.sm,
  },
  listSafeContainer: {
    flex: 1,
  },
  floatingHeaderArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.containerMobile,
    paddingTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  headerTitle: {
    ...Typography.headlineSm,
    color: Colors.onBackground,
    fontWeight: '800',
    textShadowColor: 'rgba(255, 255, 255, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    ...Shadow.sm,
  },
  toggleBtnText: {
    ...Typography.labelMd,
    color: Colors.primary,
    fontWeight: '700',
  },
  filterSection: {
    paddingVertical: Spacing.sm,
  },
  filterScrollView: {
    paddingHorizontal: Spacing.containerMobile,
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadow.sm,
  },
  chipActive: {
    backgroundColor: Colors.primary,
  },
  chipText: {
    ...Typography.labelMd,
    color: Colors.onSurfaceVariant,
  },
  chipTextActive: {
    color: Colors.onPrimary,
  },
  listContainer: {
    paddingHorizontal: Spacing.containerMobile,
    paddingBottom: 100, // accommodate bottom tab bar
    gap: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '22',
    ...Shadow.card,
  },
  selectedWorkerCardContainer: {
    position: 'absolute',
    bottom: 0, // Should be adjusted via safe area in a real scenario, but bottom tab adds its own offset
    left: 0,
    right: 0,
    padding: Spacing.md,
    paddingBottom: 80, // Pad above the bottom tab bar
    zIndex: 20,
  },
  selectedCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.lg,
  },
  closeCardBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    padding: 4,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.full,
  },
  markerContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    ...Shadow.md,
  },
  markerSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.surfaceContainerLowest,
    transform: [{ scale: 1.2 }],
  },
  topRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLow,
  },
  verifiedIconContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.full,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  workerName: {
    ...Typography.headlineSm,
    fontSize: 18,
    color: Colors.onSurface,
    fontWeight: '700',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    ...Typography.labelMd,
    color: Colors.onSurface,
    fontWeight: '700',
  },
  workerSpecialty: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  availabilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  badgeGreen: {
    backgroundColor: Colors.availableBg,
  },
  badgeOrange: {
    backgroundColor: Colors.busyBg,
  },
  availabilityText: {
    ...Typography.labelSm,
    fontSize: 10,
    fontWeight: '700',
  },
  textGreen: {
    color: Colors.availableGreen,
  },
  textOrange: {
    color: Colors.busyOrange,
  },
  distanceText: {
    ...Typography.labelSm,
    color: Colors.outline,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  actionBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '66',
  },
  actionBtnOutlineText: {
    ...Typography.labelMd,
    color: Colors.primary,
    fontWeight: '700',
  },
  actionBtnWhatsApp: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: '#25D366' + '10',
    borderWidth: 1,
    borderColor: '#25D366' + '40',
  },
  actionBtnWhatsAppText: {
    ...Typography.labelMd,
    color: '#075E54',
    fontWeight: '700',
  },
  primaryBtn: {
    width: '100%',
    height: 44,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    ...Typography.labelMd,
    color: Colors.onPrimary,
    fontWeight: '700',
  },
});
