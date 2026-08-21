import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { Avatar } from '../../src/components/Avatar';
import { useAppStore } from '../../src/store/useAppStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useNotificationsStore } from '../../src/store/useNotificationsStore';
import { usePremiumStore } from '../../src/store/usePremiumStore';
import { updateCoupleSettings } from '../../src/services/couples';
import { registerPushToken } from '../../src/services/users';
import { ApiError } from '../../src/services/http';
import { colors, fonts, radius, shadow, spacing, type } from '../../src/theme';
import { greeting, nextReportDate } from '../../src/utils/week';

const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Пн' },
  { value: 2, label: 'Вт' },
  { value: 3, label: 'Ср' },
  { value: 4, label: 'Чт' },
  { value: 5, label: 'Пт' },
  { value: 6, label: 'Сб' },
  { value: 7, label: 'Вс' },
];
const HOUR_OPTIONS = [8, 9, 12, 18, 20, 21];

// Shared by both notification switches — each just needs a registered push
// token before its own couple/user-level flag can be turned on.
async function ensurePushRegistered(): Promise<{ ok: true } | { ok: false; error: string }> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  const granted = existing === 'granted' ? true : (await Notifications.requestPermissionsAsync()).status === 'granted';
  if (!granted) return { ok: false, error: 'Разрешение на уведомления не получено' };

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  await registerPushToken(token.data);
  return { ok: true };
}

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
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const weeklyReport = useAppStore((s) => s.weeklyReport);
  const { coupleSettings } = useAppStore();
  const isPremiumLocal = usePremiumStore((s) => s.isPremium);
  const isPremium = isPremiumLocal || !!coupleSettings?.isPremium;
  // Quota only blocks the *next* generation -- an already-generated report
  // (this cycle's free one) is always viewable regardless of quota state.
  const reportLocked =
    !weeklyReport && !isPremium && !!coupleSettings && coupleSettings.freeReportsUsed >= coupleSettings.freeReportLimit;
  const g = greeting();
  const [now, setNow] = useState(() => new Date());

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [reportWeekday, setReportWeekday] = useState<number | null>(null);
  const [reportHour, setReportHour] = useState<number | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [partnerActivityEnabled, setPartnerActivityEnabled] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [savingPartnerActivity, setSavingPartnerActivity] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);

  // coupleSettings is one shared object, kept fresh by app-wide polling —
  // mirror it into local state so this screen reflects a change the *other*
  // partner just made, without clobbering a save this device has in flight.
  useEffect(() => {
    if (!coupleSettings) return;
    if (!savingSchedule) {
      setReportWeekday(coupleSettings.reportWeekday);
      setReportHour(coupleSettings.reportHour);
    }
    if (!savingNotifications) setNotificationsEnabled(coupleSettings.notificationsEnabled);
    if (!savingPartnerActivity) setPartnerActivityEnabled(coupleSettings.partnerActivityNotificationsEnabled);
  }, [coupleSettings, savingSchedule, savingNotifications, savingPartnerActivity]);

  const journalReminderEnabled = user.journalReminderEnabled ?? true;

  const handlePickWeekday = async (day: number) => {
    const previous = reportWeekday;
    setReportWeekday(day);
    setScheduleError(null);
    setSavingSchedule(true);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await updateCoupleSettings({ reportWeekday: day, reportTimezone: timezone });
    } catch (err) {
      setReportWeekday(previous);
      setScheduleError(err instanceof ApiError ? err.message : 'Не удалось изменить день отчёта');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handlePickHour = async (hour: number) => {
    const previous = reportHour;
    setReportHour(hour);
    setScheduleError(null);
    setSavingSchedule(true);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await updateCoupleSettings({ reportHour: hour, reportTimezone: timezone });
    } catch (err) {
      setReportHour(previous);
      setScheduleError(err instanceof ApiError ? err.message : 'Не удалось изменить время отчёта');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleToggleNotifications = async (next: boolean) => {
    setNotificationsError(null);

    if (!next) {
      setNotificationsEnabled(false);
      updateCoupleSettings({ notificationsEnabled: false }).catch(() => {});
      return;
    }

    setSavingNotifications(true);
    try {
      const registered = await ensurePushRegistered();
      if (!registered.ok) {
        setNotificationsError(registered.error);
        return;
      }
      await updateCoupleSettings({ notificationsEnabled: true });
      setNotificationsEnabled(true);
    } catch {
      setNotificationsError('Не удалось включить уведомления. Попробуйте позже.');
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleTogglePartnerActivity = async (next: boolean) => {
    setNotificationsError(null);

    if (!next) {
      setPartnerActivityEnabled(false);
      updateCoupleSettings({ partnerActivityNotificationsEnabled: false }).catch(() => {});
      return;
    }

    setSavingPartnerActivity(true);
    try {
      const registered = await ensurePushRegistered();
      if (!registered.ok) {
        setNotificationsError(registered.error);
        return;
      }
      await updateCoupleSettings({ partnerActivityNotificationsEnabled: true });
      setPartnerActivityEnabled(true);
    } catch {
      setNotificationsError('Не удалось включить уведомления. Попробуйте позже.');
    } finally {
      setSavingPartnerActivity(false);
    }
  };

  const handleToggleJournalReminder = (next: boolean) => {
    updateProfile({ journalReminderEnabled: next }).catch(() => {});
  };

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const target =
    reportWeekday !== null && reportHour !== null && coupleSettings
      ? nextReportDate(reportWeekday, reportHour, coupleSettings.reportTimezone, now)
      : null;
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
          <Text style={[styles.countdownLabel, { flex: 1 }]}>
            {partner ? `Скоро откроются события ${partner.name}` : 'До следующего отчёта'}
          </Text>
          <Pressable onPress={() => setSettingsVisible(true)} hitSlop={8}>
            <Ionicons name="settings-outline" size={16} color={colors.sageDark} />
          </Pressable>
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
        style={({ pressed }) => [
          styles.reportCard,
          weeklyReport && styles.reportCardReady,
          pressed && styles.reportCardPressed,
        ]}
        onPress={() => router.push(reportLocked ? '/paywall' : '/report/summary')}
      >
        <View style={[styles.reportIconWrap, weeklyReport && styles.reportIconWrapReady]}>
          <Ionicons
            name={reportLocked ? 'lock-closed' : weeklyReport ? 'book' : 'sparkles-outline'}
            size={20}
            color={weeklyReport ? colors.white : colors.roseDark}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.reportTitle}>Ваша история недели</Text>
          <Text style={[styles.reportHint, weeklyReport && styles.reportHintReady]}>
            {reportLocked
              ? 'Оформите Together Plus, чтобы получить отчёт'
              : weeklyReport
                ? 'Готово — можно прочитать 💌'
                : 'Появится по расписанию отчёта'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={weeklyReport ? colors.roseDark : colors.inkMuted} />
      </Pressable>

      <View style={{ flex: 1 }} />

      <Pressable style={styles.cta} onPress={() => router.push('/entry/new')}>
        <View style={styles.ctaCircle}>
          <Ionicons name="add" size={30} color={colors.white} />
        </View>
        <Text style={styles.ctaLabel}>Поделиться эмоцией</Text>
      </Pressable>
      </Screen>

      <Modal
        visible={settingsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={styles.pickerOverlay}>
          <Pressable style={styles.pickerBackdrop} onPress={() => setSettingsVisible(false)} />
          <View style={styles.pickerSheet}>
            <View style={styles.pickerSheetHeader}>
              <Pressable onPress={() => setSettingsVisible(false)} style={styles.pickerCloseBtn} hitSlop={10}>
                <Ionicons name="close" size={20} color={colors.ink} />
              </Pressable>
              <Text style={styles.pickerSheetTitle}>Настройки отчёта</Text>
              <View style={[styles.pickerCloseBtn, { backgroundColor: 'transparent' }]} />
            </View>

            <Text style={styles.settingLabel}>День отчёта</Text>
            {reportWeekday === null ? (
              <ActivityIndicator style={{ marginVertical: spacing.lg }} color={colors.roseDark} />
            ) : (
              <View style={styles.weekdayRow}>
                {WEEKDAY_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => handlePickWeekday(opt.value)}
                    disabled={savingSchedule}
                    style={[styles.weekdayItem, opt.value === reportWeekday && styles.intervalItemActive]}
                  >
                    <Text style={[styles.intervalValue, opt.value === reportWeekday && { color: colors.white }]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={styles.settingLabel}>Время отчёта</Text>
            {reportHour === null ? (
              <ActivityIndicator style={{ marginVertical: spacing.lg }} color={colors.roseDark} />
            ) : (
              <View style={styles.intervalRow}>
                {HOUR_OPTIONS.map((hour) => (
                  <Pressable
                    key={hour}
                    onPress={() => handlePickHour(hour)}
                    disabled={savingSchedule}
                    style={[styles.intervalItem, hour === reportHour && styles.intervalItemActive]}
                  >
                    <Text style={[styles.intervalValue, hour === reportHour && { color: colors.white }]}>
                      {hour}:00
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            {scheduleError && <Text style={styles.notifyError}>⚠️ {scheduleError}</Text>}
            <Text style={styles.settingHint}>Менять день и время можно не чаще 3 раз в неделю</Text>

            <View style={styles.notifyRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Уведомление о новом отчёте</Text>
                <Text style={styles.settingHint}>Придёт на телефон, когда отчёт будет готов</Text>
              </View>
              {savingNotifications ? (
                <ActivityIndicator color={colors.roseDark} />
              ) : (
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleToggleNotifications}
                  trackColor={{ false: colors.border, true: colors.rose }}
                />
              )}
            </View>

            <View style={styles.notifyRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Партнёр поделился</Text>
                <Text style={styles.settingHint}>Уведомление, когда партнёр добавил запись (без деталей)</Text>
              </View>
              {savingPartnerActivity ? (
                <ActivityIndicator color={colors.roseDark} />
              ) : (
                <Switch
                  value={partnerActivityEnabled}
                  onValueChange={handleTogglePartnerActivity}
                  trackColor={{ false: colors.border, true: colors.rose }}
                />
              )}
            </View>
            {notificationsError && <Text style={styles.notifyError}>⚠️ {notificationsError}</Text>}

            <View style={styles.notifyRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Напоминание вести дневник</Text>
                <Text style={styles.settingHint}>Если вы не добавляли записи — напомним за день до отчёта</Text>
              </View>
              <Switch
                value={journalReminderEnabled}
                onValueChange={handleToggleJournalReminder}
                trackColor={{ false: colors.border, true: colors.rose }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  reportCardReady: { backgroundColor: colors.roseMist },
  reportCardPressed: { opacity: 0.85 },
  reportIconWrap: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.roseMist,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  reportIconWrapReady: { backgroundColor: colors.rose },
  reportTitle: { ...type.bodySemibold, fontFamily: type.bodySemibold.fontFamily, color: colors.ink },
  reportHint: { ...type.bodySm, color: colors.inkMuted, marginTop: 2 },
  reportHintReady: { fontFamily: type.bodySemibold.fontFamily, color: colors.roseDark },
  cta: { alignItems: 'center', marginBottom: spacing.xxl },
  ctaCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.rose,
    alignItems: 'center', justifyContent: 'center', ...shadow.soft,
  },
  ctaLabel: {
    ...type.bodySm, fontFamily: type.bodySemibold.fontFamily, color: colors.ink,
    marginTop: spacing.sm, textAlign: 'center',
  },
  pickerOverlay: { flex: 1, justifyContent: 'flex-end' },
  pickerBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay },
  pickerSheet: {
    backgroundColor: colors.cardSoft, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingBottom: spacing.xxl, paddingTop: spacing.sm, paddingHorizontal: spacing.xl,
  },
  pickerSheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.md, marginHorizontal: -spacing.xl, paddingHorizontal: spacing.xl,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  pickerSheetTitle: {
    ...type.bodySemibold, fontFamily: type.bodySemibold.fontFamily, color: colors.ink,
    flex: 1, textAlign: 'center',
  },
  pickerCloseBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
  },
  settingLabel: { ...type.bodySemibold, fontFamily: type.bodySemibold.fontFamily, color: colors.ink, marginTop: spacing.xl },
  settingHint: { ...type.bodySm, color: colors.inkMuted, marginTop: 2 },
  intervalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md, flexWrap: 'wrap', gap: spacing.sm },
  intervalItem: {
    minWidth: 52, height: 44, borderRadius: 22, backgroundColor: colors.card, paddingHorizontal: spacing.sm,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.border,
  },
  intervalItemActive: { backgroundColor: colors.rose, borderColor: colors.rose },
  intervalValue: { ...type.bodySemibold, fontFamily: type.bodySemibold.fontFamily, color: colors.ink },
  weekdayRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  weekdayItem: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.border,
  },
  notifyRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xl },
  notifyError: { ...type.bodySm, color: colors.danger, marginTop: spacing.md },
});
