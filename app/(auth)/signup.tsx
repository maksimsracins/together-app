import React, { useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { BackHeader } from '../../src/components/BackHeader';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { SocialRow } from '../../src/components/SocialRow';
import { Avatar } from '../../src/components/Avatar';
import { useAuthStore } from '../../src/store/useAuthStore';
import { ApiError, API_BASE_URL } from '../../src/services/http';
import { colors, spacing, type } from '../../src/theme';
import { isPhotoTooLarge } from '../../src/utils/photo';

export default function Signup() {
  const signup = useAuthStore((s) => s.signup);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // See login.tsx / entry/new.tsx: state-based disabling isn't synchronous,
  // so a fast double-tap needs a ref guard to actually block the second call.
  const loadingRef = useRef(false);

  const canSubmit = name.trim().length > 0 && email.trim().length > 3 && password.length >= 6;

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

  const handleChoosePhoto = () => {
    const options = [
      { text: 'Сделать фото', onPress: pickFromCamera },
      { text: 'Выбрать из галереи', onPress: pickFromLibrary },
      ...(avatarUri ? [{ text: 'Удалить фото', onPress: () => setAvatarUri(null), style: 'destructive' as const }] : []),
      { text: 'Отмена', style: 'cancel' as const },
    ];
    Alert.alert('Фото профиля', undefined, options);
  };

  const handleSubmit = async () => {
    if (!canSubmit || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      await signup(email.trim(), password, name.trim());
      if (avatarUri) {
        // Best-effort: the account already exists at this point, so a failed
        // avatar upload shouldn't block onboarding — it can be retried later
        // from the profile screen.
        await updateProfile({ avatarUri }).catch(() => {});
      }
      router.replace('/(auth)/couple');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось создать аккаунт. Проверьте соединение.');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <Screen>
      <BackHeader />
      <Text style={styles.title}>Начнём знакомство 🌷</Text>
      <Text style={styles.subtitle}>Это займёт меньше минуты</Text>

      <Pressable style={styles.avatarWrap} onPress={handleChoosePhoto} hitSlop={8}>
        <Avatar emoji="🌸" uri={avatarUri} size={84} />
        <View style={styles.avatarBadge}>
          <Ionicons name="camera" size={16} color={colors.white} />
        </View>
      </Pressable>

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

      <Text style={styles.legal}>
        Создавая аккаунт, вы соглашаетесь с{' '}
        <Text style={styles.link} onPress={() => Linking.openURL(`${API_BASE_URL}/terms`)}>
          условиями использования
        </Text>{' '}
        и{' '}
        <Text style={styles.link} onPress={() => Linking.openURL(`${API_BASE_URL}/privacy`)}>
          политикой конфиденциальности
        </Text>
        .
      </Text>

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
    marginTop: spacing.xl,
  },
  avatarBadge: {
    position: 'absolute', bottom: -2, right: -2, width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.rose, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.cream,
  },
  error: { ...type.bodySm, color: colors.danger, marginTop: spacing.lg, textAlign: 'center' },
  legal: { ...type.bodySm, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.lg, lineHeight: 18 },
  footer: { ...type.body, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.xl },
  link: { color: colors.roseDark, fontFamily: type.bodySemibold.fontFamily },
});
