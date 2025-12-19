
import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { TaskManager } from './components/TaskManager.tsx';
import { SmartSchedule } from './components/SmartSchedule.tsx';
import { FocusTimer } from './components/FocusTimer.tsx';
import { AITutor } from './components/AITutor.tsx';
import { Analytics } from './components/Analytics.tsx';
import { Groups } from './components/Groups.tsx';
import { Login } from './components/Login.tsx';
import { authService } from './services/authService.ts';
import { dbService } from './services/dbService.ts';
import { AppView, UserProfile } from './types.ts';
import { BellRing, X, User as UserIcon, Check, Sparkles, Target } from 'lucide-react';

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

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isLoading, setIsLoading] = useState(true);
  const [atmosphere, setAtmosphere] = useState('indigo');

  const [subjects, setSubjects] = useState<string[]>(() => {
    const saved = localStorage.getItem('nexus_subjects');
    try {
      return saved ? JSON.parse(saved) : DEFAULT_SUBJECTS;
    } catch {
      return DEFAULT_SUBJECTS;
    }
  });

  const [timerMode, setTimerMode] = useState<'focus' | 'short' | 'long'>('focus');
  const [timerIsActive, setTimerIsActive] = useState(false);
  const [timerTimeLeft, setTimerTimeLeft] = useState(25 * 60);
  const [timerTotalTime, setTimerTotalTime] = useState(25 * 60);
  const [timerSubject, setTimerSubject] = useState(() => {
    return localStorage.getItem('nexus_timer_subject') || DEFAULT_SUBJECTS[0];
  });
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('nexus_timer_muted') === 'true';
  });
  const [showAlarmToast, setShowAlarmToast] = useState(false);
  const timerIntervalRef = useRef<any>(null);

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
    const initSession = async () => {
      try {
        const savedUser = await authService.restoreSession();
        if (savedUser) {
          setUser(savedUser);
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

  useEffect(() => {
    const savedEnd = localStorage.getItem('nexus_timer_end');
    const savedActive = localStorage.getItem('nexus_timer_active') === 'true';
    const savedMode = localStorage.getItem('nexus_timer_mode') as any;
    const savedSubject = localStorage.getItem('nexus_timer_subject') || DEFAULT_SUBJECTS[0];
    const savedTotal = parseInt(localStorage.getItem('nexus_timer_total') || '1500');

    if (savedActive && savedEnd) {
      const remaining = Math.round((parseInt(savedEnd) - Date.now()) / 1000);
      if (remaining > 0) {
        setTimerTimeLeft(remaining);
        setTimerIsActive(true);
        setTimerMode(savedMode || 'focus');
        setTimerSubject(savedSubject);
        setTimerTotalTime(savedTotal);
      } else {
        localStorage.removeItem('nexus_timer_active');
        localStorage.removeItem('nexus_timer_end');
      }
    } else {
      const settings = JSON.parse(localStorage.getItem('nexus_timer_settings') || '{"focus": 25, "short": 5, "long": 15}');
      setTimerTimeLeft(settings[savedMode || 'focus'] * 60);
      setTimerTotalTime(settings[savedMode || 'focus'] * 60);
      setTimerMode(savedMode || 'focus');
      setTimerSubject(savedSubject);
    }
  }, []);

  useEffect(() => {
    if (timerIsActive && timerTimeLeft > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimerTimeLeft(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [timerIsActive]);

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
    localStorage.removeItem('nexus_timer_active');
    localStorage.removeItem('nexus_timer_end');
    playFeedbackSound('complete');
    setShowAlarmToast(true);

    if (timerMode === 'focus' && user) {
        await dbService.logSession({
            id: crypto.randomUUID(),
            userId: user.uid,
            subject: timerSubject,
            duration: timerTotalTime,
            timestamp: Date.now(),
            date: new Date().toISOString().split('T')[0]
        });
        await dbService.logActivity({
            userId: user.uid,
            userName: user.name,
            type: 'session_completed',
            subject: timerSubject,
            duration: timerTotalTime
        });
        await dbService.updateUserStatus(user.uid, 'break');
    }
  };

  const handleManualEnd = async () => {
      if (!timerIsActive || !user) return;
      const elapsedSeconds = timerTotalTime - timerTimeLeft;
      
      setTimerIsActive(false);
      localStorage.removeItem('nexus_timer_active');
      localStorage.removeItem('nexus_timer_end');
      
      if (timerMode === 'focus' && elapsedSeconds > 10) {
          await dbService.logSession({
              id: crypto.randomUUID(),
              userId: user.uid,
              subject: timerSubject,
              duration: elapsedSeconds,
              timestamp: Date.now(),
              date: new Date().toISOString().split('T')[0]
          });
          await dbService.logActivity({
              userId: user.uid,
              userName: user.name,
              type: 'session_completed',
              subject: timerSubject,
              duration: elapsedSeconds
          });
      }
      await dbService.updateUserStatus(user.uid, 'online');
      playFeedbackSound('stop');
  };

  const handleStartTimer = (duration: number, mode: string, subject: string) => {
    const endTime = Date.now() + (duration * 1000);
    localStorage.setItem('nexus_timer_active', 'true');
    localStorage.setItem('nexus_timer_end', endTime.toString());
    localStorage.setItem('nexus_timer_mode', mode);
    localStorage.setItem('nexus_timer_subject', subject);
    localStorage.setItem('nexus_timer_total', duration.toString());
    
    setTimerTimeLeft(duration);
    setTimerTotalTime(duration);
    setTimerIsActive(true);
    setTimerMode(mode as any);
    setTimerSubject(subject);

    if (mode === 'focus') playFeedbackSound('start');
    else playFeedbackSound('break');
  };

  const handleStopTimer = () => {
    setTimerIsActive(false);
    localStorage.removeItem('nexus_timer_active');
    localStorage.removeItem('nexus_timer_end');
    if (user) dbService.updateUserStatus(user.uid, 'online');
    playFeedbackSound('stop');
  };

  const handleResetTimer = (duration: number) => {
    handleStopTimer();
    setTimerTimeLeft(duration);
    setTimerTotalTime(duration);
  };

  const handleLogin = (newUser: UserProfile) => {
    setUser(newUser);
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

  const handleUpdateDailyGoal = async (minutes: number) => {
    if (!user) return;
    const updatedUser = { ...user, dailyGoalMinutes: minutes };
    setUser(updatedUser);
    await dbService.updateUserProfile(user.uid, { dailyGoalMinutes: minutes });
  };

  if (isLoading) {
     return (
        <div className="flex h-screen w-screen items-center justify-center bg-black text-white">
           <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
     );
  }

  if (!user) return <Login onLogin={handleLogin} />;

  const renderView = () => {
    switch (currentView) {
      case AppView.DASHBOARD: return <Dashboard user={user} onViewChange={setCurrentView} />;
      case AppView.TASKS: return <TaskManager user={user} />;
      case AppView.SCHEDULE: return (
        <SmartSchedule 
          user={user} 
          subjects={subjects} 
          setSubjects={setSubjects} 
        />
      );
      case AppView.FOCUS: return (
        <FocusTimer 
          user={user} 
          subjects={subjects}
          setSubjects={setSubjects}
          globalTimer={{
            isActive: timerIsActive,
            timeLeft: timerTimeLeft,
            totalTime: timerTotalTime,
            mode: timerMode,
            subject: timerSubject,
            isMuted: isMuted,
            setIsMuted: setIsMuted,
            start: handleStartTimer,
            stop: handleStopTimer,
            reset: handleResetTimer,
            manualEnd: handleManualEnd,
            setMode: setTimerMode,
            setSubject: setTimerSubject
          }} 
        />
      );
      case AppView.GROUPS: return <Groups user={user} />;
      case AppView.TUTOR: return <AITutor user={user} />;
      case AppView.ANALYTICS: return <Analytics user={user} />;
      case AppView.SETTINGS: return (
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in p-8 pb-32 overflow-y-auto h-full custom-scrollbar">
              <h2 className="text-3xl font-bold text-white tracking-tight">System Configuration</h2>
              
              <div className="p-8 rounded-3xl bg-zinc-900/30 border border-white/5 space-y-8 backdrop-blur-sm">
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                          <UserIcon className="w-6 h-6 text-indigo-400" />
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
                                className={`relative aspect-square rounded-2xl border-2 transition-all p-1 group ${isActive ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.3)]' : 'border-white/5 bg-black/40 hover:border-white/20'}`}
                              >
                                  <img src={url} className="w-full h-full rounded-xl transition-transform group-hover:scale-110" alt="Avatar option" />
                                  {isActive && (
                                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center border-4 border-black animate-scale-in shadow-xl">
                                          <Check className="w-3 h-3 text-white stroke-[4px]" />
                                      </div>
                                  )}
                              </button>
                          );
                      })}
                  </div>
                  
                  <div className="p-6 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                          <img src={user.avatar} className="w-16 h-16 rounded-2xl bg-black border border-white/10" alt="Current Avatar" />
                          <div>
                              <p className="text-white font-bold">{user.name}</p>
                              <p className="text-xs text-zinc-500">Nexus Citizen v1.0.4</p>
                          </div>
                      </div>
                      <div className="text-right">
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Status</p>
                          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Verified</span>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="p-8 rounded-3xl bg-zinc-900/30 border border-white/5 space-y-6 backdrop-blur-sm">
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                          <Target className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Productivity Goals</h3>
                          <p className="text-xs text-zinc-500">Adjust your daily study expectations.</p>
                      </div>
                  </div>

                  <div className="flex items-center gap-6">
                      <div className="flex-1">
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-3">Daily Study Goal (Minutes)</label>
                          <div className="flex items-center gap-4">
                              <input 
                                type="range" 
                                min="30" 
                                max="600" 
                                step="15"
                                value={user.dailyGoalMinutes || 120}
                                onChange={(e) => handleUpdateDailyGoal(parseInt(e.target.value))}
                                className="flex-1 h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
                              />
                              <div className="w-20 text-center py-2 bg-black border border-white/5 rounded-xl text-white font-mono font-bold text-sm">
                                  {user.dailyGoalMinutes || 120}m
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="p-8 rounded-3xl bg-zinc-900/30 border border-white/5 space-y-6 backdrop-blur-sm">
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                          <Sparkles className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Interface Atmosphere</h3>
                          <p className="text-xs text-zinc-500">Tailor the visual depth of your workspace.</p>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {['indigo', 'sunset', 'ocean', 'space'].map(a => (
                          <button 
                            key={a} 
                            onClick={() => setAtmosphere(a)}
                            className={`group relative h-28 rounded-2xl border-2 transition-all overflow-hidden ${atmosphere === a ? 'border-white shadow-[0_0_30px_rgba(255,255,255,0.1)]' : 'border-transparent hover:border-white/10'} ${
                                a === 'indigo' ? 'bg-gradient-to-br from-indigo-900 to-black' :
                                a === 'sunset' ? 'bg-gradient-to-br from-rose-900 to-black' :
                                a === 'ocean' ? 'bg-gradient-to-br from-cyan-900 to-black' :
                                'bg-gradient-to-br from-zinc-900 to-black'
                            }`}
                          >
                             <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity bg-white" />
                             <span className="absolute bottom-4 left-4 text-[10px] font-bold text-white uppercase tracking-[0.2em]">{a}</span>
                             {atmosphere === a && (
                                <div className="absolute top-4 right-4 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                                    <Check className="w-3 h-3 text-black stroke-[3px]" />
                                </div>
                             )}
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      );
      default: return <Dashboard user={user} onViewChange={setCurrentView} />;
    }
  };

  const atmosphereColors = {
      indigo: 'from-indigo-600/10 via-black to-black',
      sunset: 'from-rose-600/10 via-black to-black',
      ocean: 'from-cyan-600/10 via-black to-black',
      space: 'from-zinc-600/10 via-black to-black'
  };

  return (
    <div className={`flex h-screen overflow-hidden bg-black text-zinc-100 font-sans transition-all duration-1000`}>
      <div className={`fixed inset-0 bg-gradient-to-tr ${atmosphereColors[atmosphere as keyof typeof atmosphereColors]} pointer-events-none opacity-50 z-0`} />
      
      {showAlarmToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[1000] animate-slide-up">
            <div className="bg-indigo-600 text-white px-8 py-4 rounded-2xl shadow-[0_0_50px_rgba(99,102,241,0.5)] border border-indigo-400 flex items-center gap-6">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center animate-bounce">
                    <BellRing className="w-6 h-6" />
                </div>
                <div>
                    <h4 className="font-bold text-lg leading-tight">Session Complete</h4>
                    <p className="text-white/70 text-sm">Time for a well-deserved break.</p>
                </div>
                <button 
                    onClick={() => setShowAlarmToast(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <X className="w-5 h-5" />
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
            activeTimerMins={timerIsActive ? Math.ceil(timerTimeLeft / 60) : null}
        />
      </div>
      <main className="flex-1 h-full relative z-10 overflow-hidden">
        <div className="h-full w-full p-3 md:p-6">{renderView()}</div>
      </main>
    </div>
  );
};

export default App;
