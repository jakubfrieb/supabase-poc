import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../theme/colors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  pressed?: boolean;
}

export function Card({ children, style, pressed = false }: CardProps) {
  return (
    <View style={[
      styles.card,
      pressed && styles.cardPressed,
      style
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  cardPressed: {
    borderColor: colors.primary,
  },
});
