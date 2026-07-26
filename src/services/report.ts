import { api } from './http';
import { EmotionKey, WeeklyReportEntry } from '../types';

export interface PerspectiveReport {
  narrative: string;
  myEntries: WeeklyReportEntry[];
  partnerEntries: WeeklyReportEntry[];
}

export interface ReportEnvelope {
  id: string;
  weekId: string;
  weekLabel: string;
  generatedAt: string;
  report: PerspectiveReport;
}

export interface ReportHistoryItem {
  id: string;
  weekLabel: string;
  generatedAt: string;
}

export function generateReport() {
  return api<ReportEnvelope>('/api/report/generate', { method: 'POST' });
}

export function getLatestReport() {
  return api<ReportEnvelope | null>('/api/report/latest');
}

export function getReportHistory() {
  return api<ReportHistoryItem[]>('/api/report/history');
}

export function getReportHistoryDetail(id: string) {
  return api<ReportEnvelope>(`/api/report/history/${id}`);
}

export type { EmotionKey };
