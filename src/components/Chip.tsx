import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing, type } from '../theme';

interface ChipProps {
  label: string;
  emoji?: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'rose' | 'sage';
}

export function Chip({ label, emoji, selected, onPress, tone = 'rose' }: ChipProps) {
  const activeBg = tone === 'rose' ? colors.rose : colors.sage;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.base,
        { backgroundColor: selected ? activeBg : colors.card, borderColor: selected ? activeBg : colors.border },
      ]}
    >
      {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
      <Text style={[styles.label, { color: selected ? colors.white : colors.inkSoft }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  emoji: { fontSize: 15, marginRight: 6 },
  label: { ...type.bodySm, fontFamily: type.button.fontFamily, fontSize: 14 },
});
