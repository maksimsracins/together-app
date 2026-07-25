import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { colors, radius, shadow, spacing } from '../theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'card' | 'sage' | 'rose' | 'sand' | 'sky';
  padded?: boolean;
}

const toneMap = {
  card: colors.card,
  sage: colors.sageMist,
  rose: colors.roseMist,
  sand: colors.sandMist,
  sky: colors.skyMist,
};

export function Card({ children, style, tone = 'card', padded = true }: CardProps) {
  return (
    <View
      style={[
        styles.base,
        { backgroundColor: toneMap[tone] },
        padded && styles.padded,
        tone === 'card' && shadow.soft,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
  },
  padded: {
    padding: spacing.xl,
  },
});
