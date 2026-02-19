
import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { TaskManager } from './components/TaskManager.tsx';
import { SmartSchedule } from './components/SmartSchedule.tsx';
import { FocusTimer } from './components/FocusTimer.tsx';
import { AITutor } from './components/AITutor.tsx';
import { Analytics } from './components/Analytics.tsx';
import { NexusHub } from './components/NexusHub.tsx';
import { Login } from './components/Login.tsx';
import { CommandPalette } from './components/CommandPalette.tsx';
import { authService } from './services/authService.ts';
import { dbService } from './services/dbService.ts';
import { AppView, UserProfile, AppTheme } from './types.ts';
import { BellRing, X, User as UserIcon, Check, Sparkles, Target, Palette, Moon, Sun, Monitor, Zap } from 'lucide-react';

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

const THEMES: { id: AppTheme; name: string; description: string; colors: string[] }[] = [
  { id: 'default', name: 'Nexus Core', description: 'Deep Black & Electric Violet', colors: ['#000000', '#7C3AED'] },
  { id: 'midnight', name: 'Midnight', description: 'Deep Black & Royal Blue', colors: ['#000000', '#2563eb'] },
  { id: 'blackout', name: 'Blackout', description: 'Pure Black & White', colors: ['#000000', '#ffffff'] },
  { id: 'cyberpunk', name: 'Neon Protocol', description: 'Deep Black & Magenta', colors: ['#000000', '#d946ef'] },
  { id: 'oceanic', name: 'Oceanic', description: 'Deep Black & Cyan', colors: ['#000000', '#06b6d4'] },
  { id: 'sunset', name: 'Sunset', description: 'Deep Black & Amber', colors: ['#000000', '#f59e0b'] },
  { id: 'forest', name: 'Forest', description: 'Deep Black & Emerald', colors: ['#000000', '#10b981'] },
  { id: 'crimson', name: 'Crimson', description: 'Deep Black & Red', colors: ['#000000', '#ef4444'] },
];

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isLoading, setIsLoading] = useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<AppTheme>('default');

  const [subjects, setSubjects] = useState<string[]>(() => {
    const saved = localStorage.getItem('nexus_subjects');
    try {
      return saved ? JSON.parse(saved) : DEFAULT_SUBJECTS;
    } catch {
      return DEFAULT_SUBJECTS;
    }
  });

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
    }
  };

  const saveSession = async (durationSecs: number) => {
    if (!user || durationSecs < 1) return;
    try {
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
        // NEW: Public post to the Hub
        await dbService.createPost({
          userId: user.uid,
          userName: user.name,
          userAvatar: user.avatar || '',
          type: 'session_complete',
          content: `${user.name} just completed a high-density ${Math.round(durationSecs / 60)}m focus session!`,
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

  const handleLogin = (newUser: UserProfile) => {
    setUser(newUser);
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
      case AppView.DASHBOARD: return <Dashboard user={user} onViewChange={setCurrentView} />;
      case AppView.TASKS: return <TaskManager user={user} />;
      case AppView.SCHEDULE: return <SmartSchedule user={user} subjects={subjects} setSubjects={setSubjects} />;
      case AppView.TIMER: return (
        <FocusTimer 
          user={user} 
          subjects={subjects}
          setSubjects={setSubjects}
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
      case AppView.HUB: return <NexusHub user={user} />;
      case AppView.TUTOR: return <AITutor user={user} />;
      case AppView.ANALYTICS: return <Analytics user={user} />;
      case AppView.SETTINGS: return (
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in p-8 pb-32 overflow-y-auto h-full custom-scrollbar">
              <header>
                  <h2 className="text-3xl font-bold text-white tracking-tight">System Configuration</h2>
                  <p className="text-zinc-500 text-sm mt-1">Manage your identity and visual experience.</p>
              </header>
              <div className="p-8 rounded-3xl bg-zinc-900/30 border border-white/5 space-y-8 backdrop-blur-sm">
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-nexus-electric/10 border border-nexus-electric/20 flex items-center justify-center">
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
                                className={`relative aspect-square rounded-2xl border-2 transition-all p-1 group ${isActive ? 'border-nexus-electric bg-nexus-electric/10 shadow-[0_0_20px_rgba(var(--nexus-accent-rgb),0.3)]' : 'border-white/5 bg-black/40 hover:border-white/20'}`}
                              >
                                  <img src={url} className="w-full h-full rounded-xl transition-transform group-hover:scale-110" alt="Avatar option" />
                                  {isActive && (
                                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-nexus-electric rounded-full flex items-center justify-center border-4 border-black animate-scale-in shadow-xl">
                                          <Check className="w-3 h-3 text-white stroke-[4px]" />
                                      </div>
                                  )}
                              </button>
                          );
                      })}
                  </div>
              </div>
              <div className="p-8 rounded-3xl bg-zinc-900/30 border border-white/5 space-y-8 backdrop-blur-sm">
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                          <Palette className="w-6 h-6 text-indigo-400" />
                      </div>
                      <div>
                          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Visual Experience</h3>
                          <p className="text-xs text-zinc-500">Minimal black foundation with vibrant accents.</p>
                      </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {THEMES.map((theme) => {
                      const isActive = currentTheme === theme.id;
                      return (
                        <button
                          key={theme.id}
                          onClick={() => handleUpdateTheme(theme.id)}
                          className={`
                            p-5 rounded-2xl border transition-all text-left flex flex-col gap-4 group relative overflow-hidden
                            ${isActive ? 'bg-nexus-electric/10 border-nexus-electric shadow-lg' : 'bg-black/40 border-white/5 hover:border-white/20 hover:bg-zinc-800/40'}
                          `}
                        >
                          <div className="flex justify-between items-center relative z-10">
                            <div className="w-10 h-10 rounded-xl bg-black border border-white/10 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                <Zap className="w-5 h-5" style={{ color: theme.colors[1] }} />
                            </div>
                            {isActive && <Check className="w-4 h-4 text-nexus-electric" />}
                          </div>
                          <div className="relative z-10">
                            <p className="text-sm font-bold text-white">{theme.name}</p>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">{theme.description}</p>
                          </div>
                          <div className="absolute bottom-0 right-0 w-12 h-12 bg-gradient-to-br transition-opacity opacity-5" style={{ backgroundImage: `linear-gradient(to bottom right, ${theme.colors[1]}, transparent)` }} />
                        </button>
                      );
                    })}
                  </div>
              </div>
          </div>
      );
      default: return <Dashboard user={user} onViewChange={setCurrentView} />;
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden bg-nexus-black text-zinc-100 font-sans transition-all duration-1000`}>
      <div className={`fixed inset-0 bg-gradient-to-tr from-nexus-electric/10 via-nexus-black to-nexus-black pointer-events-none opacity-60 z-0 transition-colors duration-1000`} />
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
      <main className="flex-1 h-full relative z-10 overflow-hidden">
        <div className="h-full w-full p-3 md:p-6">{renderView()}</div>
      </main>
    </div>
  );
};

export default App;
