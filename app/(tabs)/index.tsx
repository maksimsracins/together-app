import React, { useEffect, useState } from 'react';
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
import { colors, fonts, radius, shadow, spacing, type } from '../../src/theme';
import { greeting, nextReportDate } from '../../src/utils/week';

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function TimerSegment({ value, label, last }: { value: string; label: string; last?: boolean }) {
  return (
    <View style={[styles.segment, !last && styles.segmentDivider]}>
      <Text style={styles.segmentValue}>{value}</Text>
      <Text style={styles.segmentLabel}>{label}</Text>
    </View>
  );
}

export default function Home() {
  const user = useAuthStore((s) => s.user)!;
  const partner = useAuthStore((s) => s.partner);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const weeklyReport = useAppStore((s) => s.weeklyReport);
  const g = greeting();
  const [target, setTarget] = useState<Date | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    getCoupleSettings()
      .then((s) => setTarget(nextReportDate(s.reportWeekday, s.reportHour)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const diffMs = target ? Math.max(0, target.getTime() - now.getTime()) : null;
  const days = diffMs !== null ? Math.floor(diffMs / 86400000) : null;
  const hours = diffMs !== null ? Math.floor((diffMs % 86400000) / 3600000) : null;
  const minutes = diffMs !== null ? Math.floor((diffMs % 3600000) / 60000) : null;
  const seconds = diffMs !== null ? Math.floor((diffMs % 60000) / 1000) : null;

  return (
    <View style={styles.root}>
      <Screen scroll={false} style={{ backgroundColor: 'transparent' }} ambient>
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
        <View style={styles.countdownHeaderRow}>
          <Ionicons name="heart" size={14} color={colors.rose} />
          <Text style={styles.countdownLabel}>
            {partner ? `Скоро откроются события ${partner.name}` : 'До следующего отчёта'}
          </Text>
        </View>

        <View style={styles.countdownRow}>
          {diffMs === null ? (
            <Text style={styles.countdownEmpty}>—</Text>
          ) : (
            <>
              <TimerSegment value={String(days)} label={days === 1 ? 'день' : 'дней'} />
              <TimerSegment value={pad(hours!)} label="часов" />
              <TimerSegment value={pad(minutes!)} label="минут" />
              <TimerSegment value={pad(seconds!)} label="секунд" last />
            </>
          )}
        </View>
      </Card>

      <Pressable
        style={({ pressed }) => [styles.reportCard, pressed && styles.reportCardPressed]}
        onPress={() => router.push('/report/summary')}
      >
        <View style={styles.reportIconWrap}>
          <Ionicons name={weeklyReport ? 'book-outline' : 'sparkles-outline'} size={20} color={colors.roseDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.reportTitle}>Ваша история недели</Text>
          <Text style={styles.reportHint}>
            {weeklyReport ? 'Готово — можно прочитать' : 'Появится по расписанию отчёта'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
      </Pressable>

      <View style={{ flex: 1 }} />

      <Pressable style={styles.cta} onPress={() => router.push('/entry/new')}>
        <View style={styles.ctaCircle}>
          <Ionicons name="add" size={30} color={colors.white} />
        </View>
        <Text style={styles.ctaLabel}>Поделиться эмоцией</Text>
      </Pressable>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
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
  countdownCard: { marginBottom: spacing.xl },
  countdownHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  countdownLabel: { ...type.bodySm, color: colors.sageDark, marginLeft: 6 },
  countdownRow: { flexDirection: 'row' },
  countdownEmpty: { ...type.h2, color: colors.ink, flex: 1, textAlign: 'center' },
  segment: { flex: 1, alignItems: 'center' },
  segmentDivider: { borderRightWidth: 1, borderRightColor: colors.sage + '33' },
  segmentValue: {
    fontFamily: fonts.bodyBold, fontSize: 26, color: colors.roseDark, fontVariant: ['tabular-nums'],
  },
  segmentLabel: {
    ...type.bodySm, fontSize: 11, color: colors.sageDark, marginTop: 4,
  },
  reportCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: spacing.lg, ...shadow.soft,
  },
  reportCardPressed: { opacity: 0.85 },
  reportIconWrap: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.roseMist,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  reportTitle: { ...type.bodySemibold, fontFamily: type.bodySemibold.fontFamily, color: colors.ink },
  reportHint: { ...type.bodySm, color: colors.inkMuted, marginTop: 2 },
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
