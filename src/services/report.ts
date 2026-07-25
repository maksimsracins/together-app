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

export interface ReportHistoryItem {
  id: string;
  weekId: string;
  weekLabel: string;
  generatedAt: string;
  narrative: string;
}

export function getReportHistory() {
  return api<ReportHistoryItem[]>('/api/report/history');
}

export function getReportHistoryDetail(id: string) {
  return api<ReportEnvelope>(`/api/report/history/${id}`);
}

export type { EmotionKey };
