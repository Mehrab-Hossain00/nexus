
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  TASKS = 'TASKS',
  SCHEDULE = 'SCHEDULE',
  TIMER = 'TIMER',
  TUTOR = 'TUTOR',
  ANALYTICS = 'ANALYTICS',
  HUB = 'HUB',
  SETTINGS = 'SETTINGS'
}

export type UserStatus = 'online' | 'offline' | 'studying' | 'break';

export type AppTheme = 'default' | 'midnight' | 'blackout' | 'cyberpunk' | 'oceanic' | 'sunset' | 'forest' | 'crimson';

export enum TaskStatus {
  PENDING = 'PENDING',
  DONE = 'DONE'
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

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
  xp?: number;
  streak?: number;
  theme?: AppTheme;
  friends?: string[]; // Array of UIDs
  friendRequests?: { from: string; name: string; avatar: string }[];
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

export interface Reaction {
  emoji: string;
  count: number;
  uids: string[];
}

export interface PostComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: number;
}

export interface SocialPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  type: 'manual' | 'session_complete' | 'achievement';
  content: string;
  imageUrl?: string;
  subject?: string;
  duration?: number; 
  timestamp: number;
  reactions: Reaction[];
  commentCount: number;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
  seen?: boolean;
}

export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  ownerId: string;
  members: string[];
  groupCode: string;
  createdAt: number;
}

export interface StudySession {
  id: string;
  userId: string;
  subject: string;
  duration: number;
  timestamp: number;
  date: string;
}

export interface Task {
  id: string;
  userId?: string;
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
  userId?: string;
  title: string;
  subject?: string;
  startTime: string;
  date?: string;
  durationMinutes: number;
  type: 'study' | 'break' | 'exam' | 'other';
  description?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  type: string;
  subject?: string;
  duration?: number;
  timestamp: number;
}

export interface GroupMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}
