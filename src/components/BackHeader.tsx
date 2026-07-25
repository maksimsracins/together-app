import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, type } from '../theme';

export function BackHeader({ title, onBack }: { title?: string; onBack?: () => void }) {
  return (
    <View style={styles.row}>
      <Pressable onPress={onBack ?? (() => router.back())} style={styles.btn} hitSlop={10}>
        <Ionicons name="chevron-back" size={20} color={colors.ink} />
      </Pressable>
      {title ? <Text style={styles.title}>{title}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl, marginTop: spacing.md },
  btn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  title: { ...type.h3, color: colors.ink },
});
