import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ReportView, ReportViewData } from '../../src/components/ReportView';
import { useAuthStore } from '../../src/store/useAuthStore';
import { getReportHistoryDetail } from '../../src/services/report';
import { setEntryReaction } from '../../src/services/entries';
import { colors, spacing, type } from '../../src/theme';

export default function ReportHistoryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user)!;
  const partner = useAuthStore((s) => s.partner);
  const [weekLabel, setWeekLabel] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [report, setReport] = useState<ReportViewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getReportHistoryDetail(id)
      .then((envelope) => {
        setWeekLabel(envelope.weekLabel);
        setGeneratedAt(envelope.generatedAt);
        setReport({
          myEntries: envelope.report.myEntries,
          partnerEntries: envelope.report.partnerEntries,
          narrative: envelope.report.narrative,
          narrativeDeep: envelope.report.narrativeDeep,
        });
      })
      .catch(() => setError('Не удалось загрузить отчёт'));
  }, [id]);

  const handleReact = async (entryId: string, emoji: string | null) => {
    const updated = await setEntryReaction(entryId, emoji);
    setReport((prev) => {
      if (!prev) return prev;
      const apply = (list: typeof prev.myEntries) =>
        list.map((e) => (e.id === entryId ? { ...e, reactionEmoji: updated.reactionEmoji } : e));
      return { ...prev, myEntries: apply(prev.myEntries), partnerEntries: apply(prev.partnerEntries) };
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{weekLabel ?? 'Отчёт'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {generatedAt && (
          <Text style={styles.date}>
            {new Date(generatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        )}

        {error ? (
          <Text style={styles.emptyText}>⚠️ {error}</Text>
        ) : !report ? (
          <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.roseDark} />
        ) : (
          <ReportView
            report={report}
            myName={user.name}
            partnerName={partner?.name ?? null}
            onReact={handleReact}
          />
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
  backBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { ...type.h3, color: colors.ink, flex: 1, textAlign: 'center' },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
  date: { ...type.bodySm, color: colors.inkMuted, textAlign: 'center', marginBottom: spacing.md },
  emptyText: { ...type.body, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.xl },
});
