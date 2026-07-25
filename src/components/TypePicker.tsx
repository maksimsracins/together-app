import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ENTRY_TYPES } from '../data/catalog';
import { EntryType } from '../types';
import { colors, radius, spacing, type } from '../theme';

interface Props {
  value: EntryType;
  onChange: (key: EntryType) => void;
}

export function TypePicker({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {ENTRY_TYPES.map((t) => {
        const selected = value === t.key;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={[styles.item, selected && styles.itemSelected]}
          >
            <Text style={styles.emoji}>{t.emoji}</Text>
            <Text style={[styles.label, selected && { color: colors.sageDark, fontFamily: type.bodySemibold.fontFamily }]}>
              {t.label}
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
    backgroundColor: colors.sageMist,
    borderColor: colors.sage,
  },
  emoji: { fontSize: 16, marginRight: 6 },
  label: { ...type.bodySm, color: colors.inkSoft },
});
