import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { colors, radius, spacing, type } from '../../src/theme';

export default function Welcome() {
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.hero} edges={['top']}>
        <View style={[styles.blob, styles.blobLarge]} />
        <View style={[styles.blob, styles.blobSmall]} />

        <View style={styles.brand}>
          <Text style={styles.wordmark}>together</Text>
          <Text style={styles.tagline}>нежное пространство для двоих</Text>
        </View>

        <View style={styles.heroCenter}>
          <View style={styles.heartWrap}>
            <Text style={styles.heartEmoji}>💌</Text>
          </View>
          <Text style={styles.heroLine}>Пишите о чувствах.{'\n'}Понимайте друг друга.</Text>
        </View>
      </SafeAreaView>

      <SafeAreaView style={styles.sheet} edges={['bottom']}>
        <Text style={styles.sheetTitle}>Добро пожаловать</Text>
        <Text style={styles.sheetSubtitle}>
          Каждую неделю — немного заботы. Без обвинений, без спешки.
        </Text>

        <Button label="Создать аккаунт" onPress={() => router.push('/(auth)/signup')} style={{ marginTop: spacing.xl }} />
        <Button
          label="Войти"
          variant="outline"
          onPress={() => router.push('/(auth)/login')}
          style={{ marginTop: spacing.md }}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.sageDark },
  hero: {
    flex: 1,
    backgroundColor: colors.sageDark,
    paddingHorizontal: spacing.xl,
    overflow: 'hidden',
  },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: colors.sage, opacity: 0.55 },
  blobLarge: { width: 260, height: 260, top: -80, right: -70 },
  blobSmall: { width: 140, height: 140, bottom: 40, left: -50, backgroundColor: colors.roseLight, opacity: 0.35 },
  brand: { marginTop: spacing.xl },
  wordmark: { ...type.h1, fontSize: 34, color: colors.onDark },
  tagline: { ...type.body, color: colors.sageMist, marginTop: 4 },
  heroCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: spacing.xxxl },
  heartWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  heartEmoji: { fontSize: 44 },
  heroLine: { ...type.h3, color: colors.onDark, textAlign: 'center', lineHeight: 26 },
  sheet: {
    backgroundColor: colors.cream,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  sheetTitle: { ...type.h2, color: colors.ink },
  sheetSubtitle: { ...type.body, color: colors.inkMuted, marginTop: spacing.xs },
});
