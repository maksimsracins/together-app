import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format, parseISO, subYears } from 'date-fns';
import { Avatar } from '../../src/components/Avatar';
import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { LoveLanguagesInfoButton } from '../../src/components/LoveLanguagesInfo';
import { AVATAR_EMOJIS, LOVE_LANGUAGES } from '../../src/data/catalog';
import { useAuthStore } from '../../src/store/useAuthStore';
import { exportMyData } from '../../src/services/users';
import { ApiError } from '../../src/services/http';
import { colors, radius, spacing, type } from '../../src/theme';
import { isPhotoTooLarge } from '../../src/utils/photo';

export default function EditProfile() {
  const user = useAuthStore((s) => s.user)!;
  const partner = useAuthStore((s) => s.partner);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const leaveCouple = useAuthStore((s) => s.leaveCouple);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);

  const [avatarEmoji, setAvatarEmoji] = useState(user.avatarEmoji);
  const [avatarUri, setAvatarUri] = useState<string | null>(user.avatarUri ?? null);
  const [name, setName] = useState(user.name);
  const [relationshipStartDate, setRelationshipStartDate] = useState(() =>
    user.relationshipStartDate ? parseISO(user.relationshipStartDate) : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loveLanguages, setLoveLanguages] = useState<string[]>(user.loveLanguages);
  const [interests, setInterests] = useState<string[]>(user.interests);
  const [interestInput, setInterestInput] = useState('');
  const [birthdate, setBirthdate] = useState<Date | null>(user.birthdate ? parseISO(user.birthdate) : null);
  const [occupation, setOccupation] = useState(user.occupation ?? '');
  const [habits, setHabits] = useState(user.habits ?? '');
  const [city, setCity] = useState(user.city ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Same synchronous-guard fix as entry/new.tsx's save/delete: `disabled=
  // {saving}` can't stop a second tap that lands before the state update
  // from the first one has actually re-rendered the button.
  const savingRef = useRef(false);
  const [exporting, setExporting] = useState(false);
  const exportingRef = useRef(false);

  const handleExportData = async () => {
    if (exportingRef.current) return;
    exportingRef.current = true;
    setExporting(true);
    try {
      const data = await exportMyData();
      await Share.share({
        title: 'Мои данные Together',
        message: JSON.stringify(data, null, 2),
      });
    } catch {
      Alert.alert('Ошибка', 'Не удалось экспортировать данные. Попробуйте ещё раз.');
    } finally {
      exportingRef.current = false;
      setExporting(false);
    }
  };

  const toggleLoveLanguage = (l: string) => {
    setLoveLanguages((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));
  };

  const addInterest = () => {
    const t = interestInput.trim();
    if (t && !interests.includes(t)) setInterests((prev) => [...prev, t]);
    setInterestInput('');
  };

  const canSave = name.trim().length > 0;

  const handleSave = async () => {
    if (!canSave || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        avatarEmoji,
        avatarUri,
        name: name.trim(),
        relationshipStartDate: format(relationshipStartDate, 'yyyy-MM-dd'),
        loveLanguages,
        interests,
        birthdate: birthdate ? format(birthdate, 'yyyy-MM-dd') : null,
        occupation: occupation.trim() || null,
        habits: habits.trim() || null,
        city: city.trim() || null,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось сохранить профиль');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const onChangeDate = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'dismissed') return;
    if (selected) setRelationshipStartDate(selected);
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Нет доступа', 'Разрешите доступ к фото в настройках, чтобы выбрать изображение.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    const asset = result.assets?.[0];
    if (!result.canceled && asset?.base64) {
      const dataUri = `data:image/jpeg;base64,${asset.base64}`;
      if (isPhotoTooLarge(dataUri)) {
        Alert.alert('Фото слишком большое', 'Попробуйте выбрать другое фото.');
      } else {
        setAvatarUri(dataUri);
      }
    }
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Нет доступа', 'Разрешите доступ к камере в настройках, чтобы сделать фото.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    const asset = result.assets?.[0];
    if (!result.canceled && asset?.base64) {
      const dataUri = `data:image/jpeg;base64,${asset.base64}`;
      if (isPhotoTooLarge(dataUri)) {
        Alert.alert('Фото слишком большое', 'Попробуйте сделать снимок заново.');
      } else {
        setAvatarUri(dataUri);
      }
    }
  };

  const handleLeaveCouple = () => {
    Alert.alert(
      'Убрать пару?',
      partner
        ? `Вы перестанете быть в паре с ${partner.name}.`
        : 'Приглашение будет отменено, и код перестанет действовать.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Убрать',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveCouple();
              router.back();
            } catch {
              Alert.alert('Ошибка', 'Не удалось убрать пару. Попробуйте ещё раз.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Удалить аккаунт?',
      partner
        ? `Все ваши записи будут удалены без возможности восстановления, а ваша пара с ${partner.name} расторгнута.`
        : 'Все ваши записи будут удалены без возможности восстановления. Это действие необратимо.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить навсегда',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              router.replace('/(auth)/welcome');
            } catch {
              Alert.alert('Ошибка', 'Не удалось удалить аккаунт. Попробуйте ещё раз.');
            }
          },
        },
      ]
    );
  };

  const handleChoosePhoto = () => {
    const options = [
      { text: 'Сделать фото', onPress: pickFromCamera },
      { text: 'Выбрать из галереи', onPress: pickFromLibrary },
      ...(avatarUri ? [{ text: 'Удалить фото', onPress: () => setAvatarUri(null), style: 'destructive' as const }] : []),
      { text: 'Отмена', style: 'cancel' as const },
    ];
    Alert.alert('Фото профиля', undefined, options);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={10}>
            <Ionicons name="close" size={20} color={colors.ink} />
          </Pressable>
        </View>

        <Text style={styles.title} numberOfLines={1}>Редактировать профиль</Text>

        <View style={[styles.headerSide, { justifyContent: 'flex-end' }]}>
          <Pressable onPress={handleSave} disabled={!canSave || saving} hitSlop={10}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.roseDark} />
            ) : (
              <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>Сохранить</Text>
            )}
          </Pressable>
        </View>
      </View>

      {error && <Text style={styles.errorBanner}>⚠️ {error}</Text>}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Фото профиля</Text>
        <View style={styles.photoRow}>
          <Avatar emoji={avatarEmoji} uri={avatarUri} size={88} />
          <Pressable style={styles.photoBadge} onPress={handleChoosePhoto} hitSlop={8}>
            <Ionicons name="camera" size={16} color={colors.white} />
          </Pressable>
        </View>

        <Text style={[styles.label, { marginTop: spacing.lg }]}>
          {avatarUri ? 'Или замените эмодзи-аватаром' : 'Или выберите эмодзи-аватар'}
        </Text>
        <View style={styles.avatarRow}>
          {AVATAR_EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => {
                setAvatarEmoji(emoji);
                setAvatarUri(null);
              }}
              style={[styles.avatarItem, !avatarUri && avatarEmoji === emoji && styles.avatarItemActive]}
            >
              <Text style={styles.avatarEmoji}>{emoji}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Имя</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Как вас называть?" placeholderTextColor={colors.inkMuted} maxLength={20} />

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Дата начала отношений</Text>
        <Pressable style={styles.dateField} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar-outline" size={18} color={colors.roseDark} />
          <Text style={styles.dateFieldText}>
            {relationshipStartDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        </Pressable>

        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker value={relationshipStartDate} mode="date" display="default" maximumDate={new Date()} onChange={onChangeDate} />
        )}

        {Platform.OS === 'ios' && (
          <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
            <View style={styles.pickerOverlay}>
              <Pressable style={styles.pickerBackdrop} onPress={() => setShowDatePicker(false)} />
              <View style={styles.pickerSheet}>
                <View style={styles.pickerSheetHeader}>
                  <Text style={styles.pickerSheetTitle}>Дата начала отношений</Text>
                  <Pressable onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.pickerDone}>Готово</Text>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={relationshipStartDate}
                  mode="date"
                  display="spinner"
                  locale="ru-RU"
                  maximumDate={new Date()}
                  onChange={onChangeDate}
                  style={{ alignSelf: 'center' }}
                />
              </View>
            </View>
          </Modal>
        )}

        <View style={[styles.labelRow, { marginTop: spacing.lg }]}>
          <Text style={[styles.label, { marginBottom: 0 }]}>Языки любви</Text>
          <LoveLanguagesInfoButton />
        </View>
        <View style={styles.chipsWrap}>
          {LOVE_LANGUAGES.map((l) => (
            <Chip key={l} label={l} tone="rose" selected={loveLanguages.includes(l)} onPress={() => toggleLoveLanguage(l)} />
          ))}
        </View>

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Интересы</Text>
        <View style={styles.tagInputRow}>
          <Ionicons name="add-circle-outline" size={18} color={colors.inkMuted} />
          <TextInput
            style={styles.tagInput}
            placeholder="Добавить интерес и нажать Готово"
            placeholderTextColor={colors.inkMuted}
            value={interestInput}
            onChangeText={setInterestInput}
            onSubmitEditing={addInterest}
            returnKeyType="done"
          />
        </View>
        {interests.length > 0 && (
          <View style={[styles.chipsWrap, { marginTop: spacing.md }]}>
            {interests.map((i) => (
              <Chip key={i} label={i} tone="sage" selected onPress={() => setInterests((prev) => prev.filter((x) => x !== i))} />
            ))}
          </View>
        )}

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Работа</Text>
        <TextInput
          style={styles.input}
          value={occupation}
          onChangeText={setOccupation}
          placeholder="Кем вы работаете"
          placeholderTextColor={colors.inkMuted}
        />

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Привычки</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          value={habits}
          onChangeText={setHabits}
          placeholder="Например: рано встаю, занимаюсь спортом по утрам…"
          placeholderTextColor={colors.inkMuted}
          multiline
          textAlignVertical="top"
        />
        <Text style={styles.hint}>Возраст, работа и привычки помогают AI точнее разбирать ваш отчёт</Text>

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Город</Text>
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          placeholder="Например: Москва"
          placeholderTextColor={colors.inkMuted}
        />
        <Text style={styles.hint}>Погода вашего города появится в отчёте недели</Text>

        <DateField
          label="Дата рождения"
          value={birthdate}
          mode="date"
          defaultValue={subYears(new Date(), 25)}
          maximumDate={new Date()}
          placeholder="Не указана"
          onChange={setBirthdate}
          onClear={() => setBirthdate(null)}
        />

        {user.coupleId && (
          <>
            <Text style={[styles.label, { marginTop: spacing.lg }]}>Пара</Text>
            <Button label="Убрать пару" variant="outline" onPress={handleLeaveCouple} />
          </>
        )}

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Аккаунт</Text>
        <Button
          label={exporting ? 'Готовим экспорт…' : 'Экспортировать мои данные'}
          variant="outline"
          loading={exporting}
          onPress={handleExportData}
          style={{ marginBottom: spacing.md }}
        />
        <Button label="Удалить аккаунт" variant="outline" onPress={handleDeleteAccount} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DateField({
  label,
  value,
  mode,
  defaultValue,
  maximumDate,
  placeholder,
  onChange,
  onClear,
}: {
  label: string;
  value: Date | null;
  mode: 'date' | 'time';
  defaultValue: Date;
  maximumDate?: Date;
  placeholder: string;
  onChange: (date: Date) => void;
  onClear: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const pickerValue = value ?? defaultValue;

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setVisible(false);
    if (event.type === 'dismissed') return;
    if (selected) onChange(selected);
  };

  const formatted = value
    ? mode === 'date'
      ? value.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
      : value.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : placeholder;

  return (
    <>
      <Text style={[styles.label, { marginTop: spacing.lg }]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Pressable style={[styles.dateField, { flex: 1 }]} onPress={() => setVisible(true)}>
          <Ionicons name={mode === 'date' ? 'calendar-outline' : 'time-outline'} size={18} color={colors.roseDark} />
          <Text style={[styles.dateFieldText, !value && { color: colors.inkMuted }]}>{formatted}</Text>
        </Pressable>
        {value && (
          <Pressable onPress={onClear} hitSlop={8} style={{ marginLeft: spacing.sm }}>
            <Ionicons name="close-circle" size={20} color={colors.inkMuted} />
          </Pressable>
        )}
      </View>

      {visible && Platform.OS === 'android' && (
        <DateTimePicker value={pickerValue} mode={mode} display="default" maximumDate={maximumDate} onChange={handleChange} />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
          <View style={styles.pickerOverlay}>
            <Pressable style={styles.pickerBackdrop} onPress={() => setVisible(false)} />
            <View style={styles.pickerSheet}>
              <View style={styles.pickerSheetHeader}>
                <Text style={styles.pickerSheetTitle}>{label}</Text>
                <Pressable onPress={() => setVisible(false)}>
                  <Text style={styles.pickerDone}>Готово</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={pickerValue}
                mode={mode}
                display="spinner"
                locale="ru-RU"
                maximumDate={maximumDate}
                onChange={handleChange}
                style={{ alignSelf: 'center' }}
              />
            </View>
          </View>
        </Modal>
      )}
    </>
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
  errorBanner: { ...type.bodySm, color: colors.danger, textAlign: 'center', paddingHorizontal: spacing.xl, marginBottom: spacing.sm },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
  label: { ...type.label, color: colors.inkMuted, textTransform: 'uppercase', marginBottom: spacing.md },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  photoRow: { alignSelf: 'center', marginBottom: spacing.sm },
  photoBadge: {
    position: 'absolute', bottom: -2, right: -2, width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.rose, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.cream,
  },
  avatarRow: { flexDirection: 'row', flexWrap: 'wrap' },
  avatarItem: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.border,
    marginRight: spacing.sm, marginBottom: spacing.sm,
  },
  avatarItemActive: { backgroundColor: colors.roseMist, borderColor: colors.rose },
  avatarEmoji: { fontSize: 24 },
  input: {
    ...type.bodyLg, color: colors.ink, backgroundColor: colors.card, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: 14, borderWidth: 1.5, borderColor: colors.border,
  },
  multilineInput: { minHeight: 80 },
  hint: { ...type.bodySm, color: colors.inkMuted, marginTop: spacing.sm },
  dateField: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: 14, borderWidth: 1.5, borderColor: colors.border,
  },
  dateFieldText: { ...type.bodyLg, color: colors.ink, marginLeft: spacing.sm },
  pickerOverlay: { flex: 1, justifyContent: 'flex-end' },
  pickerBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay },
  pickerSheet: {
    backgroundColor: colors.cardSoft, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingBottom: spacing.xxl, paddingTop: spacing.sm,
  },
  pickerSheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  pickerSheetTitle: { ...type.bodySemibold, fontFamily: type.bodySemibold.fontFamily, color: colors.ink },
  pickerDone: { ...type.bodySemibold, fontFamily: type.bodySemibold.fontFamily, color: colors.roseDark },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  tagInputRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.pill,
    borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: 10,
  },
  tagInput: { ...type.body, color: colors.ink, marginLeft: spacing.sm, flex: 1 },
});
