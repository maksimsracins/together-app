import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { Avatar } from '../../src/components/Avatar';
import { useAppStore } from '../../src/store/useAppStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useNotificationsStore } from '../../src/store/useNotificationsStore';
import { getCoupleSettings } from '../../src/services/couples';
import { ENTRY_TYPES } from '../../src/data/catalog';
import { colors, radius, shadow, spacing, type } from '../../src/theme';
import { greeting, pluralDays } from '../../src/utils/week';

// Approximates days remaining until the couple's next scheduled report using
// the viewer's device clock — the actual generation happens in the couple's
// stored timezone, so this is a friendly estimate, not a precise countdown.
function daysUntilNextReport(weekday: number, hour: number): number {
  const now = new Date();
  const currentIso = now.getDay() === 0 ? 7 : now.getDay();
  let diff = weekday - currentIso;
  if (diff < 0) diff += 7;
  if (diff === 0 && now.getHours() >= hour) diff = 7;
  return diff;
}

function pluralEntries(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'записей';
  if (mod10 === 1) return 'запись';
  if (mod10 >= 2 && mod10 <= 4) return 'записи';
  return 'записей';
}

export default function Home() {
  const user = useAuthStore((s) => s.user)!;
  const partner = useAuthStore((s) => s.partner);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const { entries } = useAppStore();
  const g = greeting();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  const typeTally = useMemo(() => {
    const counts = new Map<string, number>();
    entries.forEach((e) => counts.set(e.type, (counts.get(e.type) ?? 0) + 1));
    return ENTRY_TYPES.map((t) => ({ ...t, count: counts.get(t.key) ?? 0 })).filter((t) => t.count > 0);
  }, [entries]);

  useEffect(() => {
    getCoupleSettings()
      .then((s) => setDaysLeft(daysUntilNextReport(s.reportWeekday, s.reportHour)))
      .catch(() => {});
  }, []);

  return (
    <Screen scroll={false}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>
            {g.text}, {user.name} {g.emoji}
          </Text>
          <Text style={styles.subGreeting}>Как хорошо, что вы здесь</Text>
        </View>
        <Pressable onPress={() => router.push('/notifications')} hitSlop={8} style={styles.bellBtn}>
          <Ionicons name="notifications-outline" size={22} color={colors.ink} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <View style={styles.coupleRow}>
        <View style={styles.coupleItem}>
          <Pressable onPress={() => router.push(partner ? '/profile/partner' : '/(auth)/couple')} hitSlop={6}>
            {partner ? (
              <Avatar emoji={partner.avatarEmoji} uri={partner.avatarUri} size={72} />
            ) : (
              <View style={styles.invitePlaceholder}>
                <Text style={styles.invitePlaceholderText}>+</Text>
              </View>
            )}
          </Pressable>
          <Text style={styles.coupleName} numberOfLines={1}>{partner?.name ?? 'Пригласить'}</Text>
        </View>

        <Text style={styles.coupleHeart}>💞</Text>

        <View style={styles.coupleItem}>
          <Pressable onPress={() => router.push('/(tabs)/profile')} hitSlop={6}>
            <Avatar emoji={user.avatarEmoji} uri={user.avatarUri} size={72} />
          </Pressable>
          <Text style={styles.coupleName} numberOfLines={1}>{user.name}</Text>
        </View>
      </View>

      <Card tone="sage" style={styles.countdownCard}>
        <View>
          <Text style={styles.countdownLabel}>До следующего отчёта</Text>
          <Text style={styles.countdownValue}>
            {daysLeft === null ? '—' : daysLeft === 0 ? 'Сегодня' : `${daysLeft} ${pluralDays(daysLeft)}`}
          </Text>
        </View>
        <Text style={styles.countdownEmoji}>📖</Text>
      </Card>

      <View style={styles.entriesHeader}>
        <Text style={styles.sectionLabel}>Эта неделя</Text>
        <Pressable onPress={() => router.push('/(tabs)/calendar')}>
          <Text style={styles.link}>Все записи</Text>
        </Pressable>
      </View>

      <Card style={styles.statsCard}>
        {entries.length === 0 ? (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 28, marginBottom: spacing.sm }}>🌱</Text>
            <Text style={styles.statsTitle}>0 записей на этой неделе</Text>
            <Text style={styles.statsHint}>Поделитесь своими эмоциями с нами</Text>
          </View>
        ) : (
          <>
            <Text style={styles.statsTitle}>{entries.length} {pluralEntries(entries.length)} на этой неделе</Text>
            <View style={styles.statsRow}>
              {typeTally.map((t) => (
                <View key={t.key} style={styles.statTile}>
                  <Text style={styles.statEmoji}>{t.emoji}</Text>
                  <Text style={styles.statCount}>{t.count}</Text>
                  <Text style={styles.statLabel} numberOfLines={1}>{t.label}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </Card>

      <View style={{ flex: 1 }} />

      <Pressable style={styles.cta} onPress={() => router.push('/entry/new')}>
        <View style={styles.ctaCircle}>
          <Ionicons name="add" size={30} color={colors.white} />
        </View>
        <Text style={styles.ctaLabel}>Поделиться эмоцией</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  greeting: { ...type.h2, color: colors.ink },
  subGreeting: { ...type.body, color: colors.inkMuted, marginTop: 2 },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: colors.cream,
  },
  badgeText: { fontSize: 10, fontFamily: type.bodySemibold.fontFamily, color: colors.white },
  coupleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl,
  },
  coupleItem: { alignItems: 'center', width: 96 },
  coupleName: { ...type.bodySm, fontFamily: type.bodySemibold.fontFamily, color: colors.ink, marginTop: spacing.sm },
  coupleHeart: { fontSize: 24, marginHorizontal: spacing.md },
  invitePlaceholder: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.card,
    borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  invitePlaceholderText: { ...type.h2, color: colors.inkMuted },
  countdownCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  countdownLabel: { ...type.bodySm, color: colors.sageDark },
  countdownValue: { ...type.h2, color: colors.ink, marginTop: 4 },
  countdownEmoji: { fontSize: 34 },
  entriesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel: { ...type.label, color: colors.inkMuted, textTransform: 'uppercase', marginBottom: spacing.md },
  link: { ...type.bodySm, color: colors.roseDark, fontFamily: type.bodySemibold.fontFamily, marginBottom: spacing.md },
  statsCard: { alignItems: 'center' },
  statsTitle: { ...type.bodyLg, fontFamily: type.bodySemibold.fontFamily, color: colors.ink, textAlign: 'center' },
  statsHint: { ...type.bodySm, color: colors.inkMuted, marginTop: 4, textAlign: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginTop: spacing.lg },
  statTile: { alignItems: 'center', width: 72, marginHorizontal: spacing.xs, marginBottom: spacing.sm },
  statEmoji: { fontSize: 22 },
  statCount: { ...type.h3, color: colors.ink, marginTop: 2 },
  statLabel: { ...type.label, color: colors.inkMuted, fontSize: 10, marginTop: 2, textAlign: 'center' },
  cta: { alignItems: 'center', marginBottom: spacing.xxl },
  ctaCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.rose,
    alignItems: 'center', justifyContent: 'center', ...shadow.soft,
  },
  ctaLabel: {
    ...type.bodySm, fontFamily: type.bodySemibold.fontFamily, color: colors.ink,
    marginTop: spacing.sm, textAlign: 'center',
  },
});
