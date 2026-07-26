import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../src/components/Button';
import { useAppStore } from '../../src/store/useAppStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { getReportHistoryDetail } from '../../src/services/report';
import { emotionMeta } from '../../src/data/catalog';
import { EmotionKey, WeeklyReport, WeeklyReportEntry } from '../../src/types';
import { colors, radius, spacing, type } from '../../src/theme';

function wordCount(entries: WeeklyReportEntry[]) {
  return entries.reduce((sum, e) => sum + e.text.trim().split(/\s+/).filter(Boolean).length, 0);
}

function photoCount(entries: WeeklyReportEntry[]) {
  return entries.filter((e) => e.hasPhoto).length;
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

function BarLine({ name, value, max, color }: { name: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 6 : 0) : 0;
  return (
    <View style={styles.barLine}>
      <Text style={styles.barName} numberOfLines={1}>{name}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.barValue}>{value}</Text>
    </View>
  );
}

// Buckets entries by calendar day (not weekday name) since the report window
// is a rolling "since last report" span, not always Mon-Sun -- a real date
// per column is the only thing that stays correct if that window ever drifts.
function buildDailyActivity(mine: WeeklyReportEntry[], partnerEntries: WeeklyReportEntry[]) {
  const dayKey = (iso: string) => iso.slice(0, 10);
  const days = new Map<string, { mine: number; partner: number }>();
  for (const e of mine) {
    const k = dayKey(e.createdAt);
    const cur = days.get(k) ?? { mine: 0, partner: 0 };
    cur.mine += 1;
    days.set(k, cur);
  }
  for (const e of partnerEntries) {
    const k = dayKey(e.createdAt);
    const cur = days.get(k) ?? { mine: 0, partner: 0 };
    cur.partner += 1;
    days.set(k, cur);
  }
  return Array.from(days.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));
}

function DayColumn({ date, mine, partner, max, hasPartner }: { date: string; mine: number; partner: number; max: number; hasPartner: boolean }) {
  const barMaxHeight = 44;
  const mineHeight = max > 0 ? Math.max((mine / max) * barMaxHeight, mine > 0 ? 4 : 0) : 0;
  const partnerHeight = max > 0 ? Math.max((partner / max) * barMaxHeight, partner > 0 ? 4 : 0) : 0;
  const label = new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric' });
  return (
    <View style={styles.dayCol}>
      <View style={styles.dayBars}>
        <View style={[styles.dayBar, { height: mineHeight, backgroundColor: colors.rose }]} />
        {hasPartner && <View style={[styles.dayBar, { height: partnerHeight, backgroundColor: colors.sky }]} />}
      </View>
      <Text style={styles.dayColLabel}>{label}</Text>
    </View>
  );
}

function StatBlock({
  icon,
  label,
  mine,
  partner,
  partnerName,
}: {
  icon: string;
  label: string;
  mine: number;
  partner: number | null;
  partnerName: string;
}) {
  const max = Math.max(mine, partner ?? 0, 1);
  return (
    <View style={styles.statBlock}>
      <View style={styles.statHeaderRow}>
        <Text style={styles.statIcon}>{icon}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <BarLine name="Я" value={mine} max={max} color={colors.rose} />
      {partner !== null && <BarLine name={partnerName} value={partner} max={max} color={colors.sky} />}
    </View>
  );
}

