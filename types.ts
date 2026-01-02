
export type Mood = 'happy' | 'excited' | 'neutral' | 'sad' | 'angry' | '';

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  repeatDays?: number;
}

export interface DailyData {
  todo: TodoItem[];
  diary: string;
  mood: Mood;
  photos: string[];
}

export interface AppState {
  [date: string]: DailyData;
}

export type ViewMode = 'todo' | 'diary' | 'gallery';
