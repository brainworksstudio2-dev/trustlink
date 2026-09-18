import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from '../components/AppAlert';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { supabase } from '../lib/supabase';

// Supabase's recovery link redirects here with either a #access_token=...
// hash fragment (implicit flow) or a ?code=... query param (PKCE) — handle
// both since detectSessionInUrl is off (this is a native app, no URL bar).
function parseTokensFromUrl(url: string): { access_token?: string; refresh_token?: string; code?: string } {
  const result: { access_token?: string; refresh_token?: string; code?: string } = {};
  const hashIndex = url.indexOf('#');
  if (hashIndex >= 0) {
    const params = new URLSearchParams(url.slice(hashIndex + 1));
    result.access_token = params.get('access_token') || undefined;
    result.refresh_token = params.get('refresh_token') || undefined;
  }
  const queryIndex = url.indexOf('?');
  if (queryIndex >= 0) {
    const queryStr = url.slice(queryIndex + 1, hashIndex >= 0 ? hashIndex : undefined);
    const params = new URLSearchParams(queryStr);
    result.code = params.get('code') || undefined;
  }
  return result;
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [isEstablishingSession, setIsEstablishingSession] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleUrl = async (url: string) => {
      const { access_token, refresh_token, code } = parseTokensFromUrl(url);
      try {
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          setSessionReady(true);
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          setSessionReady(true);
        }
      } catch {
        // Falls through to the "expired/invalid link" state below.
      } finally {
        setIsEstablishingSession(false);
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
      else setIsEstablishingSession(false);
    });

    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  const handleSetPassword = async () => {
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Password Updated', 'You can now sign in with your new password.', [
        { text: 'OK', onPress: () => router.replace('/profile') },
      ]);
    }
  };

  if (isEstablishingSession) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (!sessionReady) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={styles.title}>Link Expired or Invalid</Text>
        <Text style={styles.subtitle}>Request a new password reset link from the sign-in screen.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/profile')}>
          <Text style={styles.primaryBtnText}>Back to Sign In</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.safeArea} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Ionicons name="lock-closed" size={40} color={Colors.primary} />
          <Text style={styles.title}>Set a New Password</Text>
          <Text style={styles.subtitle}>Choose a new password for your account.</Text>

          <TextInput
            style={styles.input}
            placeholder="New password"
            placeholderTextColor={Colors.outline}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            placeholderTextColor={Colors.outline}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <TouchableOpacity style={styles.primaryBtn} onPress={handleSetPassword} disabled={isSubmitting}>
            {isSubmitting ? <ActivityIndicator color={Colors.onPrimary} /> : <Text style={styles.primaryBtnText}>Update Password</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, gap: 8 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.containerMobile, gap: Spacing.md },
  title: { ...Typography.headlineSm, color: Colors.onSurface, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  subtitle: { ...Typography.bodySm, color: Colors.onSurfaceVariant, textAlign: 'center' },
  input: {
    backgroundColor: Colors.surfaceContainerLowest, borderWidth: 1, borderColor: Colors.outlineVariant,
    borderRadius: Radius.md, height: 50, paddingHorizontal: Spacing.md, ...Typography.bodyMd, color: Colors.onSurface,
  },
  primaryBtn: {
    height: 50, backgroundColor: Colors.primary, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm,
  },
  primaryBtnText: { ...Typography.labelLg, color: Colors.onPrimary, fontWeight: '700' },
});
