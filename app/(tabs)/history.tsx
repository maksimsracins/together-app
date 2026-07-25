import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { isSameDay } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { EntryCard } from '../../src/components/EntryCard';
import { Button } from '../../src/components/Button';
import { useAppStore } from '../../src/store/useAppStore';
import { listAllEntries } from '../../src/services/entries';
import { Entry } from '../../src/types';
import { colors, spacing, type } from '../../src/theme';
import { formatDayLabel } from '../../src/utils/week';

function groupByDay(list: Entry[]) {
  const map = new Map<string, Entry[]>();
  list.forEach((e) => {
    const key = formatDayLabel(new Date(e.createdAt));
    map.set(key, [...(map.get(key) ?? []), e]);
  });
  return Array.from(map.entries());
}

const isToday = (e: Entry) => isSameDay(new Date(e.createdAt), new Date());

export default function History() {
  const entries = useAppStore((s) => s.entries);

  const [olderExpanded, setOlderExpanded] = useState(false);
  const [olderMine, setOlderMine] = useState<Entry[] | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState<string | null>(null);

  const todayEntries = useMemo(() => entries.filter(isToday), [entries]);

  const olderEntries = useMemo(() => {
    // Rest of the current week is already loaded (`entries` is this week's
    // entries) — only the truly older stuff needs the lazy full fetch.
    const restOfWeek = entries.filter((e) => !isToday(e));
    const older = (olderMine ?? []).filter((e) => !entries.some((cur) => cur.id === e.id));
    return [...restOfWeek, ...older].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [entries, olderMine]);

  const groupedToday = useMemo(() => groupByDay(todayEntries), [todayEntries]);
  const groupedOlder = useMemo(() => groupByDay(olderEntries), [olderEntries]);

  const handleToggleOlder = async () => {
    if (olderExpanded) {
      setOlderExpanded(false);
      return;
    }
    setOlderExpanded(true);
    if (olderMine !== null) return;
    setLoadingOlder(true);
    setOlderError(null);
    try {
      const all = await listAllEntries();
      setOlderMine(all);
    } catch {
      setOlderError('Не удалось загрузить историю');
    } finally {
      setLoadingOlder(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Мои записи</Text>
      <Text style={styles.subtitle}>Ваши записи за сегодня</Text>

      {todayEntries.length === 0 ? (
        <Card style={{ alignItems: 'center', marginTop: spacing.lg }}>
          <Text style={{ fontSize: 28, marginBottom: spacing.sm }}>🌱</Text>
          <Text style={styles.emptyText}>Записей пока нет</Text>
          <Button label="Добавить запись" onPress={() => router.push('/entry/new')} style={{ marginTop: spacing.lg }} />
        </Card>
      ) : (
        groupedToday.map(([day, items]) => (
          <View key={day} style={{ marginBottom: spacing.lg }}>
            <Text style={styles.dayLabel}>{day}</Text>
            {items.map((e) => (
              <EntryCard key={e.id} entry={e} editable />
            ))}
          </View>
        ))
      )}

      <Pressable style={styles.olderToggle} onPress={handleToggleOlder} hitSlop={8}>
        <Text style={styles.olderToggleText}>
          {olderExpanded ? 'Скрыть более ранние записи' : 'Показать более ранние записи'}
        </Text>
        <Ionicons name={olderExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.roseDark} />
      </Pressable>

      {olderExpanded && (
        loadingOlder ? (
          <ActivityIndicator style={{ marginVertical: spacing.lg }} color={colors.roseDark} />
        ) : olderError ? (
          <Text style={styles.notifyError}>⚠️ {olderError}</Text>
        ) : groupedOlder.length === 0 ? (
          <Text style={styles.emptyText}>Более ранних записей нет</Text>
        ) : (
          groupedOlder.map(([day, items]) => (
            <View key={day} style={{ marginBottom: spacing.lg }}>
              <Text style={styles.dayLabel}>{day}</Text>
              {items.map((e) => (
                <EntryCard key={e.id} entry={e} editable />
              ))}
            </View>
          ))
        )
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.h2, color: colors.ink, marginTop: spacing.lg },
  subtitle: { ...type.body, color: colors.inkMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
  dayLabel: { ...type.label, color: colors.roseDark, textTransform: 'uppercase', marginBottom: spacing.md },
  emptyText: { ...type.body, color: colors.inkMuted, textAlign: 'center' },
  notifyError: { ...type.bodySm, color: colors.danger, textAlign: 'center', marginBottom: spacing.md },
  olderToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.md, marginBottom: spacing.md,
  },
  olderToggleText: { ...type.bodySm, fontFamily: type.bodySemibold.fontFamily, color: colors.roseDark, marginRight: 4 },
});
