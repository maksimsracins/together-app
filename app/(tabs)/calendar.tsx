import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
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
import { Button } from '../../src/components/Button';
import { EntryCard } from '../../src/components/EntryCard';
import { Mascot } from '../../src/components/Mascot';
import { useAppStore } from '../../src/store/useAppStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { getPartnerActivity, listAllEntries } from '../../src/services/entries';
import { Entry } from '../../src/types';
import { colors, radius, spacing, type } from '../../src/theme';
import { daysUntilNextReport, pluralDays } from '../../src/utils/week';

type Author = 'mine' | 'partner';
interface Selection {
  date: Date;
  author: Author;
}

const WEEKDAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function CalendarScreen() {
  const partnerEntries = useAppStore((s) => s.partnerEntries);
  const partner = useAuthStore((s) => s.partner);
  const { coupleSettings } = useAppStore();

  const [weekCursor, setWeekCursor] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selected, setSelected] = useState<Selection>({ date: new Date(), author: 'mine' });
  const [myEntries, setMyEntries] = useState<Entry[] | null>(null);
  const [partnerActivityDates, setPartnerActivityDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Refetch on every focus (not just mount) so adding, editing, or deleting an
  // entry elsewhere in the app is reflected here as soon as you come back —
  // this is now the only place your own entries are browsable.
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setLoadError(null);
      Promise.all([listAllEntries(), getPartnerActivity()])
        .then(([mine, activity]) => {
          setMyEntries(mine);
          setPartnerActivityDates(activity.createdAts.map((iso) => new Date(iso)));
        })
        .catch(() => setLoadError('Не удалось загрузить записи'))
        .finally(() => setLoading(false));
    }, [])
  );

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

  const hasPartnerActivity = (day: Date) => partnerActivityDates.some((d) => isSameDay(d, day));

  const selectedEntries = useMemo(() => {
    const source = selected.author === 'mine' ? myEntries : partnerEntries;
    return (source ?? [])
      .filter((e) => isSameDay(new Date(e.createdAt), selected.date))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [myEntries, partnerEntries, selected]);

  // Partner activity can be "known" (a dot showing they wrote something)
  // before it's actually visible (only once a report unlocks it) -- so an
  // empty list for a day with a dot means "hidden," not "nothing happened."
  const partnerActivityHiddenOnSelected =
    selected.author === 'partner' && selectedEntries.length === 0 && hasPartnerActivity(selected.date);

  const daysUntilReveal = coupleSettings
    ? daysUntilNextReport(coupleSettings.reportWeekday, coupleSettings.reportHour)
    : null;
  const revealHint =
    daysUntilReveal === null ? '' : daysUntilReveal === 0 ? 'сегодня' : `через ${daysUntilReveal} ${pluralDays(daysUntilReveal)}`;

  const weekLabel = `${format(weekCursor, 'd MMM', { locale: ru })} – ${format(endOfWeek(weekCursor, { weekStartsOn: 1 }), 'd MMM', { locale: ru })}`;

  return (
    <Screen>
      <Text style={styles.title}>Календарь</Text>
      <Text style={styles.subtitle}>
        {partner ? 'Выберите день и кто именно — вы или партнёр' : 'Выберите день, чтобы увидеть записи'}
      </Text>

      <Card style={{ marginTop: spacing.md }}>
        <View style={styles.weekHeader}>
          <Pressable onPress={() => goToWeek(subWeeks(weekCursor, 1))} hitSlop={10} style={styles.weekNavBtn}>
            <Ionicons name="chevron-back" size={18} color={colors.roseDark} />
          </Pressable>
          <Text style={styles.weekLabel}>{weekLabel}</Text>
          <Pressable onPress={() => goToWeek(addWeeks(weekCursor, 1))} hitSlop={10} style={styles.weekNavBtn}>
            <Ionicons name="chevron-forward" size={18} color={colors.roseDark} />
          </Pressable>
        </View>

        <View style={styles.gridRow}>
          <View style={styles.rowLabelCell} />
          {weekDays.map((day) => (
            <View key={day.toISOString()} style={styles.dayHeaderCell}>
              <Text style={[styles.dayHeaderWeekday, isTodayFn(day) && { color: colors.roseDark }]}>
                {WEEKDAY_SHORT[(day.getDay() + 6) % 7]}
              </Text>
              <Text style={[styles.dayHeaderDate, isTodayFn(day) && { color: colors.roseDark }]}>
                {format(day, 'd')}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.gridRow}>
          <View style={styles.rowLabelCell}>
            <Text style={[styles.rowLabelText, { color: colors.roseDark }]}>Я</Text>
          </View>
          {weekDays.map((day) => {
            const active = selected.author === 'mine' && isSameDay(day, selected.date);
            return (
              <Pressable
                key={day.toISOString()}
                style={styles.dayCellWrap}
                onPress={() => setSelected({ date: day, author: 'mine' })}
              >
                <View style={[styles.cell, { backgroundColor: active ? colors.rose : colors.roseMist }]}>
                  {hasEntry(myEntries, day) && (
                    <View style={[styles.dot, { backgroundColor: active ? colors.white : colors.roseDark }]} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {partner && (
          <View style={styles.gridRow}>
            <View style={styles.rowLabelCell}>
              <Text
                style={[styles.rowLabelText, { color: colors.skyDark }]}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {partner.name}
              </Text>
            </View>
            {weekDays.map((day) => {
              const active = selected.author === 'partner' && isSameDay(day, selected.date);
              return (
                <Pressable
                  key={day.toISOString()}
                  style={styles.dayCellWrap}
                  onPress={() => setSelected({ date: day, author: 'partner' })}
                >
                  <View style={[styles.cell, { backgroundColor: active ? colors.skyDark : colors.skyMist }]}>
                    {hasPartnerActivity(day) && (
                      <View style={[styles.dot, { backgroundColor: active ? colors.white : colors.skyDark }]} />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
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
          {partnerActivityHiddenOnSelected ? (
            <Text style={{ fontSize: 28, marginBottom: spacing.sm }}>🔒</Text>
          ) : (
            <Mascot pose="sleepy" size={80} style={{ marginBottom: spacing.sm }} />
          )}
          <Text style={styles.emptyText}>
            {partnerActivityHiddenOnSelected
              ? `Партнёр кое-что добавил(а) — откроется${revealHint ? ` ${revealHint}` : ''}`
              : 'Записей за этот день нет'}
          </Text>
          {selected.author === 'mine' && isTodayFn(selected.date) && (
            <Button label="Добавить запись" onPress={() => router.push('/entry/new')} style={{ marginTop: spacing.lg }} />
          )}
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
  title: { ...type.h2, color: colors.ink, marginTop: spacing.md },
  subtitle: { ...type.body, color: colors.inkMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
  weekHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md,
  },
  weekNavBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
  },
  weekLabel: { ...type.bodySemibold, fontFamily: type.bodySemibold.fontFamily, color: colors.ink },
  gridRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs,
  },
  rowLabelCell: { width: 82, paddingRight: spacing.xs },
  rowLabelText: { ...type.bodySm, fontSize: 12, lineHeight: 15, fontFamily: type.bodySemibold.fontFamily },
  dayHeaderCell: { flex: 1, alignItems: 'center' },
  dayHeaderWeekday: { ...type.label, fontSize: 11, color: colors.inkMuted, textTransform: 'uppercase' },
  dayHeaderDate: { ...type.bodySm, color: colors.inkMuted, marginTop: 1 },
  dayCellWrap: { flex: 1, alignItems: 'center' },
  cell: {
    width: 36, height: 36, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  selectedLabel: {
    ...type.label, color: colors.roseDark, textTransform: 'uppercase',
    marginTop: spacing.xl, marginBottom: spacing.md,
  },
  emptyText: { ...type.body, color: colors.inkMuted, textAlign: 'center' },
});
