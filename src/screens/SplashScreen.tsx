import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated, Dimensions, Image, Easing } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HAS_SEEN_ONBOARDING_KEY } from '../lib/onboarding';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  // Logo: a quick, slightly springy pop-in so the handoff from the static
  // native splash (same mark, same background) into this animated one
  // reads as the logo "coming alive" rather than a jump cut.
  const logoScale = useRef(new Animated.Value(0.55)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(1)).current; // 1 -> -6deg, 0 -> 0deg
  // Text/tagline/footer fade in just after, staggered behind the logo.
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Progress loading bar animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 1800,
      delay: 300,
      useNativeDriver: false, // width animation requires layout driver
    }).start(async () => {
      const hasSeenOnboarding = await AsyncStorage.getItem(HAS_SEEN_ONBOARDING_KEY);
      router.replace(hasSeenOnboarding ? '/home' : '/onboarding');
    });
  }, [router]);

  const logoRotateDeg = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-6deg'],
  });

  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 160], // 160px maximum width
  });

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Atmospheric Background Blobs */}
      <View style={[styles.blob, styles.blob1]} />
      <View style={[styles.blob, styles.blob2]} />

      {/* Logo + wordmark -- the real brand lockup, popping in before the
          rest of the content fades in beneath it. */}
      <Animated.View
        style={[
          styles.logoWrap,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }, { rotate: logoRotateDeg }],
          },
        ]}
      >
        <Image source={require('../../assets/splash-icon.png')} style={styles.logo} resizeMode="contain" />
      </Animated.View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <Text style={styles.subtitle}>EXCELLENCE VERIFIED</Text>

        {/* Tagline / Value Prop */}
        <Text style={styles.tagline}>
          Connecting discerning clients with elite professionals through rigorous verification.
        </Text>

        {/* Progress Indicator */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, { width: progressBarWidth }]} />
        </View>
      </Animated.View>

      {/* Subtle Footer Detail */}
      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <Ionicons name="lock-closed" size={14} color={Colors.outline} style={styles.footerIcon} />
        <Text style={styles.footerText}>Secured by TrustLink Protocol</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  blob: {
    position: 'absolute',
    borderRadius: Radius.full,
    opacity: 0.05,
    backgroundColor: Colors.primary,
  },
  blob1: {
    width: 250,
    height: 250,
    top: '10%',
    left: '-10%',
    backgroundColor: Colors.primary,
  },
  blob2: {
    width: 300,
    height: 300,
    bottom: '15%',
    right: '-15%',
    backgroundColor: Colors.secondary,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 320,
  },
  logoWrap: {
    marginBottom: Spacing.lg,
  },
  logo: {
    width: 240,
    height: 100,
  },
  subtitle: {
    ...Typography.labelSm,
    color: Colors.outline,
    letterSpacing: 3,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  tagline: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
    marginBottom: Spacing.xl,
  },
  progressTrack: {
    width: 160,
    height: 3,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.5,
  },
  footerIcon: {
    marginRight: Spacing.xs,
  },
  footerText: {
    ...Typography.labelSm,
    color: Colors.outline,
  },
});
