import { api } from './http';
import { EmotionKey, WeeklyReportEntry } from '../types';

export interface PerspectiveReport {
  narrative: string;
  narrativeDeep: string;
  myEntries: WeeklyReportEntry[];
  partnerEntries: WeeklyReportEntry[];
}

export interface ReportEnvelope {
  weekId: string;
  weekLabel: string;
  generatedAt: string;
  report: PerspectiveReport;
}

export function generateReport() {
  return api<ReportEnvelope>('/api/report/generate', { method: 'POST' });
}

export function getLatestReport() {
  return api<ReportEnvelope | null>('/api/report/latest');
}

export type { EmotionKey };
