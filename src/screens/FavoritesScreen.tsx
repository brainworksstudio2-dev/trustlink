import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router/react-navigation';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { supabase } from '../lib/supabase';

export default function FavoritesScreen() {
  const router = useRouter();
  const [workers, setWorkers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setIsLoading(true);
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          setWorkers([]);
          setIsLoading(false);
          return;
        }

        const { data } = await supabase
          .from('favorites')
          .select('worker_id, workers(*)')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        setWorkers((data || []).map((row: any) => row.workers).filter(Boolean));
        setIsLoading(false);
      })();
    }, [])
  );

  const removeFavorite = async (workerId: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    setWorkers((prev) => prev.filter((w) => w.id !== workerId));
    await supabase.from('favorites').delete().eq('user_id', session.user.id).eq('worker_id', workerId);
  };

  const handleViewProfile = (worker: any) => {
    router.push({ pathname: '/worker/[id]', params: { id: String(worker.id), worker: JSON.stringify(worker) } });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Favorites</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : workers.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="heart-outline" size={48} color={Colors.outline} />
          <Text style={styles.emptyText}>No saved workers yet.</Text>
          <Text style={styles.emptySubtext}>Tap the heart on a professional's profile to save them here.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContainer}>
          {workers.map((worker) => (
            <TouchableOpacity key={worker.id} style={styles.card} onPress={() => handleViewProfile(worker)} activeOpacity={0.9}>
              <Image source={{ uri: worker.avatar_url }} style={styles.avatar} />
              <View style={styles.details}>
                <Text style={styles.name}>{worker.name}</Text>
                <Text style={styles.specialty}>{worker.specialty}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={12} color={Colors.gold} />
                  <Text style={styles.ratingText}>{worker.rating || '—'}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.heartBtn} onPress={() => removeFavorite(worker.id)}>
                <Ionicons name="heart" size={20} color={Colors.error} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

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
    borderBottomColor: Colors.outlineVariant + '22',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...Typography.headlineSm, color: Colors.onSurface, fontWeight: '700' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, gap: 6 },
  emptyText: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, fontWeight: '700', marginTop: 8 },
  emptySubtext: { ...Typography.bodySm, color: Colors.outline, textAlign: 'center' },
  listContainer: { padding: Spacing.containerMobile, gap: Spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '22',
    ...Shadow.card,
  },
  avatar: { width: 56, height: 56, borderRadius: Radius.full, backgroundColor: Colors.surfaceContainerLow },
  details: { flex: 1 },
  name: { ...Typography.labelLg, color: Colors.onSurface, fontWeight: '700' },
  specialty: { ...Typography.bodySm, color: Colors.onSurfaceVariant, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingText: { ...Typography.labelSm, color: Colors.onSurface, fontWeight: '700' },
  heartBtn: { padding: Spacing.xs },
});
