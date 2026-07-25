import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import {
  addWeeks,
  endOfWeek,
  format,
  isSameDay,
  isToday as isTodayFn,
  startOfWeek,
  subWeeks,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { EntryCard } from '../../src/components/EntryCard';
import { useAppStore } from '../../src/store/useAppStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { getPartnerActivity, listAllEntries } from '../../src/services/entries';
import { updateCoupleSettings } from '../../src/services/couples';
import { registerPushToken } from '../../src/services/users';
import { ApiError } from '../../src/services/http';
import { Entry } from '../../src/types';
import { colors, radius, spacing, type } from '../../src/theme';

type Author = 'mine' | 'partner';
interface Selection {
  date: Date;
  author: Author;
}

const WEEKDAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
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

export default function CalendarScreen() {
  const partnerEntries = useAppStore((s) => s.partnerEntries);
  const partner = useAuthStore((s) => s.partner);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const { coupleSettings } = useAppStore();
  const user = useAuthStore((s) => s.user)!;

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

  const [weekCursor, setWeekCursor] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selected, setSelected] = useState<Selection>({ date: new Date(), author: 'mine' });
  const [myEntries, setMyEntries] = useState<Entry[] | null>(null);
  const [partnerActivityDates, setPartnerActivityDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Refetch on every focus (not just mount) so adding, editing, or deleting an
  // entry elsewhere in the app is reflected here as soon as you come back —
  // this is now the only place your own entries are browsable.
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setLoadError(null);
      Promise.all([listAllEntries(), getPartnerActivity()])
        .then(([mine, activity]) => {
          setMyEntries(mine);
          setPartnerActivityDates(activity.createdAts.map((iso) => new Date(iso)));
        })
        .catch(() => setLoadError('Не удалось загрузить записи'))
        .finally(() => setLoading(false));
    }, [])
  );

  const goToWeek = (newCursor: Date) => {
    setWeekCursor(newCursor);
    setSelected((s) => {
      const inNewWeek = new Date() >= newCursor && new Date() < addWeeks(newCursor, 1);
      return { date: inNewWeek ? new Date() : newCursor, author: s.author };
    });
  };

  const weekDays = useMemo(() => {
    const start = weekCursor;
    return Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * 24 * 60 * 60 * 1000));
  }, [weekCursor]);

  const hasEntry = (list: Entry[] | null, day: Date) =>
    !!list?.some((e) => isSameDay(new Date(e.createdAt), day));

  const hasPartnerActivity = (day: Date) => partnerActivityDates.some((d) => isSameDay(d, day));

  const selectedEntries = useMemo(() => {
    const source = selected.author === 'mine' ? myEntries : partnerEntries;
    return (source ?? [])
      .filter((e) => isSameDay(new Date(e.createdAt), selected.date))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [myEntries, partnerEntries, selected]);

  // Partner activity can be "known" (a dot showing they wrote something)
  // before it's actually visible (only once a report unlocks it) -- so an
  // empty list for a day with a dot means "hidden," not "nothing happened."
  const partnerActivityHiddenOnSelected =
    selected.author === 'partner' && selectedEntries.length === 0 && hasPartnerActivity(selected.date);

  const weekLabel = `${format(weekCursor, 'd MMM', { locale: ru })} – ${format(endOfWeek(weekCursor, { weekStartsOn: 1 }), 'd MMM', { locale: ru })}`;

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

      <Text style={styles.title}>Календарь</Text>
      <Text style={styles.subtitle}>
        {partner ? 'Выберите день и кто именно — вы или партнёр' : 'Выберите день, чтобы увидеть записи'}
      </Text>

      <Card style={{ marginTop: spacing.md }}>
        <View style={styles.weekHeader}>
          <Pressable onPress={() => goToWeek(subWeeks(weekCursor, 1))} hitSlop={10} style={styles.weekNavBtn}>
            <Ionicons name="chevron-back" size={18} color={colors.roseDark} />
          </Pressable>
          <Text style={styles.weekLabel}>{weekLabel}</Text>
          <Pressable onPress={() => goToWeek(addWeeks(weekCursor, 1))} hitSlop={10} style={styles.weekNavBtn}>
            <Ionicons name="chevron-forward" size={18} color={colors.roseDark} />
          </Pressable>
        </View>

        <View style={styles.gridRow}>
          <View style={styles.rowLabelCell} />
          {weekDays.map((day) => (
            <View key={day.toISOString()} style={styles.dayHeaderCell}>
              <Text style={[styles.dayHeaderWeekday, isTodayFn(day) && { color: colors.roseDark }]}>
                {WEEKDAY_SHORT[(day.getDay() + 6) % 7]}
              </Text>
              <Text style={[styles.dayHeaderDate, isTodayFn(day) && { color: colors.roseDark }]}>
                {format(day, 'd')}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.gridRow}>
          <View style={styles.rowLabelCell}>
            <Text style={[styles.rowLabelText, { color: colors.roseDark }]}>Я</Text>
          </View>
          {weekDays.map((day) => {
            const active = selected.author === 'mine' && isSameDay(day, selected.date);
            return (
              <Pressable
                key={day.toISOString()}
                style={styles.dayCellWrap}
                onPress={() => setSelected({ date: day, author: 'mine' })}
              >
                <View style={[styles.cell, { backgroundColor: active ? colors.rose : colors.roseMist }]}>
                  {hasEntry(myEntries, day) && (
                    <View style={[styles.dot, { backgroundColor: active ? colors.white : colors.roseDark }]} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {partner && (
          <View style={styles.gridRow}>
            <View style={styles.rowLabelCell}>
              <Text
                style={[styles.rowLabelText, { color: colors.skyDark }]}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {partner.name}
              </Text>
            </View>
            {weekDays.map((day) => {
              const active = selected.author === 'partner' && isSameDay(day, selected.date);
              return (
                <Pressable
                  key={day.toISOString()}
                  style={styles.dayCellWrap}
                  onPress={() => setSelected({ date: day, author: 'partner' })}
                >
                  <View style={[styles.cell, { backgroundColor: active ? colors.skyDark : colors.skyMist }]}>
                    {hasPartnerActivity(day) && (
                      <View style={[styles.dot, { backgroundColor: active ? colors.white : colors.skyDark }]} />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </Card>

      <Text style={styles.selectedLabel}>
        {selected.author === 'mine' ? 'Ваши записи' : `Записи ${partner?.name ?? 'партнёра'}`}
        {' — '}
        {isTodayFn(selected.date) ? 'сегодня' : format(selected.date, 'd MMMM', { locale: ru })}
      </Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.roseDark} />
      ) : loadError ? (
        <Text style={styles.emptyText}>⚠️ {loadError}</Text>
      ) : selectedEntries.length === 0 ? (
        <Card style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 28, marginBottom: spacing.sm }}>{partnerActivityHiddenOnSelected ? '🔒' : '🌤️'}</Text>
          <Text style={styles.emptyText}>
            {partnerActivityHiddenOnSelected
              ? 'Партнёр кое-что добавил(а) — увидите после отчёта'
              : 'Записей за этот день нет'}
          </Text>
          {selected.author === 'mine' && isTodayFn(selected.date) && (
            <Button label="Добавить запись" onPress={() => router.push('/entry/new')} style={{ marginTop: spacing.lg }} />
          )}
        </Card>
      ) : (
        selectedEntries.map((e) => (
          <EntryCard key={e.id} entry={e} editable={selected.author === 'mine'} />
        ))
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
  weekHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md,
  },
  weekNavBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
  },
  weekLabel: { ...type.bodySemibold, fontFamily: type.bodySemibold.fontFamily, color: colors.ink },
  gridRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs,
  },
  rowLabelCell: { width: 82, paddingRight: spacing.xs },
  rowLabelText: { ...type.bodySm, fontSize: 12, lineHeight: 15, fontFamily: type.bodySemibold.fontFamily },
  dayHeaderCell: { flex: 1, alignItems: 'center' },
  dayHeaderWeekday: { ...type.label, fontSize: 11, color: colors.inkMuted, textTransform: 'uppercase' },
  dayHeaderDate: { ...type.bodySm, color: colors.inkMuted, marginTop: 1 },
  dayCellWrap: { flex: 1, alignItems: 'center' },
  cell: {
    width: 36, height: 36, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  selectedLabel: {
    ...type.label, color: colors.roseDark, textTransform: 'uppercase',
    marginTop: spacing.xl, marginBottom: spacing.md,
  },
  emptyText: { ...type.body, color: colors.inkMuted, textAlign: 'center' },
});
