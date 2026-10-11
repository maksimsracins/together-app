import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { requireOptionalNativeModule } from 'expo-modules-core';
import type * as ClipboardModule from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Screen } from '../../src/components/Screen';
import { BackHeader } from '../../src/components/BackHeader';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { TextField } from '../../src/components/TextField';
import { useAuthStore } from '../../src/store/useAuthStore';
import { createCouple, joinCouple } from '../../src/services/couples';
import { ApiError } from '../../src/services/http';
import { colors, radius, spacing, type } from '../../src/theme';
import { useT } from '../../src/i18n';

export default function CoupleSetup() {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const refreshMe = useAuthStore((s) => s.refreshMe);

  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [code, setCode] = useState('');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [clipboardAvailable] = useState(() => Boolean(requireOptionalNativeModule('ExpoClipboard')));
  // Same synchronous-guard fix as elsewhere: disabling via state alone leaves
  // a window where a fast double-tap fires the handler twice.
  const creatingRef = useRef(false);
  const joiningRef = useRef(false);

  useEffect(() => {
    // Only auto-fetch when the user already belongs to a couple (returning to view
    // their existing code) — never auto-create one just from landing on this tab,
    // or a user meaning to join with a partner's code ends up owning a couple of
    // their own first and the join is rejected as "already in a couple".
    if (mode !== 'create' || inviteCode || !user?.coupleId) return;
    createCouple()
      .then((res) => setInviteCode(res.inviteCode))
      .catch((err) => setError(err instanceof ApiError ? err.message : t('couple.createFailed')));
  }, [mode, inviteCode, user?.coupleId]);

  const handleCreateCouple = async () => {
    if (creatingRef.current) return;
    creatingRef.current = true;
    setCreating(true);
    setError(null);
    try {
      const res = await createCouple();
      setInviteCode(res.inviteCode);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('couple.createFailed'));
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!code.trim() || joiningRef.current) return;
    joiningRef.current = true;
    setLoading(true);
    setError(null);
    try {
      await joinCouple(code.trim());
      await refreshMe();
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('couple.joinFailed'));
    } finally {
      joiningRef.current = false;
      setLoading(false);
    }
  };

  const handleContinueCreated = async () => {
    await refreshMe();
    router.replace('/(tabs)');
  };

  const handleCopy = async () => {
    if (!inviteCode || !clipboardAvailable) return;
    try {
      const Clipboard: typeof ClipboardModule = require('expo-clipboard');
      await Clipboard.setStringAsync(inviteCode);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t('couple.copyFailed'));
    }
  };

  const handleShare = async () => {
    if (!inviteCode) return;
    try {
      await Share.share({
        message: t('couple.shareMessage', { code: inviteCode }),
      });
    } catch {
      // user cancelled the share sheet
    }
  };

  return (
    <Screen>
      <BackHeader />
      <Text style={styles.title}>{t('couple.title')}</Text>
      <Text style={styles.subtitle}>{t('couple.subtitle')}</Text>

      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleItem, mode === 'create' && styles.toggleItemActive]}
          onPress={() => setMode('create')}
        >
          <Text style={[styles.toggleLabel, mode === 'create' && styles.toggleLabelActive]}>{t('couple.create')}</Text>
        </Pressable>
        <Pressable
          style={[styles.toggleItem, mode === 'join' && styles.toggleItemActive]}
          onPress={() => setMode('join')}
        >
          <Text style={[styles.toggleLabel, mode === 'join' && styles.toggleLabelActive]}>{t('couple.haveCode')}</Text>
        </Pressable>
      </View>

      {mode === 'create' ? (
        <Card tone="rose" style={{ alignItems: 'center', marginTop: spacing.xl }}>
          {inviteCode ? (
            <>
              <Text style={styles.codeLabel}>{t('couple.yourCode')}</Text>
              <Pressable onPress={handleCopy} disabled={!clipboardAvailable} hitSlop={8}>
                <Text style={styles.code} selectable>
                  {inviteCode}
                </Text>
              </Pressable>
              <Text style={styles.codeHint}>
                {copied
                  ? t('couple.copied')
                  : clipboardAvailable
                    ? t('couple.tapToCopy')
                    : t('couple.holdToCopy')}
              </Text>
              <View style={styles.codeActions}>
                {clipboardAvailable && (
                  <Pressable style={styles.codeActionButton} onPress={handleCopy} hitSlop={8}>
                    <Text style={styles.codeActionLabel}>{t('couple.copy')}</Text>
                  </Pressable>
                )}
                <Pressable style={styles.codeActionButton} onPress={handleShare} hitSlop={8}>
                  <Text style={styles.codeActionLabel}>{t('couple.share')}</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.codeLabel}>{t('couple.noCode')}</Text>
              <Button
                label={t('couple.createCode')}
                onPress={handleCreateCouple}
                loading={creating}
                style={{ marginTop: spacing.md }}
              />
            </>
          )}
        </Card>
      ) : (
        <View style={{ marginTop: spacing.xl }}>
          <TextField
            label={t('couple.inviteCode')}
            placeholder="LOVE-XXXX"
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            autoCapitalize="characters"
          />
        </View>
      )}

      {error && <Text style={styles.error}>⚠️ {error}</Text>}

      {mode === 'create' ? (
        <Button label={t('couple.continue')} onPress={handleContinueCreated} disabled={!inviteCode} style={{ marginTop: spacing.xl }} />
      ) : (
        <Button
          label={t('couple.join')}
          onPress={handleJoin}
          disabled={!code.trim()}
          loading={loading}
          style={{ marginTop: spacing.xl }}
        />
      )}
      <Button label={t('couple.skip')} variant="ghost" onPress={() => router.replace('/(tabs)')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.h1, color: colors.ink },
  subtitle: { ...type.body, color: colors.inkMuted, marginTop: spacing.xs },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.creamDeep,
    borderRadius: radius.pill,
    padding: 4,
    marginTop: spacing.xl,
  },
  toggleItem: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, alignItems: 'center' },
  toggleItemActive: { backgroundColor: colors.card },
  toggleLabel: { ...type.bodySm, fontFamily: type.bodySemibold.fontFamily, color: colors.inkMuted },
  toggleLabelActive: { color: colors.roseDark },
  codeLabel: { ...type.bodySm, color: colors.roseDark },
  code: { ...type.h1, color: colors.ink, letterSpacing: 2, marginVertical: spacing.sm },
  codeHint: { ...type.bodySm, color: colors.inkMuted, textAlign: 'center' },
  codeActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  codeActionButton: {
    paddingVertical: 8,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
  },
  codeActionLabel: { ...type.bodySm, fontFamily: type.bodySemibold.fontFamily, color: colors.roseDark },
  error: { ...type.bodySm, color: colors.danger, marginTop: spacing.lg, textAlign: 'center' },
});
