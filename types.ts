
export enum AppState {
  MENU = 'MENU',
  STUDY = 'STUDY',
  GAME = 'GAME',
  SUMMARY = 'SUMMARY'
}

export interface MathFact {
  factorA: number;
  factorB: number;
  userAnswer?: number;
  isCorrect?: boolean;
  timestamp: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isAnimating?: boolean;
}

export interface TutorConfig {
  name: string;
  personality: string;
}
