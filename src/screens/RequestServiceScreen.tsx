import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Image, Alert, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import MapView, { Marker, Region } from 'react-native-maps';
import Toast from 'react-native-toast-message';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

type RequestServiceScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'RequestService'>;
  route: RouteProp<RootStackParamList, 'RequestService'>;
};

const { width } = Dimensions.get('window');

const SERVICE_TYPES = [
  { id: 'plumbing', name: 'Plumbing', icon: 'water' },
  { id: 'electrical', name: 'Electrical', icon: 'flash' },
  { id: 'photography', name: 'Photography', icon: 'camera' },
  { id: 'carpentry', name: 'Carpentry', icon: 'hammer' },
  { id: 'delivery', name: 'Delivery', icon: 'bicycle' },
  { id: 'pet', name: 'Pet Care', icon: 'paw' },
  { id: 'home', name: 'Home Repair', icon: 'build' },
  { id: 'other', name: 'Other', icon: 'ellipsis-horizontal' },
];

export default function RequestServiceScreen({ navigation, route }: RequestServiceScreenProps) {
  const { worker_id, worker_name } = route.params || {};

  const [step, setStep] = useState(worker_id ? 2 : 1);
  const [serviceType, setServiceType] = useState('plumbing');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [location, setLocation] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [locationObj, setLocationObj] = useState<Location.LocationObject | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  const handleContinue = async () => {
    if (step < 4) {
      if (step === 2 && description.trim().length === 0) {
        Alert.alert('Details Required', 'Please provide a short description of your needs so our professionals can understand.');
        return;
      }
      setStep(step + 1);
    } else {
      // Final submission
      setIsSubmitting(true);
      const { error } = await supabase.from('service_requests').insert({
        user_id: session?.user.id,
        worker_id: worker_id || null,
        service_type: serviceType,
        description: description,
        scheduled_date: date.toISOString(),
        location_address: location,
        latitude: locationObj?.coords.latitude || null,
        longitude: locationObj?.coords.longitude || null,
      });
      setIsSubmitting(false);

      // If direct booking, send notification to the worker
      if (worker_id && !error) {
        const { data: workerData } = await supabase.from('workers').select('user_id').eq('id', worker_id).single();
        
        if (workerData?.user_id) {
          await supabase.from('notifications').insert({
            user_id: workerData.user_id,
            title: 'New Booking Request!',
            message: `You have received a new booking for ${date.toLocaleDateString()}.`,
            type: 'booking_request'
          });
        }
      }

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Toast.show({
          type: 'success',
          text1: 'Request Submitted! 🎉',
          text2: 'We are matching you with certified professionals now.',
          position: 'top',
          visibilityTime: 4000,
        });
        setStep(1);
        setDescription('');
        setLocation('');
        navigation.navigate('Main');
      }
    }
  };

  const handleBack = () => {
    const minStep = worker_id ? 2 : 1;
    if (step > minStep) {
      setStep(step - 1);
    }
  };

  const totalSteps = worker_id ? 3 : 4;
  const currentStepDisplay = worker_id ? step - 1 : step;
  const progressPercent = (currentStepDisplay / totalSteps) * 100;

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.label}>What service do you need?</Text>
            <View style={styles.grid}>
              {SERVICE_TYPES.map((type) => {
                const isSelected = serviceType === type.id;
                return (
                  <TouchableOpacity
                    key={type.id}
                    style={[styles.serviceCard, isSelected && styles.serviceCardSelected]}
                    onPress={() => setServiceType(type.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.serviceIconContainer, isSelected && styles.serviceIconContainerSelected]}>
                      <Ionicons name={type.icon as any} size={24} color={isSelected ? Colors.primary : Colors.outline} />
                    </View>
                    <Text style={[styles.serviceCardText, isSelected && styles.serviceCardTextSelected]}>{type.name}</Text>
                    {isSelected && (
                      <View style={styles.checkIcon}>
                        <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.label}>Describe your needs...</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Provide as much detail as possible to help professionals understand your request (e.g. leaking sink faucet, custom walnut shelf mount)."
              placeholderTextColor={Colors.outline}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.label}>When do you need this?</Text>
            
            <TouchableOpacity 
              style={styles.datePickerBtn}
              onPress={() => setShowPicker(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={24} color={Colors.primary} />
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <Text style={styles.dateLabel}>Selected Date & Time</Text>
                <Text style={styles.dateValue}>
                  {date.toLocaleDateString()} at {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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
        );

      case 4:
        return (
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

            <TouchableOpacity 
              style={styles.locationBtn} 
              activeOpacity={0.8}
              onPress={async () => {
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
                        longitude: loc.coords.longitude
                      });
                      if (address && address.length > 0) {
                        const first = address[0];
                        const name = first.name ? `${first.name}, ` : '';
                        const street = first.street ? `${first.street}, ` : '';
                        const city = first.city || first.subregion || first.region || '';
                        const formattedAddress = `${name}${street}${city}`.trim().replace(/,\s*$/, "");
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
                }
              }}
            >
              <Ionicons name="locate" size={16} color={Colors.primary} />
              <Text style={styles.locationBtnText}>Use Current Location</Text>
            </TouchableOpacity>

            <View style={styles.mapContainer}>
              <MapView 
                style={styles.mapImage} 
                region={locationObj ? {
                  latitude: locationObj.coords.latitude,
                  longitude: locationObj.coords.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                } : {
                  latitude: 40.7128,
                  longitude: -74.0060,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421,
                }}
              >
                {locationObj && (
                  <Marker coordinate={{ latitude: locationObj.coords.latitude, longitude: locationObj.coords.longitude }} />
                )}
              </MapView>
              <View style={styles.mapBadge}>
                <Ionicons name="shield-checkmark" size={12} color={Colors.secondary} />
                <Text style={styles.mapBadgeText}>Verified Zone</Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
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
        <TouchableOpacity style={styles.continueButton} onPress={() => navigation.navigate('Main', { screen: 'Profile' } as any)}>
          <Text style={styles.continueButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header bar */}
      <View style={styles.header}>
        {step > (worker_id ? 2 : 1) ? (
          <TouchableOpacity style={styles.backCircle} onPress={handleBack}>
            <Ionicons name="arrow-back" size={20} color={Colors.onSurface} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.backCircle} onPress={() => navigation.goBack()}>
             <Ionicons name="arrow-back" size={20} color={Colors.onSurface} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{worker_name ? `Book ${worker_name}` : 'Request Service'}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Progress Track */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={styles.progressText}>Step {currentStepDisplay} of {totalSteps}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Step Form Field Content */}
        {renderStepContent()}

        {/* Action Button Row */}
        <View style={styles.actionRow}>
          {step > (worker_id ? 2 : 1) ? (
            <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.8}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity 
            style={[styles.continueButton, step === (worker_id ? 2 : 1) && { width: '100%' }, isSubmitting && { opacity: 0.7 }]} 
            onPress={handleContinue} 
            activeOpacity={0.9}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.onPrimary} />
            ) : (
              <>
                <Text style={styles.continueButtonText}>
                  {step === 4 ? 'Submit Request' : 'Continue'}
                </Text>
                {step < 4 && <Ionicons name="arrow-forward" size={16} color={Colors.onPrimary} />}
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Security Bento Trust Info */}
        <View style={styles.trustInfoContainer}>
          <View style={styles.trustCard}>
            <View style={[styles.trustIconContainer, { backgroundColor: Colors.secondary + '15' }]}>
              <Ionicons name="shield-checkmark" size={18} color={Colors.secondary} />
            </View>
            <View style={styles.trustTextContainer}>
              <Text style={styles.trustTitle}>Secure & Verified</Text>
              <Text style={styles.trustDesc}>All TrustLink providers undergo a rigorous background check.</Text>
            </View>
          </View>

          <View style={styles.trustCard}>
            <View style={[styles.trustIconContainer, { backgroundColor: Colors.primary + '15' }]}>
              <Ionicons name="lock-closed" size={18} color={Colors.primary} />
            </View>
            <View style={styles.trustTextContainer}>
              <Text style={styles.trustTitle}>Insurance Protected</Text>
              <Text style={styles.trustDesc}>Every booking is covered by our $1M satisfaction protection.</Text>
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
  progressContainer: {
    paddingHorizontal: Spacing.containerMobile,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant + '15',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radius.full,
    marginRight: Spacing.md,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
  progressText: {
    ...Typography.labelSm,
    color: Colors.outline,
    fontWeight: '600',
  },
  container: {
    paddingHorizontal: Spacing.containerMobile,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  serviceCard: {
    width: (width - Spacing.containerMobile * 2 - Spacing.md) / 2,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.outlineVariant + '33',
    ...Shadow.card,
  },
  serviceCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryContainer + '08',
  },
  serviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  serviceIconContainerSelected: {
    backgroundColor: Colors.primaryContainer + '15',
  },
  serviceCardText: {
    ...Typography.labelMd,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  serviceCardTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  checkIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  textArea: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outline,
    padding: Spacing.md,
    height: 180,
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
    resizeMode: 'cover',
  },
  mapBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  mapBadgeText: {
    ...Typography.labelSm,
    color: Colors.secondary,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginVertical: Spacing.xl,
  },
  backButton: {
    width: '30%',
    height: 48,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    ...Typography.labelMd,
    color: Colors.primary,
    fontWeight: '700',
  },
  continueButton: {
    flex: 1,
    height: 48,
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
  },
  continueButtonText: {
    ...Typography.labelMd,
    color: Colors.onPrimary,
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
});
