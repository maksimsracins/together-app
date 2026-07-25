export type EntryType = 'worry' | 'joy' | 'gratitude' | 'wish' | 'thought';

export type EmotionKey =
  | 'joy'
  | 'sadness'
  | 'irritation'
  | 'anxiety'
  | 'love'
  | 'hurt'
  | 'calm'
  | 'doubt'
  | 'gratitude';

export interface EntryInput {
  type: EntryType;
  emotion: EmotionKey;
  text: string;
  tags: string[];
  createdAt: string;
}

export interface ProfileContext {
  age?: number;
  occupation?: string;
  habits?: string;
}

export interface GenerateReportRequest {
  weekLabel: string;
  userAName: string;
  userBName: string;
  entriesA: EntryInput[];
  entriesB: EntryInput[];
  profileA: ProfileContext;
  profileB: ProfileContext;
  previousNarrative?: string;
}

export interface PlanItem {
  emoji: string;
  title: string;
}

export interface GenerateReportResponse {
  narrative: string;
  narrativeDeep: string;
  planA: PlanItem[];
  planB: PlanItem[];
}
