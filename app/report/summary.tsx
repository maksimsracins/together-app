import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../src/components/Avatar';
import { Button } from '../../src/components/Button';
import { Mascot } from '../../src/components/Mascot';
import { useAppStore } from '../../src/store/useAppStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { generateReport, getReportHistoryDetail } from '../../src/services/report';
import { emotionMeta } from '../../src/data/catalog';
import { pluralDays } from '../../src/utils/week';
import { EmotionKey, WeeklyReport, WeeklyReportEntry } from '../../src/types';
import { colors, emotionColors, radius, spacing, type } from '../../src/theme';

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

// Rough emotional valence per emotion, -2..2, used only to plot a shape --
// not shown as a number anywhere, so it doesn't need to be precise, just
// consistently ordered (clearly-positive > mixed > clearly-difficult).
const EMOTION_VALENCE: Record<EmotionKey, number> = {
  joy: 2, gratitude: 2, love: 2, calm: 1,
  doubt: -1, sadness: -1,
  irritation: -2, anxiety: -2, hurt: -2,
};

interface MoodPoint {
  date: string;
  valence: number;
}

function buildMoodByDay(all: WeeklyReportEntry[]): MoodPoint[] {
  const byDay = new Map<string, number[]>();
  for (const e of all) {
    const k = e.createdAt.slice(0, 10);
    const arr = byDay.get(k) ?? [];
    arr.push(EMOTION_VALENCE[e.emotion] ?? 0);
    byDay.set(k, arr);
  }
  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, valence: vals.reduce((s, v) => s + v, 0) / vals.length }));
}

interface EmotionSlice {
  key: EmotionKey;
  count: number;
}

