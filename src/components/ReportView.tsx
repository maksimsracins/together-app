import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { emotionMeta, entryTypeMeta } from '../data/catalog';
import { WeeklyReportEntry } from '../types';
import { colors, radius, shadow, spacing, type } from '../theme';
import { formatDayLabel } from '../utils/week';

interface TimelineEntry extends WeeklyReportEntry {
  mine: boolean;
}

const REACTIONS = ['❤️', '🥰', '😂', '😢', '👏'];

export interface ReportViewData {
  myEntries: WeeklyReportEntry[];
  partnerEntries: WeeklyReportEntry[];
  narrative: string;
  narrativeDeep: string;
}

export function ReportView({
  report,
  myName,
  partnerName,
  onReact,
}: {
  report: ReportViewData;
  myName: string;
  partnerName: string | null;
  onReact: (entryId: string, emoji: string | null) => void;
}) {
  // Centralized so opening one bubble's reaction picker — or tapping anywhere
  // else on the screen — always closes any other one that was open.
  const [openPickerId, setOpenPickerId] = useState<string | null>(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [renderDetails, setRenderDetails] = useState(false);
  const detailsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (detailsOpen) {
      setRenderDetails(true);
      detailsAnim.setValue(0);
      Animated.timing(detailsAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    } else {
      Animated.timing(detailsAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setRenderDetails(false));
    }
  }, [detailsOpen, detailsAnim]);

  const dayGroups = useMemo(() => {
    const timeline: TimelineEntry[] = [
      ...report.myEntries.map((e) => ({ ...e, mine: true })),
      ...report.partnerEntries.map((e) => ({ ...e, mine: false })),
    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const map = new Map<string, TimelineEntry[]>();
    timeline.forEach((e) => {
      const key = formatDayLabel(new Date(e.createdAt));
      map.set(key, [...(map.get(key) ?? []), e]);
    });
    return Array.from(map.entries());
  }, [report.myEntries, report.partnerEntries]);

  return (
    <Pressable onPress={() => setOpenPickerId(null)}>
      {dayGroups.length === 0 ? (
        <Text style={[styles.emptyText, { marginTop: spacing.lg }]}>Записей за этот период нет</Text>
      ) : (
        dayGroups.map(([day, items]) => (
          <View key={day} style={{ marginTop: spacing.md }}>
            <Text style={styles.dayDivider}>{day}</Text>
            {items.map((entry) => (
              <ChatBubble
                key={entry.id}
                entry={entry}
                name={entry.mine ? myName : partnerName ?? 'Партнёр'}
                pickerOpen={openPickerId === entry.id}
                onOpenPicker={() => setOpenPickerId(entry.id)}
                onClosePicker={() => setOpenPickerId(null)}
                onReact={(emoji) => onReact(entry.id, emoji)}
              />
            ))}
          </View>
        ))
      )}

      <Card style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryHeaderEmoji}>📖</Text>
          <Text style={styles.summaryHeaderTitle}>Ваша история недели</Text>
        </View>
        <Text style={styles.summaryText}>{report.narrative}</Text>

        <Pressable
          style={({ pressed }) => [styles.detailsToggle, pressed && { opacity: 0.85 }]}
          onPress={() => setDetailsOpen((v) => !v)}
          hitSlop={6}
        >
          <Text style={styles.detailsToggleText}>{detailsOpen ? 'Свернуть' : 'Подробнее'}</Text>
          <Animated.View
            style={{
              transform: [
                { rotate: detailsAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) },
              ],
            }}
          >
            <Ionicons name="chevron-down" size={16} color={colors.roseDark} />
          </Animated.View>
        </Pressable>

        {renderDetails && (
          <Animated.View style={{ opacity: detailsAnim }}>
            <View style={styles.deepAnalysisBox}>
              <Text style={styles.deepAnalysisText}>{report.narrativeDeep}</Text>
            </View>
          </Animated.View>
        )}
      </Card>
    </Pressable>
  );
}

const DOUBLE_TAP_MS = 260;

