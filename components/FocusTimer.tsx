
import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Brain, Plus, X, Volume2, VolumeX, Settings2, Check, FastForward, Maximize2, Minimize2, Timer as TimerIcon, Hourglass } from 'lucide-react';
import { UserProfile } from '../types.ts';
import { dbService } from '../services/dbService.ts';

interface FocusTimerProps {
  user: UserProfile;
  subjects: string[];
  setSubjects: React.Dispatch<React.SetStateAction<string[]>>;
  globalTimer: {
    isActive: boolean;
    timeValue: number;
    totalTime: number;
    type: 'stopwatch' | 'pomodoro';
    mode: 'focus' | 'short' | 'long';
    subject: string;
    isMuted: boolean;
    setIsMuted: (muted: boolean) => void;
    start: (value: number, type: 'stopwatch' | 'pomodoro', mode: string, subject: string) => void;
    stop: () => void;
    reset: (value: number) => void;
    manualEnd: () => void;
    setType: (type: 'stopwatch' | 'pomodoro') => void;
    setMode: (mode: 'focus' | 'short' | 'long') => void;
    setSubject: (sub: string) => void;
  };
}

export const FocusTimer: React.FC<FocusTimerProps> = ({ user, subjects, setSubjects, globalTimer }) => {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('nexus_timer_settings');
    return saved ? JSON.parse(saved) : { focus: 25, short: 5, long: 15 };
  });

  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editSettings, setEditSettings] = useState(settings);

  useEffect(() => {
    localStorage.setItem('nexus_timer_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFullscreen]);

  const toggleTimer = async () => {
    if (globalTimer.isActive) {
      globalTimer.stop();
    } else {
      const isPomodoro = globalTimer.type === 'pomodoro';
      const startVal = isPomodoro 
        ? (globalTimer.timeValue > 0 ? globalTimer.timeValue : settings[globalTimer.mode] * 60) 
        : globalTimer.timeValue;
      
      globalTimer.start(startVal, globalTimer.type, globalTimer.mode, globalTimer.subject);
      
      const sessionSubject = globalTimer.mode === 'focus' ? globalTimer.subject : 'Break';
      await dbService.updateUserStatus(user.uid, globalTimer.mode === 'focus' ? 'studying' : 'break', sessionSubject);
      
      if (globalTimer.mode === 'focus' && globalTimer.timeValue === 0) {
         await dbService.logActivity({ userId: user.uid, userName: user.name, type: 'session_started', subject: sessionSubject });
      }
    }
  };

  const switchType = (t: 'stopwatch' | 'pomodoro') => {
    globalTimer.stop();
    globalTimer.setType(t);
    if (t === 'stopwatch') {
      globalTimer.reset(0);
    } else {
      globalTimer.reset(settings[globalTimer.mode] * 60);
    }
  };

  const switchMode = (m: 'focus' | 'short' | 'long') => {
    globalTimer.stop();
    globalTimer.setMode(m);
    if (globalTimer.type === 'pomodoro') {
      globalTimer.reset(settings[m] * 60);
    } else {
      globalTimer.reset(0);
    }
  };

  const handleReset = () => {
    const resetVal = globalTimer.type === 'pomodoro' ? settings[globalTimer.mode] * 60 : 0;
    globalTimer.reset(resetVal);
  };

  const formatTime = (s: number) => {
    const hours = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const rs = s % 60;
    const timeStr = `${m.toString().padStart(2, '0')}:${rs.toString().padStart(2, '0')}`;
    return hours > 0 ? `${hours}:${timeStr}` : timeStr;
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSettings(editSettings);
    setShowConfig(false);
    if (!globalTimer.isActive && globalTimer.type === 'pomodoro') {
      globalTimer.reset(editSettings[globalTimer.mode] * 60);
    }
  };

  const addSubject = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = newSubjectName.trim();
    if (trimmed && !subjects.includes(trimmed)) {
      setSubjects(prev => [...prev, trimmed]);
      globalTimer.setSubject(trimmed);
      setNewSubjectName('');
      setIsAddingSubject(false);
    }
  };

  const deleteSubject = (e: React.MouseEvent, sub: string) => {
    e.stopPropagation();
    const newSubjects = subjects.filter(s => s !== sub);
    setSubjects(newSubjects);
    if (globalTimer.subject === sub) {
      globalTimer.setSubject(newSubjects[0] || 'Math');
    }
  };

  const size = isFullscreen ? 600 : 340;
  const isPomodoro = globalTimer.type === 'pomodoro';
  
  // For Pomodoro, we show remaining time progress. 
  // For Stopwatch, we show a constant pulse when active.
  const progress = isPomodoro 
    ? ((globalTimer.totalTime - globalTimer.timeValue) / globalTimer.totalTime) * 100 
    : 100;

  const radius = size * 0.42;
  const circumference = 2 * Math.PI * radius;

  const renderFullscreen = () => (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center animate-fade-in overflow-hidden">
      <div className={`absolute inset-0 opacity-20 pointer-events-none transition-colors duration-1000 ${globalTimer.mode === 'focus' ? 'bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.15)_0%,transparent_70%)]' : 'bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15)_0%,transparent_70%)]'}`} />
      <button onClick={() => setIsFullscreen(false)} className="absolute top-10 right-10 p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-3xl text-zinc-600 hover:text-white transition-all backdrop-blur-3xl group" title="Exit (ESC)">
        <Minimize2 className="w-6 h-6" />
      </button>
      <div className="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full transform -rotate-90 absolute inset-0">
          <circle cx={size/2} cy={size/2} r={radius} strokeWidth="2" stroke="currentColor" fill="transparent" className="text-white/5" />
          <circle cx={size/2} cy={size/2} r={radius} strokeWidth="3" stroke="currentColor" fill="transparent" 
            strokeDasharray={circumference}
            strokeDashoffset={isPomodoro ? (circumference * (1 - progress / 100)) : (globalTimer.isActive ? undefined : circumference)}
            strokeLinecap="round"
            className={`${globalTimer.mode === 'focus' ? 'text-nexus-electric' : 'text-emerald-500'} transition-all duration-700 ease-out ${!isPomodoro && globalTimer.isActive ? 'animate-pulse' : ''}`}
            style={{ filter: `drop-shadow(0 0 12px ${globalTimer.mode === 'focus' ? 'rgba(124,58,237,0.4)' : 'rgba(16,185,129,0.4)'})` }}
          />
        </svg>
        <div className="flex flex-col items-center justify-center text-center z-10">
          <div className="text-[14rem] font-black text-white tabular-nums tracking-[-0.05em] leading-none font-mono">
            {formatTime(globalTimer.timeValue)}
          </div>
          <div className="mt-6 flex flex-col items-center gap-4 animate-fade-in">
            <div className={`px-8 py-2 rounded-full border text-[10px] font-black uppercase tracking-[0.5em] ${globalTimer.mode === 'focus' ? 'bg-nexus-electric/10 border-nexus-electric/20 text-nexus-electric' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
              {globalTimer.type} • {globalTimer.mode}
            </div>
            {globalTimer.mode === 'focus' && (
              <div className="text-2xl font-bold text-zinc-500 tracking-tight flex items-center gap-3">
                 <div className="w-1.5 h-1.5 rounded-full bg-nexus-electric animate-pulse shadow-[0_0_10px_rgba(124,58,237,0.8)]" />
                 {globalTimer.subject}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="absolute bottom-20 flex items-center gap-12 transition-all duration-700 opacity-20 hover:opacity-100 transform translate-y-4 hover:translate-y-0">
          <button onClick={handleReset} className="w-20 h-20 rounded-full bg-zinc-900/50 border border-white/5 text-zinc-600 flex items-center justify-center hover:text-white hover:border-white/20 transition-all active:scale-90"><RotateCcw className="w-6 h-6" /></button>
          <button onClick={toggleTimer} className="w-32 h-32 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_60px_rgba(255,255,255,0.15)] active:scale-90 transition-all hover:scale-105">{globalTimer.isActive ? <Pause className="w-12 h-12 fill-black" /> : <Play className="w-12 h-12 fill-black ml-2" />}</button>
          <button onClick={() => globalTimer.manualEnd()} className="w-20 h-20 rounded-full bg-nexus-electric/10 border border-nexus-electric/20 text-nexus-electric flex items-center justify-center hover:bg-nexus-electric hover:text-white transition-all active:scale-90"><FastForward className="w-6 h-6" /></button>
      </div>
    </div>
  );

  if (isFullscreen) return renderFullscreen();

  return (
    <div className="h-full overflow-y-auto custom-scrollbar pr-2 pb-12 animate-fade-in relative">
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-3">
          <button onClick={() => setIsFullscreen(true)} className="p-3 bg-zinc-900/60 border border-white/10 rounded-2xl text-zinc-500 hover:text-white transition-all backdrop-blur-xl shadow-xl hover:scale-105 active:scale-95" title="Fullscreen Timer"><Maximize2 className="w-5 h-5" /></button>
          <button onClick={() => globalTimer.setIsMuted(!globalTimer.isMuted)} className="p-3 bg-zinc-900/60 border border-white/10 rounded-2xl text-zinc-500 hover:text-white transition-all backdrop-blur-xl shadow-xl hover:scale-105 active:scale-95" title={globalTimer.isMuted ? "Unmute sounds" : "Mute sounds"}>{globalTimer.isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}</button>
          <button onClick={() => { setEditSettings(settings); setShowConfig(true); }} className="p-3 bg-zinc-900/60 border border-white/10 rounded-2xl text-zinc-500 hover:text-white transition-all backdrop-blur-xl shadow-xl hover:scale-105 active:scale-95" title="Timer Settings"><Settings2 className="w-5 h-5" /></button>
      </div>

      <div className="min-h-full flex flex-col items-center justify-center space-y-10 py-8 relative">
        <div className="flex flex-col items-center gap-6">
          <div className="flex p-1 bg-zinc-900/60 border border-white/10 rounded-full backdrop-blur-xl shrink-0">
              <button onClick={() => switchType('stopwatch')} className={`px-8 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${globalTimer.type === 'stopwatch' ? 'bg-nexus-electric text-white shadow-xl' : 'text-zinc-500 hover:text-zinc-200'}`}><TimerIcon className="w-3.5 h-3.5" /> STOPWATCH</button>
              <button onClick={() => switchType('pomodoro')} className={`px-8 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${globalTimer.type === 'pomodoro' ? 'bg-nexus-electric text-white shadow-xl' : 'text-zinc-500 hover:text-zinc-200'}`}><Hourglass className="w-3.5 h-3.5" /> POMODORO</button>
          </div>
          {globalTimer.type === 'pomodoro' && (
            <div className="flex p-1 bg-zinc-900/20 border border-white/5 rounded-full backdrop-blur-md shrink-0 animate-fade-in">
                {(['focus', 'short', 'long'] as const).map(m => (
                    <button key={m} onClick={() => switchMode(m)} className={`px-6 py-1.5 rounded-full text-[10px] font-black tracking-widest transition-all ${globalTimer.mode === m ? 'bg-white/10 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>{m.toUpperCase()}</button>
                ))}
            </div>
          )}
        </div>

        {globalTimer.mode === 'focus' && !globalTimer.isActive && (
            <div className="w-full max-w-xl space-y-4 animate-fade-in px-4">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest text-center">Active Subject</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {subjects.map(s => (
                        <button key={s} onClick={() => globalTimer.setSubject(s)} className={`py-2.5 rounded-xl text-xs font-medium border transition-all flex items-center justify-center relative group ${globalTimer.subject === s ? 'bg-nexus-electric/20 border-nexus-electric text-white' : 'bg-zinc-900/40 border-white/5 text-zinc-500'}`}>
                            <span className="truncate px-2">{s}</span>
                            {subjects.length > 1 && <button onClick={(e) => deleteSubject(e, s)} className="absolute -top-1 -right-1 p-1 bg-zinc-800 border border-white/10 rounded-full text-zinc-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-2.5 h-2.5" /></button>}
                        </button>
                    ))}
                    {isAddingSubject ? (
                      <form onSubmit={addSubject} className="flex"><input autoFocus value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} onBlur={() => { if (!newSubjectName.trim()) setIsAddingSubject(false); else addSubject(); }} placeholder="Name..." className="w-full py-2.5 bg-zinc-900/40 border border-nexus-electric/50 rounded-xl text-xs text-white px-3 outline-none" /></form>
                    ) : (
                      <button onClick={() => setIsAddingSubject(true)} className="py-2.5 rounded-xl text-xs font-medium border border-dashed border-zinc-700 text-zinc-500 hover:text-white transition-all flex items-center justify-center gap-2"><Plus className="w-3.5 h-3.5" /><span>Add</span></button>
                    )}
                </div>
            </div>
        )}

        {globalTimer.isActive && globalTimer.mode === 'focus' && (
            <div className="px-6 py-2 bg-nexus-electric/10 border border-nexus-electric/20 rounded-full text-nexus-electric text-xs font-bold animate-pulse flex items-center gap-2"><Brain className="w-3.5 h-3.5" />Studying {globalTimer.subject}</div>
        )}

        <div className="relative group flex items-center justify-center shrink-0" style={{ width: 340, height: 340 }}>
            <svg viewBox={`0 0 340 340`} className="w-full h-full transform -rotate-90">
                <circle cx={170} cy={170} r={140} strokeWidth="8" stroke="currentColor" fill="transparent" className="text-zinc-900" />
                <circle cx={170} cy={170} r={140} strokeWidth="8" stroke="currentColor" fill="transparent" 
                  strokeDasharray={2 * Math.PI * 140}
                  strokeDashoffset={isPomodoro ? (2 * Math.PI * 140 * (1 - progress / 100)) : (globalTimer.isActive ? undefined : 2 * Math.PI * 140)}
                  className={`${globalTimer.mode === 'focus' ? 'text-nexus-electric' : 'text-emerald-500'} transition-all duration-300 ease-out ${!isPomodoro && globalTimer.isActive ? 'animate-pulse' : ''}`}
                  style={{ filter: 'drop-shadow(0 0 8px currentColor)' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-8xl font-bold text-white tabular-nums tracking-tighter shadow-2xl">{formatTime(globalTimer.timeValue)}</div>
                <div className="mt-4 px-4 py-1.5 bg-zinc-900/80 border border-white/5 rounded-full text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">{globalTimer.type} • {globalTimer.mode}</div>
            </div>
        </div>

        <div className="flex items-center gap-8 shrink-0">
            <button onClick={handleReset} className="w-16 h-16 rounded-full bg-zinc-900 border border-white/5 text-zinc-500 flex items-center justify-center hover:text-white transition-colors active:scale-90" title="Reset Session"><RotateCcw className="w-5 h-5" /></button>
            <button onClick={toggleTimer} className="w-24 h-24 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.2)] active:scale-90 transition-transform">{globalTimer.isActive ? <Pause className="w-10 h-10 fill-black" /> : <Play className="w-10 h-10 fill-black ml-1" />}</button>
            {(globalTimer.isActive || (!isPomodoro && globalTimer.timeValue > 0)) && (
                <button onClick={() => globalTimer.manualEnd()} className="w-16 h-16 rounded-full bg-nexus-electric/10 border border-nexus-electric/20 text-nexus-electric flex items-center justify-center hover:bg-nexus-electric hover:text-white transition-all active:scale-90 group" title="Finish and Save Progress"><FastForward className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" /></button>
            )}
        </div>
      </div>

      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-[#09090b] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-nexus-electric to-emerald-500" />
             <div className="flex justify-between items-center mb-8">
                 <h3 className="text-xl font-bold text-white flex items-center gap-2"><Settings2 className="w-5 h-5 text-nexus-electric" />Timer Configuration</h3>
                 <button onClick={() => setShowConfig(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
             </div>
             <form onSubmit={handleSaveSettings} className="space-y-6">
                <div className="space-y-4">
                    {(['focus', 'short', 'long'] as const).map(m => (
                      <div key={m} className="flex items-center justify-between">
                          <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{m} Session</label>
                          <div className="flex items-center gap-3">
                              <input type="number" value={editSettings[m]} onChange={e => setEditSettings({...editSettings, [m]: parseInt(e.target.value) || 1})} className="w-16 bg-zinc-900 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white focus:border-nexus-electric outline-none font-mono" />
                              <span className="text-[10px] text-zinc-600 font-bold">MIN</span>
                          </div>
                      </div>
                    ))}
                </div>
                <button type="submit" className="w-full py-4 bg-white text-black font-bold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl"><Check className="w-4 h-4" />Apply Changes</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};
