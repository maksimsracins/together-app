import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { BackHeader } from '../../src/components/BackHeader';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { SocialRow } from '../../src/components/SocialRow';
import { useAuthStore } from '../../src/store/useAuthStore';
import { ApiError } from '../../src/services/http';
import { colors, spacing, type } from '../../src/theme';

export default function Login() {
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // A fast double-tap can fire the handler twice before `disabled={loading}`
  // actually re-renders -- a ref flips synchronously so the second call bails
  // out immediately regardless of render timing.
  const loadingRef = useRef(false);

  const canSubmit = email.trim().length > 3 && password.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось войти. Проверьте соединение.');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <Screen>
      <BackHeader />
      <Text style={styles.title}>С возвращением 🌿</Text>
      <Text style={styles.subtitle}>Рады снова вас видеть</Text>

      <View style={{ marginTop: spacing.xxl }}>
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
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      {error && <Text style={styles.error}>⚠️ {error}</Text>}

      <Button label="Войти" onPress={handleSubmit} disabled={!canSubmit} loading={loading} style={{ marginTop: spacing.sm }} />

      <SocialRow />

      <Text style={styles.footer}>
        Нет аккаунта?{' '}
        <Text style={styles.link} onPress={() => router.push('/(auth)/signup')}>
          Зарегистрироваться
        </Text>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.h1, color: colors.ink },
  subtitle: { ...type.body, color: colors.inkMuted, marginTop: spacing.xs },
  error: { ...type.bodySm, color: colors.danger, marginTop: spacing.lg, textAlign: 'center' },
  footer: { ...type.body, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.xl },
  link: { color: colors.roseDark, fontFamily: type.bodySemibold.fontFamily },
});
