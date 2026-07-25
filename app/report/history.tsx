import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../src/components/Card';
import { getReportHistory, ReportHistoryItem } from '../../src/services/report';
import { colors, spacing, type } from '../../src/theme';

export default function ReportHistory() {
  const [items, setItems] = useState<ReportHistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getReportHistory()
      .then(setItems)
      .catch(() => setError('Не удалось загрузить историю отчётов'));
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </Pressable>
        <Text style={styles.title}>История отчётов</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        {items === null ? (
          <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.roseDark} />
        ) : error ? (
          <Text style={styles.emptyText}>⚠️ {error}</Text>
        ) : items.length === 0 ? (
          <Card style={{ alignItems: 'center', marginTop: spacing.lg }}>
            <Text style={{ fontSize: 28, marginBottom: spacing.sm }}>📖</Text>
            <Text style={styles.emptyText}>Отчётов пока нет</Text>
          </Card>
        ) : (
          items.map((item) => (
            <Pressable key={item.id} onPress={() => router.push(`/report/${item.id}`)}>
              <Card style={styles.itemCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemWeek}>{item.weekLabel}</Text>
                  <Text style={styles.itemDate}>
                    {new Date(item.generatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                  <Text style={styles.itemPreview} numberOfLines={2}>{item.narrative}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
              </Card>
            </Pressable>
          ))
        )}
      </View>
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
  title: { ...type.h3, color: colors.ink },
  content: { flex: 1, paddingHorizontal: spacing.xl },
  itemCard: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  itemWeek: { ...type.bodySemibold, fontFamily: type.bodySemibold.fontFamily, color: colors.ink },
  itemDate: { ...type.bodySm, color: colors.inkMuted, marginTop: 2 },
  itemPreview: { ...type.bodySm, color: colors.inkSoft, marginTop: spacing.sm },
  emptyText: { ...type.body, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.xl },
});
