import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Dimensions, SafeAreaView, Linking, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

type WorkerProfileScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'WorkerProfile'>;
  route: RouteProp<RootStackParamList, 'WorkerProfile'>;
};

const { width } = Dimensions.get('window');

const PORTFOLIO_IMAGES = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDIf0WfuG6b4CLuCkzekld1mh32Il9Gh0zEeDKHpVmwbWovpsEZDVXAQD56FB0c2r4S9We6aG8eG2kki_sphanDatoW8bg3PcotuPpT3WYC8U6EBO-bhmN-HkIzB7qy3wsuGoMb-o7Zf5J_aUKnQkNzbWWif2Xeb2DTewMm6UvewreNgfRdUXl7mDjAoCpAihIV2Nv-8DHNeCQLHhWegoMtvYjpR3xCwHqTN0wDs0PtoDGNa-FrrtnDIMdDKi2L9-RrB-ie_-L9AEE',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCwyR9BPTcC4jiDi2D6-hZrDu5QxuhY_VJi5xaiHofrPcyl_3c5DYMnma4EmlsCKx8MK2gEvrcKD8GDeWFc6lalxtNXLrDzwyC-C0Zp2fCVc51auIEvVLI_7BoqlcbGn0eoD6T4r5GUXaqjNh3FmMDaRit1Pu2fW3FnLF7E3mNLsi9zFqLhHGCOj9xfEy7mnjk8agaLPkIDViA2StBB7emMJ0Z0dJ1oQHUtBkGWa6J6KMbnjtPq4FQp9sZKyzv3NktLYw6WTlJrMS0',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDXbE8RwO-cLP1TNqz8b7QLa8jhBE2-pyfKq-AoQaHrCH4-VSzCb-zcNCIzh3jfOPEqg92sFq7pKcZqRAeggqnndRlx8oBw0jz28DV5Jd5ma4i9zBFJvcdhn_qUw2eZegjqFb8Q1wyu_pN3vQZ1jRUoPsiM10zBDV1vsjrvBYhwGVeoykOZ4Yf3q23MEXEKkH-Bf92WQnprmyMswm1IFxMpT6NxyFgJx4vwMZdLr7iix-gM2AOmn8dbpsMyZ7YF1uCvzXNTcvaMaqA',
];

const REVIEWS = [
  {
    id: '1',
    author: 'Elena Martinez',
    date: '2 days ago',
    rating: 5,
    avatarInitials: 'EM',
    content: 'Julian was incredibly professional. He arrived exactly on time and finished the work ahead of schedule. The finish is absolutely flawless. Highly recommend!',
  },
  {
    id: '2',
    author: 'Thomas Reed',
    date: '1 week ago',
    rating: 4,
    avatarInitials: 'TR',
    content: 'Great work on our installation. He was very clear about the pricing and the materials needed. A true expert with great credentials.',
  },
];

