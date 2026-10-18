import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { colors, radius, shadow, spacing, type } from '../theme';
import { useT } from '../i18n';
import { TOUR_STEPS, TourRoute } from './steps';
import { useTourStore } from './useTourStore';

const PATHNAME: Record<TourRoute, string> = { '/(tabs)': '/', '/(tabs)/calendar': '/calendar', '/(tabs)/profile': '/profile' };
const HOLE_PADDING = 8;
const DIM_COLOR = 'rgba(30, 20, 15, 0.72)';

// Rendered in a transparent Modal so it always sits above the native tab
// screens and owns every touch while the tour runs.
export function TourOverlay() {
  const t = useT();
  const pathname = usePathname();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const active = useTourStore((s) => s.active);
  const index = useTourStore((s) => s.index);
  const rect = useTourStore((s) => s.rect);
  const next = useTourStore((s) => s.next);
  const finish = useTourStore((s) => s.finish);
  const fade = useRef(new Animated.Value(0)).current;

  const step = TOUR_STEPS[index];
  const total = TOUR_STEPS.length;
  const isLast = index === total - 1;

  useEffect(() => {
    if (active && pathname !== PATHNAME[step.route]) router.navigate(step.route);
  }, [active, index]);

  // A target scrolled out of view (e.g. Profile left scrolled down) falls
  // back to the centered card rather than pointing at nothing.
  const onScreen = !!rect && rect.y + rect.height > 0 && rect.y < screenH;
  const hole = step.target && rect && onScreen
    ? {
        x: Math.max(0, rect.x - HOLE_PADDING),
        y: Math.max(0, rect.y - HOLE_PADDING),
        w: rect.width + HOLE_PADDING * 2,
        h: rect.height + HOLE_PADDING * 2,
      }
    : null;
  const waitingForTarget = !!step.target && !rect;

  useEffect(() => {
    fade.setValue(0);
    if (!waitingForTarget) Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [index, waitingForTarget, hole?.x, hole?.y]);

  if (!active) return null;

  // Card goes below the spotlight when there's room, otherwise above it.
  const cardPosition = !hole
    ? { top: screenH * 0.3 }
    : hole.y + hole.h < screenH * 0.58
      ? { top: hole.y + hole.h + spacing.md }
      : { bottom: screenH - hole.y + spacing.md };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={finish}>
      <View style={StyleSheet.absoluteFill}>
        {hole ? (
          <>
            <View style={[styles.dim, { left: 0, top: 0, width: screenW, height: hole.y }]} />
            <View style={[styles.dim, { left: 0, top: hole.y + hole.h, width: screenW, bottom: 0 }]} />
            <View style={[styles.dim, { left: 0, top: hole.y, width: hole.x, height: hole.h }]} />
            <View style={[styles.dim, { left: hole.x + hole.w, top: hole.y, right: 0, height: hole.h }]} />
            <View pointerEvents="none" style={[styles.ring, { left: hole.x, top: hole.y, width: hole.w, height: hole.h }]} />
          </>
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.dimFill]} />
        )}

        {!waitingForTarget && (
          <Animated.View style={[styles.card, cardPosition, { opacity: fade }]}>
            <Text style={styles.title}>{t(step.title)}</Text>
            <Text style={styles.body}>{t(step.body)}</Text>

            <View style={styles.footer}>
              <Text style={styles.counter}>
                {index + 1}/{total}
              </Text>
              <View style={{ flex: 1 }} />
              {!isLast && (
                <Pressable onPress={finish} hitSlop={8} style={styles.skipBtn}>
                  <Text style={styles.skipLabel}>{t('tour.skip')}</Text>
                </Pressable>
              )}
              <Pressable onPress={next} style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.85 }]}>
                <Text style={styles.nextLabel}>{isLast ? t('tour.finish') : t('tour.next')}</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Lets the user bail out even while a target is still measuring. */}
        {waitingForTarget && (
          <Pressable onPress={finish} style={styles.floatingSkip} hitSlop={8}>
            <Text style={styles.floatingSkipLabel}>{t('tour.skip')}</Text>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { position: 'absolute', backgroundColor: DIM_COLOR },
  dimFill: { backgroundColor: DIM_COLOR },
  ring: {
    position: 'absolute',
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.85)',
  },
  card: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.soft,
  },
  title: { ...type.h2, color: colors.ink },
  body: { ...type.body, color: colors.inkMuted, marginTop: spacing.xs },
  footer: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg },
  counter: { ...type.bodySm, fontFamily: type.bodySemibold.fontFamily, color: colors.inkMuted },
  skipBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, marginRight: spacing.xs },
  skipLabel: { ...type.bodySm, fontFamily: type.bodySemibold.fontFamily, color: colors.inkMuted },
  nextBtn: {
    backgroundColor: colors.rose,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  nextLabel: { ...type.bodySm, fontFamily: type.bodySemibold.fontFamily, color: colors.white },
  floatingSkip: { position: 'absolute', top: 60, right: spacing.xl },
  floatingSkipLabel: { ...type.body, fontFamily: type.bodySemibold.fontFamily, color: colors.white },
});
