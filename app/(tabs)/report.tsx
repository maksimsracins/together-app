import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { ReportView } from '../../src/components/ReportView';
import { useAppStore } from '../../src/store/useAppStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { getCoupleSettings } from '../../src/services/couples';
import { colors, spacing, type } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const WEEKDAY_DATIVE_PLURAL = [
  '', 'понедельникам', 'вторникам', 'средам', 'четвергам', 'пятницам', 'субботам', 'воскресеньям',
];

export default function Report() {
  const user = useAuthStore((s) => s.user)!;
  const partner = useAuthStore((s) => s.partner);
  const {
    weeklyReport: r,
    togglePlanItem,
    setEntryReaction,
    generateReport,
    reportStatus,
    reportError,
    reportSource,
    reportGeneratedAt,
  } = useAppStore();
  const isLoading = reportStatus === 'loading';
  const [reportWeekday, setReportWeekday] = useState<number | null>(null);
  const [reportHour, setReportHour] = useState<number | null>(null);

  useEffect(() => {
    getCoupleSettings()
      .then((s) => {
        setReportWeekday(s.reportWeekday);
        setReportHour(s.reportHour);
      })
      .catch(() => {});
  }, []);

  return (
    <Screen>
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
          onTogglePlanItem={togglePlanItem}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.xl },
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