export default function WorkerProfileScreen({ navigation, route }: WorkerProfileScreenProps) {
  const { worker } = route.params;

  const [session, setSession] = useState<Session | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from('reviews')
      .select('*, users:user_id(raw_user_meta_data)')
      .eq('worker_id', worker.id)
      .order('created_at', { ascending: false });
    
    if (data) setReviews(data);
  };

  const handleReviewSubmit = async () => {
    if (!session) {
      Alert.alert('Sign In Required', 'You must be signed in to leave a review.');
      setIsModalVisible(false);
      return;
    }
    if (!reviewContent.trim()) {
      Alert.alert('Error', 'Please write a review comment.');
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.from('reviews').insert({
      worker_id: worker.id,
      user_id: session.user.id,
      rating: rating,
      content: reviewContent,
    });
    setIsSubmitting(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setIsModalVisible(false);
      setReviewContent('');
      setRating(5);
      fetchReviews();
    }
  };

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1) 
    : worker.rating;

  const totalReviews = reviews.length > 0 ? reviews.length : worker.reviews;

  const handleCall = () => {
    Linking.openURL('tel:1234567890');
  };

  const handleChat = () => {
    Linking.openURL('https://wa.me/1234567890');
  };

  const handleBook = () => {
    Alert.alert(
      'Secure Escrow Booking',
      `Would you like to book ${worker.name} starting at ${worker.rate}? Under TrustLink protocol, your funds are safely held in escrow until completion.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Book Now', 
          onPress: () => navigation.navigate('RequestService', { worker_id: worker.id, worker_name: worker.name }) 
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Floating App Bar */}
      <View style={styles.topAppBar}>
        <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Professional Profile</Text>
        <TouchableOpacity style={styles.iconCircle}>
          <Ionicons name="share-social" size={20} color={Colors.onSurface} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Card Header */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.profileInfoRow}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: worker.avatar }} style={styles.avatar} />
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.gold} />
              </View>
            </View>

            <View style={styles.nameDetails}>
              <Text style={styles.workerName}>{worker.name}</Text>
              <Text style={styles.specialtyText}>{worker.specialty}</Text>
              <View style={[styles.statusBadge, worker.available ? styles.badgeGreen : styles.badgeOrange]}>
                <Text style={[styles.statusBadgeText, worker.available ? styles.textGreen : styles.textOrange]}>
                  {worker.availabilityText}
                </Text>
              </View>
            </View>

            <View style={styles.ratingDetails}>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={18} color={Colors.gold} />
                <Text style={styles.ratingNumber}>{avgRating}</Text>
              </View>
              <Text style={styles.reviewsCount}>({totalReviews} reviews)</Text>
            </View>
          </View>

          {/* Quick Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <View style={styles.metricIconContainer}>
                <Ionicons name="briefcase" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.metricLabel}>Experience</Text>
                <Text style={styles.metricValue}>{worker.experience || '8+ Years'}</Text>
              </View>
            </View>

            <View style={styles.metricItem}>
              <View style={styles.metricIconContainer}>
                <Ionicons name="location" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.metricLabel}>Location</Text>
                <Text style={styles.metricValue}>{worker.location || 'Brooklyn, NY'}</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActionsTopRow}>
            <TouchableOpacity style={styles.smallActionBtn} onPress={handleChat} activeOpacity={0.8}>
              <Ionicons name="logo-whatsapp" size={16} color={Colors.primary} />
              <Text style={styles.smallActionText}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallActionBtn} onPress={handleCall} activeOpacity={0.8}>
              <Ionicons name="call-outline" size={16} color={Colors.primary} />
              <Text style={styles.smallActionText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallBookBtn} onPress={handleBook} activeOpacity={0.9}>
              <Text style={styles.smallBookBtnText}>Book Now</Text>
            </TouchableOpacity>
          </View>

          {/* Social Links Row */}
          {(worker.linkedin_url || worker.instagram_url || worker.tiktok_url || worker.portfolio_url) && (
            <View style={styles.socialsRow}>
              {worker.linkedin_url && (
                <TouchableOpacity onPress={() => Linking.openURL(worker.linkedin_url)} style={styles.socialIcon}>
                  <Ionicons name="logo-linkedin" size={20} color={Colors.primary} />
                </TouchableOpacity>
              )}
              {worker.instagram_url && (
                <TouchableOpacity onPress={() => Linking.openURL(worker.instagram_url)} style={styles.socialIcon}>
                  <Ionicons name="logo-instagram" size={20} color="#E1306C" />
                </TouchableOpacity>
              )}
              {worker.tiktok_url && (
                <TouchableOpacity onPress={() => Linking.openURL(worker.tiktok_url)} style={styles.socialIcon}>
                  <Ionicons name="logo-tiktok" size={20} color={Colors.onSurface} />
                </TouchableOpacity>
              )}
              {worker.portfolio_url && (
                <TouchableOpacity onPress={() => Linking.openURL(worker.portfolio_url)} style={styles.socialIcon}>
                  <Ionicons name="globe-outline" size={20} color={Colors.secondary} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Pricing Highlight Card */}
        <View style={styles.pricingCard}>
          <View>
            <Text style={styles.pricingLabel}>Starting Rate</Text>
            <Text style={styles.pricingValue}>{worker.rate || '$40/hr'}</Text>
          </View>
          <View style={styles.instantBookingBadge}>
            <Text style={styles.instantBookingText}>Instant Booking Available</Text>
          </View>
        </View>

        {/* Portfolio Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Portfolio</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.portfolioScroll}>
            {PORTFOLIO_IMAGES.map((uri, index) => (
              <View key={index} style={styles.portfolioCard}>
                <Image source={{ uri }} style={styles.portfolioImage} />
              </View>
            ))}
          </ScrollView>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.cardContainer}>
            <Text style={styles.aboutText}>{worker.about}</Text>
            <View style={styles.tagsContainer}>
              {worker.tags && worker.tags.map((tag: string) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Ratings & Reviews Section */}
        <View style={[styles.section, { marginBottom: Spacing.xl }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ratings & Reviews</Text>
            <TouchableOpacity onPress={() => setIsModalVisible(true)}>
              <Text style={styles.viewAllText}>+ Leave Review</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.reviewsList}>
            {reviews.length === 0 ? (
              <Text style={{ color: Colors.outline, textAlign: 'center', marginVertical: 16 }}>No reviews yet. Be the first!</Text>
            ) : reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewAuthorRow}>
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarPlaceholderText}>
                        {review.users?.raw_user_meta_data?.full_name?.charAt(0) || 'U'}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.reviewAuthorName}>{review.users?.raw_user_meta_data?.full_name || 'Anonymous User'}</Text>
                      <Text style={styles.reviewDate}>{new Date(review.created_at).toLocaleDateString()}</Text>
                    </View>
                  </View>
                  <View style={styles.starsRow}>
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Ionicons key={i} name="star" size={14} color={Colors.gold} />
                    ))}
                  </View>
                </View>
                <Text style={styles.reviewContent}>{review.content}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Review Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true} onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Leave a Review</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Rating</Text>
              <View style={styles.starSelectionRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)}>
                    <Ionicons 
                      name={star <= rating ? "star" : "star-outline"} 
                      size={32} 
                      color={Colors.gold} 
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Your Feedback</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="How was the service? Did they arrive on time?"
                placeholderTextColor={Colors.outline}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={reviewContent}
                onChangeText={setReviewContent}
              />

              <TouchableOpacity 
                style={styles.submitReviewBtn} 
                onPress={handleReviewSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={Colors.onPrimary} />
                ) : (
                  <Text style={styles.submitReviewBtnText}>Submit Feedback</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topAppBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.containerMobile,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant + '15',
  },
  headerTitle: {
    ...Typography.headlineSm,
    color: Colors.onSurface,
    fontWeight: '700',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    paddingHorizontal: Spacing.containerMobile,
    paddingTop: Spacing.md,
  },
  profileHeaderCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '22',
    ...Shadow.card,
    marginBottom: Spacing.md,
  },
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant + '15',
    paddingBottom: Spacing.md,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLow,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.full,
    padding: 2,
  },
  nameDetails: {
    flex: 1,
  },
  workerName: {
    ...Typography.headlineSm,
    color: Colors.onSurface,
    fontWeight: '700',
  },
  specialtyText: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginTop: 6,
  },
  badgeGreen: {
    backgroundColor: Colors.availableBg,
  },
  badgeOrange: {
    backgroundColor: Colors.busyBg,
  },
  statusBadgeText: {
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
  ratingDetails: {
    alignItems: 'flex-end',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingNumber: {
    ...Typography.headlineSm,
    fontSize: 20,
    color: Colors.onSurface,
    fontWeight: '700',
  },
  reviewsCount: {
    ...Typography.labelSm,
    color: Colors.outline,
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    paddingTop: Spacing.md,
  },
  metricItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  metricIconContainer: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    ...Typography.labelSm,
    color: Colors.outline,
  },
  metricValue: {
    ...Typography.labelMd,
    color: Colors.onSurface,
    fontWeight: '700',
  },
  pricingCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Shadow.card,
    marginBottom: Spacing.lg,
  },
  pricingLabel: {
    ...Typography.labelSm,
    color: Colors.onPrimary,
    opacity: 0.8,
  },
  pricingValue: {
    ...Typography.headlineSm,
    color: Colors.onPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  instantBookingBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  instantBookingText: {
    ...Typography.labelMd,
    color: Colors.onPrimary,
    fontWeight: '700',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.headlineSm,
    color: Colors.onSurface,
    fontWeight: '700',
  },
  viewAllText: {
    ...Typography.labelMd,
    color: Colors.primary,
    fontWeight: '600',
  },
  portfolioScroll: {
    gap: Spacing.md,
  },
  portfolioCard: {
    width: width * 0.65,
    height: 160,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.card,
  },
  portfolioImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardContainer: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '22',
  },
  aboutText: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  tagChip: {
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  tagChipText: {
    ...Typography.labelSm,
    color: Colors.onSurface,
  },
  reviewsList: {
    gap: Spacing.md,
  },
  reviewCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '22',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  reviewAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondaryContainer + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    ...Typography.labelMd,
    color: Colors.onSecondaryContainer,
    fontWeight: '700',
  },
  reviewAuthorName: {
    ...Typography.labelMd,
    color: Colors.onSurface,
    fontWeight: '700',
  },
  reviewDate: {
    ...Typography.labelSm,
    color: Colors.outline,
  },
  starsRow: {
    flexDirection: 'row',
  },
  reviewContent: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
  },
  quickActionsTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant + '15',
  },
  smallActionBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryContainer + '20',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  smallActionText: {
    ...Typography.labelSm,
    color: Colors.primary,
    fontWeight: '600',
  },
  smallBookBtn: {
    flex: 1.5,
    height: 36,
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBookBtnText: {
    ...Typography.labelSm,
    color: Colors.onPrimary,
    fontWeight: '700',
  },
  submitReviewBtnText: {
    ...Typography.labelMd,
    color: Colors.onPrimary,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    ...Typography.headlineSm,
    color: Colors.onSurface,
    fontWeight: '700',
  },
  modalBody: {
    gap: Spacing.md,
  },
  modalLabel: {
    ...Typography.labelMd,
    color: Colors.onSurface,
    fontWeight: '700',
  },
  starSelectionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  modalInput: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outline,
    padding: Spacing.md,
    height: 120,
    ...Typography.bodyMd,
    color: Colors.onSurface,
  },
  submitReviewBtn: {
    backgroundColor: Colors.primary,
    height: 48,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  socialsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant + '15',
  },
  socialIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
