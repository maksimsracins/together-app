import type { StringKey } from '../i18n/strings';

export type TourRoute = '/(tabs)' | '/(tabs)/calendar' | '/(tabs)/profile';

export interface TourStep {
  // Matches a <TourTarget id>; no target = a centered card over a plain dim.
  target?: string;
  // Tab the step's target lives on; the tour switches there before showing it.
  route: TourRoute;
  title: StringKey;
  body: StringKey;
}

export const TOUR_STEPS: TourStep[] = [
  { route: '/(tabs)', title: 'tour.welcomeTitle', body: 'tour.welcomeBody' },
  // Home
  { target: 'couple', route: '/(tabs)', title: 'tour.coupleTitle', body: 'tour.coupleBody' },
  { target: 'countdown', route: '/(tabs)', title: 'tour.countdownTitle', body: 'tour.countdownBody' },
  { target: 'reportSettings', route: '/(tabs)', title: 'tour.settingsTitle', body: 'tour.settingsBody' },
  { target: 'addEntry', route: '/(tabs)', title: 'tour.addTitle', body: 'tour.addBody' },
  { target: 'report', route: '/(tabs)', title: 'tour.reportTitle', body: 'tour.reportBody' },
  { target: 'bell', route: '/(tabs)', title: 'tour.bellTitle', body: 'tour.bellBody' },
  // Calendar
  { target: 'tabCalendar', route: '/(tabs)', title: 'tour.tabCalendarTitle', body: 'tour.tabCalendarBody' },
  { target: 'calendarWeek', route: '/(tabs)/calendar', title: 'tour.calendarTitle', body: 'tour.calendarBody' },
  // Profile
  { target: 'tabProfile', route: '/(tabs)', title: 'tour.tabProfileTitle', body: 'tour.tabProfileBody' },
  { target: 'profileEdit', route: '/(tabs)/profile', title: 'tour.editTitle', body: 'tour.editBody' },
  { route: '/(tabs)', title: 'tour.doneTitle', body: 'tour.doneBody' },
];