export default function ReportSummary() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const partner = useAuthStore((s) => s.partner);
  const { weeklyReport: liveReport, generateReport, reportStatus, reportError } = useAppStore();
  const isGenerating = reportStatus === 'loading';

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
  const partnerName = partner?.name ?? 'Партнёр';

  const stats = r
    ? {
        entriesMine: r.myEntries.length,
        entriesPartner: partner ? r.partnerEntries.length : null,
        wordsMine: wordCount(r.myEntries),
        wordsPartner: partner ? wordCount(r.partnerEntries) : null,
        photosMine: photoCount(r.myEntries),
        photosPartner: partner ? photoCount(r.partnerEntries) : null,
        moodMine: dominantEmotion(r.myEntries),
        moodPartner: partner ? dominantEmotion(r.partnerEntries) : null,
      }
    : null;

  const dailyActivity = r ? buildDailyActivity(r.myEntries, partner ? r.partnerEntries : []) : [];
  const dailyMax = Math.max(...dailyActivity.map((d) => Math.max(d.mine, d.partner)), 1);

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
        {!id && reportStatus === 'error' && <Text style={styles.error}>⚠️ {reportError}</Text>}
        {historicalError && <Text style={styles.error}>⚠️ {historicalError}</Text>}

        {loadingHistorical ? (
          <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.roseDark} />
        ) : !r ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>📖</Text>
            <Text style={styles.emptyTitle}>Отчёта пока нет</Text>
            <Text style={styles.emptyHint}>
              AI разберёт ваши записи за неделю и сплетёт из них общую историю
            </Text>
            <Button
              label={isGenerating ? 'Генерируем…' : 'Сгенерировать отчёт'}
              onPress={generateReport}
              loading={isGenerating}
              style={{ marginTop: spacing.xl }}
            />
          </View>
        ) : (
          <>
            <Text style={styles.heroEmoji}>💌</Text>
            <Text style={styles.title}>Ваша история недели</Text>

            {!id && (
              <Pressable style={styles.refresh} onPress={generateReport} disabled={isGenerating} hitSlop={6}>
                {isGenerating ? (
                  <ActivityIndicator size="small" color={colors.roseDark} />
                ) : (
                  <Ionicons name="refresh-outline" size={14} color={colors.roseDark} />
                )}
                <Text style={styles.refreshText}>{isGenerating ? 'Генерируем…' : 'Обновить'}</Text>
              </Pressable>
            )}

            <Text style={styles.narrative}>{r.narrative}</Text>

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

            {stats && (
              <View style={styles.statsSection}>
                <Text style={styles.statsTitle}>Неделя в цифрах</Text>

                <StatBlock
                  icon="✍️"
                  label="Записи"
                  mine={stats.entriesMine}
                  partner={stats.entriesPartner}
                  partnerName={partnerName}
                />
                <StatBlock
                  icon="📝"
                  label="Слов написано"
                  mine={stats.wordsMine}
                  partner={stats.wordsPartner}
                  partnerName={partnerName}
                />
                {(stats.photosMine > 0 || (stats.photosPartner ?? 0) > 0) && (
                  <StatBlock
                    icon="📷"
                    label="Фото добавлено"
                    mine={stats.photosMine}
                    partner={stats.photosPartner}
                    partnerName={partnerName}
                  />
                )}

                {(stats.moodMine || stats.moodPartner) && (
                  <View style={styles.moodRow}>
                    {stats.moodMine && (
                      <View style={styles.moodChip}>
                        <Text style={styles.moodEmoji}>{emotionMeta(stats.moodMine).emoji}</Text>
                        <Text style={styles.moodText}>
                          Я чаще всего — {emotionMeta(stats.moodMine).label.toLowerCase()}
                        </Text>
                      </View>
                    )}
                    {stats.moodPartner && (
                      <View style={styles.moodChip}>
                        <Text style={styles.moodEmoji}>{emotionMeta(stats.moodPartner).emoji}</Text>
                        <Text style={styles.moodText}>
                          {partnerName} чаще всего — {emotionMeta(stats.moodPartner).label.toLowerCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {dailyActivity.length > 1 && (
                  <View style={styles.dayChartBlock}>
                    <Text style={styles.statLabel}>Активность по дням</Text>
                    <View style={styles.dayChartRow}>
                      {dailyActivity.map((d) => (
                        <DayColumn
                          key={d.date}
                          date={d.date}
                          mine={d.mine}
                          partner={d.partner}
                          max={dailyMax}
                          hasPartner={!!partner}
                        />
                      ))}
                    </View>
                  </View>
                )}
              </View>
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
  heroEmoji: { fontSize: 40, textAlign: 'center', marginBottom: spacing.md },
  title: { ...type.h2, color: colors.ink, textAlign: 'center', marginBottom: spacing.md },
  refresh: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginBottom: spacing.xl,
  },
  refreshText: { ...type.bodySm, fontFamily: type.bodySemibold.fontFamily, color: colors.roseDark, marginLeft: 4 },
  narrative: { ...type.bodyLg, color: colors.ink, lineHeight: 27 },
  weatherRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.lg },
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
  statsSection: {
    marginTop: spacing.xl, paddingTop: spacing.xl,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  statsTitle: {
    ...type.label, color: colors.inkMuted, textTransform: 'uppercase', marginBottom: spacing.lg,
  },
  statBlock: { marginBottom: spacing.lg },
  statHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  statIcon: { fontSize: 15, marginRight: 6 },
  statLabel: { ...type.bodySemibold, fontFamily: type.bodySemibold.fontFamily, color: colors.ink },
  barLine: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  barName: { ...type.bodySm, color: colors.inkMuted, width: 64 },
  barTrack: {
    flex: 1, height: 8, borderRadius: radius.pill, backgroundColor: colors.card,
    overflow: 'hidden', marginHorizontal: spacing.sm,
  },
  barFill: { height: '100%', borderRadius: radius.pill },
  barValue: { ...type.bodySm, fontFamily: type.bodySemibold.fontFamily, color: colors.ink, width: 24, textAlign: 'right' },
  moodRow: { marginTop: spacing.xs },
  moodChip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.roseMist,
    borderRadius: radius.pill, paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    marginBottom: spacing.sm, alignSelf: 'flex-start',
  },
  moodEmoji: { fontSize: 15, marginRight: 6 },
  moodText: { ...type.bodySm, color: colors.roseDark },
  dayChartBlock: { marginTop: spacing.md },
  dayChartRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    marginTop: spacing.md, paddingHorizontal: 2,
  },
  dayCol: { alignItems: 'center' },
  dayBars: { flexDirection: 'row', alignItems: 'flex-end', height: 44 },
  dayBar: { width: 5, borderRadius: 3, marginHorizontal: 1.5 },
  dayColLabel: { ...type.bodySm, fontSize: 10, color: colors.inkMuted, marginTop: 4 },
  historyLink: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center',
    marginTop: spacing.xl, paddingTop: spacing.lg,
  },
  historyLinkText: {
    ...type.bodySm, fontFamily: type.bodySemibold.fontFamily, color: colors.sageDark,
    marginHorizontal: 6,
  },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxxl },
  emptyEmoji: { fontSize: 40, marginBottom: spacing.md },
  emptyTitle: { ...type.h3, color: colors.ink, marginBottom: spacing.xs },
  emptyHint: { ...type.body, color: colors.inkMuted, textAlign: 'center', maxWidth: 280 },
});
