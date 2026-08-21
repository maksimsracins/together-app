import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { EmotionPicker } from '../../src/components/EmotionPicker';
import { useAppStore } from '../../src/store/useAppStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { ApiError } from '../../src/services/http';
import { getEntry } from '../../src/services/entries';
import { EmotionKey, Entry, EntryType } from '../../src/types';
import { colors, radius, spacing, type } from '../../src/theme';
import { isPhotoTooLarge } from '../../src/utils/photo';

const MAX_LEN = 1000;

// The type picker was dropped from the UI (emotion alone is the point now),
// but the server column is still required and the AI report prompt still
// reads it -- so we derive a reasonable one from the chosen emotion instead
// of asking for it a second time.
const EMOTION_TO_TYPE: Record<EmotionKey, EntryType> = {
  joy: 'joy',
  gratitude: 'gratitude',
  love: 'joy',
  calm: 'thought',
  sadness: 'worry',
  irritation: 'worry',
  anxiety: 'worry',
  hurt: 'worry',
  doubt: 'worry',
};

export default function NewEntry() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;
  const storeEntries = useAppStore((s) => s.entries);
  const addEntry = useAppStore((s) => s.addEntry);
  const updateEntry = useAppStore((s) => s.updateEntry);
  const deleteEntry = useAppStore((s) => s.deleteEntry);
  const currentUser = useAuthStore((s) => s.user);
  const partner = useAuthStore((s) => s.partner);

  // The store only ever holds this week's entries loaded once at app launch,
  // so it can still say includedInReportId: null for an entry the background
  // report scheduler has since locked -- whether editing is allowed has to
  // gate on the server's current state, not that stale snapshot. It's kept
  // only as an instant preview while the authoritative copy loads (and it
  // never has anything for a partner's entry, which always needs the fetch).
  const storeMatch = isEditing ? storeEntries.find((e) => e.id === id) : undefined;
  const [fetchedExisting, setFetchedExisting] = useState<Entry | null>(null);
  const [resolving, setResolving] = useState(isEditing && !storeMatch);
  // Distinct from fetchedExisting === null (which also means "not fetched
  // yet") -- without this, a failed fetch with no store fallback used to
  // silently render as a blank, editable "new entry" form instead of an
  // error, which looked exactly like an empty edit screen with no text/photo.
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    if (!isEditing || !id) {
      setResolving(false);
      return;
    }
    let cancelled = false;
    setFetchFailed(false);
    getEntry(id)
      .then((entry) => {
        if (!cancelled) setFetchedExisting(entry);
      })
      .catch(() => {
        if (!cancelled) {
          setFetchedExisting(null);
          setFetchFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setResolving(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, id]);

  // Prefer the freshly-fetched copy once it lands -- it's the authoritative
  // one, the store match was only ever a fast first paint.
  const existing = fetchedExisting ?? storeMatch ?? undefined;
  const notFound = isEditing && fetchFailed && !existing;
  const isMine = !existing || !currentUser || existing.authorId === currentUser.id;
  const locked = !!existing?.includedInReportId || !isMine;

  const [emotion, setEmotion] = useState<EmotionKey | null>(existing?.emotion ?? null);
  const [text, setText] = useState(existing?.text ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(existing?.photoUri ?? null);
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A fast double-tap can fire the handler twice before the `saving` state
  // update from the first tap has actually re-rendered the button as
  // disabled -- a ref flips synchronously, so the second call sees it
  // immediately regardless of render timing.
  const savingRef = useRef(false);

  // Fires whenever the authoritative fetch lands, whether or not a store
  // match already painted a (possibly stale) preview.
  useEffect(() => {
    if (fetchedExisting) {
      setEmotion(fetchedExisting.emotion);
      setText(fetchedExisting.text);
      setPhotoUri(fetchedExisting.photoUri ?? null);
    }
  }, [fetchedExisting]);

  const canSave = emotion !== null && text.trim().length > 0;

  const applyPickedAsset = (result: ImagePicker.ImagePickerResult) => {
    const asset = result.assets?.[0];
    if (!result.canceled && asset?.base64) {
      const dataUri = `data:image/jpeg;base64,${asset.base64}`;
      if (isPhotoTooLarge(dataUri)) {
        setError('Фото слишком большое. Попробуйте выбрать другое или сделать снимок заново.');
      } else {
        setPhotoUri(dataUri);
      }
    }
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Нет доступа к галерее');
      return;
    }
    setPickingPhoto(true);
    try {
      applyPickedAsset(
        await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, base64: true })
      );
    } finally {
      setPickingPhoto(false);
    }
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError('Нет доступа к камере');
      return;
    }
    setPickingPhoto(true);
    try {
      applyPickedAsset(await ImagePicker.launchCameraAsync({ quality: 0.5, base64: true }));
    } finally {
      setPickingPhoto(false);
    }
  };

  const handleChoosePhoto = () => {
    setError(null);
    Alert.alert('Фото', undefined, [
      { text: 'Сделать фото', onPress: pickFromCamera },
      { text: 'Выбрать из галереи', onPress: pickFromLibrary },
      { text: 'Отмена', style: 'cancel' },
    ]);
  };

  const persistEntry = async (finalText: string) => {
    if (!emotion || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    const payload = { type: EMOTION_TO_TYPE[emotion], emotion, text: finalText.trim(), tags: [], photoUri };
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
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!emotion) {
      setError('Выберите эмоцию');
      return;
    }
    if (!text.trim()) {
      setError('Добавьте текст записи');
      return;
    }
    setError(null);
    await persistEntry(text);
  };

  const handleDelete = async () => {
    if (!id || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await deleteEntry(id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось удалить запись');
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={10}>
            <Ionicons name="close" size={20} color={colors.ink} />
          </Pressable>
          {isEditing && !locked && !notFound && (
            <Pressable onPress={handleDelete} style={[styles.closeBtn, { marginLeft: spacing.sm }]} hitSlop={10}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </Pressable>
          )}
        </View>

        <Text style={styles.title} numberOfLines={1}>
          {notFound ? 'Запись' : !isMine ? `Запись ${partner?.name ?? 'партнёра'}` : locked ? 'Запись' : isEditing ? 'Изменить запись' : 'Новая запись'}
        </Text>

        <View style={[styles.headerSide, { justifyContent: 'flex-end' }]}>
          {!locked && !notFound && (
            <Pressable onPress={handleSave} disabled={saving} hitSlop={10}>
              {saving ? (
                <ActivityIndicator size="small" color={colors.roseDark} />
              ) : (
                <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>
                  {isEditing ? 'Сохранить' : 'Создать'}
                </Text>
              )}
            </Pressable>
          )}
        </View>
      </View>

      {error && !resolving && <Text style={styles.errorBanner}>⚠️ {error}</Text>}

      {resolving ? (
        <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.roseDark} />
      ) : notFound ? (
        <View style={styles.content}>
          <Text style={styles.lockedNote}>
            Не удалось загрузить запись — она недоступна или произошла ошибка сети. Попробуйте ещё раз.
          </Text>
        </View>
      ) : (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {locked && (
          <Text style={styles.lockedNote}>
            {!isMine
              ? `💌 Запись ${partner?.name ?? 'партнёра'} — доступна только для просмотра`
              : '🔒 Эта запись уже вошла в отчёт и теперь доступна только для просмотра — изменить или удалить её нельзя'}
          </Text>
        )}

        <View style={styles.textWrap}>
          <TextInput
            multiline
            editable={!locked}
            autoFocus={!isEditing && !locked}
            maxLength={MAX_LEN}
            placeholder="Расскажите, что вы чувствуете…"
            placeholderTextColor={colors.inkMuted}
            value={text}
            onChangeText={setText}
            style={styles.textInput}
            textAlignVertical="top"
          />
          {!locked && <Text style={styles.counter}>{text.length}/{MAX_LEN}</Text>}
        </View>

        {!locked && <Text style={styles.privacyNote}>🔒 Увидите только вы — до недельного отчёта</Text>}

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
            <Pressable style={styles.photoAddBtn} onPress={handleChoosePhoto} disabled={pickingPhoto} hitSlop={4}>
              <Ionicons name="camera-outline" size={17} color={colors.roseDark} />
              <Text style={styles.photoAddText}>{pickingPhoto ? 'Загрузка…' : 'Добавить фото'}</Text>
            </Pressable>
          )
        )}

        <View style={styles.tagSection}>
          <Text style={styles.label}>Эмоция</Text>
          <View pointerEvents={locked ? 'none' : 'auto'} style={locked && styles.disabled}>
            <EmotionPicker value={emotion} onChange={setEmotion} />
          </View>
        </View>
      </ScrollView>
      )}
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
  title: { ...type.h3, color: colors.ink, flex: 1, textAlign: 'center' },
  headerSide: { flexDirection: 'row', alignItems: 'center', minWidth: 44 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
  },
  saveText: { ...type.bodyLg, fontFamily: type.bodyBold.fontFamily, color: colors.roseDark },
  saveTextDisabled: { color: colors.inkMuted },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  label: { ...type.label, color: colors.inkMuted, textTransform: 'uppercase', marginBottom: spacing.sm },
  textWrap: {
    backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border,
    padding: spacing.lg,
  },
  textInput: { ...type.bodyLg, color: colors.ink, minHeight: 96 },
  counter: { ...type.bodySm, color: colors.inkMuted, textAlign: 'right', marginTop: spacing.xs },
  photoAddBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card,
    paddingVertical: 8, paddingHorizontal: spacing.md, marginTop: spacing.sm,
  },
  photoAddText: { ...type.bodySm, fontFamily: type.bodySemibold.fontFamily, color: colors.roseDark, marginLeft: spacing.sm },
  photoWrap: { marginTop: spacing.sm },
  photo: { width: '100%', height: 160, borderRadius: radius.md, backgroundColor: colors.card },
  photoRemoveBtn: {
    position: 'absolute', top: spacing.sm, right: spacing.sm, width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center',
  },
  privacyNote: { ...type.bodySm, color: colors.inkMuted, marginTop: spacing.xs },
  tagSection: {
    marginTop: spacing.lg, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  errorBanner: {
    ...type.bodySm, color: colors.danger, textAlign: 'center',
    paddingVertical: spacing.sm, paddingHorizontal: spacing.xl, backgroundColor: colors.roseMist,
  },
  lockedNote: {
    ...type.bodySm, color: colors.inkSoft, backgroundColor: colors.card, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.lg, lineHeight: 19,
  },
  disabled: { opacity: 0.5 },
});
