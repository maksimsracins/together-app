import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { TypePicker } from '../../src/components/TypePicker';
import { EmotionPicker } from '../../src/components/EmotionPicker';
import { Button } from '../../src/components/Button';
import { useAppStore } from '../../src/store/useAppStore';
import { ApiError } from '../../src/services/http';
import { EmotionKey, EntryType } from '../../src/types';
import { colors, radius, spacing, type } from '../../src/theme';

const MAX_LEN = 1000;

export default function NewEntry() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;
  const entries = useAppStore((s) => s.entries);
  const addEntry = useAppStore((s) => s.addEntry);
  const updateEntry = useAppStore((s) => s.updateEntry);
  const deleteEntry = useAppStore((s) => s.deleteEntry);
  const existing = isEditing ? entries.find((e) => e.id === id) : undefined;
  const locked = !!existing?.includedInReportId;

  const [entryType, setEntryType] = useState<EntryType>(existing?.type ?? 'worry');
  const [emotion, setEmotion] = useState<EmotionKey | null>(existing?.emotion ?? null);
  const [text, setText] = useState(existing?.text ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(existing?.photoUri ?? null);
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = emotion !== null && text.trim().length > 0;

  const handlePickPhoto = async () => {
    setError(null);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Нет доступа к галерее');
      return;
    }
    setPickingPhoto(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.5,
        base64: true,
      });
      const asset = result.assets?.[0];
      if (!result.canceled && asset?.base64) {
        setPhotoUri(`data:image/jpeg;base64,${asset.base64}`);
      }
    } finally {
      setPickingPhoto(false);
    }
  };

  const persistEntry = async (finalText: string) => {
    if (!emotion) return;
    setSaving(true);
    setError(null);
    const payload = { type: entryType, emotion, text: finalText.trim(), tags: [], photoUri };
    try {
      if (isEditing && id) {
        await updateEntry(id, payload);
      } else {
        await addEntry(payload);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось сохранить запись');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!canSave || !emotion) return;
    await persistEntry(text);
  };

  const handleDelete = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await deleteEntry(id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось удалить запись');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <Text style={styles.title}>{locked ? 'Запись' : isEditing ? 'Изменить запись' : 'Новая запись'}</Text>
        <View style={{ flexDirection: 'row' }}>
          {isEditing && !locked && (
            <Pressable onPress={handleDelete} style={[styles.closeBtn, { marginRight: spacing.sm }]} hitSlop={10}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </Pressable>
          )}
          <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={10}>
            <Ionicons name="close" size={20} color={colors.ink} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {locked && (
          <Text style={styles.lockedNote}>
            🔒 Эта запись уже вошла в отчёт и теперь доступна только для просмотра — изменить или удалить её нельзя
          </Text>
        )}

        <Text style={styles.label}>Тип записи</Text>
        <View pointerEvents={locked ? 'none' : 'auto'} style={locked && styles.disabled}>
          <TypePicker value={entryType} onChange={setEntryType} />
        </View>

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Эмоция</Text>
        <View pointerEvents={locked ? 'none' : 'auto'} style={locked && styles.disabled}>
          <EmotionPicker value={emotion} onChange={setEmotion} />
        </View>

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Описание</Text>
        <View style={styles.textWrap}>
          <TextInput
            multiline
            editable={!locked}
            maxLength={MAX_LEN}
            placeholder="Расскажите, что вы чувствуете… это увидите только вы"
            placeholderTextColor={colors.inkMuted}
            value={text}
            onChangeText={setText}
            style={styles.textInput}
            textAlignVertical="top"
          />
          {!locked && <Text style={styles.counter}>{text.length}/{MAX_LEN}</Text>}
        </View>

        {photoUri ? (
          <View style={styles.photoWrap}>
            <Image source={{ uri: photoUri }} style={styles.photo} />
            {!locked && (
              <Pressable style={styles.photoRemoveBtn} onPress={() => setPhotoUri(null)} hitSlop={10}>
                <Ionicons name="close" size={16} color={colors.white} />
              </Pressable>
            )}
          </View>
        ) : (
          !locked && (
            <Pressable style={styles.photoAddBtn} onPress={handlePickPhoto} disabled={pickingPhoto}>
              <Ionicons name="image-outline" size={20} color={colors.roseDark} />
              <Text style={styles.photoAddText}>{pickingPhoto ? 'Загрузка…' : 'Добавить фото'}</Text>
            </Pressable>
          )
        )}

        {!locked && <Text style={styles.privacyNote}>🔒 Запись увидите только вы — до недельного отчёта</Text>}

        {error && <Text style={styles.errorText}>⚠️ {error}</Text>}

        {!locked && (
          <Button
            label={isEditing ? 'Сохранить изменения' : 'Сохранить'}
            onPress={handleSave}
            disabled={!canSave || saving}
            loading={saving}
            style={{ marginTop: spacing.lg }}
          />
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
  },
  title: { ...type.h3, color: colors.ink },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
  },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
  label: { ...type.label, color: colors.inkMuted, textTransform: 'uppercase', marginBottom: spacing.md },
  textWrap: {
    backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border,
    padding: spacing.lg,
  },
  textInput: { ...type.bodyLg, color: colors.ink, minHeight: 120 },
  counter: { ...type.bodySm, color: colors.inkMuted, textAlign: 'right', marginTop: spacing.xs },
  photoAddBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed',
    paddingVertical: spacing.md, marginTop: spacing.lg,
  },
  photoAddText: { ...type.bodySm, fontFamily: type.bodySemibold.fontFamily, color: colors.roseDark, marginLeft: spacing.sm },
  photoWrap: { marginTop: spacing.lg },
  photo: { width: '100%', height: 200, borderRadius: radius.md, backgroundColor: colors.card },
  photoRemoveBtn: {
    position: 'absolute', top: spacing.sm, right: spacing.sm, width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center',
  },
  privacyNote: { ...type.bodySm, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.xl },
  errorText: { ...type.bodySm, color: colors.danger, textAlign: 'center', marginTop: spacing.lg },
  lockedNote: {
    ...type.bodySm, color: colors.inkSoft, backgroundColor: colors.card, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.lg, lineHeight: 19,
  },
  disabled: { opacity: 0.5 },
});