function ChatBubble({
  entry,
  name,
  pickerOpen,
  onOpenPicker,
  onClosePicker,
  onReact,
}: {
  entry: TimelineEntry;
  name: string;
  pickerOpen: boolean;
  onOpenPicker: () => void;
  onClosePicker: () => void;
  onReact: (emoji: string | null) => void;
}) {
  const lastTapRef = useRef(0);
  const pickerAnim = useRef(new Animated.Value(0)).current;
  // Stays mounted a beat longer than `pickerOpen`/`reactionEmoji` so the close
  // animation can actually play instead of things just vanishing.
  const [renderPicker, setRenderPicker] = useState(pickerOpen);
  const [renderTag, setRenderTag] = useState(!!entry.reactionEmoji);
  const [displayEmoji, setDisplayEmoji] = useState(entry.reactionEmoji);
  const tagAnim = useRef(new Animated.Value(entry.reactionEmoji ? 1 : 0)).current;

  const typeMeta = entryTypeMeta(entry.type);
  const emo = emotionMeta(entry.emotion);
  const time = new Date(entry.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    if (pickerOpen) {
      setRenderPicker(true);
      pickerAnim.setValue(0);
      Animated.spring(pickerAnim, { toValue: 1, friction: 6, useNativeDriver: true }).start();
    } else {
      Animated.timing(pickerAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
        setRenderPicker(false);
      });
    }
  }, [pickerOpen, pickerAnim]);

  useEffect(() => {
    if (entry.reactionEmoji) {
      setDisplayEmoji(entry.reactionEmoji);
      setRenderTag(true);
      tagAnim.setValue(0);
      Animated.spring(tagAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
    } else {
      Animated.timing(tagAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
        setRenderTag(false);
      });
    }
  }, [entry.reactionEmoji, tagAnim]);

  const handleTap = () => {
    if (pickerOpen) {
      onClosePicker();
      return;
    }
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      onReact(entry.reactionEmoji === '❤️' ? null : '❤️');
    } else {
      lastTapRef.current = now;
    }
  };

  const pick = (emoji: string) => {
    onReact(entry.reactionEmoji === emoji ? null : emoji);
    onClosePicker();
  };

  return (
    <View style={[styles.bubbleRow, entry.mine ? styles.bubbleRowMine : styles.bubbleRowPartner]}>
      <View style={styles.bubbleWrap}>
        <Text style={[styles.bubbleName, entry.mine ? styles.bubbleNameMine : styles.bubbleNamePartner]}>{name}</Text>

        {renderPicker && (
          <Animated.View
            pointerEvents={pickerOpen ? 'auto' : 'none'}
            style={[
              styles.reactionPicker,
              entry.mine ? { right: 0 } : { left: 0 },
              {
                opacity: pickerAnim,
                transform: [{ scale: pickerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
              },
            ]}
          >
            {REACTIONS.map((emoji) => (
              <Pressable key={emoji} onPress={() => pick(emoji)} hitSlop={4}>
                <Text style={styles.reactionOption}>{emoji}</Text>
              </Pressable>
            ))}
          </Animated.View>
        )}

        <Pressable onPress={handleTap} onLongPress={onOpenPicker} delayLongPress={350}>
          <View style={[styles.bubble, entry.mine ? styles.bubbleMine : styles.bubblePartner]}>
            <Text style={styles.bubbleBadge}>{typeMeta.emoji} {emo.emoji} {emo.label}</Text>
            <Text style={styles.bubbleText}>{entry.text}</Text>
            <Text style={styles.bubbleTime}>{time}</Text>
          </View>
          {renderTag && (
            <Animated.View
              style={[
                styles.reactionTag,
                entry.mine ? styles.reactionTagMine : styles.reactionTagPartner,
                { opacity: tagAnim, transform: [{ scale: tagAnim }] },
              ]}
            >
              <Text style={styles.reactionTagText}>{displayEmoji}</Text>
            </Animated.View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dayDivider: {
    ...type.label, color: colors.inkMuted, textAlign: 'center', textTransform: 'uppercase', marginBottom: spacing.md,
  },
  bubbleRow: { flexDirection: 'row', marginBottom: spacing.sm },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowPartner: { justifyContent: 'flex-start' },
  bubbleWrap: { maxWidth: '62%' },
  bubbleName: { ...type.label, fontSize: 11, color: colors.inkMuted, marginBottom: 2 },
  bubbleNameMine: { textAlign: 'right' },
  bubbleNamePartner: { textAlign: 'left' },
  bubble: { borderRadius: radius.lg, padding: spacing.md },
  bubbleMine: { backgroundColor: colors.roseMist, borderBottomRightRadius: 4 },
  bubblePartner: { backgroundColor: colors.skyMist, borderBottomLeftRadius: 4 },
  bubbleBadge: { ...type.bodySm, fontFamily: type.bodySemibold.fontFamily, color: colors.inkSoft, marginBottom: 4 },
  bubbleText: { ...type.body, color: colors.ink },
  bubbleTime: { ...type.label, fontSize: 10, color: colors.inkMuted, marginTop: 4, textAlign: 'right' },
  reactionTag: {
    position: 'absolute', bottom: -10, width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
  },
  reactionTagMine: { left: -8 },
  reactionTagPartner: { right: -8 },
  reactionTagText: { fontSize: 14 },
  reactionPicker: {
    position: 'absolute', bottom: '100%', marginBottom: 6, zIndex: 20,
    flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm, ...shadow.soft,
  },
  reactionOption: { fontSize: 22 },
  summaryCard: { marginTop: spacing.lg, padding: spacing.lg },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  summaryHeaderEmoji: { fontSize: 20, marginRight: spacing.sm },
  summaryHeaderTitle: { ...type.h3, color: colors.ink },
  summaryText: { ...type.bodyLg, color: colors.ink, lineHeight: 25 },
  detailsToggle: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: spacing.md,
    backgroundColor: colors.roseMist, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: 7,
  },
  detailsToggleText: {
    ...type.bodySm, fontFamily: type.bodySemibold.fontFamily, color: colors.roseDark, marginRight: 4,
  },
  deepAnalysisBox: {
    backgroundColor: colors.creamDeep, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md,
    borderLeftWidth: 3, borderLeftColor: colors.rose,
  },
  deepAnalysisText: { ...type.body, color: colors.inkSoft, lineHeight: 22 },
  emptyText: { ...type.body, color: colors.inkMuted, textAlign: 'center' },
});
