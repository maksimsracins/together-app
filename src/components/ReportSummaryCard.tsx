import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { colors, radius, spacing, type } from '../theme';

export function ReportSummaryCard({ narrative, narrativeDeep }: { narrative: string; narrativeDeep: string }) {
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
    <Card style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryHeaderEmoji}>📖</Text>
        <Text style={styles.summaryHeaderTitle}>Ваша история недели</Text>
      </View>
      <Text style={styles.summaryText}>{narrative}</Text>

      <Pressable
        style={({ pressed }) => [styles.detailsToggle, pressed && { opacity: 0.85 }]}
        onPress={() => setDetailsOpen((v) => !v)}
        hitSlop={6}
      >
        <Text style={styles.detailsToggleText}>{detailsOpen ? 'Свернуть' : 'Подробнее'}</Text>
        <Animated.View
          style={{
            transform: [{ rotate: detailsAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }],
          }}
        >
          <Ionicons name="chevron-down" size={16} color={colors.roseDark} />
        </Animated.View>
      </Pressable>

      {renderDetails && (
        <Animated.View style={{ opacity: detailsAnim }}>
          <View style={styles.deepAnalysisBox}>
            <Text style={styles.deepAnalysisText}>{narrativeDeep}</Text>
          </View>
        </Animated.View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
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
});
