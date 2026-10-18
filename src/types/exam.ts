export type ExamHskLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | '7-9' | 'HSKK';

export type ExamCategory = 'official' | 'mock' | 'listening' | 'reading' | 'writing';

export interface ExamItem {
  id: string;
  title: string;
  hskLevel: ExamHskLevel;
  category: ExamCategory;
  year?: number;
  source?: string;
  durationMinutes?: number;
  questionCount?: number;
  description?: string;
  pdfUrl?: string;
  audioUrl?: string;
  answerUrl?: string;
  isPinned?: boolean;
  status: 'published' | 'draft';
  viewsCount: number;
  downloadsCount: number;
  createdAt: string;
  updatedAt: string;
}
