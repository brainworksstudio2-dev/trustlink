import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, SafeAreaView, ScrollView, Modal, TextInput } from 'react-native';
import { supabase } from '../lib/supabase';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Session } from '@supabase/supabase-js';

import { useNavigation, useFocusEffect } from '@react-navigation/native';

export default function UserProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [session, setSession] = useState<Session | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workerProfile, setWorkerProfile] = useState<any | null>(null);
  const [loadingWorker, setLoadingWorker] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.user_metadata) {
        setEditName(session.user.user_metadata.full_name || '');
        setEditPhone(session.user.user_metadata.phone || '');
      }
    });
  }, []);

  // Re-fetch worker profile every time this tab comes into focus
  // so it updates immediately after the user completes registration
  useFocusEffect(
    React.useCallback(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.id) {
          fetchWorkerProfile(session.user.id);
        } else {
          setLoadingWorker(false);
        }
      });
    }, [])
  );

  const fetchWorkerProfile = async (userId: string) => {
    setLoadingWorker(true);
    const { data, error } = await supabase
      .from('workers')
      .select('id, name, specialty, available, avatar_url, rate, experience')
      .eq('user_id', userId)
      .maybeSingle();
    if (!error) setWorkerProfile(data ?? null);
    setLoadingWorker(false);
  };

  const handleUpdateProfile = async () => {
    setIsSubmitting(true);
    const { data, error } = await supabase.auth.updateUser({
      data: { full_name: editName, phone: editPhone }
    });
    setIsSubmitting(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Profile updated successfully!');
      setIsEditModalVisible(false);
      // Update local session state to re-render
      if (data.user) {
        setSession({ ...session, user: data.user } as Session);
      }
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Error signing out', error.message);
    }
  };

  const handleBecomeWorker = () => {
    navigation.navigate('WorkerRegistration');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.emailText}>{session?.user?.user_metadata?.full_name || 'Anonymous User'}</Text>
          <Text style={styles.memberText}>{session?.user?.email || 'Loading...'}</Text>
          
          <TouchableOpacity 
            style={styles.editProfileBtn} 
            onPress={() => setIsEditModalVisible(true)}
          >
            <Ionicons name="pencil" size={14} color={Colors.primary} />
            <Text style={styles.editProfileBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Activity</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="heart" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.menuItemText}>Saved Favorites</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.outline} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="calendar" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.menuItemText}>Booking History</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.outline} />
          </TouchableOpacity>
        </View>

        {/* Worker section — status card if registered, promo if not */}
        {!loadingWorker && (
          workerProfile ? (
            <TouchableOpacity
              style={styles.workerStatusCard}
              onPress={handleBecomeWorker}
              activeOpacity={0.85}
            >
              <View style={styles.workerStatusLeft}>
                <View style={styles.workerStatusIconCircle}>
                  <Ionicons name="construct" size={22} color={Colors.primary} />
                </View>
                <View style={styles.workerStatusText}>
                  <Text style={styles.workerStatusTitle}>My Worker Profile</Text>
                  <Text style={styles.workerStatusSpecialty} numberOfLines={1}>
                    {workerProfile.specialty || 'Professional'}
                  </Text>
                  <View style={styles.workerStatusBadge}>
                    <View style={[styles.dot, { backgroundColor: workerProfile.available ? Colors.secondary : Colors.outline }]} />
                    <Text style={[styles.workerStatusAvail, { color: workerProfile.available ? Colors.secondary : Colors.outline }]}>
                      {workerProfile.available ? 'Available Now' : 'Unavailable'}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.workerEditBtn}>
                <Ionicons name="create-outline" size={16} color={Colors.primary} />
                <Text style={styles.workerEditBtnText}>Edit</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.workerPromoContainer}>
              <View style={styles.workerPromoIcon}>
                <Ionicons name="construct" size={24} color={Colors.onPrimary} />
              </View>
              <View style={styles.workerPromoTextContainer}>
                <Text style={styles.workerPromoTitle}>Are you a professional?</Text>
                <Text style={styles.workerPromoSubtitle}>Join our platform to get hired.</Text>
              </View>
              <TouchableOpacity style={styles.workerPromoBtn} onPress={handleBecomeWorker}>
                <Text style={styles.workerPromoBtnText}>Apply Now</Text>
              </TouchableOpacity>
            </View>
          )
        )}

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={isEditModalVisible} animationType="slide" transparent={true} onRequestClose={() => setIsEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.textInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="e.g. John Doe"
              placeholderTextColor={Colors.outline}
            />

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.textInput}
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="e.g. +1 555 123 4567"
              placeholderTextColor={Colors.outline}
              keyboardType="phone-pad"
            />

            <TouchableOpacity 
              style={styles.saveBtn} 
              onPress={handleUpdateProfile}
              disabled={isSubmitting}
            >
              <Text style={styles.saveBtnText}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.containerMobile,
  },
  header: {
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  emailText: {
    ...Typography.headlineSm,
    color: Colors.onBackground,
    fontWeight: '700',
  },
  memberText: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
  },
  section: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    ...Shadow.sm,
  },
  sectionTitle: {
    ...Typography.labelLg,
    color: Colors.onSurface,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  menuItemText: {
    flex: 1,
    ...Typography.bodyMd,
    color: Colors.onSurface,
    fontWeight: '500',
  },
  workerPromoContainer: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    ...Shadow.md,
  },
  workerPromoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  workerPromoTextContainer: {
    flex: 1,
  },
  workerPromoTitle: {
    ...Typography.labelLg,
    color: Colors.onPrimary,
    fontWeight: '700',
    marginBottom: 2,
  },
  workerPromoSubtitle: {
    ...Typography.bodySm,
    color: 'rgba(255,255,255,0.8)',
  },
  workerPromoBtn: {
    backgroundColor: Colors.onPrimary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  workerPromoBtnText: {
    ...Typography.labelMd,
    color: Colors.primary,
    fontWeight: '700',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.error + '40',
  },
  signOutBtnText: {
    ...Typography.labelLg,
    color: Colors.error,
    fontWeight: '600',
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    backgroundColor: Colors.primaryContainer + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    gap: 4,
  },
  editProfileBtnText: {
    ...Typography.labelSm,
    color: Colors.primary,
    fontWeight: '600',
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
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    ...Typography.headlineSm,
    color: Colors.onSurface,
    fontWeight: '700',
  },
  inputLabel: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    marginBottom: 6,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
    ...Typography.bodyMd,
    color: Colors.onSurface,
    marginBottom: Spacing.lg,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    height: 48,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  saveBtnText: {
    ...Typography.labelMd,
    color: Colors.onPrimary,
    fontWeight: '700',
  },
  // Worker status card (shown when already registered as a worker)
  workerStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    borderWidth: 1.5,
    borderColor: Colors.primary + '30',
    ...Shadow.sm,
  },
  workerStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  workerStatusIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primaryContainer + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerStatusText: {
    flex: 1,
  },
  workerStatusTitle: {
    ...Typography.labelMd,
    color: Colors.onSurface,
    fontWeight: '700',
    marginBottom: 2,
  },
  workerStatusSpecialty: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    marginBottom: 4,
  },
  workerStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  workerStatusAvail: {
    ...Typography.labelSm,
    fontSize: 11,
    fontWeight: '600',
  },
  workerEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryContainer + '18',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  workerEditBtnText: {
    ...Typography.labelSm,
    color: Colors.primary,
    fontWeight: '700',
  },
});
