import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Dimensions, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type OnboardingScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

const { width } = Dimensions.get('window');

export default function OnboardingScreen({ navigation }: OnboardingScreenProps) {
  const [step, setStep] = useState(1);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (step < 3) {
      // Transition out
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -20, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        setStep(step + 1);
        slideAnim.setValue(20);
        // Transition in
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();
      });
    } else {
      // Navigate to Main application (tab stack)
      navigation.replace('Main');
    }
  };

  const handleSkip = () => {
    navigation.replace('Main');
  };

  const renderVisual = () => {
    if (step === 1) {
      return (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="people" size={100} color={Colors.primary} />
          {/* Floating Verification Badge */}
          <View style={styles.floatingBadge}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.gold} />
            <Text style={styles.floatingBadgeText}>SKILL VERIFIED</Text>
          </View>
        </View>
      );
    } else if (step === 2) {
      return (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="card" size={100} color={Colors.primary} />
          {/* Floating Escrow Badge */}
          <View style={[styles.floatingBadge, styles.bottomFloatingBadge]}>
            <Ionicons name="shield-half" size={18} color={Colors.secondary} />
            <Text style={[styles.floatingBadgeText, { color: Colors.secondary }]}>ESCROW PROTECTED</Text>
          </View>
        </View>
      );
    } else {
      return (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="ribbon" size={100} color={Colors.primary} />
          {/* Floating Guarantee Badge */}
          <View style={styles.floatingBadge}>
            <Ionicons name="heart" size={18} color={Colors.error} />
            <Text style={[styles.floatingBadgeText, { color: Colors.error }]}>100% SATISFACTION</Text>
          </View>
        </View>
      );
    }
  };

  const renderContent = () => {
    if (step === 1) {
      return (
        <>
          <Text style={styles.headline}>Find Verified Professionals</Text>
          <Text style={styles.description}>
            Every worker on TrustLink undergoes rigorous background checks and manual skill verification to ensure your peace of mind.
          </Text>

          {/* Bento List */}
          <View style={styles.bentoContainer}>
            <View style={styles.bentoItem}>
              <View style={styles.iconBoxPrimary}>
                <Ionicons name="shield-checkmark" size={20} color={Colors.primary} />
              </View>
              <View style={styles.bentoText}>
                <Text style={styles.bentoTitle}>Identity Clear</Text>
                <Text style={styles.bentoDesc}>Full ID and background check completed.</Text>
              </View>
            </View>

            <View style={styles.bentoItem}>
              <View style={styles.iconBoxSecondary}>
                <Ionicons name="construct" size={20} color={Colors.secondary} />
              </View>
              <View style={styles.bentoText}>
                <Text style={styles.bentoTitle}>Proven Expertise</Text>
                <Text style={styles.bentoDesc}>Credentials and past work reviewed by pros.</Text>
              </View>
            </View>
          </View>
        </>
      );
    } else if (step === 2) {
      return (
        <>
          <Text style={styles.headline}>Secure Booking & Payments</Text>
          <Text style={styles.description}>
            Book top-tier professionals instantly. Your funds are held in a secure escrow until the job is completed to your satisfaction.
          </Text>

          {/* Bento List */}
          <View style={styles.bentoContainer}>
            <View style={styles.bentoItem}>
              <View style={styles.iconBoxSecondary}>
                <Ionicons name="wallet" size={20} color={Colors.secondary} />
              </View>
              <View style={styles.bentoText}>
                <Text style={styles.bentoTitle}>Escrow Protected</Text>
                <Text style={styles.bentoDesc}>Money safely held until work is signed off.</Text>
              </View>
            </View>

            <View style={styles.bentoItem}>
              <View style={styles.iconBoxPrimary}>
                <Ionicons name="calendar" size={20} color={Colors.primary} />
              </View>
              <View style={styles.bentoText}>
                <Text style={styles.bentoTitle}>Instant Booking</Text>
                <Text style={styles.bentoDesc}>Hire immediately without long discussions.</Text>
              </View>
            </View>
          </View>
        </>
      );
    } else {
      return (
        <>
          <Text style={styles.headline}>Quality Work, Guaranteed</Text>
          <Text style={styles.description}>
            Your peace of mind is our priority. Every project is backed by our satisfaction guarantee and round-the-clock professional support.
          </Text>

          {/* Bento List */}
          <View style={styles.bentoContainer}>
            <View style={styles.bentoItem}>
              <View style={styles.iconBoxPrimary}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
              </View>
              <View style={styles.bentoText}>
                <Text style={styles.bentoTitle}>Satisfaction Guarantee</Text>
                <Text style={styles.bentoDesc}>Not happy? We'll make it right or refund.</Text>
              </View>
            </View>

            <View style={styles.bentoItem}>
              <View style={styles.iconBoxSecondary}>
                <Ionicons name="headset" size={20} color={Colors.secondary} />
              </View>
              <View style={styles.bentoText}>
                <Text style={styles.bentoTitle}>24/7 Concierge Support</Text>
                <Text style={styles.bentoDesc}>Dedicated team always ready to help you.</Text>
              </View>
            </View>
          </View>
        </>
      );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header bar */}
      <View style={styles.header}>
        <Text style={styles.headerBrand}>TrustLink</Text>
        {step < 3 && (
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Slide Content */}
      <Animated.View style={[styles.mainContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Visual Element */}
        <View style={styles.visualContainer}>
          {renderVisual()}
        </View>

        {/* Text and Bento Details */}
        <View style={styles.textContainer}>
          {renderContent()}
        </View>
      </Animated.View>

      {/* Sticky Bottom Actions */}
      <View style={styles.footer}>
        {/* Progress dots */}
        <View style={styles.dotsRow}>
          <View style={[styles.dot, step === 1 ? styles.dotActive : null]} />
          <View style={[styles.dot, step === 2 ? styles.dotActive : null]} />
          <View style={[styles.dot, step === 3 ? styles.dotActive : null]} />
        </View>

        {/* Call to action button */}
        <TouchableOpacity style={styles.button} onPress={handleNext} activeOpacity={0.9}>
          <Text style={styles.buttonText}>{step === 3 ? 'Get Started' : 'Next'}</Text>
          <Ionicons name="arrow-forward" size={18} color={Colors.onPrimary} />
        </TouchableOpacity>

        <Text style={styles.stepText}>Step {step} of 3 • {step === 3 ? 'Finalize your experience' : 'Learn about our trust system'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 50,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.containerMobile,
  },
  headerBrand: {
    ...Typography.headlineSm,
    color: Colors.primary,
    fontWeight: '800',
  },
  skipText: {
    ...Typography.labelMd,
    color: Colors.onSurfaceVariant,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: Spacing.containerMobile,
    alignItems: 'center',
  },
  visualContainer: {
    width: '100%',
    height: width * 0.65,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  imagePlaceholder: {
    width: '90%',
    height: '100%',
    borderRadius: Radius.xxl,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '33',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  floatingBadge: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '44',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomFloatingBadge: {
    bottom: Spacing.md,
    right: Spacing.md,
    left: undefined,
  },
  floatingBadgeText: {
    ...Typography.labelSm,
    color: Colors.gold,
    fontWeight: '700',
    marginLeft: 6,
  },
  textContainer: {
    width: '100%',
    alignItems: 'center',
  },
  headline: {
    ...Typography.headlineMd,
    color: Colors.onBackground,
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  description: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.8,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  bentoContainer: {
    width: '100%',
    gap: Spacing.sm,
  },
  bentoItem: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLowest,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '22',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  iconBoxPrimary: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  iconBoxSecondary: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.secondary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  bentoText: {
    flex: 1,
  },
  bentoTitle: {
    ...Typography.labelMd,
    color: Colors.onSurface,
    fontWeight: '700',
  },
  bentoDesc: {
    ...Typography.bodySm,
    color: Colors.outline,
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: Spacing.containerMobile,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant + '15',
    alignItems: 'center',
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
    backgroundColor: Colors.outlineVariant,
  },
  dotActive: {
    width: 20,
    backgroundColor: Colors.primary,
  },
  button: {
    width: '100%',
    height: 54,
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: Spacing.md,
  },
  buttonText: {
    ...Typography.labelMd,
    color: Colors.onPrimary,
    fontWeight: '700',
  },
  stepText: {
    ...Typography.labelSm,
    color: Colors.outline,
  },
});
