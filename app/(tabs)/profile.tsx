import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { SectionHeader } from '../../src/components/SectionHeader';
import { Chip } from '../../src/components/Chip';
import { Avatar } from '../../src/components/Avatar';
import { Button } from '../../src/components/Button';
import { LoveLanguagesInfoButton } from '../../src/components/LoveLanguagesInfo';
import { useAuthStore } from '../../src/store/useAuthStore';
import { colors, radius, spacing, type } from '../../src/theme';
import { differenceInDays } from 'date-fns';

export default function Profile() {
  const user = useAuthStore((s) => s.user)!;
  const partner = useAuthStore((s) => s.partner);
  const logout = useAuthStore((s) => s.logout);
  const daysTogether = partner && user.relationshipStartDate
    ? differenceInDays(new Date(), new Date(user.relationshipStartDate))
    : null;

  return (
    <Screen>
      <Pressable style={styles.editBtn} onPress={() => router.push('/profile/edit')} hitSlop={10}>
        <Ionicons name="pencil-outline" size={16} color={colors.roseDark} />
        <Text style={styles.editBtnLabel}>Редактировать</Text>
      </Pressable>

      <View style={styles.header}>
        <Avatar emoji={user.avatarEmoji} uri={user.avatarUri} size={84} />
        <Text style={styles.name}>{user.name}</Text>
        <View style={styles.pairRow}>
          {partner ? (
            <Text style={styles.pairText}>💞 в паре с {partner.name}</Text>
          ) : user.coupleId ? (
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.pairTextMuted}>⏳ ждём, когда партнёр присоединится</Text>
              <Pressable
                style={styles.showCodeBtn}
                onPress={() => router.push('/(auth)/couple')}
                hitSlop={8}
              >
                <Ionicons name="qr-code-outline" size={14} color={colors.roseDark} />
                <Text style={styles.showCodeLabel}>Показать код</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => router.push('/(auth)/couple')}>
              <Text style={styles.pairText}>💌 пригласить партнёра</Text>
            </Pressable>
          )}
        </View>
        {daysTogether !== null && <Text style={styles.daysTogether}>Вместе уже {daysTogether} дней</Text>}
      </View>

      <SectionHeader title="О себе" />
      <Card style={{ marginBottom: spacing.xl }}>
        <Row
          label="Дата начала отношений"
          value={user.relationshipStartDate ? new Date(user.relationshipStartDate).toLocaleDateString('ru-RU') : '—'}
          last
        />
      </Card>

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Языки любви</Text>
        <LoveLanguagesInfoButton />
      </View>
      <View style={styles.chipsWrap}>
        {user.loveLanguages.length === 0 && <Text style={styles.emptyHint}>Пока не выбраны</Text>}
        {user.loveLanguages.map((l) => (
          <Chip key={l} label={l} tone="rose" selected />
        ))}
      </View>

      <SectionHeader title="Интересы" />
      <View style={styles.chipsWrap}>
        {user.interests.length === 0 && <Text style={styles.emptyHint}>Пока не выбраны</Text>}
        {user.interests.map((i) => (
          <Chip key={i} label={i} tone="sage" selected />
        ))}
      </View>

      <Button label="Выйти" variant="outline" onPress={logout} style={{ marginTop: spacing.md }} />
    </Screen>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  editBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end',
    marginTop: spacing.lg, marginRight: spacing.md, paddingVertical: spacing.xs,
  },
  editBtnLabel: { ...type.bodySm, fontFamily: type.bodySemibold.fontFamily, color: colors.roseDark, marginLeft: 6 },
  header: { alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.xl },
  name: { ...type.h2, color: colors.ink, marginTop: spacing.md },
  pairRow: { marginTop: 4 },
  pairText: { ...type.body, color: colors.roseDark },
  pairTextMuted: { ...type.body, color: colors.inkMuted },
  showCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  showCodeLabel: { ...type.bodySm, fontFamily: type.bodySemibold.fontFamily, color: colors.roseDark, marginLeft: 6 },
  daysTogether: { ...type.bodySm, color: colors.inkMuted, marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { ...type.body, color: colors.inkMuted },
  rowValue: { ...type.bodySemibold, fontFamily: type.bodySemibold.fontFamily, color: colors.ink },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  sectionTitle: { ...type.h2, color: colors.ink },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.xl },
  emptyHint: { ...type.body, color: colors.inkMuted },
});
