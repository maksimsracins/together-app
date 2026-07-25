import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { differenceInDays } from 'date-fns';
import { Screen } from '../../src/components/Screen';
import { BackHeader } from '../../src/components/BackHeader';
import { Card } from '../../src/components/Card';
import { SectionHeader } from '../../src/components/SectionHeader';
import { Chip } from '../../src/components/Chip';
import { Avatar } from '../../src/components/Avatar';
import { LoveLanguagesInfoButton } from '../../src/components/LoveLanguagesInfo';
import { useAuthStore } from '../../src/store/useAuthStore';
import { colors, spacing, type } from '../../src/theme';

export default function PartnerProfile() {
  const partner = useAuthStore((s) => s.partner);
  const daysTogether = partner?.relationshipStartDate
    ? differenceInDays(new Date(), new Date(partner.relationshipStartDate))
    : null;

  useEffect(() => {
    if (!partner) router.back();
  }, [partner]);

  if (!partner) return null;

  return (
    <Screen>
      <BackHeader />

      <View style={styles.header}>
        <Avatar emoji={partner.avatarEmoji} uri={partner.avatarUri} size={84} />
        <Text style={styles.name}>{partner.name}</Text>
        {daysTogether !== null && <Text style={styles.daysTogether}>Вместе уже {daysTogether} дней</Text>}
      </View>

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Языки любви</Text>
        <LoveLanguagesInfoButton />
      </View>
      <View style={styles.chipsWrap}>
        {partner.loveLanguages.length === 0 && <Text style={styles.emptyHint}>Пока не выбраны</Text>}
        {partner.loveLanguages.map((l) => (
          <Chip key={l} label={l} tone="rose" selected />
        ))}
      </View>

      <SectionHeader title="Интересы" />
      <View style={styles.chipsWrap}>
        {partner.interests.length === 0 && <Text style={styles.emptyHint}>Пока не выбраны</Text>}
        {partner.interests.map((i) => (
          <Chip key={i} label={i} tone="sage" selected />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.xl },
  name: { ...type.h2, color: colors.ink, marginTop: spacing.md },
  daysTogether: { ...type.bodySm, color: colors.inkMuted, marginTop: 2 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  sectionTitle: { ...type.h2, color: colors.ink },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.xl },
  emptyHint: { ...type.body, color: colors.inkMuted },
});
