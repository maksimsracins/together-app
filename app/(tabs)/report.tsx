import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { ReportView } from '../../src/components/ReportView';
import { useAppStore } from '../../src/store/useAppStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { getCoupleSettings, updateCoupleSettings } from '../../src/services/couples';
import { getMe, registerPushToken, updateMe } from '../../src/services/users';
import { ApiError } from '../../src/services/http';
import { colors, radius, spacing, type } from '../../src/theme';

const WEEKDAY_DATIVE_PLURAL = [
  '', 'понедельникам', 'вторникам', 'средам', 'четвергам', 'пятницам', 'субботам', 'воскресеньям',
];
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

export default function Report() {
  const user = useAuthStore((s) => s.user)!;
  const partner = useAuthStore((s) => s.partner);
  const {
    weeklyReport: r,
    setEntryReaction,
    generateReport,
    reportStatus,
    reportError,
    reportSource,
    reportGeneratedAt,
  } = useAppStore();
  const isLoading = reportStatus === 'loading';

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [reportWeekday, setReportWeekday] = useState<number | null>(null);
  const [reportHour, setReportHour] = useState<number | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [partnerActivityEnabled, setPartnerActivityEnabled] = useState(false);
  const [journalReminderEnabled, setJournalReminderEnabled] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [savingPartnerActivity, setSavingPartnerActivity] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);

  useEffect(() => {
    getCoupleSettings()
      .then((s) => {
        setReportWeekday(s.reportWeekday);
        setReportHour(s.reportHour);
        setNotificationsEnabled(s.notificationsEnabled);
        setPartnerActivityEnabled(s.partnerActivityNotificationsEnabled);
      })
      .catch(() => {});
    getMe()
      .then((u) => setJournalReminderEnabled(u.journalReminderEnabled ?? true))
      .catch(() => {});
  }, []);

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

  const handleToggleJournalReminder = async (next: boolean) => {
    setJournalReminderEnabled(next);
    updateMe({ journalReminderEnabled: next }).catch(() => setJournalReminderEnabled(!next));
  };

  return (
    <Screen>
      <Pressable style={styles.settingsBtn} onPress={() => setSettingsVisible(true)} hitSlop={10}>
        <Ionicons name="settings-outline" size={16} color={colors.roseDark} />
        <Text style={styles.settingsBtnLabel}>Настроить отчёт</Text>
      </Pressable>

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
              <Text style={styles.pickerSheetTitle}>Настройки отчёта</Text>
              <Pressable onPress={() => setSettingsVisible(false)}>
                <Text style={styles.pickerDone}>Готово</Text>
              </Pressable>
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

      <View style={styles.hero}>
        <Text style={styles.heroEmoji}>❤️</Text>
        <Text style={styles.heroTitle}>{r ? 'Ваш недельный отчёт готов' : 'Недельный отчёт'}</Text>
        {r && <Text style={styles.heroWeek}>{r.weekLabel}</Text>}
      </View>

      <Card tone={reportSource === 'ai' ? 'sage' : 'card'} style={styles.aiCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.aiTitle}>{reportSource === 'ai' ? '✨ Анализ от AI' : 'Отчёт ещё не создан'}</Text>
          <Text style={styles.aiSubtitle}>
            {reportSource === 'ai'
              ? `Сгенерировано ${new Date(reportGeneratedAt!).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
              : 'Нажмите, чтобы AI разобрал ваши записи, или дождитесь автоматического отчёта'}
          </Text>
          {reportWeekday !== null && reportHour !== null && (
            <Text style={styles.aiHint}>
              Формируется автоматически по {WEEKDAY_DATIVE_PLURAL[reportWeekday]} в {reportHour}:00
            </Text>
          )}
          {reportStatus === 'error' && <Text style={styles.aiError}>⚠️ {reportError}</Text>}
        </View>
        <Button
          label={reportSource === 'ai' ? 'Обновить' : 'Сгенерировать'}
          onPress={generateReport}
          variant="secondary"
          fullWidth={false}
          loading={isLoading}
          style={styles.aiButton}
        />
      </Card>

      <Pressable style={styles.historyLink} onPress={() => router.push('/report/history')} hitSlop={8}>
        <Text style={styles.historyLinkText}>История отчётов</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.roseDark} />
      </Pressable>

      {!r ? (
        <Card style={{ alignItems: 'center', marginTop: spacing.lg }}>
          <Text style={{ fontSize: 28, marginBottom: spacing.sm }}>📖</Text>
          <Text style={styles.emptyText}>
            {partner
              ? 'Здесь появится совместный разбор недели, как только вы сгенерируете отчёт'
              : 'Здесь появится ваш личный разбор недели, как только вы сгенерируете отчёт'}
          </Text>
        </Card>
      ) : (
        <ReportView
          report={r}
          myName={user.name}
          partnerName={partner?.name ?? null}
          onReact={(id, emoji) => setEntryReaction(id, emoji)}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  settingsBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end',
    marginTop: spacing.lg, marginRight: spacing.md, paddingVertical: spacing.xs,
  },
  settingsBtnLabel: { ...type.bodySm, fontFamily: type.bodySemibold.fontFamily, color: colors.roseDark, marginLeft: 6 },
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
  pickerSheetTitle: { ...type.bodySemibold, fontFamily: type.bodySemibold.fontFamily, color: colors.ink },
  pickerDone: { ...type.bodySemibold, fontFamily: type.bodySemibold.fontFamily, color: colors.roseDark },
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
  hero: { alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.xl },
  heroEmoji: { fontSize: 34, marginBottom: spacing.sm },
  heroTitle: { ...type.h2, color: colors.ink, textAlign: 'center' },
  heroWeek: { ...type.body, color: colors.inkMuted, marginTop: 4 },
  aiCard: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  aiTitle: { ...type.bodySemibold, fontFamily: type.bodySemibold.fontFamily, color: colors.ink },
  aiSubtitle: { ...type.bodySm, color: colors.inkMuted, marginTop: 2 },
  aiHint: { ...type.bodySm, color: colors.inkMuted, marginTop: 2 },
  aiError: { ...type.bodySm, color: colors.danger, marginTop: spacing.xs },
  aiButton: { paddingHorizontal: spacing.lg, paddingVertical: 10, marginLeft: spacing.md },
  historyLink: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center',
    marginBottom: spacing.lg, paddingVertical: spacing.xs,
  },
  historyLinkText: { ...type.bodySm, fontFamily: type.bodySemibold.fontFamily, color: colors.roseDark, marginRight: 2 },
  emptyText: { ...type.body, color: colors.inkMuted, textAlign: 'center' },
});
