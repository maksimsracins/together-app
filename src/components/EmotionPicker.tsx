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
    <View style={styles.row}>
      {EMOTIONS.map((e) => {
        const selected = value === e.key;
        return (
          <Pressable
            key={e.key}
            onPress={() => onChange(e.key)}
            style={[styles.item, selected && styles.itemSelected]}
          >
            <Text style={styles.emoji}>{e.emoji}</Text>
            <Text style={[styles.label, selected && { color: colors.roseDark, fontFamily: type.bodySemibold.fontFamily }]}>
              {e.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  itemSelected: {
    backgroundColor: colors.roseMist,
    borderColor: colors.rose,
  },
  emoji: { fontSize: 16, marginRight: 6 },
  label: { ...type.bodySm, color: colors.inkSoft },
});
