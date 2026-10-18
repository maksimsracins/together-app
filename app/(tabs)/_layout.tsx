import React, { useEffect, useRef } from 'react';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, type } from '../../src/theme';
import { Alert, AppState, Platform, Pressable, View } from 'react-native';
import type { BottomTabBarButtonProps } from 'expo-router/tabs';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useAppStore } from '../../src/store/useAppStore';
import { useNotificationsStore } from '../../src/store/useNotificationsStore';
import { useT } from '../../src/i18n';
import { TourOverlay } from '../../src/tour/TourOverlay';
import { TourTarget } from '../../src/tour/TourTarget';
import { useTourStore } from '../../src/tour/useTourStore';

const PARTNER_POLL_INTERVAL_MS = 6000;

// Tab buttons the walkthrough can spotlight.
function tourTabButton(id: string) {
  return function TourTabButton({ ref: _ref, ...props }: BottomTabBarButtonProps) {
    return (
      <TourTarget id={id} style={{ flex: 1 }}>
        <Pressable {...(props as React.ComponentProps<typeof Pressable>)} style={[props.style, { flex: 1 }]} />
      </TourTarget>
    );
  };
}
const CalendarTabButton = tourTabButton('tabCalendar');
const ProfileTabButton = tourTabButton('tabProfile');

export default function TabsLayout() {
  const t = useT();
  const authStatus = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const partner = useAuthStore((s) => s.partner);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const loadEntries = useAppStore((s) => s.loadEntries);
  const loadPartnerEntries = useAppStore((s) => s.loadPartnerEntries);
  const loadLatestReport = useAppStore((s) => s.loadLatestReport);
  const loadCoupleSettings = useAppStore((s) => s.loadCoupleSettings);
  const loadNotifications = useNotificationsStore((s) => s.load);

  useEffect(() => {
    if (authStatus === 'authed') {
      loadEntries();
      loadPartnerEntries();
      loadLatestReport();
      loadCoupleSettings().catch(() => {});
      loadNotifications().catch(() => {});
    }
  }, [authStatus, loadEntries, loadPartnerEntries, loadLatestReport, loadCoupleSettings, loadNotifications]);

  // Keep polling for couple changes as long as we're in one — this catches a
  // partner joining (coupleId set, partner still null) as well as the couple
  // being dissolved from the other side (our own coupleId flips back to null).
  // Notifications, the shared weekly report, and the shared report settings
  // all ride the same interval — a "partner left" entry, a report the *other*
  // partner just generated, or a schedule/notification toggle they just
  // changed are exactly the kind of thing that shows up between polls. These
  // are single shared objects per couple, so both phones need to converge on
  // them without either partner having to manually refresh.
  useEffect(() => {
    if (authStatus !== 'authed') return;
    const interval = setInterval(() => {
      refreshMe().catch(() => {});
      loadNotifications().catch(() => {});
      loadLatestReport().catch(() => {});
      loadCoupleSettings().catch(() => {});
    }, PARTNER_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [authStatus, refreshMe, loadNotifications, loadLatestReport, loadCoupleSettings]);

  // JS timers pause while the app is backgrounded, so the interval above alone
  // misses a change that happened while this device was locked/backgrounded —
  // catch up immediately whenever the app comes back to the foreground.
  useEffect(() => {
    if (authStatus !== 'authed') return;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refreshMe().catch(() => {});
        loadNotifications().catch(() => {});
        loadLatestReport().catch(() => {});
        loadCoupleSettings().catch(() => {});
      }
    });
    return () => subscription.remove();
  }, [authStatus, refreshMe, loadNotifications, loadLatestReport, loadCoupleSettings]);

  // First time this account reaches the app: walk them through it. The short
  // delay lets Home lay out before the first spotlight measures it.
  const userId = user?.id;
  useEffect(() => {
    if (authStatus !== 'authed' || !userId) return;
    const timer = setTimeout(() => useTourStore.getState().startIfFirstTime(userId), 700);
    return () => clearTimeout(timer);
  }, [authStatus, userId]);

  const previousPartnerRef = useRef(partner);
  useEffect(() => {
    if (!previousPartnerRef.current && partner) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert(t('tabs.partnerJoinedTitle'), t('tabs.partnerJoinedBody', { name: partner.name }));
    }
    previousPartnerRef.current = partner;
  }, [partner]);

  if (authStatus !== 'authed') {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <View style={{ flex: 1 }}>
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
          title: t('tabs.home'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: t('tabs.calendar'),
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
          tabBarButton: CalendarTabButton,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
          tabBarButton: ProfileTabButton,
        }}
      />
    </Tabs>
    <TourOverlay />
    </View>
  );
}
