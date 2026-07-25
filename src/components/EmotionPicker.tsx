import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EMOTIONS } from '../data/catalog';
import { EmotionKey } from '../types';
import { colors, radius, spacing, type } from '../theme';

interface Props {
  value: EmotionKey | null;
  onChange: (key: EmotionKey) => void;
}

export function EmotionPicker({ value, onChange }: Props) {
  return (
    <View style={styles.grid}>
      {EMOTIONS.map((e) => {
        const selected = value === e.key;
        return (
          <Pressable
            key={e.key}
            onPress={() => onChange(e.key)}
            style={[styles.item, selected && styles.itemSelected]}
          >
            <Text style={styles.emoji}>{e.emoji}</Text>
            <Text style={[styles.label, selected && { color: colors.roseDark }]}>{e.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  item: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  itemSelected: {
    backgroundColor: colors.roseMist,
    borderColor: colors.rose,
  },
  emoji: { fontSize: 26, marginBottom: 4 },
  label: { ...type.bodySm, color: colors.inkSoft, textAlign: 'center' },
});
