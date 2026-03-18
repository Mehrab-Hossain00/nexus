
import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { TaskManager } from './components/TaskManager.tsx';
import { SmartSchedule } from './components/SmartSchedule.tsx';
import { FocusTimer } from './components/FocusTimer.tsx';
import { AITutor } from './components/AITutor.tsx';
import { Analytics } from './components/Analytics.tsx';
import { NexusHub } from './components/NexusHub.tsx';
import { NexusShop } from './components/NexusShop.tsx';
import { Achievements } from './components/Achievements.tsx';
import { DailyQuests } from './components/DailyQuests.tsx';
import { Login } from './components/Login.tsx';
import { CommandPalette } from './components/CommandPalette.tsx';
import { GamificationOverlay } from './components/GamificationOverlay.tsx';
import { GothMommyGallery } from './components/GothMommyGallery.tsx';
import { authService } from './services/authService.ts';
import { dbService } from './services/dbService.ts';
import { increment, query, collection, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from './services/firebase.ts';
import { AppView, UserProfile, AppTheme, DailyQuest, Task, TaskPriority, TaskStatus } from './types.ts';
import { BellRing, X, User as UserIcon, Check, Sparkles, Target, Palette, Moon, Sun, Monitor, Zap, ShoppingBag, Award, Lock } from 'lucide-react';

const XP_PER_LEVEL = 1000;
const INITIAL_DAILY_QUESTS: DailyQuest[] = [
  { id: 'q1', title: 'Deep Focus', description: 'Study for 60 minutes', target: 60, current: 0, rewardXp: 100, rewardCredits: 50, completed: false, type: 'study_time' },
  { id: 'q2', title: 'Task Master', description: 'Complete 3 tasks', target: 3, current: 0, rewardXp: 150, rewardCredits: 75, completed: false, type: 'tasks_done' },
  { id: 'q3', title: 'Pomodoro Streak', description: 'Complete 4 Pomodoros', target: 4, current: 0, rewardXp: 200, rewardCredits: 100, completed: false, type: 'pomodoro_count' },
];

const DEFAULT_SUBJECTS = ["Math", "Physics", "Chemistry", "Biology"];

const AVATAR_PRESETS = [
  { style: 'micah', seed: 'Felix' },
  { style: 'micah', seed: 'Aneka' },
  { style: 'micah', seed: 'Julian' },
  { style: 'avataaars', seed: 'Lily' },
  { style: 'avataaars', seed: 'Jack' },
  { style: 'avataaars', seed: 'Luna' },
  { style: 'lorelei', seed: 'Maya' },
  { style: 'lorelei', seed: 'Oliver' },
  { style: 'bottts', seed: 'Robo1' },
  { style: 'bottts', seed: 'Robo2' },
  { style: 'pixel-art', seed: 'Hero' },
  { style: 'pixel-art', seed: 'Quest' },
];

const THEMES: { id: AppTheme; name: string; description: string; colors: string[]; isPremium?: boolean }[] = [
  { id: 'default', name: 'Nexus Core', description: 'Deep Black & Electric Violet', colors: ['#000000', '#7C3AED'] },
  { id: 'midnight', name: 'Midnight', description: 'Deep Black & Royal Blue', colors: ['#000000', '#2563EB'] },
  { id: 'blackout', name: 'Blackout', description: 'Pure Black & White', colors: ['#000000', '#FFFFFF'] },
  { id: 'neon_protocol', name: 'Neon Protocol', description: 'Deep Black & Magenta', colors: ['#000000', '#D946EF'] },
  { id: 'oceanic', name: 'Oceanic', description: 'Deep Black & Cyan', colors: ['#000000', '#06B6D4'] },
  { id: 'sunset', name: 'Sunset', description: 'Deep Black & Amber', colors: ['#000000', '#F59E0B'] },
  { id: 'forest', name: 'Forest', description: 'Deep Black & Emerald', colors: ['#000000', '#10B981'] },
  { id: 'crimson', name: 'Crimson', description: 'Deep Black & Red', colors: ['#000000', '#EF4444'] },
  { id: 'discord_dark', name: 'Dark', description: 'Classic Dark Mode', colors: ['#36393f', '#5865F2'], isPremium: true },
  { id: 'discord_light', name: 'Light', description: 'Bright & Clean', colors: ['#ffffff', '#5865F2'], isPremium: true },
  { id: 'gradient_aurora', name: 'Aurora Borealis', description: 'Cool Teal Gradients', colors: ['#0f2027', '#00f2fe'], isPremium: true },
  { id: 'gradient_nebula', name: 'Nebula Dream', description: 'Deep Space Purples', colors: ['#2a0845', '#ff0099'], isPremium: true },
  { id: 'hacker_terminal', name: 'Terminal', description: 'Pure Black & Neon Green', colors: ['#000000', '#00ff00'], isPremium: true },
  { id: 'cherry_blossom', name: 'Cherry Blossom', description: 'Soft Pinks & Purples', colors: ['#2a1b2e', '#ffb7b2'], isPremium: true },
  { id: 'premium_gold', name: 'Prestige Gold', description: 'Luxurious Gold & Black', colors: ['#1a1a1a', '#FFD700'], isPremium: true },
  { id: 'premium_cyber', name: 'Cyberpunk 2077', description: 'Neon Yellow & Cyan', colors: ['#050505', '#fcee0a'], isPremium: true },
  { id: 'premium_ethereal', name: 'Ethereal Light', description: 'Soft Ice Blues', colors: ['#e6f2ff', '#4da6ff'], isPremium: true },
  { id: 'premium_crimson', name: 'Crimson Blood', description: 'Deep Reds & Pure Black', colors: ['#000000', '#DC143C'], isPremium: true },
];

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isLoading, setIsLoading] = useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isGothMommyGalleryOpen, setIsGothMommyGalleryOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<AppTheme>('default');
  const [xpPopups, setXpPopups] = useState<{ id: string; amount: number; x: number; y: number }[]>([]);
  const [levelUp, setLevelUp] = useState<{ level: number; rewards: { xp: number; credits: number } } | null>(null);
  const [globalRankings, setGlobalRankings] = useState<UserProfile[]>([]);

  const [subjects, setSubjects] = useState<string[]>(() => {
    const saved = localStorage.getItem('nexus_subjects');
    try {
      return saved ? JSON.parse(saved) : DEFAULT_SUBJECTS;
    } catch {
      return DEFAULT_SUBJECTS;
    }
  });

  const [settingsTab, setSettingsTab] = useState<'profile' | 'appearance' | 'preferences'>('profile');

  // --- TIMER STATE ---
  const [timerType, setTimerType] = useState<'stopwatch' | 'pomodoro'>(() => {
    return (localStorage.getItem('nexus_timer_type') as 'stopwatch' | 'pomodoro') || 'stopwatch';
  });
  const [timerMode, setTimerMode] = useState<'focus' | 'short' | 'long'>('focus');
  const [timerIsActive, setTimerIsActive] = useState(false);
  const [timerTimeValue, setTimerTimeValue] = useState(0); 
  const [timerTotalTime, setTimerTotalTime] = useState(25 * 60);
  const [timerSubject, setTimerSubject] = useState(() => {
    return localStorage.getItem('nexus_timer_subject') || DEFAULT_SUBJECTS[0];
  });
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('nexus_timer_muted') === 'true';
  });
  const [showAlarmToast, setShowAlarmToast] = useState(false);
  
  const timerIntervalRef = useRef<any>(null);
  const timerTargetTimeRef = useRef<number | null>(null); 

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    localStorage.setItem('nexus_subjects', JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem('nexus_timer_subject', timerSubject);
  }, [timerSubject]);

  useEffect(() => {
    localStorage.setItem('nexus_timer_muted', isMuted.toString());
  }, [isMuted]);

  useEffect(() => {
    localStorage.setItem('nexus_timer_type', timerType);
  }, [timerType]);

  useEffect(() => {
    const initSession = async () => {
      try {
        const savedUser = await authService.restoreSession();
        if (savedUser) {
          setUser(savedUser);
          if (savedUser.theme) {
            setCurrentTheme(savedUser.theme);
            document.body.setAttribute('data-theme', savedUser.theme);
          }
          await dbService.updateUserStatus(savedUser.uid, 'online');
        }
      } finally {
        setIsLoading(false);
      }
    };
    initSession();

    const handleUnload = () => {
        if (user) dbService.updateUserStatus(user.uid, 'offline');
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  // Give "test" account unlimited credits
  useEffect(() => {
    if (user && user.name === 'test' && (user.credits || 0) < 9999999) {
      const giveUnlimitedCredits = async () => {
        await dbService.updateUserProfile(user.uid, { credits: 9999999 });
        setUser(prev => prev ? { ...prev, credits: 9999999 } : null);
      };
      giveUnlimitedCredits();
    }
  }, [user?.name, user?.credits, user?.uid]);

  useEffect(() => {
    const resetXP = async () => {
      if (!user) return;
      const hasReset = localStorage.getItem('nexus_xp_reset_done');
      if (!hasReset) {
        await dbService.resetAllUsersXP(user.uid);
        localStorage.setItem('nexus_xp_reset_done', 'true');
        setUser(prev => prev ? { ...prev, xp: 0, level: 1 } : null);
      }
    };
    resetXP();
  }, [user]);

  // --- DAILY QUESTS LOGIC ---
  const DAILY_TASK_IDEAS = [
    "Review yesterday's notes",
    "Organize study space",
    "Read 1 chapter of current book",
    "Do a 10-minute meditation",
    "Plan tomorrow's schedule",
    "Drink 2 liters of water",
    "Stretch for 5 minutes",
    "Write down 3 things you learned today",
    "Clear out email inbox",
    "Review upcoming deadlines"
  ];

  const generateDailyTasks = async (userId: string) => {
    const shuffled = [...DAILY_TASK_IDEAS].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 2); // pick 2 unique tasks
    
    for (const title of selected) {
      const task: Task = {
        id: crypto.randomUUID(),
        title: `Daily: ${title}`,
        subject: 'General',
        priority: TaskPriority.LOW,
        status: TaskStatus.PENDING,
        createdAt: Date.now()
      };
      await dbService.addTask(task, userId);
    }
  };

  const generateDailyQuests = (level: number): DailyQuest[] => {
    const scale = Math.max(1, Math.floor(level / 5)); // Increase difficulty every 5 levels
    
    return [
      { 
        id: crypto.randomUUID(), 
        title: 'Deep Focus', 
        description: `Study for ${30 * scale} minutes`, 
        target: 30 * scale, 
        current: 0, 
        rewardXp: 100 * scale, 
        rewardCredits: 50 * scale, 
        completed: false, 
        type: 'study_time' 
      },
      { 
        id: crypto.randomUUID(), 
        title: 'Task Master', 
        description: `Complete ${2 + scale} tasks`, 
        target: 2 + scale, 
        current: 0, 
        rewardXp: 150 * scale, 
        rewardCredits: 75 * scale, 
        completed: false, 
        type: 'tasks_done' 
      },
      { 
        id: crypto.randomUUID(), 
        title: 'Pomodoro Streak', 
        description: `Complete ${2 + scale} Pomodoros`, 
        target: 2 + scale, 
        current: 0, 
        rewardXp: 200 * scale, 
        rewardCredits: 100 * scale, 
        completed: false, 
        type: 'pomodoro_count' 
      },
    ];
  };

  useEffect(() => {
    const processDailyLogin = async () => {
      if (!user) return;
      
      const today = new Date().toISOString().split('T')[0];
      const lastActive = user.lastActiveDate;
      
      let needsUpdate = false;
      const updates: Partial<UserProfile> = {};

      let newStreak = user.streak || 0;
      
      if (lastActive !== today || !user.streak) {
        needsUpdate = true;
        updates.lastActiveDate = today;
        
        if (lastActive) {
          const lastDate = new Date(lastActive);
          const todayDate = new Date(today);
          const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            newStreak += 1;
          } else if (diffDays > 1) {
            if ((user.streakFreezeCount || 0) > 0) {
              updates.streakFreezeCount = (user.streakFreezeCount || 0) - 1;
              // Streak is maintained
            } else {
              newStreak = 1;
            }
          } else if (diffDays === 0) {
            newStreak = Math.max(1, newStreak);
          }
        } else {
          newStreak = 1;
        }
        
        if (newStreak !== user.streak) {
          updates.streak = newStreak;
        }
      }

      if (lastActive !== today || !user.dailyQuests || user.dailyQuests.length === 0) {
        needsUpdate = true;
        updates.dailyQuests = generateDailyQuests(user.level || 1);
        
        // Generate daily unique tasks only if it's a new day
        if (lastActive !== today) {
          await generateDailyTasks(user.uid);
        }
      }

      if (needsUpdate && Object.keys(updates).length > 0) {
        console.log("Processing daily login...", updates);
        setUser(prev => prev ? { ...prev, ...updates } : null);
        await dbService.updateUserProfile(user.uid, updates);
      }
    };
    
    if (user && !isLoading) {
      processDailyLogin();
    }
  }, [user?.uid, isLoading]);

  const refreshDailyQuests = async () => {
    if (!user) return;
    const newQuests = generateDailyQuests(user.level || 1);
    const updates: Partial<UserProfile> = { dailyQuests: newQuests };
    setUser(prev => prev ? { ...prev, ...updates } : null);
    await dbService.updateUserProfile(user.uid, updates);
    await generateDailyTasks(user.uid);
  };

  const triggerXP = async (amount: number, x?: number, y?: number) => {
    if (!user) return;
    
    const id = crypto.randomUUID();
    setXpPopups(prev => [...prev, { id, amount, x: x || window.innerWidth / 2, y: y || window.innerHeight / 2 }]);
    setTimeout(() => setXpPopups(prev => prev.filter(p => p.id !== id)), 2000);

    const newXP = (user.xp || 0) + amount;
    const currentLevel = user.level || 1;
    const newLevel = Math.floor(newXP / XP_PER_LEVEL) + 1;

    const updates: Partial<UserProfile> = { xp: newXP };
    
    if (newLevel > currentLevel) {
      const rewards = { xp: 0, credits: newLevel * 50 };
      setLevelUp({ level: newLevel, rewards });
      updates.level = newLevel;
      updates.credits = (user.credits || 0) + rewards.credits;
    }

    setUser(prev => prev ? { ...prev, ...updates } : null);
    await dbService.updateUserProfile(user.uid, updates);
    checkAchievements();
  };

  const checkAchievements = async () => {
    if (!user) return;
    const badges = user.badges || [];
    const newBadges = [...badges];
    let changed = false;

    // A1: Novice Scholar (1 session)
    if (!badges.includes('a1')) {
      const sessions = await dbService.getSessions(user.uid);
      if (sessions.length >= 1) { newBadges.push('a1'); changed = true; }
    }
    // A2: Deep Diver (10 sessions)
    if (!badges.includes('a2')) {
      const sessions = await dbService.getSessions(user.uid);
      if (sessions.length >= 10) { newBadges.push('a2'); changed = true; }
    }
    // A3: Task Ninja (20 tasks)
    if (!badges.includes('a3')) {
      const tasks = await dbService.getTasks(user.uid);
      const done = tasks.filter(t => t.status === 'DONE').length;
      if (done >= 20) { newBadges.push('a3'); changed = true; }
    }
    // A4: Unstoppable (7 day streak)
    if (!badges.includes('a4') && (user.streak || 0) >= 7) {
      newBadges.push('a4'); changed = true;
    }
    // A5: Nexus Sage (Level 10)
    if (!badges.includes('a5') && (user.level || 1) >= 10) {
      newBadges.push('a5'); changed = true;
    }

    if (changed) {
      setUser(prev => prev ? { ...prev, badges: newBadges } : null);
      await dbService.updateUserProfile(user.uid, { badges: newBadges });
      triggerXP(500); // Bonus for any achievement
    }
  };

  const fetchGlobalRankings = async () => {
    try {
      const q = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(10));
      const snap = await getDocs(q);
      setGlobalRankings(snap.docs.map(d => d.data() as UserProfile));
    } catch (err) {
      console.error("Failed to fetch rankings:", err);
    }
  };

  useEffect(() => {
    if (currentView === AppView.HUB) {
      fetchGlobalRankings();
    }
  }, [currentView]);

  const updateQuestProgress = async (type: DailyQuest['type'], amount: number) => {
    if (!user || !user.dailyQuests) return;

    let changed = false;
    const newQuests = user.dailyQuests.map(q => {
      if (q.type === type && !q.completed) {
        const newCurrent = Math.min(q.target, q.current + amount);
        if (newCurrent !== q.current) {
          changed = true;
          const completed = newCurrent >= q.target;
          if (completed) {
            triggerXP(q.rewardXp);
            // Credits are handled in triggerXP via level up or separately
            dbService.awardRewards(user.uid, 0, q.rewardCredits);
            setUser(prev => prev ? { ...prev, credits: (prev.credits || 0) + q.rewardCredits } : null);
          }
          return { ...q, current: newCurrent, completed };
        }
      }
      return q;
    });

    if (changed) {
      setUser(prev => prev ? { ...prev, dailyQuests: newQuests } : null);
      await dbService.updateDailyQuests(user.uid, newQuests);
    }
  };

  // Restore Timer State from LocalStorage
  useEffect(() => {
    const savedTarget = localStorage.getItem('nexus_timer_target');
    const savedActive = localStorage.getItem('nexus_timer_active') === 'true';
    const savedType = (localStorage.getItem('nexus_timer_type') as 'stopwatch' | 'pomodoro') || 'stopwatch';
    const savedMode = (localStorage.getItem('nexus_timer_mode') as any) || 'focus';
    const savedValue = parseInt(localStorage.getItem('nexus_timer_value') || '0');
    const savedTotal = parseInt(localStorage.getItem('nexus_timer_total') || '1500');

    setTimerType(savedType);
    setTimerMode(savedMode);
    setTimerTotalTime(savedTotal);

    if (savedActive && savedTarget) {
      const targetTime = parseInt(savedTarget);
      timerTargetTimeRef.current = targetTime;
      setTimerIsActive(true);
      
      if (savedType === 'pomodoro') {
        const remaining = Math.round((targetTime - Date.now()) / 1000);
        if (remaining > 0) {
          setTimerTimeValue(remaining);
        } else {
          handleTimerComplete();
        }
      } else {
        const elapsed = Math.round((Date.now() - targetTime) / 1000);
        setTimerTimeValue(elapsed);
      }
    } else {
      setTimerTimeValue(savedValue);
      setTimerIsActive(false);
    }
  }, []);

  // Timer Tick Logic
  useEffect(() => {
    if (timerIsActive) {
      timerIntervalRef.current = setInterval(() => {
        if (timerTargetTimeRef.current) {
          if (timerType === 'pomodoro') {
            const remaining = Math.max(0, Math.round((timerTargetTimeRef.current - Date.now()) / 1000));
            setTimerTimeValue(remaining);
            if (remaining <= 0) handleTimerComplete();
          } else {
            const elapsed = Math.max(0, Math.round((Date.now() - timerTargetTimeRef.current) / 1000));
            setTimerTimeValue(elapsed);
          }
        }
      }, 500);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [timerIsActive, timerType]);

  const playFeedbackSound = (type: 'start' | 'stop' | 'complete' | 'break') => {
    if (isMuted) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, duration: number, volume: number = 0.2, type: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    switch (type) {
      case 'start':
        playTone(440, now, 0.4);
        playTone(880, now + 0.1, 0.4);
        break;
      case 'stop':
        playTone(440, now, 0.5);
        playTone(220, now + 0.1, 0.6);
        break;
      case 'break':
        playTone(523.25, now, 1.0, 0.1);
        playTone(659.25, now + 0.1, 1.0, 0.05);
        break;
      case 'complete':
        playTone(880, now, 1);
        playTone(1108, now + 0.2, 1);
        playTone(1318, now + 0.4, 1);
        playTone(1760, now + 0.6, 1.5);
        break;
    }
  };

  const handleTimerComplete = async () => {
    setTimerIsActive(false);
    setTimerTimeValue(0);
    localStorage.removeItem('nexus_timer_active');
    localStorage.removeItem('nexus_timer_target');
    localStorage.setItem('nexus_timer_value', '0');
    
    playFeedbackSound('complete');
    setShowAlarmToast(true);

    if (timerType === 'pomodoro' && timerMode === 'focus' && user) {
        await saveSession(timerTotalTime);
        await dbService.updateUserStatus(user.uid, 'break');
        
        // Gamification: Award XP for completed Pomodoro
        const xpAmount = Math.floor(timerTotalTime / 60) * 2; // 2 XP per minute
        triggerXP(xpAmount);
        updateQuestProgress('pomodoro_count', 1);
        updateQuestProgress('study_time', Math.floor(timerTotalTime / 60));
    }
  };

  const saveSession = async (durationSecs: number) => {
    if (!user || durationSecs < 1) return;
    try {
        const xpAmount = Math.floor(durationSecs / 60) * 2;
        if (timerType === 'stopwatch') {
          triggerXP(xpAmount);
          updateQuestProgress('study_time', Math.floor(durationSecs / 60));
        }
        await dbService.logSession({
            id: crypto.randomUUID(),
            userId: user.uid,
            subject: timerSubject,
            duration: durationSecs,
            timestamp: Date.now(),
            date: new Date().toISOString().split('T')[0]
        });
        await dbService.logActivity({
            userId: user.uid,
            userName: user.name,
            type: 'session_completed',
            subject: timerSubject,
            duration: durationSecs
        });
    } catch (err) {
        console.error("Failed to save session:", err);
    }
  };

  const handleManualEnd = async () => {
      if (!user) return;
      const duration = timerType === 'pomodoro' ? (timerTotalTime - timerTimeValue) : timerTimeValue;
      
      setTimerIsActive(false);
      localStorage.removeItem('nexus_timer_active');
      localStorage.removeItem('nexus_timer_target');
      
      if (timerMode === 'focus' && duration > 1) {
          await saveSession(duration);
      }
      
      resetToDefault();
      await dbService.updateUserStatus(user.uid, 'online');
      playFeedbackSound('stop');
  };

  const resetToDefault = () => {
    if (timerType === 'stopwatch') {
      setTimerTimeValue(0);
      localStorage.setItem('nexus_timer_value', '0');
    } else {
      const settings = JSON.parse(localStorage.getItem('nexus_timer_settings') || '{"focus": 25, "short": 5, "long": 15}');
      const dur = settings[timerMode] * 60;
      setTimerTimeValue(dur);
      setTimerTotalTime(dur);
      localStorage.setItem('nexus_timer_value', dur.toString());
      localStorage.setItem('nexus_timer_total', dur.toString());
    }
  };

  const handleStartTimer = (value: number, type: 'stopwatch' | 'pomodoro', mode: string, subject: string) => {
    const isPomodoro = type === 'pomodoro';
    const target = isPomodoro ? (Date.now() + value * 1000) : (Date.now() - value * 1000);
    
    timerTargetTimeRef.current = target;
    localStorage.setItem('nexus_timer_active', 'true');
    localStorage.setItem('nexus_timer_target', target.toString());
    localStorage.setItem('nexus_timer_type', type);
    localStorage.setItem('nexus_timer_mode', mode);
    localStorage.setItem('nexus_timer_subject', subject);
    localStorage.setItem('nexus_timer_total', timerTotalTime.toString());
    
    setTimerTimeValue(value);
    setTimerIsActive(true);
    setTimerType(type);
    setTimerMode(mode as any);
    setTimerSubject(subject);

    if (mode === 'focus') playFeedbackSound('start');
    else playFeedbackSound('break');
  };

  const handleStopTimer = () => {
    setTimerIsActive(false);
    localStorage.removeItem('nexus_timer_active');
    localStorage.removeItem('nexus_timer_target');
    localStorage.setItem('nexus_timer_value', timerTimeValue.toString());
    
    if (user) dbService.updateUserStatus(user.uid, 'online');
    playFeedbackSound('stop');
  };

  const handleResetTimer = (value: number) => {
    setTimerIsActive(false);
    localStorage.removeItem('nexus_timer_active');
    localStorage.removeItem('nexus_timer_target');
    setTimerTimeValue(value);
    if (timerType === 'pomodoro') setTimerTotalTime(value);
    localStorage.setItem('nexus_timer_value', value.toString());
    localStorage.setItem('nexus_timer_total', value.toString());
    playFeedbackSound('stop');
  };

  const handleLogin = async (newUser: UserProfile) => {
    const userWithGamification = {
      ...newUser,
      xp: newUser.xp || 0,
      level: newUser.level || 1,
      credits: newUser.credits || 0,
      unlockedThemes: newUser.unlockedThemes || ['default']
    };
    
    setUser(userWithGamification);

    if (newUser.theme) {
      setCurrentTheme(newUser.theme);
      document.body.setAttribute('data-theme', newUser.theme);
    }
    setCurrentView(AppView.DASHBOARD);
    dbService.updateUserStatus(newUser.uid, 'online');
  };

  const handleLogout = () => {
    if (user) dbService.updateUserStatus(user.uid, 'offline');
    authService.logout();
    setUser(null);
  };

  const handleUpdateAvatar = async (url: string) => {
    if (!user) return;
    const updatedUser = { ...user, avatar: url };
    setUser(updatedUser);
    await dbService.updateUserProfile(user.uid, { avatar: url });
  };

  const handleUpdateTheme = async (theme: AppTheme) => {
    if (!user) return;
    setCurrentTheme(theme);
    document.body.setAttribute('data-theme', theme);
    const updatedUser = { ...user, theme };
    setUser(updatedUser);
    await dbService.updateUserProfile(user.uid, { theme });
  };

  if (isLoading) {
     return (
        <div className="flex h-screen w-screen items-center justify-center bg-nexus-black text-white">
           <div className="w-12 h-12 border-4 border-nexus-electric border-t-transparent rounded-full animate-spin" />
        </div>
     );
  }

  if (!user) return <Login onLogin={handleLogin} />;

  const renderView = () => {
    switch (currentView) {
      case AppView.DASHBOARD: return <Dashboard user={user} onViewChange={setCurrentView} onTriggerXP={triggerXP} onUpdateQuest={updateQuestProgress} />;
      case AppView.TASKS: return <TaskManager user={user} onTriggerXP={triggerXP} onUpdateQuest={updateQuestProgress} />;
      case AppView.SCHEDULE: return <SmartSchedule user={user} subjects={subjects} setSubjects={setSubjects} />;
      case AppView.TIMER: return (
        <FocusTimer 
          user={user} 
          subjects={subjects}
          setSubjects={setSubjects}
          onTriggerXP={triggerXP}
          onUpdateQuest={updateQuestProgress}
          globalTimer={{
            isActive: timerIsActive,
            timeValue: timerTimeValue,
            totalTime: timerTotalTime,
            type: timerType,
            mode: timerMode,
            subject: timerSubject,
            isMuted: isMuted,
            setIsMuted: setIsMuted,
            start: handleStartTimer,
            stop: handleStopTimer,
            reset: handleResetTimer,
            manualEnd: handleManualEnd,
            setType: setTimerType,
            setMode: setTimerMode,
            setSubject: setTimerSubject
          }} 
        />
      );
      case AppView.HUB: return <NexusHub user={user} globalRankings={globalRankings} />;
      case AppView.SHOP: return (
        <NexusShop 
          user={user} 
          onViewGallery={(id) => {
            if (id === 'goth_mommy') setIsGothMommyGalleryOpen(true);
          }}
          onPurchase={(item) => {
            // User state is updated inside NexusShop via dbService and onPurchase callback
            // But we need to refresh the local user state to show new credits/themes
            setUser(prev => {
              if (!prev) return null;
              const updates: any = { credits: prev.credits - item.price };
              if (item.type === 'theme') {
                updates.unlockedThemes = [...(prev.unlockedThemes || []), item.value];
                // Also apply the theme immediately if it's a theme purchase
                handleUpdateTheme(item.value as AppTheme);
              } else if (item.type === 'gallery') {
                updates.unlockedGalleries = [...(prev.unlockedGalleries || []), item.value];
                if (item.value === 'goth_mommy') {
                  setIsGothMommyGalleryOpen(true);
                }
              } else if (item.type === 'badge') {
                updates.unlockedBadges = [...(prev.unlockedBadges || []), item.value];
              } else if (item.type === 'sound_pack') {
                updates.unlockedSoundPacks = [...(prev.unlockedSoundPacks || []), item.value];
              } else if (item.type === 'avatar_border') {
                updates.unlockedAvatarBorders = [...(prev.unlockedAvatarBorders || []), item.value];
              } else if (item.type === 'profile_deco') {
                updates.unlockedProfileDecos = [...(prev.unlockedProfileDecos || []), item.value];
              } else if (item.type === 'streak_freeze') {
                updates.streakFreezeCount = (prev.streakFreezeCount || 0) + 1;
              }
              return { ...prev, ...updates };
            });
          }} 
        />
      );
      case AppView.ACHIEVEMENTS: return <Achievements user={user} />;
      case AppView.DAILY_QUESTS: return <DailyQuests user={user} onUpdateQuest={updateQuestProgress} onRefresh={refreshDailyQuests} />;
      case AppView.TUTOR: return <AITutor user={user} />;
      case AppView.ANALYTICS: return <Analytics user={user} />;
      case AppView.SETTINGS: return (
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in p-8 pb-32 overflow-y-auto h-full custom-scrollbar">
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">System Configuration</h2>
                    <p className="text-zinc-500 text-sm mt-1">Manage your identity and visual experience.</p>
                  </div>
                  <div className="flex gap-2 bg-nexus-card/40 p-1.5 rounded-2xl border border-nexus-border backdrop-blur-md shadow-sm">
                    <button 
                      onClick={() => setSettingsTab('profile')}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${settingsTab === 'profile' ? 'bg-white text-black shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Profile
                    </button>
                    <button 
                      onClick={() => setSettingsTab('appearance')}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${settingsTab === 'appearance' ? 'bg-white text-black shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Appearance
                    </button>
                    <button 
                      onClick={() => setSettingsTab('preferences')}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${settingsTab === 'preferences' ? 'bg-white text-black shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Preferences
                    </button>
                  </div>
              </header>

              {settingsTab === 'preferences' && (
                <div className="p-8 rounded-3xl bg-nexus-card/60 border border-nexus-border space-y-8 backdrop-blur-md animate-fade-in shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-sm">
                            <Target className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Daily Objective</h3>
                            <p className="text-xs text-zinc-500">Set your daily focus target in minutes.</p>
                        </div>
                    </div>
                    <div className="max-w-xs">
                        <div className="relative group">
                            <input 
                              type="number" 
                               value={user.dailyGoalMinutes || 60}
                               onChange={async (e) => {
                                 const val = parseInt(e.target.value) || 0;
                                 setUser(prev => prev ? { ...prev, dailyGoalMinutes: val } : null);
                                 await dbService.updateUserProfile(user.uid, { dailyGoalMinutes: val });
                               }}
                              className="w-full bg-nexus-black/50 border border-nexus-border rounded-2xl px-6 py-4 text-white focus:border-emerald-500/50 outline-none transition-all font-bold text-xl shadow-inner"
                            />
                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest pointer-events-none">Minutes</span>
                        </div>
                    </div>
                </div>
              )}

              {settingsTab === 'profile' && (
                <>
                  <div className="p-8 rounded-3xl bg-nexus-card/60 border border-nexus-border space-y-8 backdrop-blur-md animate-fade-in shadow-sm">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-nexus-electric/10 border border-nexus-electric/20 flex items-center justify-center shadow-sm">
                              <UserIcon className="w-6 h-6 text-nexus-electric" />
                          </div>
                          <div>
                              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Identity Presence</h3>
                              <p className="text-xs text-zinc-500">How you appear to the community.</p>
                          </div>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                          {AVATAR_PRESETS.map((preset, idx) => {
                              const url = `https://api.dicebear.com/7.x/${preset.style}/svg?seed=${preset.seed}&backgroundColor=transparent`;
                              const isActive = user.avatar === url;
                              return (
                                  <button 
                                    key={idx}
                                    onClick={() => handleUpdateAvatar(url)}
                                    className={`relative aspect-square rounded-2xl border-2 transition-all p-1 group ${isActive ? 'border-nexus-electric bg-nexus-electric/10 shadow-[0_0_20px_rgba(var(--nexus-accent-rgb),0.3)]' : 'border-nexus-border bg-nexus-black/50 hover:border-nexus-electric/50 hover:bg-nexus-card/50'}`}
                                  >
                                      <img src={url} className="w-full h-full rounded-xl transition-transform group-hover:scale-110" alt="Avatar option" />
                                      {isActive && (
                                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-nexus-electric rounded-full flex items-center justify-center border-4 border-nexus-black animate-scale-in shadow-xl">
                                              <Check className="w-3 h-3 text-white stroke-[4px]" />
                                          </div>
                                      )}
                                  </button>
                              );
                          })}
                      </div>
                  </div>

                  <div className="p-8 rounded-3xl bg-nexus-card/60 border border-nexus-border space-y-8 backdrop-blur-md animate-fade-in shadow-sm">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-sm">
                              <Award className="w-6 h-6 text-purple-400" />
                          </div>
                          <div>
                              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Profile Customization</h3>
                              <p className="text-xs text-zinc-500">Equip your badges, borders, and profile decos.</p>
                          </div>
                      </div>

                      <div className="space-y-8">
                        {/* Badges */}
                        <div>
                          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Active Badge</h4>
                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={async () => {
                                setUser(prev => prev ? { ...prev, activeBadge: undefined } : null);
                                await dbService.updateUserProfile(user.uid, { activeBadge: null });
                              }}
                              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${!user.activeBadge ? 'bg-white text-black' : 'bg-nexus-black/50 text-zinc-400 hover:bg-nexus-card border border-nexus-border hover:text-zinc-200'}`}
                            >
                              None
                            </button>
                            {(user.unlockedBadges || []).map(badge => (
                              <button
                                key={badge}
                                onClick={async () => {
                                  setUser(prev => prev ? { ...prev, activeBadge: badge } : null);
                                  await dbService.updateUserProfile(user.uid, { activeBadge: badge });
                                }}
                                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all capitalize shadow-sm ${user.activeBadge === badge ? 'bg-white text-black' : 'bg-nexus-black/50 text-zinc-400 hover:bg-nexus-card border border-nexus-border hover:text-zinc-200'}`}
                              >
                                {badge}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Avatar Borders */}
                        <div>
                          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Avatar Border</h4>
                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={async () => {
                                setUser(prev => prev ? { ...prev, activeAvatarBorder: undefined } : null);
                                await dbService.updateUserProfile(user.uid, { activeAvatarBorder: null });
                              }}
                              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${!user.activeAvatarBorder ? 'bg-white text-black' : 'bg-nexus-black/50 text-zinc-400 hover:bg-nexus-card border border-nexus-border hover:text-zinc-200'}`}
                            >
                              None
                            </button>
                            {(user.unlockedAvatarBorders || []).map(border => (
                              <button
                                key={border}
                                onClick={async () => {
                                  setUser(prev => prev ? { ...prev, activeAvatarBorder: border } : null);
                                  await dbService.updateUserProfile(user.uid, { activeAvatarBorder: border });
                                }}
                                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all capitalize shadow-sm ${user.activeAvatarBorder === border ? 'bg-white text-black' : 'bg-nexus-black/50 text-zinc-400 hover:bg-nexus-card border border-nexus-border hover:text-zinc-200'}`}
                              >
                                {border}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Profile Decos */}
                        <div>
                          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Profile Deco</h4>
                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={async () => {
                                setUser(prev => prev ? { ...prev, activeProfileDeco: undefined } : null);
                                await dbService.updateUserProfile(user.uid, { activeProfileDeco: null });
                              }}
                              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${!user.activeProfileDeco ? 'bg-white text-black' : 'bg-nexus-black/50 text-zinc-400 hover:bg-nexus-card border border-nexus-border hover:text-zinc-200'}`}
                            >
                              None
                            </button>
                            {(user.unlockedProfileDecos || []).map(deco => (
                              <button
                                key={deco}
                                onClick={async () => {
                                  setUser(prev => prev ? { ...prev, activeProfileDeco: deco } : null);
                                  await dbService.updateUserProfile(user.uid, { activeProfileDeco: deco });
                                }}
                                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all capitalize shadow-sm ${user.activeProfileDeco === deco ? 'bg-white text-black' : 'bg-nexus-black/50 text-zinc-400 hover:bg-nexus-card border border-nexus-border hover:text-zinc-200'}`}
                              >
                                {deco}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                  </div>
                </>
              )}

              {settingsTab === 'appearance' && (
                <>
                  <div className="p-8 rounded-3xl bg-nexus-card/60 border border-nexus-border space-y-8 backdrop-blur-md animate-fade-in shadow-sm">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-sm">
                              <Palette className="w-6 h-6 text-indigo-400" />
                          </div>
                          <div>
                              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Visual Experience</h3>
                              <p className="text-xs text-zinc-500">Minimal black foundation with vibrant accents.</p>
                          </div>
                      </div>
                      <div className="space-y-8">
                        <div>
                          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Default Themes</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {THEMES.filter(t => !t.isPremium).map((theme) => {
                              const isActive = currentTheme === theme.id;
                              return (
                                <button
                                  key={theme.id}
                                  onClick={() => handleUpdateTheme(theme.id)}
                                  className={`
                                    p-5 rounded-2xl border transition-all text-left flex flex-col gap-4 group relative overflow-hidden shadow-sm
                                    ${isActive ? 'bg-nexus-electric/10 border-nexus-electric shadow-[0_0_20px_rgba(var(--nexus-accent-rgb),0.2)]' : 'bg-nexus-black/50 border-nexus-border hover:border-nexus-electric/50 hover:bg-nexus-card/50'}
                                  `}
                                >
                                  <div className="flex justify-between items-center relative z-10">
                                    <div className="w-10 h-10 rounded-xl bg-nexus-black border border-nexus-border flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                        <Zap className="w-5 h-5" style={{ color: theme.colors[1] }} />
                                    </div>
                                    {isActive && <Check className="w-4 h-4 text-nexus-electric" />}
                                  </div>
                                  <div className="relative z-10">
                                    <p className="text-sm font-bold text-white group-hover:text-nexus-electric transition-colors">{theme.name}</p>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">{theme.description}</p>
                                  </div>
                                  <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-br transition-opacity opacity-5 group-hover:opacity-10" style={{ backgroundImage: `linear-gradient(to bottom right, ${theme.colors[1]}, transparent)` }} />
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Premium Themes</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {THEMES.filter(t => t.isPremium).map((theme) => {
                              const isUnlocked = user.unlockedThemes?.includes(theme.id);
                              const isActive = currentTheme === theme.id;
                              return (
                                <button
                                  key={theme.id}
                                  onClick={() => isUnlocked && handleUpdateTheme(theme.id)}
                                  disabled={!isUnlocked}
                                  className={`
                                    p-5 rounded-2xl border transition-all text-left flex flex-col gap-4 group relative overflow-hidden shadow-sm
                                    ${isActive ? 'bg-nexus-electric/10 border-nexus-electric shadow-[0_0_20px_rgba(var(--nexus-accent-rgb),0.2)]' : isUnlocked ? 'bg-nexus-black/50 border-nexus-border hover:border-nexus-electric/50 hover:bg-nexus-card/50' : 'bg-nexus-black/20 border-nexus-border opacity-50 cursor-not-allowed'}
                                  `}
                                >
                                  <div className="flex justify-between items-center relative z-10">
                                    <div className="w-10 h-10 rounded-xl bg-nexus-black border border-nexus-border flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                        <Zap className="w-5 h-5" style={{ color: theme.colors[1] }} />
                                    </div>
                                    {isActive && <Check className="w-4 h-4 text-nexus-electric" />}
                                    {!isUnlocked && <Lock className="w-4 h-4 text-zinc-500" />}
                                  </div>
                                  <div className="relative z-10">
                                    <p className="text-sm font-bold text-white group-hover:text-nexus-electric transition-colors">{theme.name}</p>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">{theme.description}</p>
                                  </div>
                                  <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-br transition-opacity opacity-5 group-hover:opacity-10" style={{ backgroundImage: `linear-gradient(to bottom right, ${theme.colors[1]}, transparent)` }} />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                  </div>

                  {user.unlockedGalleries && user.unlockedGalleries.length > 0 && (
                    <div className="p-8 rounded-3xl bg-nexus-card/60 border border-nexus-border space-y-8 backdrop-blur-md animate-fade-in shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shadow-sm">
                                <Sparkles className="w-6 h-6 text-pink-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Unlocked Galleries</h3>
                                <p className="text-xs text-zinc-500">View your special collections.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {user.unlockedGalleries.includes('goth_mommy') && (
                            <button
                              onClick={() => setIsGothMommyGalleryOpen(true)}
                              className="p-5 rounded-2xl border border-nexus-border bg-nexus-black/50 hover:border-pink-500/50 hover:bg-pink-500/10 transition-all text-left flex flex-col gap-4 group relative overflow-hidden shadow-sm"
                            >
                              <div className="w-10 h-10 rounded-xl bg-nexus-black border border-nexus-border flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                  <Sparkles className="w-5 h-5 text-pink-500" />
                              </div>
                              <div className="relative z-10">
                                <p className="text-sm font-bold text-white group-hover:text-pink-400 transition-colors">Goth Mommy Gallery</p>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">View Collection</p>
                              </div>
                            </button>
                          )}
                        </div>
                    </div>
                  )}
                </>
              )}
          </div>
      );
      default: return <Dashboard user={user} onViewChange={setCurrentView} onTriggerXP={triggerXP} onUpdateQuest={updateQuestProgress} />;
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden bg-nexus-black text-zinc-100 font-sans transition-all duration-1000`}>
      <div className={`fixed inset-0 bg-gradient-to-tr from-nexus-electric/10 via-nexus-black to-nexus-black pointer-events-none opacity-60 z-0 transition-colors duration-1000`} />
      {isGothMommyGalleryOpen && <GothMommyGallery onClose={() => setIsGothMommyGalleryOpen(false)} />}
      {isCommandPaletteOpen && (
        <CommandPalette 
          onClose={() => setIsCommandPaletteOpen(false)} 
          onNavigate={(v) => {
            setCurrentView(v);
            setIsCommandPaletteOpen(false);
          }}
        />
      )}
      {showAlarmToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[1000] animate-slide-up">
            <div className="bg-nexus-electric text-white px-8 py-4 rounded-2xl shadow-[0_0_50px_rgba(var(--nexus-accent-rgb),0.5)] border border-nexus-violet/50 flex items-center gap-6">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center animate-bounce">
                    <BellRing className="w-6 h-6" />
                </div>
                <div>
                    <h4 className="font-bold text-lg leading-tight text-white">Session Complete</h4>
                    <p className="text-white/70 text-sm">Time for a well-deserved break.</p>
                </div>
                <button onClick={() => setShowAlarmToast(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <X className="w-5 h-5 text-white" />
                </button>
            </div>
        </div>
      )}
      <div className="relative z-50 h-full">
        <Sidebar 
            user={user}
            currentView={currentView} 
            onChangeView={setCurrentView} 
            onLogout={handleLogout} 
            activeTimerMins={timerIsActive ? Math.ceil(timerTimeValue / 60) : (timerType === 'pomodoro' && timerTimeValue < timerTotalTime ? Math.ceil(timerTimeValue/60) : null)}
        />
      </div>
      <GamificationOverlay 
        levelUp={levelUp} 
        onCloseLevelUp={() => setLevelUp(null)} 
        xpPopups={xpPopups} 
      />
      <main className="flex-1 h-full relative z-10 overflow-hidden">
        <div className="h-full w-full p-3 md:p-6">{renderView()}</div>
      </main>
    </div>
  );
};

export default App;
