import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, Image,
  TextInput, Switch, Dimensions, ActivityIndicator,
} from 'react-native';
import { Alert } from '../components/AppAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import {
  MapLibreMap,
  Camera,
  Marker,
  GeoJSONSource,
  Layer,
  MapUnavailable,
  isMapLibreAvailable,
  type CameraRef,
} from '../lib/mapLibreCompat';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import Toast from 'react-native-toast-message';
import { MAP_STYLE_URL } from '../lib/mapStyle';
import { createCircleGeoJSON } from '../lib/geo';

const { width } = Dimensions.get('window');

const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo';
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'dummy_preset';

// `category` must match ExploreScreen's CATEGORY_ICON keys exactly — it's
// what drives the map pin icon and the filter chips there.
const PROFESSIONS = [
  { id: 'plumbing', name: 'Plumbing', category: 'Plumbers', icon: 'water' },
  { id: 'electrical', name: 'Electrical', category: 'Electricians', icon: 'flash' },
  { id: 'photography', name: 'Photography', category: 'Photographers', icon: 'camera' },
  { id: 'carpentry', name: 'Carpentry', category: 'Carpenters', icon: 'hammer' },
  { id: 'cleaning', name: 'Cleaning', category: 'Cleanings', icon: 'sparkles' },
  { id: 'mechanics', name: 'Mechanics', category: 'Mechanics', icon: 'car' },
];



async function uploadToCloudinary(localUri: string, folder: string = 'trustlink'): Promise<string> {
  const formData = new FormData();
  const filename = localUri.split('/').pop() || 'image.jpg';
  const ext = filename.split('.').pop();
  const type = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

  formData.append('file', { uri: localUri, name: filename, type } as any);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', folder);

  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const response = await fetch(url, { method: 'POST', body: formData });
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error?.message || 'Cloudinary upload failed');
  }
  return data.secure_url as string;
}

