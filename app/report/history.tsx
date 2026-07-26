import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { BackHeader } from '../../src/components/BackHeader';
import { Card } from '../../src/components/Card';
import { Mascot } from '../../src/components/Mascot';
import { getReportHistory, ReportHistoryItem } from '../../src/services/report';
import { colors, spacing, type } from '../../src/theme';

export default function ReportHistory() {
  const [items, setItems] = useState<ReportHistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getReportHistory()
      .then(setItems)
      .catch(() => setError('Не удалось загрузить историю'));
  }, []);

  return (
    <Screen>
      <BackHeader title="Прошлые недели" />

      {error ? (
        <Text style={styles.emptyText}>⚠️ {error}</Text>
      ) : !items ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.roseDark} />
      ) : items.length === 0 ? (
        <Card style={{ alignItems: 'center' }}>
          <Mascot pose="reading" size={80} style={{ marginBottom: spacing.sm }} />
          <Text style={styles.emptyText}>Пока нет ни одного отчёта</Text>
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
            <Text style={styles.rowDate}>{format(new Date(item.generatedAt), 'd MMMM', { locale: ru })}</Text>
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
