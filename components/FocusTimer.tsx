import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Brain, Plus, X, Volume2, VolumeX, Settings2, Check, FastForward } from 'lucide-react';
import { UserProfile } from '../types.ts';
import { dbService } from '../services/dbService.ts';

interface FocusTimerProps {
  user: UserProfile;
  subjects: string[];
  setSubjects: React.Dispatch<React.SetStateAction<string[]>>;
  globalTimer: {
    isActive: boolean;
    timeLeft: number;
    totalTime: number;
    mode: 'focus' | 'short' | 'long';
    subject: string;
    isMuted: boolean;
    setIsMuted: (muted: boolean) => void;
    start: (duration: number, mode: string, subject: string) => void;
    stop: () => void;
    reset: (duration: number) => void;
    manualEnd: () => void;
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
  
  const [editSettings, setEditSettings] = useState(settings);

  useEffect(() => {
    localStorage.setItem('nexus_timer_settings', JSON.stringify(settings));
  }, [settings]);

  const toggleTimer = async () => {
    if (globalTimer.isActive) {
      globalTimer.stop();
    } else {
      globalTimer.start(settings[globalTimer.mode] * 60, globalTimer.mode, globalTimer.subject);
      
      const subject = globalTimer.mode === 'focus' ? globalTimer.subject : 'Break';
      await dbService.updateUserStatus(user.uid, globalTimer.mode === 'focus' ? 'studying' : 'break', subject);
      if (globalTimer.mode === 'focus') {
         await dbService.logActivity({ userId: user.uid, userName: user.name, type: 'session_started', subject: subject });
      }
    }
  };

  const switchMode = (m: 'focus' | 'short' | 'long') => {
    globalTimer.stop();
    globalTimer.setMode(m);
    globalTimer.reset(settings[m] * 60);
  };

  const handleReset = () => {
    globalTimer.reset(settings[globalTimer.mode] * 60);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m.toString().padStart(2, '0')}:${rs.toString().padStart(2, '0')}`;
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSettings(editSettings);
    setShowConfig(false);
    if (!globalTimer.isActive) {
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

  const size = 340;
  const progress = ((globalTimer.totalTime - globalTimer.timeLeft) / globalTimer.totalTime) * 100;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar pr-2 pb-12 animate-fade-in relative">
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-3">
          <button 
            onClick={() => globalTimer.setIsMuted(!globalTimer.isMuted)}
            className="p-3 bg-zinc-900/60 border border-white/10 rounded-2xl text-zinc-500 hover:text-white transition-all backdrop-blur-xl shadow-xl"
            title={globalTimer.isMuted ? "Unmute sounds" : "Mute sounds"}
          >
            {globalTimer.isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => {
                setEditSettings(settings);
                setShowConfig(true);
            }}
            className="p-3 bg-zinc-900/60 border border-white/10 rounded-2xl text-zinc-500 hover:text-white transition-all backdrop-blur-xl shadow-xl"
            title="Timer Settings"
          >
            <Settings2 className="w-5 h-5" />
          </button>
      </div>

      <div className="min-h-full flex flex-col items-center justify-center space-y-10 py-8 relative">
        
        <div className="flex p-1 bg-zinc-900/60 border border-white/10 rounded-full backdrop-blur-xl shrink-0">
            {(['focus', 'short', 'long'] as const).map(m => (
                <button 
                  key={m} 
                  onClick={() => switchMode(m)}
                  className={`px-8 py-2.5 rounded-full text-xs font-bold transition-all ${globalTimer.mode === m ? 'bg-white text-black shadow-xl' : 'text-zinc-500 hover:text-zinc-200'}`}
                >
                    {m === 'focus' ? 'FOCUS' : m === 'short' ? 'SHORT BREAK' : 'LONG BREAK'}
                </button>
            ))}
        </div>

        {globalTimer.mode === 'focus' && !globalTimer.isActive && (
            <div className="w-full max-w-xl space-y-4 animate-fade-in px-4">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest text-center">What are you studying?</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {subjects.map(s => (
                        <button
                            key={s}
                            onClick={() => globalTimer.setSubject(s)}
                            className={`py-2.5 rounded-xl text-xs font-medium border transition-all flex items-center justify-center relative group
                              ${globalTimer.subject === s 
                                ? 'bg-nexus-electric/20 border-nexus-electric text-white shadow-[0_0_15px_rgba(var(--nexus-accent-rgb),0.2)]' 
                                : 'bg-zinc-900/40 border-white/5 text-zinc-500 hover:border-white/10'}`}
                        >
                            <span className="truncate px-2">{s}</span>
                            {subjects.length > 1 && (
                              <button
                                onClick={(e) => deleteSubject(e, s)}
                                className="absolute -top-1 -right-1 p-1 bg-zinc-800 border border-white/10 rounded-full text-zinc-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            )}
                        </button>
                    ))}
                    
                    {isAddingSubject ? (
                      <form onSubmit={addSubject} className="flex col-span-1 md:col-span-1">
                        <input
                          autoFocus
                          value={newSubjectName}
                          onChange={(e) => setNewSubjectName(e.target.value)}
                          onBlur={() => {
                            if (!newSubjectName.trim()) setIsAddingSubject(false);
                            else addSubject();
                          }}
                          placeholder="Name..."
                          className="w-full py-2.5 bg-zinc-900/40 border border-nexus-electric/50 rounded-xl text-xs text-white px-3 focus:outline-none focus:border-nexus-electric"
                        />
                      </form>
                    ) : (
                      <button
                        onClick={() => setIsAddingSubject(true)}
                        className="py-2.5 rounded-xl text-xs font-medium border border-dashed border-zinc-700 text-zinc-500 hover:text-white hover:border-zinc-500 transition-all flex items-center justify-center gap-2 active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    )}
                </div>
            </div>
        )}

        {globalTimer.isActive && globalTimer.mode === 'focus' && (
            <div className="px-6 py-2 bg-nexus-electric/10 border border-nexus-electric/20 rounded-full text-nexus-electric text-xs font-bold animate-pulse flex items-center gap-2">
                <Brain className="w-3.5 h-3.5" />
                Studying {globalTimer.subject}
            </div>
        )}

        <div className="relative group flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full transform -rotate-90">
                <circle cx={size/2} cy={size/2} r={140} strokeWidth="8" stroke="currentColor" fill="transparent" className="text-zinc-900" />
                <circle cx={size/2} cy={size/2} r={140} strokeWidth="8" stroke="currentColor" fill="transparent" 
                  strokeDasharray={2 * Math.PI * 140}
                  strokeDashoffset={2 * Math.PI * 140 * (1 - progress / 100)}
                  className={`${globalTimer.mode === 'focus' ? 'text-nexus-electric' : 'text-emerald-500'} transition-all duration-300 ease-out`}
                  style={{ filter: 'drop-shadow(0 0 8px currentColor)' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-8xl font-bold text-white tabular-nums tracking-tighter shadow-2xl">{formatTime(globalTimer.timeLeft)}</div>
                <div className="mt-4 px-4 py-1.5 bg-zinc-900/80 border border-white/5 rounded-full text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">{globalTimer.mode} session</div>
            </div>
        </div>

        <div className="flex items-center gap-8 shrink-0">
            <button onClick={handleReset} className="w-16 h-16 rounded-full bg-zinc-900 border border-white/5 text-zinc-500 flex items-center justify-center hover:text-white transition-colors active:scale-90" title="Reset Session">
                <RotateCcw className="w-5 h-5" />
            </button>
            <button onClick={toggleTimer} className="w-24 h-24 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.2)] active:scale-90 transition-transform">
                {globalTimer.isActive ? <Pause className="w-10 h-10 fill-black" /> : <Play className="w-10 h-10 fill-black ml-1" />}
            </button>
            {globalTimer.isActive && (
                <button 
                  onClick={() => globalTimer.manualEnd()} 
                  className="w-16 h-16 rounded-full bg-nexus-electric/10 border border-nexus-electric/20 text-nexus-electric flex items-center justify-center hover:bg-nexus-electric hover:text-white transition-all active:scale-90 group"
                  title="Finish and Save Progress"
                >
                    <FastForward className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                </button>
            )}
        </div>
      </div>

      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-[#09090b] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-nexus-electric to-emerald-500" />
             <div className="flex justify-between items-center mb-8">
                 <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Settings2 className="w-5 h-5 text-nexus-electric" />
                    Interval Config
                 </h3>
                 <button onClick={() => setShowConfig(false)} className="text-zinc-500 hover:text-white transition-colors">
                     <X className="w-5 h-5" />
                 </button>
             </div>

             <form onSubmit={handleSaveSettings} className="space-y-6">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Focus Session</label>
                        <div className="flex items-center gap-3">
                            <input 
                                type="number" 
                                value={editSettings.focus}
                                onChange={e => setEditSettings({...editSettings, focus: parseInt(e.target.value) || 1})}
                                className="w-16 bg-zinc-900 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white focus:border-nexus-electric outline-none font-mono"
                            />
                            <span className="text-[10px] text-zinc-600 font-bold">MIN</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Short Break</label>
                        <div className="flex items-center gap-3">
                            <input 
                                type="number" 
                                value={editSettings.short}
                                onChange={e => setEditSettings({...editSettings, short: parseInt(e.target.value) || 1})}
                                className="w-16 bg-zinc-900 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white focus:border-emerald-500 outline-none font-mono"
                            />
                            <span className="text-[10px] text-zinc-600 font-bold">MIN</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Long Break</label>
                        <div className="flex items-center gap-3">
                            <input 
                                type="number" 
                                value={editSettings.long}
                                onChange={e => setEditSettings({...editSettings, long: parseInt(e.target.value) || 1})}
                                className="w-16 bg-zinc-900 border border-white/10 rounded-lg px-2 py-1.5 text-center text-white focus:border-emerald-500 outline-none font-mono"
                            />
                            <span className="text-[10px] text-zinc-600 font-bold">MIN</span>
                        </div>
                    </div>
                </div>

                <button 
                    type="submit" 
                    className="w-full py-4 bg-white text-black font-bold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl"
                >
                    <Check className="w-4 h-4" />
                    Apply Settings
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};