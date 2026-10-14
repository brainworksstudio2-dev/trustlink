import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Colors, Spacing, Radius, Shadow } from '../constants/theme';

// A single shimmering placeholder matching the worker-card layout used on
// Explore -- avatar circle, name/specialty bars, a badge bar, and two
// button bars -- shown while the real list is still loading.
export default function SkeletonCard() {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Animated.View style={[styles.avatar, { opacity: pulse }]} />
        <View style={styles.details}>
          <Animated.View style={[styles.bar, { width: '55%', height: 16, opacity: pulse }]} />
          <Animated.View style={[styles.bar, { width: '40%', opacity: pulse }]} />
          <Animated.View style={[styles.bar, { width: '60%', opacity: pulse }]} />
        </View>
      </View>
      <View style={styles.actionsRow}>
        <Animated.View style={[styles.actionBar, { opacity: pulse }]} />
        <Animated.View style={[styles.actionBar, { opacity: pulse }]} />
      </View>
      <Animated.View style={[styles.primaryBar, { opacity: pulse }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '22',
    ...Shadow.card,
  },
  topRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  details: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  bar: {
    height: 10,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  actionBar: {
    flex: 1,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  primaryBar: {
    width: '100%',
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerHigh,
  },
});
