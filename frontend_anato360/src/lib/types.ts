export type Language = 'pt' | 'es';
export type Theme = 'light' | 'dark';
export type View = 'login' | 'dashboard' | 'quiz' | 'progress' | 'admin';
export type AnatomySystem = 'skeletal' | 'muscular' | 'digestive' | 'respiratory' | 'circulatory' | 'all';

export interface Question {
  id: string;
  system: Exclude<AnatomySystem, 'all'>;
  imageUrl: string;
  imageAlt_pt: string;
  imageAlt_es: string;
  marker: { x: number; y: number };
  correct_pt: string;
  correct_es: string;
  options_pt: string[];
  options_es: string[];
}

export interface QuizResult {
  questionId: string;
  system: Exclude<AnatomySystem, 'all'>;
  correct_pt: string;
  correct_es: string;
  usedOpenAnswer: boolean;
  correct: boolean;
  points: number;
  timestamp: number;
}

export interface UserStats {
  totalPoints: number;
  results: QuizResult[];
}

export interface AppUser {
  name: string;
  email: string;
  isAdmin?: boolean;
}

export interface AdminMarker {
  id: string;
  x: number;
  y: number;
  label_pt: string;
  label_es: string;
  confirmed: boolean;
}

export interface CustomQuestion extends Question {
  imageDataUrl: string;
}
