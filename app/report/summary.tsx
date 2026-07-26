import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../src/components/Avatar';
import { Mascot } from '../../src/components/Mascot';
import { useAppStore } from '../../src/store/useAppStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { getReportHistoryDetail } from '../../src/services/report';
import { updateCoupleSettings } from '../../src/services/couples';
import { registerPushToken } from '../../src/services/users';
import { ApiError } from '../../src/services/http';
import { emotionMeta } from '../../src/data/catalog';
import { pluralDays } from '../../src/utils/week';
import { EmotionKey, WeeklyReport, WeeklyReportEntry } from '../../src/types';
import { colors, radius, spacing, type } from '../../src/theme';

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

function wordCount(entries: WeeklyReportEntry[]) {
  return entries.reduce((sum, e) => sum + e.text.trim().split(/\s+/).filter(Boolean).length, 0);
}

function photoCount(entries: WeeklyReportEntry[]) {
  return entries.filter((e) => e.hasPhoto).length;
}

function pluralEntries(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'записей';
  if (mod10 === 1) return 'запись';
  if (mod10 >= 2 && mod10 <= 4) return 'записи';
  return 'записей';
}

// The one categorical (non-quantitative) stat -- which emotion shows up most
// often for a given person this period. Ties resolve to whichever was found
// first, which is fine here: we only ever display one headline mood, not a
// ranked list.
function dominantEmotion(entries: WeeklyReportEntry[]): EmotionKey | null {
  if (entries.length === 0) return null;
  const counts = new Map<EmotionKey, number>();
  for (const e of entries) counts.set(e.emotion, (counts.get(e.emotion) ?? 0) + 1);
  let best: EmotionKey | null = null;
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return best;
}

interface Fact {
  icon: string;
  text: string;
}

// Plain, objective observations pulled straight from the numbers -- no
// interpretation, no "why," nothing an AI would need to hedge about. This is
// the difference between this list and `insight`: these are facts, insight
// is the one analyst-style hypothesis.
function buildFacts(mine: WeeklyReportEntry[], partnerEntries: WeeklyReportEntry[], hasPartner: boolean, partnerName: string): Fact[] {
  const facts: Fact[] = [];
  const all = [...mine, ...partnerEntries];
  if (all.length === 0) return facts;

  const byDay = new Map<string, number>();
  for (const e of all) {
    const k = e.createdAt.slice(0, 10);
    byDay.set(k, (byDay.get(k) ?? 0) + 1);
  }
  if (byDay.size > 1) {
    let bestDay = '';
    let bestCount = 0;
    for (const [day, count] of byDay) {
      if (count > bestCount) {
        bestDay = day;
        bestCount = count;
      }
    }
    const label = new Date(bestDay).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
    facts.push({ icon: '📌', text: `Самый насыщенный день — ${label}: ${bestCount} ${pluralEntries(bestCount)}` });
  }

  if (hasPartner) {
    const mineDays = new Set(mine.map((e) => e.createdAt.slice(0, 10)));
    const partnerDays = new Set(partnerEntries.map((e) => e.createdAt.slice(0, 10)));
    let together = 0;
    for (const d of mineDays) if (partnerDays.has(d)) together += 1;
    if (together > 0) {
      facts.push({ icon: '💞', text: `Вы писали в один и тот же день ${together} ${pluralDays(together)} на этой неделе` });
    }
  }

  let longest: { entry: WeeklyReportEntry; words: number } | null = null;
  for (const e of all) {
    const words = e.text.trim().split(/\s+/).filter(Boolean).length;
    if (!longest || words > longest.words) longest = { entry: e, words };
  }
  if (longest && longest.words >= 15) {
    const isMine = mine.includes(longest.entry);
    const who = hasPartner ? (isMine ? 'у вас' : `у ${partnerName}`) : 'у вас';
    facts.push({ icon: '📖', text: `Самая подробная запись — ${who}, ${longest.words} слов` });
  }

  if (all.length >= 4) {
    const bucketOf = (hour: number) => (hour < 6 ? 'ночью' : hour < 12 ? 'утром' : hour < 18 ? 'днём' : 'вечером');
    const counts = new Map<string, number>();
    for (const e of all) {
      const b = bucketOf(new Date(e.createdAt).getHours());
      counts.set(b, (counts.get(b) ?? 0) + 1);
    }
    let bestBucket = '';
    let bestCount = 0;
    for (const [b, c] of counts) {
      if (c > bestCount) {
        bestBucket = b;
        bestCount = c;
      }
    }
    if (bestCount / all.length >= 0.5) {
      const text = hasPartner ? `Чаще всего вы оба писали ${bestBucket}` : `Вы чаще всего делитесь ${bestBucket}`;
      facts.push({ icon: '⏰', text });
    }
  }

  return facts.slice(0, 4);
}

