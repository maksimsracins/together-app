import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle, StyleProp } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing, type } from '../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  style,
  fullWidth = true,
}: ButtonProps) {
  const handlePress = () => {
    Haptics.selectionAsync().catch(() => {});
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        fullWidth && { alignSelf: 'stretch' },
        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.white : colors.roseDark} />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, labelStyles[variant], icon ? { marginLeft: spacing.sm } : null]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
  },
  label: {
    ...type.button,
  },
});

const variantStyles: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.rose },
  secondary: { backgroundColor: colors.sageMist },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.border },
  ghost: { backgroundColor: 'transparent' },
};

const labelStyles: Record<Variant, { color: string }> = {
  primary: { color: colors.white },
  secondary: { color: colors.sageDark },
  outline: { color: colors.ink },
  ghost: { color: colors.roseDark },
};
