import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { Avatar } from '../../src/components/Avatar';
import { useAppStore } from '../../src/store/useAppStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useNotificationsStore } from '../../src/store/useNotificationsStore';
import { getCoupleSettings } from '../../src/services/couples';
import { colors, radius, shadow, spacing, type } from '../../src/theme';
import { daysUntilNextReport, greeting, pluralDays } from '../../src/utils/week';

const WEEKDAY_DOTS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function Home() {
  const user = useAuthStore((s) => s.user)!;
  const partner = useAuthStore((s) => s.partner);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const weeklyReport = useAppStore((s) => s.weeklyReport);
  const reportStatus = useAppStore((s) => s.reportStatus);
  const isGenerating = reportStatus === 'loading';
  const g = greeting();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [reportWeekday, setReportWeekday] = useState<number | null>(null);

  useEffect(() => {
    getCoupleSettings()
      .then((s) => {
        setDaysLeft(daysUntilNextReport(s.reportWeekday, s.reportHour));
        setReportWeekday(s.reportWeekday);
      })
      .catch(() => {});
  }, []);

  const todayIso = new Date().getDay() === 0 ? 7 : new Date().getDay();

  return (
    <View style={styles.root}>
      <Screen scroll={false} style={{ backgroundColor: 'transparent' }}>
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
        <View style={styles.countdownTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.countdownLabel}>
              {partner ? `Скоро откроются события ${partner.name}` : 'До следующего отчёта'}
            </Text>
            <Text style={styles.countdownValue}>
              {daysLeft === null ? '—' : daysLeft === 0 ? 'Сегодня' : `${daysLeft} ${pluralDays(daysLeft)}`}
            </Text>
          </View>
          <Text style={styles.countdownEmoji}>💌</Text>
        </View>

        {reportWeekday !== null && (
          <View style={styles.weekDots}>
            {WEEKDAY_DOTS.map((label, i) => {
              const iso = i + 1;
              const isReveal = iso === reportWeekday;
              const isToday = iso === todayIso;
              return (
                <View key={label} style={styles.weekDotItem}>
                  <View
                    style={[
                      styles.weekDot,
                      isReveal && styles.weekDotReveal,
                      isToday && !isReveal && styles.weekDotToday,
                    ]}
                  >
                    {isReveal && <Ionicons name="heart" size={9} color={colors.white} />}
                  </View>
                  <Text style={[styles.weekDotLabel, isToday && styles.weekDotLabelToday]}>{label}</Text>
                </View>
              );
            })}
          </View>
        )}
      </Card>

      <Pressable
        style={({ pressed }) => [styles.reportCard, pressed && styles.reportCardPressed]}
        onPress={() => router.push('/report/summary')}
      >
        <View style={styles.reportIconWrap}>
          {isGenerating ? (
            <ActivityIndicator size="small" color={colors.roseDark} />
          ) : (
            <Ionicons name={weeklyReport ? 'book-outline' : 'sparkles-outline'} size={20} color={colors.roseDark} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.reportTitle}>Ваша история недели</Text>
          <Text style={styles.reportHint}>
            {isGenerating ? 'Генерируем…' : weeklyReport ? 'Готово — можно прочитать' : 'Ещё не сгенерирована'}
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
  countdownTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countdownLabel: { ...type.bodySm, color: colors.sageDark },
  countdownValue: { ...type.h2, color: colors.ink, marginTop: 4 },
  countdownEmoji: { fontSize: 30 },
  weekDots: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.sage + '33',
  },
  weekDotItem: { alignItems: 'center' },
  weekDot: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  weekDotToday: { borderWidth: 2, borderColor: colors.sageDark },
  weekDotReveal: { backgroundColor: colors.rose },
  weekDotLabel: { fontSize: 10, color: colors.sageDark, opacity: 0.7 },
  weekDotLabelToday: { fontFamily: type.bodySemibold.fontFamily, opacity: 1 },
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
