import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Screen } from '../src/components/Screen';
import { BackHeader } from '../src/components/BackHeader';
import { Card } from '../src/components/Card';
import { useNotificationsStore } from '../src/store/useNotificationsStore';
import { colors, radius, spacing, type } from '../src/theme';

export default function NotificationsScreen() {
  const items = useNotificationsStore((s) => s.items);
  const load = useNotificationsStore((s) => s.load);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);
  const remove = useNotificationsStore((s) => s.remove);

  useEffect(() => {
    load()
      .then(() => markAllRead())
      .catch(() => {});
  }, [load, markAllRead]);

  const handleDelete = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    remove(id).catch(() => {});
  };

  return (
    <Screen>
      <BackHeader title="Уведомления" />

      {items.length === 0 ? (
        <Card style={{ alignItems: 'center', marginTop: spacing.xl }}>
          <Text style={styles.emptyEmoji}>🔔</Text>
          <Text style={styles.emptyText}>Пока нет уведомлений</Text>
        </Card>
      ) : (
        items.map((n) => (
          <Card key={n.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.message}>{n.message}</Text>
              <Text style={styles.time}>
                {formatDistanceToNow(new Date(n.createdAt), { locale: ru, addSuffix: true })}
              </Text>
            </View>
            <Pressable onPress={() => handleDelete(n.id)} hitSlop={10} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={18} color={colors.inkMuted} />
            </Pressable>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  message: { ...type.body, color: colors.ink },
  time: { ...type.bodySm, color: colors.inkMuted, marginTop: spacing.xs },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  emptyEmoji: { fontSize: 32, marginBottom: spacing.sm },
  emptyText: { ...type.body, color: colors.inkMuted },
});
