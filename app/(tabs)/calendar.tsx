import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday as isTodayFn,
  startOfMonth,
  startOfWeek,
  subMonths,
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

type TimelineEntry = Entry & { mine: boolean };

const WEEKDAY_LETTERS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function CalendarScreen() {
  const partnerEntries = useAppStore((s) => s.partnerEntries);
  const partner = useAuthStore((s) => s.partner);

  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [myEntries, setMyEntries] = useState<Entry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    listAllEntries()
      .then(setMyEntries)
      .catch(() => setLoadError('Не удалось загрузить записи'))
      .finally(() => setLoading(false));
  }, []);

  const allTimeline = useMemo<TimelineEntry[]>(() => {
    const mine = (myEntries ?? []).map((e) => ({ ...e, mine: true }));
    const theirs = partnerEntries.map((e) => ({ ...e, mine: false }));
    return [...mine, ...theirs];
  }, [myEntries, partnerEntries]);

  // Which days in the visible month have at least one entry — drives the dot
  // under each date so you can spot activity before drilling into a day.
  const daysWithEntries = useMemo(() => {
    const set = new Set<string>();
    allTimeline.forEach((e) => set.add(format(new Date(e.createdAt), 'yyyy-MM-dd')));
    return set;
  }, [allTimeline]);

  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthCursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(monthCursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [monthCursor]);

  const selectedDayEntries = useMemo(() => {
    return allTimeline
      .filter((e) => isSameDay(new Date(e.createdAt), selectedDate))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allTimeline, selectedDate]);

  const authorLabel = (mine: boolean) => (partner ? (mine ? 'Вы' : partner.name) : undefined);

  return (
    <Screen>
      <Text style={styles.title}>Календарь</Text>
      <Text style={styles.subtitle}>Выберите день, чтобы увидеть записи</Text>

      <Card style={{ marginTop: spacing.lg }}>
        <View style={styles.monthHeader}>
          <Pressable onPress={() => setMonthCursor((m) => subMonths(m, 1))} hitSlop={10} style={styles.monthNavBtn}>
            <Ionicons name="chevron-back" size={18} color={colors.roseDark} />
          </Pressable>
          <Text style={styles.monthLabel}>{format(monthCursor, 'LLLL yyyy', { locale: ru })}</Text>
          <Pressable onPress={() => setMonthCursor((m) => addMonths(m, 1))} hitSlop={10} style={styles.monthNavBtn}>
            <Ionicons name="chevron-forward" size={18} color={colors.roseDark} />
          </Pressable>
        </View>

        <View style={styles.weekdayRow}>
          {WEEKDAY_LETTERS.map((w) => (
            <Text key={w} style={styles.weekdayLabel}>{w}</Text>
          ))}
        </View>

        <View style={styles.grid}>
          {gridDays.map((day) => {
            const inMonth = isSameMonth(day, monthCursor);
            const selected = isSameDay(day, selectedDate);
            const hasEntries = daysWithEntries.has(format(day, 'yyyy-MM-dd'));
            return (
              <Pressable
                key={day.toISOString()}
                style={styles.dayCell}
                onPress={() => setSelectedDate(day)}
              >
                <View style={[styles.dayCircle, selected && styles.dayCircleSelected]}>
                  <Text
                    style={[
                      styles.dayNumber,
                      !inMonth && styles.dayNumberMuted,
                      selected && styles.dayNumberSelected,
                      isTodayFn(day) && !selected && styles.dayNumberToday,
                    ]}
                  >
                    {format(day, 'd')}
                  </Text>
                </View>
                {hasEntries && <View style={[styles.dot, selected && styles.dotSelected]} />}
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Text style={styles.selectedLabel}>
        {isTodayFn(selectedDate) ? 'Сегодня' : format(selectedDate, 'd MMMM, EEEE', { locale: ru })}
      </Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.roseDark} />
      ) : loadError ? (
        <Text style={styles.emptyText}>⚠️ {loadError}</Text>
      ) : selectedDayEntries.length === 0 ? (
        <Card style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 28, marginBottom: spacing.sm }}>🌤️</Text>
          <Text style={styles.emptyText}>Записей за этот день нет</Text>
        </Card>
      ) : (
        selectedDayEntries.map((e) => (
          <EntryCard
            key={e.id}
            entry={e}
            editable={e.mine}
            authorLabel={authorLabel(e.mine)}
            mine={partner ? e.mine : undefined}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.h2, color: colors.ink, marginTop: spacing.lg },
  subtitle: { ...type.body, color: colors.inkMuted, marginTop: spacing.xs },
  monthHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md,
  },
  monthNavBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
  },
  monthLabel: {
    ...type.bodySemibold, fontFamily: type.bodySemibold.fontFamily, color: colors.ink, textTransform: 'capitalize',
  },
  weekdayRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekdayLabel: {
    flex: 1, textAlign: 'center', ...type.label, fontSize: 11, color: colors.inkMuted,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 },
  dayCircle: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
  },
  dayCircleSelected: { backgroundColor: colors.rose },
  dayNumber: { ...type.body, color: colors.ink },
  dayNumberMuted: { color: colors.inkMuted, opacity: 0.5 },
  dayNumberSelected: { color: colors.white, fontFamily: type.bodySemibold.fontFamily },
  dayNumberToday: { color: colors.roseDark, fontFamily: type.bodySemibold.fontFamily },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.sage, marginTop: 2 },
  dotSelected: { backgroundColor: colors.roseDark },
  selectedLabel: {
    ...type.label, color: colors.roseDark, textTransform: 'uppercase',
    marginTop: spacing.xl, marginBottom: spacing.md,
  },
  emptyText: { ...type.body, color: colors.inkMuted, textAlign: 'center' },
});
