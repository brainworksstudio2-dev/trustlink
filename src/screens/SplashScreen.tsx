import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type SplashScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Splash'>;
};

const { width } = Dimensions.get('window');

export default function SplashScreen({ navigation }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Reveal animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Progress loading bar animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false, // width animation requires layout driver
    }).start(() => {
      // Navigate to onboarding screen after loading
      navigation.replace('Onboarding');
    });
  }, [navigation]);

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

      <Animated.View 
        style={[
          styles.content, 
          { 
            opacity: fadeAnim, 
            transform: [{ translateY: slideAnim }] 
          }
        ]}
      >
        {/* Logo Container */}
        <View style={styles.logoContainer}>
          <Ionicons name="shield-checkmark" size={48} color={Colors.onPrimary} />
        </View>

        {/* Brand Typography */}
        <View style={styles.brandContainer}>
          <Text style={styles.title}>TrustLink</Text>
          <Text style={styles.subtitle}>EXCELLENCE VERIFIED</Text>
        </View>

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
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: Radius.xxl,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: Spacing.lg,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.headlineLgMobile,
    color: Colors.primary,
    fontWeight: '800',
  },
  subtitle: {
    ...Typography.labelSm,
    color: Colors.outline,
    letterSpacing: 3,
    marginTop: Spacing.xs,
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
