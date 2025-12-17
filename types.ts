
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  TASKS = 'TASKS',
  SCHEDULE = 'SCHEDULE',
  FOCUS = 'FOCUS',
  TUTOR = 'TUTOR',
  ANALYTICS = 'ANALYTICS',
  SETTINGS = 'SETTINGS'
}

export interface UserProfile {
  uid: string;
  name: string;
  avatar?: string;
  pin: string; // 4-digit security pin
  biometricEnabled?: boolean;
}

export enum TaskPriority {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low'
}

export enum TaskStatus {
  PENDING = 'Pending',
  DONE = 'Done'
}

export interface Task {
  id: string;
  title: string;
  subject: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string; // ISO String YYYY-MM-DDTHH:mm
  reminderOffset?: number; // Minutes before due date
  createdAt: number;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  subject?: string;
  startTime: string; // ISO String or HH:mm
  date?: string; // YYYY-MM-DD
  durationMinutes: number;
  type: 'study' | 'break' | 'exam' | 'other';
  description?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  imageUrl?: string;
  timestamp: number;
  isError?: boolean;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export interface AnalyticsData {
  date: string;
  tasksCompleted: number;
  focusMinutes: number;
}