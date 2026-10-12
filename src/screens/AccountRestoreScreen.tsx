import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert } from '../components/AppAlert';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { restoreAccount, deletionCompletesAt } from '../lib/accountDeletion';

export default function AccountRestoreScreen() {
  const router = useRouter();
  const { deletedAt } = useLocalSearchParams<{ deletedAt?: string }>();
  const [isWorking, setIsWorking] = useState(false);

  const deleteDate = deletedAt ? deletionCompletesAt(deletedAt) : null;

  const handleRestore = async () => {
    setIsWorking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session expired. Please sign in again.');
      await restoreAccount(session.user.id);
      router.replace('/home');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not restore your account. Please try again.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/home');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="time-outline" size={36} color={Colors.error} />
        </View>
        <Text style={styles.title}>Account Scheduled for Deletion</Text>
        <Text style={styles.subtitle}>
          {deleteDate
            ? `Your account and all its data will be permanently deleted on ${deleteDate.toLocaleDateString()}.`
            : 'Your account is scheduled for permanent deletion.'}
          {'  '}You can restore it any time before then.
        </Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleRestore} disabled={isWorking}>
          {isWorking ? <ActivityIndicator color={Colors.onPrimary} /> : <Text style={styles.primaryBtnText}>Restore My Account</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={handleSignOut} disabled={isWorking}>
          <Text style={styles.secondaryBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.md },
  iconCircle: {
    width: 72, height: 72, borderRadius: Radius.full,
    backgroundColor: Colors.error + '15', alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: { ...Typography.headlineSm, color: Colors.onSurface, fontWeight: '700', textAlign: 'center' },
  subtitle: { ...Typography.bodySm, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.md },
  primaryBtn: {
    width: '100%', height: 50, backgroundColor: Colors.primary, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: { ...Typography.labelLg, color: Colors.onPrimary, fontWeight: '700' },
  secondaryBtn: { height: 44, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { ...Typography.labelMd, color: Colors.onSurfaceVariant, fontWeight: '600' },
});
