import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Link as LinkIcon, Coffee, Brain, Zap, Settings, X, Search, CheckCircle2 } from 'lucide-react';
import { UserProfile, Task, TaskStatus } from '../types';
import { dbService } from '../services/dbService';

interface FocusTimerProps {
  user: UserProfile;
}

export const FocusTimer: React.FC<FocusTimerProps> = ({ user }) => {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('nexus_timer_settings');
    return saved ? JSON.parse(saved) : { focus: 25, short: 5, long: 15 };
  });

  const [timeLeft, setTimeLeft] = useState(settings.focus * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'focus' | 'short' | 'long'>('focus');
  
  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempSettings, setTempSettings] = useState(settings);

  // Task Linking State
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isTaskPickerOpen, setIsTaskPickerOpen] = useState(false);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [taskSearch, setTaskSearch] = useState('');

  useEffect(() => {
    localStorage.setItem('nexus_timer_settings', JSON.stringify(settings));
  }, [settings]);

  // Load pending tasks when picker opens
  useEffect(() => {
    if (isTaskPickerOpen) {
        const fetchTasks = async () => {
            const tasks = await dbService.getTasks(user.uid);
            setAvailableTasks(tasks.filter(t => t.status === TaskStatus.PENDING));
        };
        fetchTasks();
    }
  }, [isTaskPickerOpen, user.uid]);
  
  const modeConfig = {
    focus: { 
      duration: settings.focus * 60, 
      color: 'text-indigo-500', 
      glow: 'shadow-indigo-500/50',
      label: 'Focus Session',
      icon: Brain
    },
    short: { 
      duration: settings.short * 60, 
      color: 'text-emerald-500', 
      glow: 'shadow-emerald-500/50',
      label: 'Short Break',
      icon: Coffee
    },
    long: { 
      duration: settings.long * 60, 
      color: 'text-cyan-500', 
      glow: 'shadow-cyan-500/50',
      label: 'Long Break',
      icon: Zap
    }
  };

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const switchMode = (m: 'focus' | 'short' | 'long') => {
    setIsActive(false);
    setMode(m);
    const newDuration = settings[m] * 60; 
    setTimeLeft(newDuration);
  };

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(modeConfig[mode].duration);
  };

  const openSettings = () => {
    setTempSettings(settings);
    setIsSettingsOpen(true);
  };

  const saveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSettings(tempSettings);
    setIsSettingsOpen(false);
    
    if (!isActive) {
        setTimeLeft(tempSettings[mode] * 60);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentConfig = modeConfig[mode];
  const totalDuration = currentConfig.duration;
  
  // Progress Bar Logic
  const progress = totalDuration > 0 ? ((totalDuration - timeLeft) / totalDuration) * 100 : 0;
  
  // Dimensions - Reduced Size
  const size = 340; 
  const strokeWidth = 12; 
  const center = size / 2;
  const radius = (size - strokeWidth) / 2 - 20; 
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const filteredTasks = availableTasks.filter(t => 
    t.title.toLowerCase().includes(taskSearch.toLowerCase()) || 
    t.subject.toLowerCase().includes(taskSearch.toLowerCase())
  );

  return (
    <div className="h-full relative overflow-hidden rounded-3xl bg-zinc-900/20 border border-white/5 backdrop-blur-2xl shadow-2xl animate-fade-in">
      {/* Dynamic Background Gradient */}
      <div 
        className={`
          absolute inset-0 bg-gradient-to-b opacity-20 pointer-events-none transition-colors duration-1000
          ${mode === 'focus' ? 'from-indigo-900/40' : mode === 'short' ? 'from-emerald-900/40' : 'from-cyan-900/40'} 
          to-transparent
        `} 
      />

      {/* Top Controls - Fixed */}
      <div className="absolute top-6 right-6 z-30">
        <button 
            onClick={openSettings}
            className="p-3 text-zinc-500 hover:text-white transition-all hover:bg-white/5 rounded-full hover:scale-110 active:scale-95"
        >
            <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Content Container */}
      <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
        <div className="min-h-full flex flex-col items-center justify-center py-12 space-y-8">
            {/* Mode Switcher */}
            <div className="flex p-1 bg-zinc-900/60 border border-white/10 rounded-full relative z-10 backdrop-blur-xl shrink-0">
                {(['focus', 'short', 'long'] as const).map((m) => (
                <button
                    key={m}
                    onClick={() => switchMode(m)}
                    className={`
                    px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ease-out active:scale-95
                    ${mode === m 
                        ? 'bg-white text-black shadow-lg scale-105 font-bold' 
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'}
                    `}
                >
                    {m === 'focus' ? 'Focus' : m === 'short' ? 'Short' : 'Long'}
                </button>
                ))}
            </div>

            {/* Timer Visualization */}
            <div className="relative group flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
                {/* Ripple Effects when Active */}
                {isActive && (
                <>
                    <div 
                        className={`absolute inset-0 rounded-full animate-ping opacity-20 ${currentConfig.color.replace('text-', 'bg-')}`} 
                        style={{ animationDuration: '3s' }} 
                    />
                    <div 
                        className={`absolute inset-0 rounded-full animate-ping opacity-10 ${currentConfig.color.replace('text-', 'bg-')}`} 
                        style={{ animationDuration: '2s', animationDelay: '0.5s' }} 
                    />
                </>
                )}

                <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full transform -rotate-90 relative z-10 drop-shadow-2xl block">
                    {/* Track */}
                    <circle
                    cx={center} cy={center} r={radius}
                    stroke="currentColor" strokeWidth={strokeWidth} fill="transparent"
                    className="text-zinc-800/20"
                    />
                    {/* Progress Ring */}
                    <circle
                    cx={center} cy={center} r={radius}
                    stroke="currentColor" strokeWidth={strokeWidth} fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className={`
                        ${currentConfig.color} 
                        transition-all duration-1000 ease-linear
                        ${isActive ? 'drop-shadow-[0_0_15px_currentColor]' : ''}
                    `}
                    />
                </svg>

                {/* Timer Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
                    <div key={mode} className="flex flex-col items-center animate-slide-up">
                        <div className={`
                            text-7xl font-bold text-white tabular-nums tracking-tighter mb-4 text-center
                            transition-transform duration-500
                            ${isActive ? 'scale-110 drop-shadow-2xl' : 'scale-100'}
                        `}>
                            {formatTime(timeLeft)}
                        </div>
                        <div 
                            className={`
                                flex items-center gap-2 text-xs font-bold uppercase tracking-widest 
                                ${currentConfig.color} bg-black/60 px-4 py-2 rounded-full 
                                backdrop-blur-md border border-white/5 transition-all duration-300 shadow-xl
                            `}
                        >
                            <currentConfig.icon className="w-4 h-4" />
                            <span>{isActive ? 'Session Active' : currentConfig.label}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex gap-6 relative z-10 shrink-0">
                <button 
                onClick={toggleTimer}
                className={`
                    w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95
                    ${isActive 
                        ? 'bg-zinc-800 text-white border border-white/10 hover:border-white/20' 
                        : 'bg-white text-black shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)]'}
                `}
                >
                    {isActive ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                </button>
                <button 
                onClick={resetTimer}
                className="w-20 h-20 rounded-full bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-all duration-300 hover:rotate-180 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-90"
                >
                    <RotateCcw className="w-6 h-6" />
                </button>
            </div>

            {/* Active Task Linker */}
            <div className="relative z-10 shrink-0">
                {activeTask ? (
                    <div className="flex items-center gap-3 bg-zinc-900/50 border border-indigo-500/30 p-2 pl-4 pr-2 rounded-xl backdrop-blur-md animate-fade-in group hover:bg-zinc-900/70 transition-colors cursor-default shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Working on</span>
                            <span className="text-sm text-white font-medium max-w-[200px] truncate">{activeTask.title}</span>
                        </div>
                        <button 
                            onClick={() => setActiveTask(null)}
                            className="p-2 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-white transition-colors"
                            title="Unlink task"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={() => setIsTaskPickerOpen(true)}
                        className="flex items-center gap-2 text-zinc-500 hover:text-indigo-400 cursor-pointer transition-all p-2 px-4 rounded-lg hover:bg-zinc-900/50 border border-transparent hover:border-white/5 active:scale-95"
                    >
                        <LinkIcon className="w-4 h-4" />
                        <span className="text-sm">Link Active Task</span>
                    </button>
                )}
            </div>
        </div>
      </div>

      {/* Task Picker Modal */}
      {isTaskPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-md bg-[#09090b] border border-white/10 rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <LinkIcon className="w-5 h-5 text-zinc-400" />
                        Link a Task
                    </h3>
                    <button onClick={() => setIsTaskPickerOpen(false)} className="text-zinc-500 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input 
                        type="text" 
                        placeholder="Search pending tasks..." 
                        value={taskSearch}
                        onChange={(e) => setTaskSearch(e.target.value)}
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-indigo-500/50 outline-none transition-all placeholder-zinc-600 focus:shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                        autoFocus
                    />
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                    {filteredTasks.length === 0 ? (
                        <div className="text-center py-12 text-zinc-600 bg-zinc-900/20 rounded-xl border border-dashed border-white/5">
                            {availableTasks.length === 0 ? "No pending tasks." : "No matching tasks found."}
                        </div>
                    ) : (
                        filteredTasks.map(task => (
                            <button
                                key={task.id}
                                onClick={() => {
                                    setActiveTask(task);
                                    setIsTaskPickerOpen(false);
                                }}
                                className="w-full text-left p-4 rounded-xl bg-zinc-900/30 border border-white/5 hover:border-indigo-500/50 hover:bg-zinc-900/60 transition-all group relative overflow-hidden hover:scale-[1.01] active:scale-[0.99]"
                            >
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex justify-between items-start">
                                    <div className="min-w-0">
                                        <div className="text-white font-medium text-sm mb-1 group-hover:text-indigo-300 transition-colors truncate">{task.title}</div>
                                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                                            <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5">{task.subject}</span>
                                        </div>
                                    </div>
                                    {task.priority === 'High' && (
                                        <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wider">
                                            High
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-sm bg-[#09090b] border border-white/10 rounded-3xl p-6 shadow-2xl relative">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Settings className="w-5 h-5 text-zinc-400" />
                        Timer Settings
                    </h3>
                    <button onClick={() => setIsSettingsOpen(false)} className="text-zinc-500 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <form onSubmit={saveSettings} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Focus (minutes)</label>
                        <input 
                            type="number" 
                            min="1"
                            max="120"
                            value={tempSettings.focus}
                            onChange={(e) => setTempSettings({...tempSettings, focus: parseInt(e.target.value) || 25})}
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500/50 outline-none transition-all focus:shadow-[0_0_10px_rgba(99,102,241,0.2)]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Short Break (minutes)</label>
                        <input 
                            type="number" 
                            min="1"
                            max="60"
                            value={tempSettings.short}
                            onChange={(e) => setTempSettings({...tempSettings, short: parseInt(e.target.value) || 5})}
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 outline-none transition-all focus:shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Long Break (minutes)</label>
                        <input 
                            type="number" 
                            min="1"
                            max="60"
                            value={tempSettings.long}
                            onChange={(e) => setTempSettings({...tempSettings, long: parseInt(e.target.value) || 15})}
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-500/50 outline-none transition-all focus:shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                        />
                    </div>

                    <button 
                        type="submit" 
                        className="w-full mt-2 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                    >
                        Save Changes
                    </button>
                </form>
            </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
            animation: slide-up 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};