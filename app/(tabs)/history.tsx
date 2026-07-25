import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { EntryCard } from '../../src/components/EntryCard';
import { Button } from '../../src/components/Button';
import { useAppStore } from '../../src/store/useAppStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { getCoupleSettings, updateCoupleSettings } from '../../src/services/couples';
import { getMe, registerPushToken, updateMe } from '../../src/services/users';
import { ApiError } from '../../src/services/http';
import { colors, radius, spacing, type } from '../../src/theme';
import { formatDayLabel } from '../../src/utils/week';

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

export default function History() {
  const entries = useAppStore((s) => s.entries);
  const partnerEntries = useAppStore((s) => s.partnerEntries);
  const partner = useAuthStore((s) => s.partner);
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
    if (!settingsVisible) return;
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
  }, [settingsVisible]);

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

  const grouped = useMemo(() => {
    const map = new Map<string, typeof entries>();
    entries.forEach((e) => {
      const key = formatDayLabel(new Date(e.createdAt));
      map.set(key, [...(map.get(key) ?? []), e]);
    });
    return Array.from(map.entries());
  }, [entries]);

  const groupedPartner = useMemo(() => {
    const map = new Map<string, typeof partnerEntries>();
    partnerEntries.forEach((e) => {
      const key = formatDayLabel(new Date(e.createdAt));
      map.set(key, [...(map.get(key) ?? []), e]);
    });
    return Array.from(map.entries());
  }, [partnerEntries]);

  return (
    <Screen>
      <Pressable style={styles.settingsBtn} onPress={() => setSettingsVisible(true)} hitSlop={10}>
        <Ionicons name="settings-outline" size={16} color={colors.roseDark} />
        <Text style={styles.settingsBtnLabel}>Настроить отчёт</Text>
      </Pressable>

      <Text style={styles.title}>История недели</Text>
      <Text style={styles.subtitle}>Ваши записи видите только вы — партнёр их не видит</Text>

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

      {entries.length === 0 ? (
        <Card style={{ alignItems: 'center', marginTop: spacing.lg }}>
          <Text style={{ fontSize: 28, marginBottom: spacing.sm }}>🌱</Text>
          <Text style={styles.emptyText}>Записей пока нет</Text>
          <Button label="Добавить запись" onPress={() => router.push('/entry/new')} style={{ marginTop: spacing.lg }} />
        </Card>
      ) : (
        grouped.map(([day, items]) => (
          <View key={day} style={{ marginBottom: spacing.lg }}>
            <Text style={styles.dayLabel}>{day}</Text>
            {items.map((e) => (
              <EntryCard key={e.id} entry={e} editable />
            ))}
          </View>
        ))
      )}

      {partner && (
        <>
          <Text style={[styles.title, { marginTop: spacing.xl, fontSize: 20 }]}>Записи {partner.name}</Text>
          <Text style={styles.subtitle}>Открываются после недельного отчёта — и остаются здесь насовсем</Text>

          {groupedPartner.length === 0 ? (
            <Card style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 28, marginBottom: spacing.sm }}>🔒</Text>
              <Text style={styles.emptyText}>Пока нечего показать — появится после первого отчёта</Text>
            </Card>
          ) : (
            groupedPartner.map(([day, items]) => (
              <View key={day} style={{ marginBottom: spacing.lg }}>
                <Text style={styles.dayLabel}>{day}</Text>
                {items.map((e) => (
                  <EntryCard key={e.id} entry={e} />
                ))}
              </View>
            ))
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.h2, color: colors.ink, marginTop: spacing.md },
  subtitle: { ...type.body, color: colors.inkMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
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
  dayLabel: { ...type.label, color: colors.roseDark, textTransform: 'uppercase', marginBottom: spacing.md },
  emptyText: { ...type.body, color: colors.inkMuted },
});
