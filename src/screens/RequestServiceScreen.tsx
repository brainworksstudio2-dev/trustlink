import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Dimensions, ActivityIndicator, Animated } from 'react-native';
import { Alert } from '../components/AppAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MapLibreMap, Camera, Marker, MapUnavailable, isMapLibreAvailable } from '../lib/mapLibreCompat';
import { MAP_STYLE_URL } from '../lib/mapStyle';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

const { width } = Dimensions.get('window');

export default function RequestServiceScreen() {
  const router = useRouter();
  const { worker_id, worker_name, worker_specialty } = useLocalSearchParams<{
    worker_id?: string;
    worker_name?: string;
    worker_specialty?: string;
  }>();

  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [location, setLocation] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [locationObj, setLocationObj] = useState<Location.LocationObject | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const confirmScale = useRef(new Animated.Value(0.6)).current;
  const confirmOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  useEffect(() => {
    if (isSubmitted) {
      Animated.parallel([
        Animated.spring(confirmScale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
        Animated.timing(confirmOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();
    }
  }, [isSubmitted]);

  const handleSubmit = async () => {
    if (description.trim().length === 0) {
      Alert.alert('Details Required', 'Please provide a short description of your needs so the professional can understand.');
      return;
    }
    if (location.trim().length === 0) {
      Alert.alert('Location Required', 'Please enter your service address or use your current location.');
      return;
    }

    setIsSubmitting(true);

    // GPS ("Use Current Location") already gives us coordinates. If the
    // customer instead typed their own address, geocode it so the worker
    // still gets a real destination to navigate to and track towards.
    let latitude = locationObj?.coords.latitude ?? null;
    let longitude = locationObj?.coords.longitude ?? null;
    if (latitude == null || longitude == null) {
      try {
        const geocoded = await Location.geocodeAsync(location);
        if (geocoded.length > 0) {
          latitude = geocoded[0].latitude;
          longitude = geocoded[0].longitude;
        }
      } catch (e) {
        // Geocoding failed (e.g. offline, or address too vague) — fall
        // back to submitting with the typed address text only.
      }
    }

    const { error } = await supabase.from('service_requests').insert({
      user_id: session?.user.id,
      worker_id: worker_id || null,
      service_type: worker_specialty || 'General',
      description: description,
      scheduled_date: date.toISOString(),
      location_address: location,
      latitude,
      longitude,
    });
    setIsSubmitting(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setIsSubmitted(true);
    }
  };

  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location access to use this feature.');
        return;
      }

      // Try getLastKnownPosition first for speed
      let loc = await Location.getLastKnownPositionAsync({});
      if (!loc) {
        // Fallback to current with balanced accuracy so it doesn't timeout
        loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      }

      if (loc) {
        setLocationObj(loc);
        try {
          let address = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          if (address && address.length > 0) {
            const first = address[0];
            const name = first.name ? `${first.name}, ` : '';
            const street = first.street ? `${first.street}, ` : '';
            const city = first.city || first.subregion || first.region || '';
            const formattedAddress = `${name}${street}${city}`.trim().replace(/,\s*$/, '');
            setLocation(formattedAddress || 'Current Location');
          } else {
            setLocation('Current Location');
          }
        } catch (err) {
          setLocation('Current Location');
        }
      }
    } catch (e) {
      Alert.alert('Location Error', 'Could not automatically fetch your location. Please type it manually.');
    } finally {
      setIsLocating(false);
    }
  };

  if (!session) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="lock-closed" size={48} color={Colors.outline} style={{ marginBottom: 16 }} />
        <Text style={styles.headerTitle}>Sign In Required</Text>
        <Text style={{ color: Colors.onSurfaceVariant, textAlign: 'center', marginHorizontal: 32, marginTop: 8, marginBottom: 24 }}>
          You must be logged in to submit service requests so you can track them in your booking history.
        </Text>
        <TouchableOpacity style={styles.continueButton} onPress={() => router.navigate('/profile')}>
          <Text style={styles.continueButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (isSubmitted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.confirmContainer}>
          <Animated.View style={{ opacity: confirmOpacity, transform: [{ scale: confirmScale }], alignItems: 'center' }}>
            <View style={styles.confirmIconCircle}>
              <Ionicons name="checkmark" size={40} color={Colors.onPrimary} />
            </View>
            <Text style={styles.confirmTitle}>Request Sent{worker_name ? ` to ${worker_name}` : ''}!</Text>
            <Text style={styles.confirmDesc}>
              They'll review your request and accept or decline it. You'll get a notification the moment they respond.
            </Text>
          </Animated.View>

          <View style={styles.confirmActions}>
            <TouchableOpacity style={styles.continueButton} onPress={() => router.replace('/requests')} activeOpacity={0.9}>
              <Text style={styles.continueButtonText}>View My Requests</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButtonFull} onPress={() => router.replace('/home')} activeOpacity={0.8}>
              <Text style={styles.backButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backCircle} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{worker_name ? `Book ${worker_name}` : 'Request Service'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {!!worker_specialty && (
          <View style={styles.specialtyBadge}>
            <Ionicons name="briefcase" size={14} color={Colors.primary} />
            <Text style={styles.specialtyBadgeText}>{worker_specialty}</Text>
          </View>
        )}

        <View style={styles.stepContainer}>
          <Text style={styles.label}>Describe your needs</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Provide as much detail as possible to help the professional understand your request (e.g. leaking sink faucet, custom walnut shelf mount)."
            placeholderTextColor={Colors.outline}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View style={styles.stepContainer}>
          <Text style={styles.label}>When do you need this?</Text>
          <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowPicker(true)} activeOpacity={0.8}>
            <Ionicons name="calendar-outline" size={24} color={Colors.primary} />
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={styles.dateLabel}>Selected Date & Time</Text>
              <Text style={styles.dateValue}>
                {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color={Colors.outline} />
          </TouchableOpacity>

          {showPicker && (
            <DateTimePicker
              value={date}
              mode="datetime"
              display="spinner"
              onChange={(event, selectedDate) => {
                setShowPicker(false);
                if (selectedDate) setDate(selectedDate);
              }}
              minimumDate={new Date()}
            />
          )}
        </View>

        <View style={styles.stepContainer}>
          <Text style={styles.label}>Service Location</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="location" size={20} color={Colors.outline} style={styles.inputIcon} />
            <TextInput
              style={styles.locationInput}
              placeholder="Enter service address..."
              placeholderTextColor={Colors.outline}
              value={location}
              onChangeText={setLocation}
            />
          </View>

          <TouchableOpacity style={styles.locationBtn} activeOpacity={0.8} onPress={handleUseCurrentLocation} disabled={isLocating}>
            {isLocating ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons name="locate" size={16} color={Colors.primary} />
            )}
            <Text style={styles.locationBtnText}>{isLocating ? 'Locating…' : 'Use Current Location'}</Text>
          </TouchableOpacity>

          <View style={styles.mapContainer}>
            {!isMapLibreAvailable ? (
              <MapUnavailable style={styles.mapImage} />
            ) : (
              <MapLibreMap style={styles.mapImage} mapStyle={MAP_STYLE_URL}>
                <Camera
                  center={locationObj ? [locationObj.coords.longitude, locationObj.coords.latitude] : [-0.187, 5.6037]}
                  zoom={locationObj ? 16 : 12}
                />
                {locationObj && (
                  <Marker lngLat={[locationObj.coords.longitude, locationObj.coords.latitude]}>
                    <View style={styles.pickedPinDot} />
                  </Marker>
                )}
              </MapLibreMap>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.continueButton, isSubmitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          activeOpacity={0.9}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={Colors.onPrimary} />
          ) : (
            <Text style={styles.continueButtonText}>Submit Request</Text>
          )}
        </TouchableOpacity>

        {/* Trust Info */}
        <View style={styles.trustInfoContainer}>
          <View style={styles.trustCard}>
            <View style={[styles.trustIconContainer, { backgroundColor: Colors.secondary + '15' }]}>
              <Ionicons name="chatbubbles" size={18} color={Colors.secondary} />
            </View>
            <View style={styles.trustTextContainer}>
              <Text style={styles.trustTitle}>Direct Communication</Text>
              <Text style={styles.trustDesc}>Chat or call the professional directly once your request is accepted.</Text>
            </View>
          </View>

          <View style={styles.trustCard}>
            <View style={[styles.trustIconContainer, { backgroundColor: Colors.primary + '15' }]}>
              <Ionicons name="star" size={18} color={Colors.primary} />
            </View>
            <View style={styles.trustTextContainer}>
              <Text style={styles.trustTitle}>Real Reviews Only</Text>
              <Text style={styles.trustDesc}>Ratings only come from clients with a completed booking.</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.containerMobile,
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    ...Typography.headlineSm,
    color: Colors.onSurface,
    fontWeight: '700',
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    paddingHorizontal: Spacing.containerMobile,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  specialtyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: Colors.primaryContainer + '10',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    marginBottom: Spacing.lg,
  },
  specialtyBadgeText: {
    ...Typography.labelSm,
    color: Colors.primary,
    fontWeight: '700',
  },
  stepContainer: {
    marginBottom: Spacing.xl,
  },
  label: {
    ...Typography.labelMd,
    fontSize: 16,
    color: Colors.onSurface,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  textArea: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outline,
    padding: Spacing.md,
    height: 140,
    ...Typography.bodyMd,
    color: Colors.onSurface,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '33',
    ...Shadow.card,
  },
  dateLabel: {
    ...Typography.labelSm,
    color: Colors.outline,
    marginBottom: 4,
  },
  dateValue: {
    ...Typography.bodyMd,
    color: Colors.onSurface,
    fontWeight: '700',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outline,
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  locationInput: {
    flex: 1,
    height: '100%',
    ...Typography.bodyMd,
    color: Colors.onSurface,
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.primary + '33',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  locationBtnText: {
    ...Typography.labelMd,
    color: Colors.primary,
    fontWeight: '700',
  },
  mapContainer: {
    width: '100%',
    height: 160,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '44',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  pickedPinDot: {
    width: 18,
    height: 18,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: Colors.onPrimary,
    ...Shadow.sm,
  },
  continueButton: {
    width: '100%',
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: Spacing.xl,
  },
  continueButtonText: {
    ...Typography.labelMd,
    color: Colors.onPrimary,
    fontWeight: '700',
  },
  backButtonText: {
    ...Typography.labelMd,
    color: Colors.primary,
    fontWeight: '700',
  },
  trustInfoContainer: {
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant + '15',
    paddingTop: Spacing.lg,
  },
  trustCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLowest,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '15',
    alignItems: 'center',
  },
  trustIconContainer: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  trustTextContainer: {
    flex: 1,
  },
  trustTitle: {
    ...Typography.labelMd,
    color: Colors.onSurface,
    fontWeight: '700',
  },
  trustDesc: {
    ...Typography.bodySm,
    color: Colors.outline,
    marginTop: 2,
    lineHeight: 18,
  },
  confirmContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  confirmIconCircle: {
    width: 84,
    height: 84,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    ...Shadow.lg,
  },
  confirmTitle: {
    ...Typography.headlineMd,
    color: Colors.onSurface,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  confirmDesc: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  confirmActions: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: Spacing.xl * 1.5,
  },
  backButtonFull: {
    width: '100%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
