import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, ImageBackground } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HAS_SEEN_ONBOARDING_KEY } from '../lib/onboarding';

const SLIDES = [
  {
    image: require('../../assets/onboarding-1.jpg'),
    badge: { icon: 'checkmark-circle' as const, text: 'SKILL VERIFIED', color: Colors.gold },
    headline: 'Find Verified Professionals',
    description:
      'Every worker on TrustLink undergoes rigorous background checks and manual skill verification to ensure your peace of mind.',
    bullets: [
      { icon: 'shield-checkmark' as const, title: 'Identity Clear', desc: 'Full ID and background check completed.' },
      { icon: 'construct' as const, title: 'Proven Expertise', desc: 'Credentials and past work reviewed by pros.' },
    ],
  },
  {
    image: require('../../assets/onboarding-2.jpg'),
    badge: { icon: 'shield-half' as const, text: 'ESCROW PROTECTED', color: Colors.secondary },
    headline: 'Secure Booking & Payments',
    description:
      'Book top-tier professionals instantly. Your funds are held in a secure escrow until the job is completed to your satisfaction.',
    bullets: [
      { icon: 'wallet' as const, title: 'Escrow Protected', desc: 'Money safely held until work is signed off.' },
      { icon: 'calendar' as const, title: 'Instant Booking', desc: 'Hire immediately without long discussions.' },
    ],
  },
  {
    image: require('../../assets/onboarding-3.jpg'),
    badge: { icon: 'heart' as const, text: '100% SATISFACTION', color: Colors.error },
    headline: 'Quality Work, Guaranteed',
    description:
      'Your peace of mind is our priority. Every project is backed by our satisfaction guarantee and round-the-clock professional support.',
    bullets: [
      { icon: 'checkmark-circle' as const, title: 'Satisfaction Guarantee', desc: "Not happy? We'll make it right or refund." },
      { icon: 'headset' as const, title: '24/7 Concierge Support', desc: 'Dedicated team always ready to help you.' },
    ],
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const finishOnboarding = async () => {
    await AsyncStorage.setItem(HAS_SEEN_ONBOARDING_KEY, 'true');
    router.replace('/home');
  };

  const handleNext = () => {
    if (step < SLIDES.length - 1) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -20, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        setStep(step + 1);
        slideAnim.setValue(20);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();
      });
    } else {
      finishOnboarding();
    }
  };

  const handleSkip = () => finishOnboarding();

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ImageBackground source={slide.image} style={styles.background} resizeMode="cover">
        {/* Bottom-heavy scrim so the photo reads clearly up top and text stays legible lower down */}
        <LinearGradient
          colors={['rgba(4,10,24,0.10)', 'rgba(4,10,24,0.30)', 'rgba(4,10,24,0.94)']}
          locations={[0, 0.45, 0.82]}
          style={StyleSheet.absoluteFill}
        />

        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <Text style={styles.headerBrand}>TrustLink</Text>
            {!isLast && (
              <TouchableOpacity onPress={handleSkip} hitSlop={10}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.badgeRow}>
            <View style={[styles.floatingBadge, { borderColor: slide.badge.color + '66' }]}>
              <Ionicons name={slide.badge.icon} size={16} color={slide.badge.color} />
              <Text style={[styles.floatingBadgeText, { color: slide.badge.color }]}>{slide.badge.text}</Text>
            </View>
          </View>

          <View style={{ flex: 1 }} />

          <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.headline}>{slide.headline}</Text>
            <Text style={styles.description}>{slide.description}</Text>

            <View style={styles.bentoContainer}>
              {slide.bullets.map((b) => (
                <View key={b.title} style={styles.bentoItem}>
                  <View style={styles.iconBox}>
                    <Ionicons name={b.icon} size={18} color={Colors.onPrimary} />
                  </View>
                  <View style={styles.bentoText}>
                    <Text style={styles.bentoTitle}>{b.title}</Text>
                    <Text style={styles.bentoDesc}>{b.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.dotsRow}>
              {SLIDES.map((_, i) => (
                <View key={i} style={[styles.dot, step === i && styles.dotActive]} />
              ))}
            </View>

            <TouchableOpacity style={styles.button} onPress={handleNext} activeOpacity={0.9}>
              <Text style={styles.buttonText}>{isLast ? 'Get Started' : 'Next'}</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.onPrimaryFixed} />
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  background: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.containerMobile },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBrand: {
    ...Typography.headlineSm,
    color: Colors.onPrimary,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  skipText: {
    ...Typography.labelMd,
    color: Colors.onPrimary,
    opacity: 0.85,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  badgeRow: {
    marginTop: Spacing.md,
    alignItems: 'flex-start',
  },
  floatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(8,14,28,0.55)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 6,
  },
  floatingBadgeText: {
    ...Typography.labelSm,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  content: {
    paddingBottom: Spacing.xl,
  },
  headline: {
    ...Typography.headlineMd,
    color: Colors.onPrimary,
    fontWeight: '800',
    marginBottom: Spacing.sm,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  description: {
    ...Typography.bodySm,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
    marginBottom: Spacing.lg,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  bentoContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  bentoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  bentoText: { flex: 1 },
  bentoTitle: {
    ...Typography.labelMd,
    color: Colors.onPrimary,
    fontWeight: '700',
  },
  bentoDesc: {
    ...Typography.bodySm,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  dot: {
    height: 6,
    width: 6,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    width: 20,
    backgroundColor: Colors.gold,
  },
  button: {
    width: '100%',
    height: 54,
    backgroundColor: Colors.gold,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    ...Typography.labelMd,
    color: Colors.onPrimaryFixed,
    fontWeight: '700',
  },
});
