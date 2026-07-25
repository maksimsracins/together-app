import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { BackHeader } from '../../src/components/BackHeader';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { SocialRow } from '../../src/components/SocialRow';
import { useAuthStore } from '../../src/store/useAuthStore';
import { ApiError } from '../../src/services/http';
import { colors, radius, spacing, type } from '../../src/theme';

export default function Signup() {
  const signup = useAuthStore((s) => s.signup);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = name.trim().length > 0 && email.trim().length > 3 && password.length >= 6;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await signup(email.trim(), password, name.trim());
      router.replace('/(auth)/couple');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось создать аккаунт. Проверьте соединение.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <BackHeader />
      <Text style={styles.title}>Начнём знакомство 🌷</Text>
      <Text style={styles.subtitle}>Это займёт меньше минуты</Text>

      <View style={styles.avatarWrap}>
        <Text style={styles.avatarEmoji}>🌸</Text>
      </View>

      <View style={{ marginTop: spacing.lg }}>
        <TextField label="Имя" placeholder="Как вас называть?" value={name} onChangeText={setName} maxLength={20} />
        <TextField
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextField
          label="Пароль"
          placeholder="Минимум 6 символов"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      {error && <Text style={styles.error}>⚠️ {error}</Text>}

      <Button
        label="Создать аккаунт"
        onPress={handleSubmit}
        disabled={!canSubmit}
        loading={loading}
        style={{ marginTop: spacing.sm }}
      />

      <SocialRow />

      <Text style={styles.footer}>
        Уже есть аккаунт?{' '}
        <Text style={styles.link} onPress={() => router.push('/(auth)/login')}>
          Войти
        </Text>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.h1, color: colors.ink },
  subtitle: { ...type.body, color: colors.inkMuted, marginTop: spacing.xs },
  avatarWrap: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.roseMist,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    borderWidth: 2,
    borderColor: colors.rose,
    borderStyle: 'dashed',
  },
  avatarEmoji: { fontSize: 36 },
  error: { ...type.bodySm, color: colors.danger, marginTop: spacing.lg, textAlign: 'center' },
  footer: { ...type.body, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.xl },
  link: { color: colors.roseDark, fontFamily: type.bodySemibold.fontFamily },
});
