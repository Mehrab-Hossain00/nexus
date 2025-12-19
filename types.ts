
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  TASKS = 'TASKS',
  SCHEDULE = 'SCHEDULE',
  FOCUS = 'FOCUS',
  TUTOR = 'TUTOR',
  ANALYTICS = 'ANALYTICS',
  GROUPS = 'GROUPS',
  SETTINGS = 'SETTINGS'
}

export type UserStatus = 'online' | 'offline' | 'studying' | 'break';

export interface UserProfile {
  uid: string;
  name: string;
  avatar?: string;
  pin: string;
  biometricEnabled?: boolean;
  status?: UserStatus;
  currentSubject?: string;
  dailyGoalMinutes?: number;
  lastActivity?: number;
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
  dueDate?: string;
  reminderOffset?: number;
  createdAt: number;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  subject?: string;
  startTime: string;
  date?: string;
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

// --- NEW COLLABORATIVE TYPES ---

export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  ownerId: string;
  members: string[]; // UIDs
  groupCode: string;
  createdAt: number;
}

export interface GroupMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  type: 'session_started' | 'session_completed' | 'joined_group' | 'created_group';
  subject?: string;
  duration?: number; // seconds
  timestamp: number;
}

export interface StudySession {
  id: string;
  userId: string;
  subject: string;
  duration: number; // seconds
  timestamp: number;
  date: string; // YYYY-MM-DD
}
