import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, type } from '../theme';

export function SocialRow() {
  const comingSoon = () => Alert.alert('Скоро', 'Вход через соцсети появится в одном из следующих обновлений.');
  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <Text style={styles.or}>или продолжить с</Text>
        <View style={styles.line} />
      </View>
      <View style={styles.row}>
        <Pressable style={styles.social} onPress={comingSoon}>
          <Ionicons name="logo-google" size={20} color={colors.ink} />
        </Pressable>
        <Pressable style={styles.social} onPress={comingSoon}>
          <Ionicons name="logo-apple" size={22} color={colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.xl },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { ...type.bodySm, color: colors.inkMuted, marginHorizontal: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'center' },
  social: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.sm,
  },
});
