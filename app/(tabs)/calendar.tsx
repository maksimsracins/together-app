import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  addWeeks,
  endOfWeek,
  format,
  isSameDay,
  isToday as isTodayFn,
  startOfWeek,
  subWeeks,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { EntryCard } from '../../src/components/EntryCard';
import { useAppStore } from '../../src/store/useAppStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { listAllEntries } from '../../src/services/entries';
import { Entry } from '../../src/types';
import { colors, radius, spacing, type } from '../../src/theme';

type Author = 'mine' | 'partner';
interface Selection {
  date: Date;
  author: Author;
}

const WEEKDAY_LABELS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

export default function CalendarScreen() {
  const partnerEntries = useAppStore((s) => s.partnerEntries);
  const partner = useAuthStore((s) => s.partner);

  const [weekCursor, setWeekCursor] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selected, setSelected] = useState<Selection>({ date: new Date(), author: 'mine' });
  const [myEntries, setMyEntries] = useState<Entry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    listAllEntries()
      .then(setMyEntries)
      .catch(() => setLoadError('Не удалось загрузить записи'))
      .finally(() => setLoading(false));
  }, []);

  const goToWeek = (newCursor: Date) => {
    setWeekCursor(newCursor);
    setSelected((s) => {
      const inNewWeek = new Date() >= newCursor && new Date() < addWeeks(newCursor, 1);
      return { date: inNewWeek ? new Date() : newCursor, author: s.author };
    });
  };

  const weekDays = useMemo(() => {
    const start = weekCursor;
    return Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * 24 * 60 * 60 * 1000));
  }, [weekCursor]);

  const hasEntry = (list: Entry[] | null, day: Date) =>
    !!list?.some((e) => isSameDay(new Date(e.createdAt), day));

  const selectedEntries = useMemo(() => {
    const source = selected.author === 'mine' ? myEntries : partnerEntries;
    return (source ?? [])
      .filter((e) => isSameDay(new Date(e.createdAt), selected.date))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [myEntries, partnerEntries, selected]);

  const weekLabel = `${format(weekCursor, 'd MMM', { locale: ru })} – ${format(endOfWeek(weekCursor, { weekStartsOn: 1 }), 'd MMM', { locale: ru })}`;

  return (
    <Screen>
      <Text style={styles.title}>Календарь</Text>
      <Text style={styles.subtitle}>
        {partner ? 'Выберите день и кто именно — вы или партнёр' : 'Выберите день, чтобы увидеть записи'}
      </Text>

      <Card style={{ marginTop: spacing.lg }}>
        <View style={styles.weekHeader}>
          <Pressable onPress={() => goToWeek(subWeeks(weekCursor, 1))} hitSlop={10} style={styles.weekNavBtn}>
            <Ionicons name="chevron-back" size={18} color={colors.roseDark} />
          </Pressable>
          <Text style={styles.weekLabel}>{weekLabel}</Text>
          <Pressable onPress={() => goToWeek(addWeeks(weekCursor, 1))} hitSlop={10} style={styles.weekNavBtn}>
            <Ionicons name="chevron-forward" size={18} color={colors.roseDark} />
          </Pressable>
        </View>

        {partner && (
          <View style={styles.columnHeader}>
            <View style={{ flex: 1 }} />
            <Text style={[styles.columnLabel, { color: colors.roseDark }]}>Я</Text>
            <Text style={[styles.columnLabel, { color: colors.skyDark }]} numberOfLines={1}>{partner.name}</Text>
          </View>
        )}

        {weekDays.map((day) => {
          const mineActive = selected.author === 'mine' && isSameDay(day, selected.date);
          const partnerActive = selected.author === 'partner' && isSameDay(day, selected.date);
          return (
            <View key={day.toISOString()} style={styles.dayRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.dayLabel, isTodayFn(day) && { color: colors.roseDark }]}>
                  {WEEKDAY_LABELS[(day.getDay() + 6) % 7]}
                </Text>
                <Text style={styles.dayDate}>{format(day, 'd MMMM', { locale: ru })}</Text>
              </View>

              <Pressable
                style={[
                  styles.cell,
                  { backgroundColor: mineActive ? colors.rose : colors.roseMist },
                ]}
                onPress={() => setSelected({ date: day, author: 'mine' })}
              >
                {hasEntry(myEntries, day) && (
                  <View style={[styles.dot, { backgroundColor: mineActive ? colors.white : colors.roseDark }]} />
                )}
              </Pressable>

              {partner && (
                <Pressable
                  style={[
                    styles.cell,
                    { backgroundColor: partnerActive ? colors.skyDark : colors.skyMist },
                  ]}
                  onPress={() => setSelected({ date: day, author: 'partner' })}
                >
                  {hasEntry(partnerEntries, day) && (
                    <View style={[styles.dot, { backgroundColor: partnerActive ? colors.white : colors.skyDark }]} />
                  )}
                </Pressable>
              )}
            </View>
          );
        })}
      </Card>

      <Text style={styles.selectedLabel}>
        {selected.author === 'mine' ? 'Ваши записи' : `Записи ${partner?.name ?? 'партнёра'}`}
        {' — '}
        {isTodayFn(selected.date) ? 'сегодня' : format(selected.date, 'd MMMM', { locale: ru })}
      </Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.roseDark} />
      ) : loadError ? (
        <Text style={styles.emptyText}>⚠️ {loadError}</Text>
      ) : selectedEntries.length === 0 ? (
        <Card style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 28, marginBottom: spacing.sm }}>🌤️</Text>
          <Text style={styles.emptyText}>Записей за этот день нет</Text>
        </Card>
      ) : (
        selectedEntries.map((e) => (
          <EntryCard key={e.id} entry={e} editable={selected.author === 'mine'} />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.h2, color: colors.ink, marginTop: spacing.lg },
  subtitle: { ...type.body, color: colors.inkMuted, marginTop: spacing.xs },
  weekHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md,
  },
  weekNavBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
  },
  weekLabel: { ...type.bodySemibold, fontFamily: type.bodySemibold.fontFamily, color: colors.ink },
  columnHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  columnLabel: {
    ...type.label, fontSize: 11, textTransform: 'uppercase', width: 40, textAlign: 'center', marginLeft: spacing.sm,
  },
  dayRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  dayLabel: { ...type.bodySm, fontFamily: type.bodySemibold.fontFamily, color: colors.ink },
  dayDate: { ...type.bodySm, color: colors.inkMuted, marginTop: 1 },
  cell: {
    width: 40, height: 40, borderRadius: radius.md, marginLeft: spacing.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  selectedLabel: {
    ...type.label, color: colors.roseDark, textTransform: 'uppercase',
    marginTop: spacing.xl, marginBottom: spacing.md,
  },
  emptyText: { ...type.body, color: colors.inkMuted, textAlign: 'center' },
});
