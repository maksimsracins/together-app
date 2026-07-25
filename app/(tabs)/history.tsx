import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { isSameWeek } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { EntryCard } from '../../src/components/EntryCard';
import { Button } from '../../src/components/Button';
import { useAppStore } from '../../src/store/useAppStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { listAllEntries } from '../../src/services/entries';
import { Entry } from '../../src/types';
import { colors, spacing, type } from '../../src/theme';
import { formatDayLabel } from '../../src/utils/week';

type TimelineEntry = Entry & { mine: boolean };

function groupByDay(list: TimelineEntry[]) {
  const map = new Map<string, TimelineEntry[]>();
  list.forEach((e) => {
    const key = formatDayLabel(new Date(e.createdAt));
    map.set(key, [...(map.get(key) ?? []), e]);
  });
  return Array.from(map.entries());
}

function mergeSortDesc(mine: Entry[], partner: Entry[]): TimelineEntry[] {
  return [...mine.map((e) => ({ ...e, mine: true })), ...partner.map((e) => ({ ...e, mine: false }))].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

const isCurrentWeek = (e: Entry) => isSameWeek(new Date(e.createdAt), new Date(), { weekStartsOn: 1 });

export default function History() {
  const entries = useAppStore((s) => s.entries);
  const partnerEntries = useAppStore((s) => s.partnerEntries);
  const partner = useAuthStore((s) => s.partner);

  const [olderExpanded, setOlderExpanded] = useState(false);
  const [olderMine, setOlderMine] = useState<Entry[] | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState<string | null>(null);

  const currentTimeline = useMemo(() => {
    const partnerThisWeek = partnerEntries.filter(isCurrentWeek);
    return mergeSortDesc(entries, partnerThisWeek);
  }, [entries, partnerEntries]);

  const olderTimeline = useMemo(() => {
    if (olderMine === null) return [];
    const mineOlder = olderMine.filter((e) => !isCurrentWeek(e));
    const partnerOlder = partnerEntries.filter((e) => !isCurrentWeek(e));
    return mergeSortDesc(mineOlder, partnerOlder);
  }, [olderMine, partnerEntries]);

  const groupedCurrent = useMemo(() => groupByDay(currentTimeline), [currentTimeline]);
  const groupedOlder = useMemo(() => groupByDay(olderTimeline), [olderTimeline]);

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

  const authorLabel = (mine: boolean) => (partner ? (mine ? 'Вы' : partner.name) : undefined);

  return (
    <Screen>
      <Text style={styles.title}>История</Text>
      <Text style={styles.subtitle}>
        {partner ? 'Ваши записи и записи партнёра — вместе, по дням' : 'Ваши записи по дням'}
      </Text>

      {currentTimeline.length === 0 ? (
        <Card style={{ alignItems: 'center', marginTop: spacing.lg }}>
          <Text style={{ fontSize: 28, marginBottom: spacing.sm }}>🌱</Text>
          <Text style={styles.emptyText}>Записей пока нет</Text>
          <Button label="Добавить запись" onPress={() => router.push('/entry/new')} style={{ marginTop: spacing.lg }} />
        </Card>
      ) : (
        groupedCurrent.map(([day, items]) => (
          <View key={day} style={{ marginBottom: spacing.lg }}>
            <Text style={styles.dayLabel}>{day}</Text>
            {items.map((e) => (
              <EntryCard key={e.id} entry={e} editable={e.mine} authorLabel={authorLabel(e.mine)} mine={partner ? e.mine : undefined} />
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
                <EntryCard key={e.id} entry={e} editable={e.mine} authorLabel={authorLabel(e.mine)} mine={partner ? e.mine : undefined} />
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
