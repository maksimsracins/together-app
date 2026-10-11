import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { colors, radius, spacing, type } from '../../src/theme';
import { LANGUAGES, LANGUAGE_NAMES, useLang, useLanguageStore, useT } from '../../src/i18n';

export default function Welcome() {
  const t = useT();
  const lang = useLang();
  const setLang = useLanguageStore((s) => s.setLang);
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.hero} edges={['top']}>
        <View style={[styles.blob, styles.blobLarge]} />
        <View style={[styles.blob, styles.blobSmall]} />

        <View style={styles.langRow}>
          {LANGUAGES.map((l) => (
            <Pressable key={l} onPress={() => setLang(l)} hitSlop={6}>
              <Text style={[styles.langOption, l === lang && styles.langOptionActive]}>{LANGUAGE_NAMES[l]}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.brand}>
          <Text style={styles.wordmark}>together</Text>
          <Text style={styles.tagline}>{t('welcome.tagline')}</Text>
        </View>

        <View style={styles.heroCenter}>
          <View style={styles.heartWrap}>
            <Text style={styles.heartEmoji}>💌</Text>
          </View>
          <Text style={styles.heroLine}>{t('welcome.hero')}</Text>
        </View>
      </SafeAreaView>

      <SafeAreaView style={styles.sheet} edges={['bottom']}>
        <Text style={styles.sheetTitle}>{t('welcome.title')}</Text>
        <Text style={styles.sheetSubtitle}>
          {t('welcome.body')}
        </Text>

        <Button label={t('auth.createAccount')} onPress={() => router.push('/(auth)/signup')} style={{ marginTop: spacing.xl }} />
        <Button
          label={t('auth.signIn')}
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
  langRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.sm },
  langOption: { ...type.body, color: colors.sageMist, opacity: 0.7 },
  langOptionActive: { color: colors.onDark, opacity: 1 },
  brand: { marginTop: spacing.md },
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
