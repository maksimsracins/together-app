import React, { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { SectionHeader } from '../../src/components/SectionHeader';
import { Chip } from '../../src/components/Chip';
import { Avatar } from '../../src/components/Avatar';
import { Button } from '../../src/components/Button';
import { LoveLanguagesInfoButton } from '../../src/components/LoveLanguagesInfo';
import { loveLanguageLabel } from '../../src/data/catalog';
import { useAppStore } from '../../src/store/useAppStore';
import { ApiError } from '../../src/services/http';
import { intlLocale, Lang, LANGUAGE_NAMES, LANGUAGES, plural, useLang, useT } from '../../src/i18n';
import { useAuthStore } from '../../src/store/useAuthStore';
import { API_BASE_URL } from '../../src/services/http';
import { colors, radius, spacing, type } from '../../src/theme';
import { differenceInDays } from 'date-fns';

export default function Profile() {
  const user = useAuthStore((s) => s.user)!;
  const partner = useAuthStore((s) => s.partner);
  const logout = useAuthStore((s) => s.logout);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const loadLatestReport = useAppStore((s) => s.loadLatestReport);
  const t = useT();
  const lang = useLang();
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const [changingLang, setChangingLang] = useState(false);
  const daysTogether = partner && user.relationshipStartDate
    ? differenceInDays(new Date(), new Date(user.relationshipStartDate))
    : null;

  // The server re-serves reports in the new language, so refetch the latest
  // one; screens that load reports on focus pick it up themselves.
  const changeLanguage = async (next: Lang) => {
    if (next === lang || changingLang) return;
    setChangingLang(true);
    try {
      await updateProfile({ language: next });
      loadLatestReport();
    } catch (err) {
      Alert.alert(t('profile.languageFailed'), err instanceof ApiError ? err.message : t('common.checkConnection'));
    } finally {
      setChangingLang(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('edit.deleteTitle'),
      partner ? t('edit.deleteWithPartner', { name: partner.name }) : t('edit.deleteSolo'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('edit.deleteConfirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              router.replace('/(auth)/welcome');
            } catch {
              Alert.alert(t('common.error'), t('edit.deleteFailed'));
            }
          },
        },
      ]
    );
  };

  return (
    <Screen ambient>
      <Pressable style={styles.editBtn} onPress={() => router.push('/profile/edit')} hitSlop={10}>
        <Ionicons name="pencil-outline" size={16} color={colors.roseDark} />
        <Text style={styles.editBtnLabel}>{t('profile.edit')}</Text>
      </Pressable>

      <View style={styles.header}>
        <Avatar emoji={user.avatarEmoji} uri={user.avatarUri} size={84} />
        <Text style={styles.name}>{user.name}</Text>
        <View style={styles.pairRow}>
          {partner ? (
            <Text style={styles.pairText}>{t('profile.pairedWith', { name: partner.name })}</Text>
          ) : user.coupleId ? (
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.pairTextMuted}>{t('profile.waiting')}</Text>
              <Pressable
                style={styles.showCodeBtn}
                onPress={() => router.push('/(auth)/couple')}
                hitSlop={8}
              >
                <Ionicons name="qr-code-outline" size={14} color={colors.roseDark} />
                <Text style={styles.showCodeLabel}>{t('profile.showCode')}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => router.push('/(auth)/couple')}>
              <Text style={styles.pairText}>{t('profile.invite')}</Text>
            </Pressable>
          )}
        </View>
        {daysTogether !== null && <Text style={styles.daysTogether}>{t('profile.daysTogether', { n: daysTogether, days: plural('plural.days', daysTogether, lang) })}</Text>}
      </View>

      <SectionHeader title={t('profile.about')} />
      <Card style={{ marginBottom: spacing.xl }}>
        <Row
          label={t('profile.relationshipStart')}
          value={user.relationshipStartDate ? new Date(user.relationshipStartDate).toLocaleDateString(intlLocale(lang)) : '—'}
          last
        />
      </Card>

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>{t('common.loveLanguages')}</Text>
        <LoveLanguagesInfoButton />
      </View>
      <View style={styles.chipsWrap}>
        {user.loveLanguages.length === 0 && <Text style={styles.emptyHint}>{t('common.notChosen')}</Text>}
        {user.loveLanguages.map((l) => (
          <Chip key={l} label={loveLanguageLabel(l)} tone="rose" selected />
        ))}
      </View>

      <SectionHeader title={t('common.interests')} />
      <View style={styles.chipsWrap}>
        {user.interests.length === 0 && <Text style={styles.emptyHint}>{t('common.notChosen')}</Text>}
        {user.interests.map((i) => (
          <Chip key={i} label={i} tone="sage" selected />
        ))}
      </View>

      <SectionHeader title={t('profile.language')} />
      <View style={styles.langChips}>
        {LANGUAGES.map((l) => (
          <Chip key={l} label={LANGUAGE_NAMES[l]} tone="sage" selected={l === lang} onPress={() => changeLanguage(l)} />
        ))}
      </View>
      <Text style={styles.langHint}>{t('profile.languageHint')}</Text>

      <Button label={t('profile.logout')} variant="outline" onPress={logout} style={{ marginTop: spacing.md }} />

      <Pressable style={styles.deleteBtn} onPress={handleDeleteAccount} hitSlop={8}>
        <Ionicons name="trash-outline" size={15} color={colors.danger} />
        <Text style={styles.deleteLabel}>{t('edit.deleteButton')}</Text>
      </Pressable>

      <View style={styles.legalRow}>
        <Text style={styles.legalLink} onPress={() => Linking.openURL(`${API_BASE_URL}/privacy`)}>
          {t('common.privacy')}
        </Text>
        <Text style={styles.legalDivider}>·</Text>
        <Text style={styles.legalLink} onPress={() => Linking.openURL(`${API_BASE_URL}/terms`)}>
          {t('common.terms')}
        </Text>
      </View>
    </Screen>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  editBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end',
    marginTop: spacing.lg, marginRight: spacing.md, paddingVertical: spacing.xs,
  },
  editBtnLabel: { ...type.bodySm, fontFamily: type.bodySemibold.fontFamily, color: colors.roseDark, marginLeft: 6 },
  header: { alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.xl },
  name: { ...type.h2, color: colors.ink, marginTop: spacing.md },
  pairRow: { marginTop: 4 },
  pairText: { ...type.body, color: colors.roseDark },
  pairTextMuted: { ...type.body, color: colors.inkMuted },
  showCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  showCodeLabel: { ...type.bodySm, fontFamily: type.bodySemibold.fontFamily, color: colors.roseDark, marginLeft: 6 },
  daysTogether: { ...type.bodySm, color: colors.inkMuted, marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { ...type.body, color: colors.inkMuted },
  rowValue: { ...type.bodySemibold, fontFamily: type.bodySemibold.fontFamily, color: colors.ink },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  sectionTitle: { ...type.h2, color: colors.ink },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.xl },
  emptyHint: { ...type.body, color: colors.inkMuted },
  langChips: { flexDirection: 'row', flexWrap: 'wrap' },
  langHint: { ...type.bodySm, color: colors.inkMuted, marginTop: spacing.xs, marginBottom: spacing.xl },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
  deleteLabel: { ...type.bodySm, fontFamily: type.bodySemibold.fontFamily, color: colors.danger, marginLeft: 6 },
  legalRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.md },
  legalLink: { ...type.bodySm, color: colors.inkMuted, textDecorationLine: 'underline' },
  legalDivider: { ...type.bodySm, color: colors.inkMuted, marginHorizontal: spacing.sm },
});