function useStagger(count: number) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const anims = useRef(Array.from({ length: count }, () => new Animated.Value(0))).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        setReduceMotion(enabled);
        if (enabled) {
          anims.forEach((a) => a.setValue(1));
        } else {
          Animated.stagger(
            90,
            anims.map((a) => Animated.timing(a, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }))
          ).start();
        }
      })
      .catch(() => anims.forEach((a) => a.setValue(1)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return anims.map((a) => ({
    opacity: a,
    transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion ? 0 : 14, 0] }) }],
  }));
}

export default function ReportSummary() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const user = useAuthStore((s) => s.user)!;
  const partner = useAuthStore((s) => s.partner);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const { weeklyReport: liveReport, coupleSettings } = useAppStore();

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

  const [historical, setHistorical] = useState<WeeklyReport | null>(null);
  const [loadingHistorical, setLoadingHistorical] = useState(!!id);
  const [historicalError, setHistoricalError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoadingHistorical(true);
    setHistoricalError(null);
    getReportHistoryDetail(id)
      .then((envelope) => {
        setHistorical({
          id: envelope.id,
          weekLabel: envelope.weekLabel,
          myEntries: envelope.report.myEntries,
          partnerEntries: envelope.report.partnerEntries,
          narrative: envelope.report.narrative,
          insight: envelope.report.insight,
          weather: envelope.report.weather,
        });
      })
      .catch(() => setHistoricalError('Не удалось загрузить отчёт'))
      .finally(() => setLoadingHistorical(false));
  }, [id]);

  const r = id ? historical : liveReport;
  const hasPartner = !!partner;
  const partnerName = partner?.name ?? 'Партнёр';

  const stats = r
    ? {
        entriesMine: r.myEntries.length,
        entriesPartner: hasPartner ? r.partnerEntries.length : null,
        wordsMine: wordCount(r.myEntries),
        wordsPartner: hasPartner ? wordCount(r.partnerEntries) : null,
        photosMine: photoCount(r.myEntries),
        photosPartner: hasPartner ? photoCount(r.partnerEntries) : null,
        moodMine: dominantEmotion(r.myEntries),
        moodPartner: hasPartner ? dominantEmotion(r.partnerEntries) : null,
      }
    : null;

  const facts = r ? buildFacts(r.myEntries, r.partnerEntries, hasPartner, partnerName) : [];
  const totalEntries = r ? r.myEntries.length + r.partnerEntries.length : 0;

  const stagger = useStagger(3);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={10}>
          <Ionicons name="close" size={20} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{r?.weekLabel ?? 'Отчёт'}</Text>
        {id ? (
          <View style={[styles.closeBtn, { backgroundColor: 'transparent' }]} />
        ) : (
          <Pressable onPress={() => setSettingsVisible(true)} style={styles.closeBtn} hitSlop={10}>
            <Ionicons name="settings-outline" size={18} color={colors.roseDark} />
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {historicalError && <Text style={styles.error}>⚠️ {historicalError}</Text>}

        {loadingHistorical ? (
          <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.roseDark} />
        ) : !r ? (
          <View style={styles.emptyWrap}>
            <Mascot pose="reading" size={96} style={{ marginBottom: spacing.md }} />
            <Text style={styles.emptyTitle}>Отчёта пока нет</Text>
            <Text style={styles.emptyHint}>
              AI соберёт историю недели автоматически, в день и час, указанные в настройках отчёта
            </Text>
          </View>
        ) : (
          <>
            <Animated.View style={stagger[0]}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeEmoji}>💌</Text>
              </View>
              <Text style={styles.title}>Ваша история недели</Text>
              {totalEntries > 0 && (
                <Text style={styles.subtitle}>
                  {totalEntries} {pluralEntries(totalEntries)} за этот период
                </Text>
              )}

              <View style={styles.narrativeCard}>
                <Text style={styles.narrativeMark}>❝</Text>
                <Text style={styles.narrative}>{r.narrative}</Text>
              </View>
            </Animated.View>

            <Animated.View style={stagger[1]}>
              {(r.weather.mine || r.weather.partner) && (
                <View style={styles.weatherRow}>
                  {r.weather.mine && (
                    <View style={styles.weatherChip}>
                      <Text style={styles.weatherEmoji}>{r.weather.mine.emoji}</Text>
                      <Text style={styles.weatherText}>
                        Я, {r.weather.mine.city}: {r.weather.mine.minTemp}–{r.weather.mine.maxTemp}°
                      </Text>
                    </View>
                  )}
                  {r.weather.partner && (
                    <View style={styles.weatherChip}>
                      <Text style={styles.weatherEmoji}>{r.weather.partner.emoji}</Text>
                      <Text style={styles.weatherText}>
                        {partnerName}, {r.weather.partner.city}: {r.weather.partner.minTemp}–{r.weather.partner.maxTemp}°
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {!!r.insight && (
                <View style={styles.insightBox}>
                  <View style={styles.insightHeaderRow}>
                    <Ionicons name="sparkles-outline" size={14} color={colors.inkSoft} />
                    <Text style={styles.insightLabel}>Заметили совпадение</Text>
                  </View>
                  <Text style={styles.insightText}>{r.insight}</Text>
                </View>
              )}

              {facts.length > 0 && (
                <View style={styles.factsSection}>
                  <Text style={styles.sectionLabel}>Любопытные факты</Text>
                  {facts.map((f, i) => (
                    <View key={i} style={[styles.factRow, i === facts.length - 1 && styles.factRowLast]}>
                      <Text style={styles.factIcon}>{f.icon}</Text>
                      <Text style={styles.factText}>{f.text}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Animated.View>

            {stats && (
              <Animated.View style={[styles.statsSection, stagger[2]]}>
                <Text style={styles.sectionLabel}>Кто сколько писал</Text>

                <View style={styles.statTableHeader}>
                  <View style={{ flex: 1 }} />
                  <View style={styles.statValueCol}>
                    <Avatar emoji={user.avatarEmoji} uri={user.avatarUri} size={30} />
                  </View>
                  {hasPartner && (
                    <View style={styles.statValueCol}>
                      <Avatar emoji={partner!.avatarEmoji} uri={partner!.avatarUri} size={30} />
                    </View>
                  )}
                </View>

                <StatTableRow icon="✍️" label="Записи" mine={stats.entriesMine} partner={stats.entriesPartner} hasPartner={hasPartner} />
                <StatTableRow icon="📝" label="Слов" mine={stats.wordsMine} partner={stats.wordsPartner} hasPartner={hasPartner} />
                {(stats.photosMine > 0 || (stats.photosPartner ?? 0) > 0) && (
                  <StatTableRow icon="📷" label="Фото" mine={stats.photosMine} partner={stats.photosPartner} hasPartner={hasPartner} />
                )}
                {(stats.moodMine || stats.moodPartner) && (
                  <StatTableRow
                    icon="💭"
                    label="Настроение"
                    mine={stats.moodMine ? emotionMeta(stats.moodMine).emoji : '—'}
                    partner={stats.moodPartner ? emotionMeta(stats.moodPartner).emoji : hasPartner ? '—' : null}
                    hasPartner={hasPartner}
                    last
                  />
                )}
              </Animated.View>
            )}

            {!id && (
              <Pressable style={styles.historyLink} onPress={() => router.push('/report/history')} hitSlop={6}>
                <Ionicons name="time-outline" size={15} color={colors.sageDark} />
                <Text style={styles.historyLinkText}>Прошлые недели</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.sageDark} />
              </Pressable>
            )}
          </>
        )}
      </ScrollView>

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
    </SafeAreaView>
  );
}

function StatTableRow({
  icon,
  label,
  mine,
  partner,
  hasPartner,
  last,
}: {
  icon: string;
  label: string;
  mine: number | string;
  partner: number | string | null;
  hasPartner: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.statTableRow, last && styles.statTableRowLast]}>
      <View style={styles.statRowLabelWrap}>
        <Text style={styles.statRowIcon}>{icon}</Text>
        <Text style={styles.statRowLabel}>{label}</Text>
      </View>
      <View style={styles.statValueCol}>
        <Text style={styles.statRowValue}>{mine}</Text>
      </View>
      {hasPartner && (
        <View style={styles.statValueCol}>
          <Text style={styles.statRowValue}>{partner}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { ...type.h3, color: colors.ink, flex: 1, textAlign: 'center' },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxxl, flexGrow: 1 },
  error: { ...type.bodySm, color: colors.danger, textAlign: 'center', marginBottom: spacing.lg },
  heroBadge: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.roseMist,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.md,
  },
  heroBadgeEmoji: { fontSize: 28 },
  title: { ...type.h2, color: colors.ink, textAlign: 'center' },
  subtitle: { ...type.bodySm, color: colors.inkMuted, textAlign: 'center', marginTop: 4 },
  narrativeCard: {
    marginTop: spacing.xl, backgroundColor: colors.cardSoft,
    borderRadius: radius.xl, padding: spacing.xl,
  },
  narrativeMark: {
    ...type.h1, color: colors.roseLight, lineHeight: 28, marginBottom: -spacing.sm,
  },
  narrative: { ...type.bodyLg, color: colors.ink, lineHeight: 27 },
  weatherRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xl },
  weatherChip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.skyMist,
    borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: spacing.md,
    marginRight: spacing.sm, marginBottom: spacing.sm,
  },
  weatherEmoji: { fontSize: 14, marginRight: 6 },
  weatherText: { ...type.bodySm, color: colors.skyDark },
  insightBox: {
    marginTop: spacing.lg, backgroundColor: colors.sandMist,
    borderRadius: radius.lg, padding: spacing.lg,
  },
  insightHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  insightLabel: {
    ...type.label, color: colors.inkSoft, textTransform: 'uppercase', marginLeft: 6,
  },
  insightText: { ...type.body, color: colors.inkSoft, lineHeight: 21 },
  sectionLabel: {
    ...type.label, color: colors.inkMuted, textTransform: 'uppercase', marginBottom: spacing.md,
  },
  factsSection: { marginTop: spacing.xl },
  factRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingBottom: spacing.md, marginBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  factRowLast: { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 },
  factIcon: { fontSize: 17, marginRight: spacing.md },
  factText: { ...type.body, color: colors.ink, flex: 1, lineHeight: 21 },
  statsSection: {
    marginTop: spacing.xl, paddingTop: spacing.xl,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  statTableHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  statValueCol: { width: 56, alignItems: 'center' },
  statTableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  statTableRowLast: { borderBottomWidth: 0 },
  statRowLabelWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  statRowIcon: { fontSize: 15, marginRight: 8 },
  statRowLabel: { ...type.body, color: colors.inkSoft },
  statRowValue: { ...type.h3, fontFamily: type.bodyBold.fontFamily, color: colors.ink },
  historyLink: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center',
    marginTop: spacing.xl, paddingTop: spacing.lg,
  },
  historyLinkText: {
    ...type.bodySm, fontFamily: type.bodySemibold.fontFamily, color: colors.sageDark,
    marginHorizontal: 6,
  },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxxl },
  emptyTitle: { ...type.h3, color: colors.ink, marginBottom: spacing.xs },
  emptyHint: { ...type.body, color: colors.inkMuted, textAlign: 'center', maxWidth: 280 },
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
