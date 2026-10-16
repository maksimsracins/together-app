import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { BackHeader } from '../../src/components/BackHeader';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { useAuthStore } from '../../src/store/useAuthStore';
import { requestPasswordReset } from '../../src/services/auth';
import { ApiError } from '../../src/services/http';
import { colors, spacing, type } from '../../src/theme';
import { useT } from '../../src/i18n';

// Two steps on one screen: request an emailed code, then enter it together
// with a new password. A successful reset signs the user straight in.
export default function ForgotPassword() {
  const t = useT();
  const params = useLocalSearchParams<{ email?: string }>();
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);

  const canRequest = email.trim().length > 3;
  const canReset = code.trim().length === 6 && password.length >= 6;

  const run = async (fn: () => Promise<void>) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.checkConnection'));
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  const handleRequest = () =>
    run(async () => {
      await requestPasswordReset(email.trim());
      setStep('code');
      setInfo(t('forgot.codeSent', { email: email.trim() }));
    });

  const handleReset = () =>
    run(async () => {
      await resetPassword(email.trim(), code.trim(), password);
      router.replace('/(tabs)');
    });

  return (
    <Screen>
      <BackHeader />
      <Text style={styles.title}>{t('forgot.title')}</Text>
      <Text style={styles.subtitle}>{step === 'email' ? t('forgot.subtitle') : info}</Text>

      <View style={{ marginTop: spacing.xxl }}>
        {step === 'email' ? (
          <TextField
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        ) : (
          <>
            <TextField
              label={t('forgot.code')}
              placeholder="123456"
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
            />
            <TextField
              label={t('forgot.newPassword')}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </>
        )}
      </View>

      {error && <Text style={styles.error}>⚠️ {error}</Text>}

      {step === 'email' ? (
        <Button label={t('forgot.sendCode')} onPress={handleRequest} disabled={!canRequest} loading={loading} style={{ marginTop: spacing.sm }} />
      ) : (
        <>
          <Button label={t('forgot.reset')} onPress={handleReset} disabled={!canReset} loading={loading} style={{ marginTop: spacing.sm }} />
          <Text style={styles.footer}>
            <Text style={styles.link} onPress={handleRequest}>
              {t('forgot.resend')}
            </Text>
          </Text>
        </>
      )}
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
