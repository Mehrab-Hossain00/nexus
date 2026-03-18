
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  TASKS = 'TASKS',
  SCHEDULE = 'SCHEDULE',
  TIMER = 'TIMER',
  TUTOR = 'TUTOR',
  ANALYTICS = 'ANALYTICS',
  HUB = 'HUB',
  SETTINGS = 'SETTINGS',
  SHOP = 'SHOP',
  ACHIEVEMENTS = 'ACHIEVEMENTS',
  DAILY_QUESTS = 'DAILY_QUESTS'
}

export type UserStatus = 'online' | 'offline' | 'studying' | 'break';

export type AppTheme = 'default' | 'midnight' | 'blackout' | 'neon_protocol' | 'oceanic' | 'sunset' | 'forest' | 'crimson' | 'discord_dark' | 'discord_light' | 'gradient_aurora' | 'gradient_nebula' | 'hacker_terminal' | 'cherry_blossom' | 'premium_gold' | 'premium_cyber' | 'premium_ethereal' | 'premium_crimson';

export enum TaskStatus {
  PENDING = 'PENDING',
  DONE = 'DONE'
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export interface GalleryImage {
  id: string;
  url: string;
  createdAt: number;
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
  level?: number;
  credits?: number;
  streak?: number;
  streakFreezeCount?: number;
  unlockedThemes?: AppTheme[];
  unlockedGalleries?: string[];
  unlockedBadges?: string[];
  unlockedSoundPacks?: string[];
  unlockedAvatarBorders?: string[];
  unlockedProfileDecos?: string[];
  activeBadge?: string;
  activeAvatarBorder?: string;
  activeProfileDeco?: string;
  badges?: string[]; // IDs of earned badges
  dailyQuests?: DailyQuest[];
  lastActiveDate?: string;
  theme?: AppTheme;
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

export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  rewardXp: number;
  rewardCredits: number;
  completed: boolean;
  type: 'study_time' | 'tasks_done' | 'pomodoro_count';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  requirement: number;
  type: 'sessions' | 'tasks' | 'streak' | 'level';
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'theme' | 'booster' | 'streak_freeze' | 'gallery' | 'badge' | 'sound_pack' | 'avatar_border' | 'profile_deco';
  value?: string; // theme id or multiplier value
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
  groupId?: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}
