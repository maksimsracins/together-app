import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Entry } from '../types';
import { emotionMeta, entryTypeMeta } from '../data/catalog';
import { colors, radius, spacing, type } from '../theme';
import { Ionicons } from '@expo/vector-icons';

export function EntryCard({
  entry,
  editable = false,
  authorLabel,
  mine,
}: {
  entry: Entry;
  editable?: boolean;
  authorLabel?: string;
  mine?: boolean;
}) {
  const typeMeta = entryTypeMeta(entry.type);
  const emo = emotionMeta(entry.emotion);
  const time = new Date(entry.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const accent = mine === undefined ? undefined : mine ? colors.rose : colors.skyDark;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        accent && { borderLeftWidth: 3, borderLeftColor: accent },
        editable && pressed && { opacity: 0.8 },
      ]}
      disabled={!editable}
      onPress={() => router.push({ pathname: '/entry/new', params: { id: entry.id } })}
    >
      <View style={[styles.iconWrap, mine !== undefined && { backgroundColor: mine ? colors.roseMist : colors.skyMist }]}>
        <Text style={styles.icon}>{typeMeta.emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        {authorLabel && <Text style={[styles.author, accent && { color: accent }]}>{authorLabel}</Text>}
        <View style={styles.headerRow}>
          <Text style={styles.type}>{typeMeta.label}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>
        <Text style={styles.text} numberOfLines={4}>
          {entry.text}
        </Text>
        {entry.photoUri && <Image source={{ uri: entry.photoUri }} style={styles.photo} />}
        <View style={styles.footerRow}>
          <Text style={styles.emotionBadge}>
            {emo.emoji} {emo.label}
          </Text>
          {entry.hasAudio && <Ionicons name="mic-outline" size={15} color={colors.inkMuted} style={styles.metaIcon} />}
          {entry.tags.map((tag) => (
            <Text key={tag} style={styles.tag}>
              #{tag}
            </Text>
          ))}
        </View>
      </View>
      {editable && <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} style={{ marginLeft: spacing.sm, alignSelf: 'center' }} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.sandMist,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  icon: { fontSize: 20 },
  author: { ...type.bodySemibold, fontFamily: type.bodySemibold.fontFamily, fontSize: 13, color: colors.roseDark, marginBottom: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  type: { ...type.bodySemibold, fontFamily: type.bodySemibold?.fontFamily, color: colors.ink },
  time: { ...type.bodySm, color: colors.inkMuted },
  text: { ...type.body, color: colors.inkSoft },
  photo: { width: '100%', height: 140, borderRadius: radius.md, marginTop: spacing.sm, backgroundColor: colors.sandMist },
  footerRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, flexWrap: 'wrap' },
  emotionBadge: { ...type.bodySm, color: colors.roseDark, marginRight: spacing.sm },
  metaIcon: { marginRight: spacing.sm },
  tag: { ...type.bodySm, color: colors.sageDark, marginRight: spacing.sm },
});
