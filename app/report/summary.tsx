import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../src/components/Button';
import { useAppStore } from '../../src/store/useAppStore';
import { colors, radius, spacing, type } from '../../src/theme';

export default function ReportSummary() {
  const { weeklyReport: r, generateReport, reportStatus, reportError } = useAppStore();
  const isGenerating = reportStatus === 'loading';

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

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={10}>
          <Ionicons name="close" size={20} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{r?.weekLabel ?? 'Отчёт'}</Text>
        <Pressable onPress={generateReport} disabled={isGenerating} style={styles.headerBtn} hitSlop={10}>
          {isGenerating ? (
            <ActivityIndicator size="small" color={colors.roseDark} />
          ) : (
            <Ionicons name="refresh-outline" size={19} color={colors.roseDark} />
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {reportStatus === 'error' && <Text style={styles.error}>⚠️ {reportError}</Text>}

        {!r ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>📖</Text>
            <Text style={styles.emptyTitle}>Отчёта пока нет</Text>
            <Text style={styles.emptyHint}>
              AI разберёт ваши записи за неделю и сплетёт из них общую историю
            </Text>
            <Button
              label={isGenerating ? 'Генерируем…' : 'Сгенерировать отчёт'}
              onPress={generateReport}
              loading={isGenerating}
              style={{ marginTop: spacing.xl }}
            />
          </View>
        ) : (
          <>
            <Text style={styles.heroEmoji}>💌</Text>
            <Text style={styles.title}>Ваша история недели</Text>
            <Text style={styles.narrative}>{r.narrative}</Text>

            <Pressable style={styles.toggle} onPress={() => setDetailsOpen((v) => !v)} hitSlop={6}>
              <Text style={styles.toggleText}>{detailsOpen ? 'Свернуть' : 'Читать подробнее'}</Text>
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
                <View style={styles.deepBox}>
                  <Text style={styles.deepText}>{r.narrativeDeep}</Text>
                </View>
              </Animated.View>
            )}
          </>
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
  headerBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { ...type.bodySm, fontFamily: type.bodySemibold.fontFamily, color: colors.inkMuted, flex: 1, textAlign: 'center' },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxxl, flexGrow: 1 },
  error: { ...type.bodySm, color: colors.danger, textAlign: 'center', marginBottom: spacing.lg },
  heroEmoji: { fontSize: 40, textAlign: 'center', marginBottom: spacing.md },
  title: { ...type.h2, color: colors.ink, textAlign: 'center', marginBottom: spacing.xl },
  narrative: { ...type.bodyLg, color: colors.ink, lineHeight: 27 },
  toggle: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginTop: spacing.xl,
    backgroundColor: colors.roseMist, borderRadius: radius.pill,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  toggleText: { ...type.bodySm, fontFamily: type.bodySemibold.fontFamily, color: colors.roseDark, marginRight: 4 },
  deepBox: {
    marginTop: spacing.xl, paddingTop: spacing.xl,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  deepText: { ...type.bodyLg, color: colors.inkSoft, lineHeight: 26 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxxl },
  emptyEmoji: { fontSize: 40, marginBottom: spacing.md },
  emptyTitle: { ...type.h3, color: colors.ink, marginBottom: spacing.xs },
  emptyHint: { ...type.body, color: colors.inkMuted, textAlign: 'center', maxWidth: 280 },
});
