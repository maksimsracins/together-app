import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PurchasesPackage } from 'react-native-purchases';
import { Screen } from '../src/components/Screen';
import { Card } from '../src/components/Card';
import { Button } from '../src/components/Button';
import { usePremiumStore } from '../src/store/usePremiumStore';
import { API_BASE_URL } from '../src/services/http';
import { colors, radius, spacing, type } from '../src/theme';

const FEATURES = [
  { emoji: '💌', text: 'Еженедельный AI-разбор вашей недели вдвоём' },
  { emoji: '📸', text: 'Безлимитные записи и фото' },
  { emoji: '🗓️', text: 'Гибкое расписание отчёта' },
];

function packageLabel(pkg: PurchasesPackage) {
  switch (pkg.packageType) {
    case 'ANNUAL':
      return 'Год';
    case 'MONTHLY':
      return 'Месяц';
    default:
      return pkg.product.title;
  }
}

export default function Paywall() {
  const offering = usePremiumStore((s) => s.offering);
  const loadOffering = usePremiumStore((s) => s.loadOffering);
  const purchase = usePremiumStore((s) => s.purchase);
  const restore = usePremiumStore((s) => s.restore);
  const purchasing = usePremiumStore((s) => s.purchasing);
  const error = usePremiumStore((s) => s.error);
  const isPremium = usePremiumStore((s) => s.isPremium);

  const [selected, setSelected] = useState<PurchasesPackage | null>(null);

  useEffect(() => {
    loadOffering();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected && offering?.availablePackages.length) {
      // Default to the annual package (better value) when one exists.
      setSelected(offering.availablePackages.find((p) => p.packageType === 'ANNUAL') ?? offering.availablePackages[0]);
    }
  }, [offering, selected]);

  useEffect(() => {
    if (isPremium) router.back();
  }, [isPremium]);

  const handlePurchase = async () => {
    if (!selected) return;
    await purchase(selected);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={10}>
          <Ionicons name="close" size={20} color={colors.ink} />
        </Pressable>
      </View>

      <Text style={styles.emoji}>💞</Text>
      <Text style={styles.title}>Together Plus</Text>
      <Text style={styles.subtitle}>Ваш бесплатный отчёт закончился — оформите подписку, чтобы получать его каждую неделю</Text>

      <Card style={{ marginTop: spacing.xl }}>
        {FEATURES.map((f, i) => (
          <View key={f.text} style={[styles.featureRow, i > 0 && styles.featureRowBorder]}>
            <Text style={styles.featureEmoji}>{f.emoji}</Text>
            <Text style={styles.featureText}>{f.text}</Text>
          </View>
        ))}
      </Card>

      {!offering && <Text style={styles.hint}>Загружаем тарифы…</Text>}

      {offering && (
        <View style={styles.packagesRow}>
          {offering.availablePackages.map((pkg) => {
            const isSelected = selected?.identifier === pkg.identifier;
            const isAnnual = pkg.packageType === 'ANNUAL';
            return (
              <Pressable
                key={pkg.identifier}
                onPress={() => setSelected(pkg)}
                style={[styles.packageCard, isSelected && styles.packageCardSelected]}
              >
                {isAnnual && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Выгоднее</Text>
                  </View>
                )}
                <Text style={styles.packagePeriod}>{packageLabel(pkg)}</Text>
                <Text style={styles.packagePrice}>{pkg.product.priceString}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {error && <Text style={styles.error}>⚠️ {error}</Text>}

      <Button
        label="Оформить подписку"
        onPress={handlePurchase}
        disabled={!selected}
        loading={purchasing}
        style={{ marginTop: spacing.xl }}
      />

      <Pressable onPress={restore} disabled={purchasing} hitSlop={8} style={styles.restoreBtn}>
        <Text style={styles.restoreLabel}>Восстановить покупки</Text>
      </Pressable>

      <Text style={styles.legal}>
        Подписка автоматически продлевается, если не отменена как минимум за 24 часа до конца текущего периода.
        Управлять подпиской можно в настройках Apple ID.{' '}
        <Text style={styles.legalLink} onPress={() => Linking.openURL(`${API_BASE_URL}/terms`)}>
          Условия использования
        </Text>{' '}
        ·{' '}
        <Text style={styles.legalLink} onPress={() => Linking.openURL(`${API_BASE_URL}/privacy`)}>
          Конфиденциальность
        </Text>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.sm },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
  },
  emoji: { fontSize: 40, textAlign: 'center', marginTop: spacing.sm },
  title: { ...type.h1, color: colors.ink, textAlign: 'center', marginTop: spacing.sm },
  subtitle: { ...type.body, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.xs },
  featureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  featureRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  featureEmoji: { fontSize: 20, marginRight: spacing.md },
  featureText: { ...type.body, color: colors.ink, flex: 1 },
  hint: { ...type.body, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.xl },
  packagesRow: { flexDirection: 'row', marginTop: spacing.xl, gap: spacing.md },
  packageCard: {
    flex: 1, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.card, paddingVertical: spacing.lg, alignItems: 'center',
  },
  packageCardSelected: { borderColor: colors.rose, backgroundColor: colors.roseMist },
  badge: {
    position: 'absolute', top: -10, alignSelf: 'center', backgroundColor: colors.rose,
    paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill,
  },
  badgeText: { ...type.bodySm, fontFamily: type.bodySemibold.fontFamily, color: colors.white, fontSize: 11 },
  packagePeriod: { ...type.bodySm, color: colors.inkMuted },
  packagePrice: { ...type.h3, color: colors.ink, marginTop: 4 },
  error: { ...type.bodySm, color: colors.danger, marginTop: spacing.lg, textAlign: 'center' },
  restoreBtn: { alignSelf: 'center', marginTop: spacing.lg, paddingVertical: spacing.xs },
  restoreLabel: { ...type.bodySm, color: colors.roseDark, textDecorationLine: 'underline' },
  legal: { ...type.bodySm, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.xl, lineHeight: 18 },
  legalLink: { color: colors.roseDark },
});
