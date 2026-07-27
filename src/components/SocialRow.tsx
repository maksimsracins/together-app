import React, { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuthStore } from '../store/useAuthStore';
import { ApiError } from '../services/http';
import { colors, radius, spacing, type } from '../theme';

export function SocialRow() {
  const loginWithApple = useAuthStore((s) => s.loginWithApple);
  const [appleLoading, setAppleLoading] = useState(false);

  const comingSoon = () => Alert.alert('Скоро', 'Вход через соцсети появится в одном из следующих обновлений.');

  const handleApple = async () => {
    if (Platform.OS !== 'ios') {
      comingSoon();
      return;
    }
    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        Alert.alert('Не удалось войти', 'Apple не передал данные для входа. Попробуйте ещё раз.');
        return;
      }
      const fullName = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
        : undefined;
      await loginWithApple(credential.identityToken, fullName || undefined);
      const user = useAuthStore.getState().user;
      router.replace(user?.coupleId ? '/(tabs)' : '/(auth)/couple');
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Не удалось войти', e instanceof ApiError ? e.message : 'Проверьте соединение и попробуйте снова.');
      }
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <Text style={styles.or}>или продолжить с</Text>
        <View style={styles.line} />
      </View>
      <View style={styles.row}>
        <Pressable style={styles.social} onPress={comingSoon}>
          <Ionicons name="logo-google" size={20} color={colors.ink} />
        </Pressable>
        <Pressable style={styles.social} onPress={handleApple} disabled={appleLoading}>
          {appleLoading ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <Ionicons name="logo-apple" size={22} color={colors.ink} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.xl },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { ...type.bodySm, color: colors.inkMuted, marginHorizontal: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'center' },
  social: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.sm,
  },
});
