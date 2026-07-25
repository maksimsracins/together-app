import React, { useEffect, useRef } from 'react';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, type } from '../../src/theme';
import { Alert, AppState, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useAppStore } from '../../src/store/useAppStore';
import { useNotificationsStore } from '../../src/store/useNotificationsStore';

const PARTNER_POLL_INTERVAL_MS = 6000;

export default function TabsLayout() {
  const authStatus = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const partner = useAuthStore((s) => s.partner);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const loadEntries = useAppStore((s) => s.loadEntries);
  const loadPartnerEntries = useAppStore((s) => s.loadPartnerEntries);
  const loadLatestReport = useAppStore((s) => s.loadLatestReport);
  const loadNotifications = useNotificationsStore((s) => s.load);

  useEffect(() => {
    if (authStatus === 'authed') {
      loadEntries();
      loadPartnerEntries();
      loadLatestReport();
      loadNotifications().catch(() => {});
    }
  }, [authStatus, loadEntries, loadPartnerEntries, loadLatestReport, loadNotifications]);

  // Keep polling for couple changes as long as we're in one — this catches a
  // partner joining (coupleId set, partner still null) as well as the couple
  // being dissolved from the other side (our own coupleId flips back to null).
  // Notifications ride the same interval — a "partner left" entry is exactly
  // the kind of thing that shows up between polls.
  useEffect(() => {
    if (authStatus !== 'authed') return;
    const interval = setInterval(() => {
      refreshMe();
      loadNotifications().catch(() => {});
    }, PARTNER_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [authStatus, refreshMe, loadNotifications]);

  // JS timers pause while the app is backgrounded, so the interval above alone
  // misses a change that happened while this device was locked/backgrounded —
  // catch up immediately whenever the app comes back to the foreground.
  useEffect(() => {
    if (authStatus !== 'authed') return;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refreshMe();
        loadNotifications().catch(() => {});
      }
    });
    return () => subscription.remove();
  }, [authStatus, refreshMe, loadNotifications]);

  const previousPartnerRef = useRef(partner);
  useEffect(() => {
    if (!previousPartnerRef.current && partner) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Партнёр присоединился! 💞', `${partner.name} теперь с вами в Together.`);
    }
    previousPartnerRef.current = partner;
  }, [partner]);

  if (authStatus !== 'authed') {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.roseDark,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarLabelStyle: { fontFamily: type.bodySemibold.fontFamily, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          shadowColor: '#8A6A55',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Главная',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Неделя',
          tabBarIcon: ({ color, size }) => <Ionicons name="book-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Отчёт',
          tabBarIcon: ({ color, size }) => <Ionicons name="heart-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профиль',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
