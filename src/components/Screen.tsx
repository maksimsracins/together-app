import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: ViewStyle;
}

export function Screen({ children, scroll = true, style, contentStyle }: ScreenProps) {
  const Container = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={[styles.safe, style]} edges={['top']}>
      <Container
        style={{ flex: 1 }}
        contentContainerStyle={scroll ? [styles.content, contentStyle] : undefined}
        showsVerticalScrollIndicator={false}
      >
        {!scroll ? <View style={[styles.content, { flex: 1 }, contentStyle]}>{children}</View> : children}
      </Container>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
});
