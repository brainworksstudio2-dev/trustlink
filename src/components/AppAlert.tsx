import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';

type AlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

type AlertState = {
  title: string;
  message?: string;
  buttons: AlertButton[];
};

type Listener = (state: AlertState) => void;
let listener: Listener | null = null;

function alert(title: string, message?: string, buttons?: AlertButton[]) {
  const finalButtons = buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }];
  listener?.({ title, message, buttons: finalButtons });
}

// Drop-in replacement for React Native's `Alert` — same call signature,
// branded presentation instead of the OS-native dialog.
export const Alert = { alert };

type Variant = { color: string; icon: keyof typeof Ionicons.glyphMap };

function classify(title: string): Variant {
  const t = title.toLowerCase();
  if (/error|failed|cannot|wrong/.test(t)) {
    return { color: Colors.error, icon: 'alert-circle' };
  }
  if (/success|complete|sent/.test(t)) {
    return { color: Colors.secondary, icon: 'checkmark-circle' };
  }
  return { color: Colors.primary, icon: 'shield-checkmark' };
}

export function AppAlertHost() {
  const [state, setState] = useState<AlertState | null>(null);
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    listener = (next) => {
      setState(next);
      scale.setValue(0.92);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 6 }),
        Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
      ]).start();
    };
    return () => {
      listener = null;
    };
  }, []);

  const close = (btn?: AlertButton) => {
    Animated.timing(opacity, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setState(null);
      btn?.onPress?.();
    });
  };

  if (!state) return null;

  const variant = classify(state.title);
  const multiButton = state.buttons.length > 1;

  return (
    <Modal
      transparent
      visible
      animationType="none"
      onRequestClose={() => close(state.buttons.find((b) => b.style === 'cancel'))}
    >
      <Pressable style={styles.overlay} onPress={() => {}}>
        <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
          <View style={[styles.iconCircle, { backgroundColor: variant.color + '18' }]}>
            <Ionicons name={variant.icon} size={26} color={variant.color} />
          </View>
          <Text style={styles.title}>{state.title}</Text>
          {!!state.message && <Text style={styles.message}>{state.message}</Text>}

          <View style={[styles.buttonRow, !multiButton && styles.buttonRowSingle]}>
            {state.buttons.map((btn, i) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.button,
                    isCancel ? styles.buttonGhost : isDestructive ? styles.buttonDestructive : styles.buttonPrimary,
                    multiButton && i > 0 && { marginLeft: Spacing.sm },
                  ]}
                  activeOpacity={0.85}
                  onPress={() => close(btn)}
                >
                  <Text style={[styles.buttonText, isCancel ? styles.buttonTextGhost : styles.buttonTextSolid]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4,27,60,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadow.modal,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.headlineSm,
    color: Colors.onSurface,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    marginTop: Spacing.lg,
  },
  buttonRowSingle: {
    justifyContent: 'center',
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: Colors.primary,
  },
  buttonDestructive: {
    backgroundColor: Colors.error,
  },
  buttonGhost: {
    backgroundColor: Colors.surfaceContainer,
  },
  buttonText: {
    ...Typography.labelLg,
    fontWeight: '700',
  },
  buttonTextSolid: {
    color: Colors.onPrimary,
  },
  buttonTextGhost: {
    color: Colors.onSurface,
  },
});
