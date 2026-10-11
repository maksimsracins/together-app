import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { BackHeader } from '../../src/components/BackHeader';
import { Card } from '../../src/components/Card';
import { Mascot } from '../../src/components/Mascot';
import { getReportHistory, ReportHistoryItem } from '../../src/services/report';
import { colors, spacing, type } from '../../src/theme';
import { dateLocale, useLang, useT } from '../../src/i18n';

export default function ReportHistory() {
  const t = useT();
  const lang = useLang();
  const [items, setItems] = useState<ReportHistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getReportHistory()
      .then(setItems)
      .catch(() => setError(t('history.loadFailed')));
  }, [lang]);

  return (
    <Screen>
      <BackHeader title={t('history.title')} />

      {error ? (
        <Text style={styles.emptyText}>⚠️ {error}</Text>
      ) : !items ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.roseDark} />
      ) : items.length === 0 ? (
        <Card style={{ alignItems: 'center' }}>
          <Mascot pose="reading" size={80} style={{ marginBottom: spacing.sm }} />
          <Text style={styles.emptyText}>{t('history.empty')}</Text>
        </Card>
      ) : (
        items.map((item) => (
          <Pressable
            key={item.id}
            style={styles.row}
            onPress={() => router.push({ pathname: '/report/summary', params: { id: item.id } })}
          >
            <Text style={styles.emoji}>💌</Text>
            <Text style={styles.rowLabel} numberOfLines={1}>{item.weekLabel}</Text>
            <Text style={styles.rowDate}>{format(new Date(item.generatedAt), 'd MMMM', { locale: dateLocale(lang) })}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    borderRadius: 16, padding: spacing.lg, marginBottom: spacing.md,
  },
  emoji: { fontSize: 20, marginRight: spacing.md },
  rowLabel: { ...type.bodySemibold, fontFamily: type.bodySemibold.fontFamily, color: colors.ink, flex: 1 },
  rowDate: { ...type.bodySm, color: colors.inkMuted, marginRight: spacing.sm },
  emptyText: { ...type.body, color: colors.inkMuted, textAlign: 'center' },
});
