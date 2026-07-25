import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LOVE_LANGUAGE_INFO } from '../data/catalog';
import { colors, radius, spacing, type } from '../theme';

export function LoveLanguagesInfoButton() {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Pressable onPress={() => setVisible(true)} hitSlop={10} style={styles.btn}>
        <Ionicons name="information-circle-outline" size={20} color={colors.roseDark} />
      </Pressable>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={() => setVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Что такое языки любви?</Text>
              <Pressable onPress={() => setVisible(false)} hitSlop={8}>
                <Text style={styles.done}>Готово</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
              <Text style={styles.intro}>
                Языки любви — это способы, которыми люди чувствуют и выражают любовь. У каждого обычно есть один-два
                главных: зная свой и партнёра, легче показывать заботу так, чтобы партнёр услышал.
              </Text>

              {LOVE_LANGUAGE_INFO.map((item) => (
                <View key={item.label} style={styles.item}>
                  <Text style={styles.itemEmoji}>{item.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemLabel}>{item.label}</Text>
                    <Text style={styles.itemDescription}>{item.description}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.sm,
  },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay },
  sheet: {
    maxHeight: '80%', backgroundColor: colors.cardSoft, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingBottom: spacing.xxl, paddingTop: spacing.sm, paddingHorizontal: spacing.xl,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.md, marginHorizontal: -spacing.xl, paddingHorizontal: spacing.xl,
    borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: spacing.lg,
  },
  headerTitle: { ...type.bodySemibold, fontFamily: type.bodySemibold.fontFamily, color: colors.ink },
  done: { ...type.bodySemibold, fontFamily: type.bodySemibold.fontFamily, color: colors.roseDark },
  intro: { ...type.body, color: colors.inkSoft, lineHeight: 22, marginBottom: spacing.xl },
  item: { flexDirection: 'row', marginBottom: spacing.lg },
  itemEmoji: { fontSize: 22, marginRight: spacing.md },
  itemLabel: { ...type.bodySemibold, fontFamily: type.bodySemibold.fontFamily, color: colors.ink, marginBottom: 2 },
  itemDescription: { ...type.bodySm, color: colors.inkMuted, lineHeight: 19 },
});