function buildEmotionPalette(all: WeeklyReportEntry[]): EmotionSlice[] {
  const counts = new Map<EmotionKey, number>();
  for (const e of all) counts.set(e.emotion, (counts.get(e.emotion) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

function MoodByDayChart({ points }: { points: MoodPoint[] }) {
  return (
    <View style={styles.moodChartRow}>
      {points.map((p) => {
        const magnitude = Math.min(Math.abs(p.valence), 2) / 2;
        const barHeight = magnitude > 0.08 ? Math.max(magnitude * 26, 4) : 0;
        const positive = p.valence > 0.08;
        const negative = p.valence < -0.08;
        const label = new Date(p.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric' });
        return (
          <View key={p.date} style={styles.moodChartCol}>
            <View style={styles.moodChartTrack}>
              <View style={styles.moodChartBaseline} />
              {positive && (
                <View style={[styles.moodChartBar, { height: barHeight, bottom: '50%', backgroundColor: colors.sage }]} />
              )}
              {negative && (
                <View style={[styles.moodChartBar, { height: barHeight, top: '50%', backgroundColor: colors.rose }]} />
              )}
            </View>
            <Text style={styles.moodChartLabel}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function EmotionPaletteBar({ slices, total }: { slices: EmotionSlice[]; total: number }) {
  const top = slices.slice(0, 5);
  return (
    <View>
      <View style={styles.paletteBar}>
        {top.map((s) => (
          <View key={s.key} style={{ flex: s.count, backgroundColor: emotionColors[s.key] }} />
        ))}
      </View>
      <View style={styles.paletteLegend}>
        {top.map((s) => (
          <View key={s.key} style={styles.paletteLegendItem}>
            <View style={[styles.paletteDot, { backgroundColor: emotionColors[s.key] }]} />
            <Text style={styles.paletteLegendText}>
              {emotionMeta(s.key).label} · {Math.round((s.count / total) * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
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
  const { weeklyReport: liveReport, loadLatestReport } = useAppStore();

  const [testGenerating, setTestGenerating] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  // Dev-only: reports otherwise only ever arrive via the schedule (see
  // Home's countdown settings) -- this lets us trigger one on demand while
  // testing, without exposing manual generation to real users.
  const handleTestGenerate = async () => {
    setTestGenerating(true);
    setTestError(null);
    try {
      await generateReport();
      await loadLatestReport();
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Не удалось сгенерировать отчёт');
    } finally {
      setTestGenerating(false);
    }
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
          appreciationHighlight: envelope.report.appreciationHighlight,
          loveMapNote: envelope.report.loveMapNote,
          reflectionQuestion: envelope.report.reflectionQuestion,
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

  const allEntries = r ? [...r.myEntries, ...r.partnerEntries] : [];
  const moodPoints = buildMoodByDay(allEntries);
  const emotionSlices = buildEmotionPalette(allEntries);

  const stagger = useStagger(1);

  // The story itself is the point of opening this screen -- everything else
  // (stats, facts, charts) is detail worth having but not worth greeting
  // someone with, so it stays collapsed until asked for instead of stacking
  // into a wall of text on open.
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [renderDetails, setRenderDetails] = useState(false);
  const detailsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (detailsOpen) {
      setRenderDetails(true);
      detailsAnim.setValue(0);
      Animated.timing(detailsAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    } else {
      Animated.timing(detailsAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setRenderDetails(false));
    }
  }, [detailsOpen, detailsAnim]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={10}>
          <Ionicons name="close" size={20} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{r?.weekLabel ?? 'Отчёт'}</Text>
        <View style={[styles.closeBtn, { backgroundColor: 'transparent' }]} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {historicalError && <Text style={styles.error}>⚠️ {historicalError}</Text>}

        {__DEV__ && testError && <Text style={styles.error}>⚠️ {testError}</Text>}

        {loadingHistorical ? (
          <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.roseDark} />
        ) : !r ? (
          <View style={styles.emptyWrap}>
            <Mascot pose="reading" size={96} style={{ marginBottom: spacing.md }} />
            <Text style={styles.emptyTitle}>Отчёта пока нет</Text>
            <Text style={styles.emptyHint}>
              AI соберёт историю недели автоматически, в день и час, указанные в настройках отчёта
            </Text>
            {__DEV__ && !id && (
              <Button
                label={testGenerating ? 'Генерируем…' : '🧪 Сгенерировать (тест)'}
                onPress={handleTestGenerate}
                loading={testGenerating}
                variant="outline"
                style={{ marginTop: spacing.xl }}
              />
            )}
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

              {__DEV__ && !id && (
                <Pressable onPress={handleTestGenerate} disabled={testGenerating} hitSlop={6} style={styles.testLink}>
                  {testGenerating ? (
                    <ActivityIndicator size="small" color={colors.roseDark} />
                  ) : (
                    <Ionicons name="flask-outline" size={13} color={colors.roseDark} />
                  )}
                  <Text style={styles.testLinkText}>
                    {testGenerating ? 'Генерируем…' : 'Перегенерировать (тест)'}
                  </Text>
                </Pressable>
              )}

              <View style={styles.narrativeCard}>
                <Text style={styles.narrativeMark}>❝</Text>
                <Text style={styles.narrative}>{r.narrative}</Text>
              </View>

              <Pressable style={styles.toggle} onPress={() => setDetailsOpen((v) => !v)} hitSlop={6}>
                <Text style={styles.toggleText}>{detailsOpen ? 'Свернуть' : 'Показать подробнее'}</Text>
                <Animated.View
                  style={{
                    transform: [
                      { rotate: detailsAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) },
                    ],
                  }}
                >
                  <Ionicons name="chevron-down" size={16} color={colors.roseDark} />
                </Animated.View>
              </Pressable>
            </Animated.View>

            {renderDetails && (
            <Animated.View style={{ opacity: detailsAnim }}>
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

              {!!r.appreciationHighlight && (
                <View style={styles.appreciationBox}>
                  <View style={styles.insightHeaderRow}>
                    <Ionicons name="heart" size={13} color={colors.roseDark} />
                    <Text style={[styles.insightLabel, { color: colors.roseDark }]}>Момент благодарности</Text>
                  </View>
                  <Text style={styles.appreciationText}>{r.appreciationHighlight}</Text>
                </View>
              )}

              {!!r.loveMapNote && (
                <View style={styles.loveMapBox}>
                  <View style={styles.insightHeaderRow}>
                    <Ionicons name="bulb-outline" size={14} color={colors.skyDark} />
                    <Text style={[styles.insightLabel, { color: colors.skyDark }]}>Может быть, вы не знали</Text>
                  </View>
                  <Text style={styles.loveMapText}>{r.loveMapNote}</Text>
                </View>
              )}

              {emotionSlices.length > 0 && (
                <View style={styles.paletteSection}>
                  <Text style={styles.sectionLabel}>Эмоциональная палитра недели</Text>
                  <EmotionPaletteBar slices={emotionSlices} total={allEntries.length} />
                </View>
              )}

              {moodPoints.length > 1 && (
                <View style={styles.moodSection}>
                  <Text style={styles.sectionLabel}>Настроение по дням</Text>
                  <MoodByDayChart points={moodPoints} />
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

              {stats && (
                <View style={styles.statsSection}>
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
                </View>
              )}

              {!!r.reflectionQuestion && (
                <View style={styles.reflectionBox}>
                  <Ionicons name="chatbubbles-outline" size={18} color={colors.roseDark} style={{ marginBottom: spacing.sm }} />
                  <Text style={styles.reflectionText}>{r.reflectionQuestion}</Text>
                </View>
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
  testLink: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginTop: spacing.md,
  },
  testLinkText: { ...type.bodySm, color: colors.roseDark, marginLeft: 4 },
  narrativeCard: {
    marginTop: spacing.xl, backgroundColor: colors.cardSoft,
    borderRadius: radius.xl, padding: spacing.xl,
  },
  narrativeMark: {
    ...type.h1, color: colors.roseLight, lineHeight: 28, marginBottom: -spacing.sm,
  },
  narrative: { ...type.bodyLg, color: colors.ink, lineHeight: 27 },
  toggle: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginTop: spacing.xl,
    backgroundColor: colors.roseMist, borderRadius: radius.pill,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  toggleText: { ...type.bodySm, fontFamily: type.bodySemibold.fontFamily, color: colors.roseDark, marginRight: 4 },
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
  appreciationBox: {
    marginTop: spacing.lg, backgroundColor: colors.roseMist,
    borderRadius: radius.lg, padding: spacing.lg,
  },
  appreciationText: { ...type.body, color: colors.ink, lineHeight: 21 },
  loveMapBox: {
    marginTop: spacing.lg, backgroundColor: colors.skyMist,
    borderRadius: radius.lg, padding: spacing.lg,
  },
  loveMapText: { ...type.body, color: colors.ink, lineHeight: 21 },
  reflectionBox: {
    marginTop: spacing.xl, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.xl,
  },
  reflectionText: {
    ...type.bodyLg, fontFamily: type.bodySemibold.fontFamily, color: colors.ink,
    textAlign: 'center', lineHeight: 25,
  },
  sectionLabel: {
    ...type.label, color: colors.inkMuted, textTransform: 'uppercase', marginBottom: spacing.md,
  },
  paletteSection: { marginTop: spacing.xl },
  paletteBar: {
    flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', backgroundColor: colors.border,
  },
  paletteLegend: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md },
  paletteLegendItem: {
    flexDirection: 'row', alignItems: 'center', marginRight: spacing.lg, marginBottom: spacing.xs,
  },
  paletteDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  paletteLegendText: { ...type.bodySm, color: colors.inkSoft },
  moodSection: { marginTop: spacing.xl },
  moodChartRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
  },
  moodChartCol: { alignItems: 'center', flex: 1 },
  moodChartTrack: { width: '100%', height: 56, alignItems: 'center' },
  moodChartBaseline: {
    position: 'absolute', top: '50%', left: '15%', right: '15%', height: 1, backgroundColor: colors.border,
  },
  moodChartBar: { position: 'absolute', width: 8, left: '50%', marginLeft: -4, borderRadius: 4 },
  moodChartLabel: { ...type.bodySm, fontSize: 10, color: colors.inkMuted, marginTop: 4 },
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
});