export default function WorkerRegistrationScreen() {
  const router = useRouter();
  // Existing profile (edit mode)
  const [existingWorker, setExistingWorker] = useState<any | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Profile photo
  const [avatarLocalUri, setAvatarLocalUri] = useState<string | null>(null);
  // Keeps track of already-uploaded Cloudinary URL when not picking a new image
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(null);

  // Portfolio photos — a mix of already-uploaded URLs (http...) and freshly
  // picked local URIs, unified into one array; only local ones get uploaded
  // on submit.
  const MAX_PORTFOLIO_PHOTOS = 6;
  const [portfolioUris, setPortfolioUris] = useState<string[]>([]);

  // Profession
  const [selectedProfession, setSelectedProfession] = useState('carpentry');
  const [otherSpec, setOtherSpec] = useState('');
  const [bio, setBio] = useState('');
  const [rate, setRate] = useState('');
  const [experience, setExperience] = useState('');

  // Contact
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');

  // Social links
  const [linkedin, setLinkedin] = useState('');
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [portfolio, setPortfolio] = useState('');

  // Service radius
  const [radius, setRadius] = useState(15);

  // Location / Map
  const cameraRef = useRef<CameraRef>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationAddress, setLocationAddress] = useState('');
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);



  // Availability
  const [readyToWork, setReadyToWork] = useState(true);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // What to actually show in the photo preview: a freshly-picked local file
  // takes priority, otherwise fall back to the already-uploaded photo so
  // editing a profile doesn't look like the photo went missing.
  const displayAvatarUri = avatarLocalUri || existingAvatarUrl;

  // ─── Load existing profile on mount ─────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setIsLoadingProfile(false); return; }

      const { data } = await supabase
        .from('workers')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (data) {
        setExistingWorker(data);
        // Pre-fill all fields
        setExistingAvatarUrl(data.avatar_url || null);
        setPortfolioUris(data.portfolio_urls || []);
        // Match profession id from specialty name
        const matchedProf = PROFESSIONS.find(
          p => p.name === data.specialty || data.specialty?.startsWith(p.name)
        );
        if (matchedProf) setSelectedProfession(matchedProf.id);
        else setOtherSpec(data.specialty || '');
        setBio(data.about_text || '');
        setRate(data.rate ? data.rate.replace('/hr', '') : '');
        setExperience(data.experience ? data.experience.replace(' Years', '') : '');
        setPhoneNumber(data.phone_number || session.user.user_metadata?.phone || '');
        setWhatsappNumber(data.whatsapp_number || '');
        setLinkedin(data.linkedin_url || '');
        setInstagram(data.instagram_url || '');
        setTiktok(data.tiktok_url || '');
        setPortfolio(data.portfolio_url || '');
        setReadyToWork(data.available ?? true);
        if (data.latitude && data.longitude) {
          setUserLocation({ latitude: data.latitude, longitude: data.longitude });
          setLocationAddress(data.location_name || '');
        }
      } else if (session.user.user_metadata?.phone) {
        // Fresh registration — reuse the phone number already on the account.
        setPhoneNumber(session.user.user_metadata.phone);
      }
      setIsLoadingProfile(false);
    })();
  }, []);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const pickImage = async (onPicked: (uri: string) => void) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to upload images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      onPicked(result.assets[0].uri);
    }
  };

  const addPortfolioPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to upload images.');
      return;
    }
    const remainingSlots = MAX_PORTFOLIO_PHOTOS - portfolioUris.length;
    if (remainingSlots <= 0) {
      Alert.alert('Limit Reached', `You can showcase up to ${MAX_PORTFOLIO_PHOTOS} photos.`);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPortfolioUris((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, MAX_PORTFOLIO_PHOTOS));
    }
  };

  const removePortfolioPhoto = (index: number) => {
    setPortfolioUris((prev) => prev.filter((_, i) => i !== index));
  };

  const fetchLocation = async () => {
    setIsFetchingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is needed to set your service area.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setUserLocation(coords);
      cameraRef.current?.easeTo({ center: [coords.longitude, coords.latitude], zoom: 12, duration: 1000 });

      const addresses = await Location.reverseGeocodeAsync(coords);
      if (addresses.length > 0) {
        const a = addresses[0];
        setLocationAddress(`${a.city || a.subregion || ''}, ${a.region || a.country || ''}`.trim().replace(/^,\s*/, ''));
      }
    } catch (e) {
      Alert.alert('Error', 'Could not fetch your location. Please try again.');
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const handleSubmit = async () => {
    const isEditing = !!existingWorker;

    // For new registrations, photo + ID are required.
    // For edits, we keep existing files if no new one is picked.
    if (!isEditing && !avatarLocalUri) {
      Alert.alert('Missing Photo', 'Please upload a professional profile photo.');
      return;
    }

    if (!phoneNumber.trim()) {
      Alert.alert('Phone Number Required', 'Clients need a number to reach you — please add at least one.');
      return;
    }

    if (!userLocation) {
      Alert.alert('Service Area Required', 'Please set your service location on the map.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Please log in first.');

      Toast.show({ type: 'info', text1: 'Uploading photos…', position: 'top', visibilityTime: 3000 });

      // Only re-upload if a new local file was picked
      const avatarUrl = avatarLocalUri
        ? await uploadToCloudinary(avatarLocalUri, 'trustlink/avatars')
        : existingAvatarUrl;

      // Same idea for the portfolio — only upload the entries that are still
      // local files; anything already an https URL was uploaded previously.
      const portfolioUrls = await Promise.all(
        portfolioUris.map((uri) => (uri.startsWith('http') ? Promise.resolve(uri) : uploadToCloudinary(uri, 'trustlink/portfolio')))
      );

      Toast.show({
        type: 'info',
        text1: isEditing ? 'Saving changes…' : 'Creating your profile…',
        position: 'top',
        visibilityTime: 3000,
      });

      const workerData = {
        user_id: session.user.id,
        name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Unknown',
        specialty: otherSpec || PROFESSIONS.find(p => p.id === selectedProfession)?.name || selectedProfession,
        category: PROFESSIONS.find(p => p.id === selectedProfession)?.category || selectedProfession,
        avatar_url: avatarUrl,
        portfolio_urls: portfolioUrls,
        identity_document_url: existingWorker?.identity_document_url || null,
        available: readyToWork,
        availability_text: readyToWork ? 'Available Now' : 'Currently Unavailable',
        rate: rate ? `${rate}/hr` : null,
        experience: experience ? `${experience} Years` : '0 Years',
        about_text: bio || null,
        phone_number: phoneNumber.trim(),
        whatsapp_number: whatsappNumber.trim() || phoneNumber.trim(),
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        location_name: locationAddress || 'Ghana',
        linkedin_url: linkedin || null,
        instagram_url: instagram || null,
        tiktok_url: tiktok || null,
        portfolio_url: portfolio || null,
      };

      if (isEditing) {
        // UPDATE existing row
        const { error } = await supabase
          .from('workers')
          .update(workerData)
          .eq('user_id', session.user.id);
        if (error) throw error;
      } else {
        // INSERT new row
        const { error } = await supabase.from('workers').insert([workerData]);
        if (error) throw error;
      }

      // Keep the account's own phone number in sync so it doesn't have to be
      // entered twice if they ever edit their account details separately.
      if (session.user.user_metadata?.phone !== workerData.phone_number) {
        await supabase.auth.updateUser({ data: { phone: workerData.phone_number } });
      }

      setIsSubmitting(false);
      Toast.show({
        type: 'success',
        text1: isEditing ? 'Profile Updated! ✅' : 'Registration Complete! 🎉',
        text2: isEditing ? 'Your changes are saved.' : 'Your profile is live. Clients can now find you!',
        position: 'top',
        visibilityTime: 4000,
      });
      setTimeout(() => router.navigate('/home'), 2000);
    } catch (err: any) {
      setIsSubmitting(false);
      Alert.alert(
        isEditing ? 'Update Failed' : 'Registration Failed',
        err.message || 'Something went wrong. Please try again.'
      );
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{existingWorker ? 'Edit Profile' : 'Worker Portal'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <View style={styles.introBlock}>
          <Text style={styles.introTitle}>Earn as a Trust Certified Pro</Text>
          <Text style={styles.introDesc}>Join elite local contractors. Complete verification to unlock premium instant bookings.</Text>
        </View>

        {/* ── Step 1: Profile Photo ── */}
        <View style={styles.sectionCard}>
          <SectionHeader icon="camera" title="Profile Photo" />
          <TouchableOpacity
            style={styles.photoContainer}
            onPress={() => pickImage(setAvatarLocalUri)}
            activeOpacity={0.9}
          >
            {displayAvatarUri ? (
              <Image source={{ uri: displayAvatarUri }} style={styles.photoAvatar} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera-outline" size={36} color={Colors.outline} />
                <Text style={styles.photoPlaceholderText}>Tap to upload your photo</Text>
              </View>
            )}
            {!!displayAvatarUri && (
              <View style={styles.editBadge}>
                <Ionicons name="pencil" size={14} color={Colors.onPrimary} />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.photoTipText}>
            {existingAvatarUrl && !avatarLocalUri
              ? 'Using your existing profile photo. Tap to replace it.'
              : 'Clear, well-lit face photos increase client trust by 80%.'}
          </Text>
        </View>

        {/* ── Contact Numbers ── */}
        <View style={styles.sectionCard}>
          <SectionHeader icon="call" title="Contact Number" />
          <Text style={styles.sectionDesc}>This is how clients reach you to call or book. Add a WhatsApp number too if it's different.</Text>
          <FormField
            label="Phone Number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="e.g. +233 55 123 4567"
            keyboardType="phone-pad"
          />
          <FormField
            label="WhatsApp Number (optional — same as phone if left blank)"
            value={whatsappNumber}
            onChangeText={setWhatsappNumber}
            placeholder="e.g. +233 55 123 4567"
            keyboardType="phone-pad"
          />
        </View>

        {/* ── Portfolio ── */}
        <View style={styles.sectionCard}>
          <SectionHeader icon="images" title="Portfolio (Optional)" />
          <Text style={styles.sectionDesc}>Show off real photos of your past work. Clients trust profiles with real examples.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.portfolioScroll}>
            {portfolioUris.map((uri, index) => (
              <View key={uri + index} style={styles.portfolioThumbWrap}>
                <Image source={{ uri }} style={styles.portfolioThumb} />
                <TouchableOpacity style={styles.portfolioRemoveBtn} onPress={() => removePortfolioPhoto(index)}>
                  <Ionicons name="close" size={12} color={Colors.onPrimary} />
                </TouchableOpacity>
              </View>
            ))}
            {portfolioUris.length < MAX_PORTFOLIO_PHOTOS && (
              <TouchableOpacity style={styles.portfolioAddTile} onPress={addPortfolioPhotos}>
                <Ionicons name="add" size={24} color={Colors.outline} />
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* ── Step 2: Profession ── */}
        <View style={styles.sectionCard}>
          <SectionHeader icon="briefcase" title="Your Profession" />
          <View style={styles.professionGrid}>
            {PROFESSIONS.map((prof) => {
              const isSelected = selectedProfession === prof.id;
              return (
                <TouchableOpacity
                  key={prof.id}
                  style={[styles.professionBtn, isSelected && styles.professionBtnSelected]}
                  onPress={() => setSelectedProfession(prof.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={prof.icon as any} size={18} color={isSelected ? Colors.primary : Colors.outline} />
                  <Text style={[styles.professionBtnText, isSelected && styles.professionBtnTextSelected]}>{prof.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <FormField label="Other / Specialization (optional)" value={otherSpec} onChangeText={setOtherSpec} placeholder="e.g. Smart Home Installation" />
          <FormField label="About You" value={bio} onChangeText={setBio} placeholder="Describe your skills and experience…" multiline />
          <FormField label="Hourly Rate (GH₵) (Optional)" value={rate} onChangeText={setRate} placeholder="e.g. 50" keyboardType="numeric" />
          <FormField label="Years of Experience (Optional)" value={experience} onChangeText={setExperience} placeholder="e.g. 5" keyboardType="numeric" />
        </View>

        {/* ── Step 3: Service Area Map ── */}
        <View style={styles.sectionCard}>
          <SectionHeader icon="map" title="Service Area" />
          <Text style={styles.sectionDesc}>Tap the button below to set your work location. Clients near you will see your profile.</Text>

          {userLocation && !isMapLibreAvailable ? (
            <View style={styles.mapContainer}>
              <MapUnavailable style={styles.map} />
            </View>
          ) : userLocation ? (
            <View style={styles.mapContainer}>
              <MapLibreMap
                style={styles.map}
                mapStyle={MAP_STYLE_URL}
                onPress={(e: any) => {
                  const [lng, lat] = e.nativeEvent.lngLat;
                  const coords = { latitude: lat, longitude: lng };
                  setUserLocation(coords);
                  Location.reverseGeocodeAsync(coords).then(addresses => {
                    if (addresses.length > 0) {
                      const a = addresses[0];
                      setLocationAddress(`${a.city || a.subregion || ''}, ${a.region || a.country || ''}`.trim().replace(/^,\s*/, ''));
                    }
                  });
                }}
              >
                <Camera ref={cameraRef} initialViewState={{ center: [userLocation.longitude, userLocation.latitude], zoom: 12 }} />
                <Marker lngLat={[userLocation.longitude, userLocation.latitude]}>
                  <View style={styles.myLocationDot} />
                </Marker>
                <GeoJSONSource
                  id="serviceRadiusSource"
                  data={createCircleGeoJSON(userLocation, radius * 1609.34)}
                >
                  <Layer
                    id="serviceRadiusFill"
                    type="fill"
                    paint={{ 'fill-color': Colors.primary, 'fill-opacity': 0.08 }}
                  />
                  <Layer
                    id="serviceRadiusOutline"
                    type="line"
                    paint={{ 'line-color': Colors.primary, 'line-width': 2, 'line-opacity': 0.6 }}
                  />
                </GeoJSONSource>
              </MapLibreMap>
            </View>
          ) : (
            <View style={styles.mapPlaceholder}>
              <Ionicons name="map-outline" size={40} color={Colors.outline} />
              <Text style={styles.mapPlaceholderText}>Map will appear here once you set your location</Text>
            </View>
          )}

          {locationAddress ? (
            <View style={styles.locationBadge}>
              <Ionicons name="location" size={14} color={Colors.primary} />
              <Text style={styles.locationBadgeText}>{locationAddress}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.locationBtn} onPress={fetchLocation} disabled={isFetchingLocation} activeOpacity={0.85}>
            {isFetchingLocation ? (
              <ActivityIndicator color={Colors.onPrimary} size="small" />
            ) : (
              <Ionicons name="navigate" size={16} color={Colors.onPrimary} />
            )}
            <Text style={styles.locationBtnText}>{isFetchingLocation ? 'Fetching…' : 'Use My Current Location'}</Text>
          </TouchableOpacity>

          {/* Service Radius Selector */}
          <View style={styles.radiusSection}>
            <Text style={styles.radiusLabel}>Service Radius</Text>
            <View style={styles.radiusBtns}>
              {[5, 10, 15, 25, 30].map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.radiusBtn, radius === r && styles.radiusBtnSelected]}
                  onPress={() => setRadius(r)}
                >
                  <Text style={[styles.radiusBtnText, radius === r && styles.radiusBtnTextSelected]}>{r}mi</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ── Step 4: Online Presence ── */}
        <View style={styles.sectionCard}>
          <SectionHeader icon="globe-outline" title="Online Presence (Optional)" />
          <FormField label="LinkedIn Profile" value={linkedin} onChangeText={setLinkedin} placeholder="https://linkedin.com/in/..." autoCapitalize="none" />
          <FormField label="Instagram" value={instagram} onChangeText={setInstagram} placeholder="https://instagram.com/..." autoCapitalize="none" />
          <FormField label="TikTok" value={tiktok} onChangeText={setTiktok} placeholder="https://tiktok.com/@..." autoCapitalize="none" />
          <FormField label="Portfolio Website" value={portfolio} onChangeText={setPortfolio} placeholder="https://myportfolio.com" autoCapitalize="none" />
        </View>



        {/* ── Step 6: Availability ── */}
        <View style={styles.sectionCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <View style={[styles.iconCircle, { backgroundColor: Colors.secondary + '15' }]}>
                <Ionicons name="calendar-sharp" size={18} color={Colors.secondary} />
              </View>
              <View style={styles.toggleText}>
                <Text style={styles.toggleTitle}>Available Now</Text>
                <Text style={styles.toggleDesc}>Appear in nearby client searches immediately.</Text>
              </View>
            </View>
            <Switch
              value={readyToWork}
              onValueChange={setReadyToWork}
              trackColor={{ false: Colors.outlineVariant, true: Colors.secondary }}
              thumbColor={Colors.onPrimary}
            />
          </View>
          {readyToWork && (
            <View style={styles.greenBanner}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.secondary} />
              <Text style={styles.greenBannerText}>Clients can now request your services immediately.</Text>
            </View>
          )}
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[styles.completeBtn, isSubmitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          activeOpacity={0.9}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={Colors.onPrimary} />
          ) : (
            <>
              <Text style={styles.completeBtnText}>{existingWorker ? 'Save Changes' : 'Complete Registration'}</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.onPrimary} />
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.termsText}>
          By clicking complete, you agree to our{' '}
          <Text style={styles.termsLink}>Professional Terms of Service</Text>.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon as any} size={18} color={Colors.primary} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function FormField({
  label, value, onChangeText, placeholder, multiline, keyboardType, autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
}) {
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.textInput, multiline && { height: 90, textAlignVertical: 'top', paddingTop: 10 }]}
        placeholder={placeholder}
        placeholderTextColor={Colors.outline}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize || 'sentences'}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.containerMobile,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant + '15',
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  headerTitle: { ...Typography.headlineSm, color: Colors.onSurface, fontWeight: '700' },
  container: { paddingHorizontal: Spacing.containerMobile, paddingTop: Spacing.lg, paddingBottom: Spacing.xl * 2, gap: Spacing.lg },
  introBlock: { marginBottom: Spacing.sm },
  introTitle: { ...Typography.headlineMd, fontSize: 22, color: Colors.onBackground, fontWeight: '800' },
  introDesc: { ...Typography.bodySm, color: Colors.onSurfaceVariant, opacity: 0.8, marginTop: 6, lineHeight: 20 },
  sectionCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '22',
    ...Shadow.card,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  sectionDesc: { ...Typography.bodySm, color: Colors.onSurfaceVariant, lineHeight: 18, marginBottom: Spacing.md },
  iconCircle: {
    width: 32, height: 32, borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer + '10', alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { ...Typography.labelMd, fontSize: 16, color: Colors.onSurface, fontWeight: '700' },
  // Photo
  photoContainer: {
    alignSelf: 'center',
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  photoPlaceholder: {
    width: 120, height: 120, borderRadius: Radius.full,
    borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  photoPlaceholderText: { ...Typography.labelSm, color: Colors.outline, textAlign: 'center', fontSize: 10, maxWidth: 90 },
  photoAvatar: { width: 120, height: 120, borderRadius: Radius.full, borderWidth: 3, borderColor: Colors.primary + '40' },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: Colors.primary, width: 30, height: 30,
    borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center',
  },
  photoTipText: { ...Typography.bodySm, color: Colors.outline, textAlign: 'center', marginTop: 4 },
  // Portfolio
  portfolioScroll: { gap: Spacing.sm, paddingVertical: 4 },
  portfolioThumbWrap: { position: 'relative' },
  portfolioThumb: { width: 84, height: 84, borderRadius: Radius.md, backgroundColor: Colors.surfaceContainerLow },
  portfolioRemoveBtn: {
    position: 'absolute', top: -6, right: -6,
    width: 20, height: 20, borderRadius: Radius.full,
    backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center',
  },
  portfolioAddTile: {
    width: 84, height: 84, borderRadius: Radius.md,
    borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center',
  },
  // Profession
  professionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  professionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surfaceContainerLow, borderWidth: 2, borderColor: 'transparent',
    borderRadius: Radius.md, height: 44, paddingHorizontal: Spacing.md,
  },
  professionBtnSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryContainer + '10' },
  professionBtnText: { ...Typography.labelSm, color: Colors.onSurfaceVariant },
  professionBtnTextSelected: { color: Colors.primary, fontWeight: '700' },
  // Form Fields
  inputContainer: { marginBottom: Spacing.md },
  inputLabel: { ...Typography.labelSm, color: Colors.onSurfaceVariant, fontWeight: '600', marginBottom: 6 },
  textInput: {
    borderWidth: 1, borderColor: Colors.outlineVariant, borderRadius: Radius.md,
    height: 46, paddingHorizontal: Spacing.md, ...Typography.bodyMd, color: Colors.onSurface,
  },
  // Map
  mapContainer: { borderRadius: Radius.lg, overflow: 'hidden', marginBottom: Spacing.md },
  map: { width: '100%', height: 220 },
  myLocationDot: {
    width: 18,
    height: 18,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: Colors.onPrimary,
    ...Shadow.sm,
  },
  mapPlaceholder: {
    height: 180, borderRadius: Radius.lg, borderWidth: 1, borderStyle: 'dashed',
    borderColor: Colors.outlineVariant, backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: Spacing.md,
  },
  mapPlaceholderText: { ...Typography.bodySm, color: Colors.outline, textAlign: 'center', maxWidth: '70%' },
  locationBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primaryContainer + '10', borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: Spacing.sm,
  },
  locationBadgeText: { ...Typography.labelSm, color: Colors.primary, fontWeight: '600' },
  locationBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: Radius.full, height: 46,
    marginBottom: Spacing.lg,
  },
  locationBtnText: { ...Typography.labelMd, color: Colors.onPrimary, fontWeight: '700' },
  radiusSection: { borderTopWidth: 1, borderTopColor: Colors.outlineVariant + '20', paddingTop: Spacing.md },
  radiusLabel: { ...Typography.labelMd, color: Colors.onSurface, fontWeight: '700', marginBottom: Spacing.sm },
  radiusBtns: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  radiusBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLow,
  },
  radiusBtnSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryContainer + '10' },
  radiusBtnText: { ...Typography.labelSm, color: Colors.onSurfaceVariant },
  radiusBtnTextSelected: { color: Colors.primary, fontWeight: '700' },
  // ID Verification
  requiredBadge: { backgroundColor: Colors.goldBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  requiredBadgeText: { ...Typography.labelSm, fontSize: 9, color: Colors.gold, fontWeight: '700' },
  idGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  idCard: {
    width: (width - Spacing.containerMobile * 2 - Spacing.md * 2 - Spacing.sm) / 2,
    backgroundColor: Colors.surfaceContainerLow, borderWidth: 2, borderColor: 'transparent',
    borderRadius: Radius.lg, padding: Spacing.md, gap: 4, position: 'relative',
  },
  idCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryContainer + '08' },
  idCardName: { ...Typography.labelSm, color: Colors.onSurface, fontWeight: '700', fontSize: 12 },
  idCardNameSelected: { color: Colors.primary },
  idCardDesc: { ...Typography.bodySm, color: Colors.outline, fontSize: 10, lineHeight: 14 },
  idCardCheck: { position: 'absolute', top: 6, right: 6 },
  uploadDocBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.primary + '40', borderStyle: 'dashed',
  },
  uploadDocBtnDone: { borderStyle: 'solid', borderColor: Colors.secondary + '60', backgroundColor: Colors.secondary + '05' },
  uploadDocInfo: { flex: 1 },
  uploadDocTitle: { ...Typography.labelMd, color: Colors.onSurface, fontWeight: '700' },
  uploadDocSub: { ...Typography.bodySm, color: Colors.outline, marginTop: 2 },
  docThumbnail: { width: 50, height: 50, borderRadius: Radius.sm, backgroundColor: Colors.surfaceContainerHigh },
  // Availability
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleInfo: { flexDirection: 'row', gap: Spacing.md, flex: 1 },
  toggleText: { flex: 1 },
  toggleTitle: { ...Typography.labelMd, color: Colors.onSurface, fontWeight: '700' },
  toggleDesc: { ...Typography.bodySm, color: Colors.outline, marginTop: 2, lineHeight: 18 },
  greenBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.secondaryContainer + '15', padding: Spacing.sm,
    borderRadius: Radius.md, marginTop: Spacing.md,
  },
  greenBannerText: { ...Typography.labelSm, color: Colors.onSecondaryContainer, fontWeight: '600', flex: 1 },
  // Submit
  completeBtn: {
    width: '100%', height: 54, backgroundColor: Colors.primary,
    borderRadius: Radius.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4, marginTop: Spacing.md,
  },
  completeBtnText: { ...Typography.labelMd, color: Colors.onPrimary, fontWeight: '700' },
  termsText: { ...Typography.bodySm, color: Colors.outline, textAlign: 'center', lineHeight: 18, marginTop: Spacing.sm },
  termsLink: { color: Colors.primary, fontWeight: '600' },
});
