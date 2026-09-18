import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ToastConfig, ToastConfigParams } from 'react-native-toast-message';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const VARIANTS: Record<string, { icon: IconName; color: string }> = {
  success: { icon: 'checkmark-circle', color: Colors.secondary },
  error: { icon: 'alert-circle', color: Colors.error },
  info: { icon: 'information-circle', color: Colors.primary },
  notification: { icon: 'notifications', color: Colors.primary },
};

function ToastCard({ type, text1, text2, onPress, props }: ToastConfigParams<{ icon?: IconName }>) {
  const variant = VARIANTS[type] || VARIANTS.info;
  const icon = props?.icon || variant.icon;

  const isNavigable = type === 'notification';

  return (
    <TouchableOpacity activeOpacity={isNavigable ? 0.85 : 1} onPress={onPress} style={styles.card}>
      <View style={[styles.iconCircle, { backgroundColor: variant.color + '18' }]}>
        <Ionicons name={icon} size={20} color={variant.color} />
      </View>
      <View style={styles.textCol}>
        {!!text1 && (
          <Text style={styles.title} numberOfLines={1}>
            {text1}
          </Text>
        )}
        {!!text2 && (
          <Text style={styles.message} numberOfLines={2}>
            {text2}
          </Text>
        )}
      </View>
      {isNavigable && <Ionicons name="chevron-forward" size={16} color={Colors.outline} style={styles.chevron} />}
    </TouchableOpacity>
  );
}

export const toastConfig: ToastConfig = {
  success: (params) => <ToastCard {...params} />,
  error: (params) => <ToastCard {...params} />,
  info: (params) => <ToastCard {...params} />,
  notification: (params) => <ToastCard {...params} />,
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '92%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm + 2,
    ...Shadow.lg,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  textCol: { flex: 1 },
  title: { ...Typography.labelLg, color: Colors.onSurface, fontWeight: '700' },
  message: { ...Typography.bodySm, color: Colors.onSurfaceVariant, marginTop: 2 },
  chevron: { marginLeft: Spacing.xs },
});
