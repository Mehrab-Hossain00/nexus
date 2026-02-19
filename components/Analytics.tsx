import React, { useEffect, useState, useMemo } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { UserProfile, StudySession, Task, TaskStatus } from '../types.ts';
import { dbService } from '../services/dbService.ts';
import { Brain, Clock, Activity, Target, Zap, TrendingUp, Calendar as CalendarIcon, ChevronLeft, ChevronRight, BookOpen, Search, Layers } from 'lucide-react';

interface AnalyticsProps {
    user: UserProfile;
}

type TimeRange = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
type AnalysisTab = 'Day' | 'Week' | 'Month';

const getThemeColor = () => getComputedStyle(document.documentElement).getPropertyValue('--nexus-accent').trim() || '#7C3AED';

export const Analytics: React.FC<AnalyticsProps> = ({ user }) => {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('Weekly');
  const [loading, setLoading] = useState(true);
  const [accentColor, setAccentColor] = useState('#7C3AED');
  
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [analysisTab, setAnalysisTab] = useState<AnalysisTab>('Day');

  useEffect(() => {
    setAccentColor(getThemeColor());
  }, [user.theme]);

  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        try {
            const [fetchedSessions, fetchedTasks] = await Promise.all([
                dbService.getSessions(user.uid),
                dbService.getTasks(user.uid)
            ]);
            setSessions(fetchedSessions);
            setTasks(fetchedTasks);
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, [user.uid]);

  const dailyStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySessions = sessions.filter(s => s.date === todayStr);
    const todayTasks = tasks.filter(t => {
      const taskDate = new Date(t.createdAt).toISOString().split('T')[0];
      return taskDate === todayStr;
    });

    const totalSecs = todaySessions.reduce((acc, s) => acc + s.duration, 0);
    const doneTasks = todayTasks.filter(t => t.status === TaskStatus.DONE).length;
    
    return {
        totalHours: Number((totalSecs / 3600).toFixed(1)),
        avgSession: todaySessions.length > 0 ? Math.round((totalSecs / todaySessions.length) / 60) : 0,
        sessionCount: todaySessions.length,
        taskEfficiency: todayTasks.length > 0 ? Math.round((doneTasks / todayTasks.length) * 100) : 0,
        doneTasks,
        pendingTasks: todayTasks.length - doneTasks
    };
  }, [sessions, tasks]);

  const calendarDays = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) {
        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
        const daySessions = sessions.filter(s => s.date === dateStr);
        const totalMins = daySessions.reduce((acc, s) => acc + s.duration, 0) / 60;
        days.push({ day: i, date: dateStr, sessions: daySessions, totalMins });
    }
    return days;
  }, [currentCalendarDate, sessions]);

  const analysisData = useMemo(() => {
    if (!selectedDay && analysisTab !== 'Month') return null;

    let filtered: StudySession[] = [];
    let title = "";

    if (analysisTab === 'Day') {
      filtered = sessions.filter(s => s.date === selectedDay);
      title = selectedDay ? new Date(selectedDay).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : "Today";
    } else if (analysisTab === 'Week') {
      const selected = new Date(selectedDay || new Date());
      const first = selected.getDate() - selected.getDay();
      const last = first + 6;
      const firstDay = new Date(selected.setDate(first)).toISOString().split('T')[0];
      const lastDay = new Date(selected.setDate(last)).toISOString().split('T')[0];
      filtered = sessions.filter(s => s.date >= firstDay && s.date <= lastDay);
      title = "This Week";
    } else if (analysisTab === 'Month') {
      const y = currentCalendarDate.getFullYear();
      const m = currentCalendarDate.getMonth();
      filtered = sessions.filter(s => {
        const d = new Date(s.date);
        return d.getFullYear() === y && d.getMonth() === m;
      });
      title = currentCalendarDate.toLocaleDateString(undefined, { month: 'long' });
    }

    const totalSeconds = filtered.reduce((acc, s) => acc + s.duration, 0);
    const subjectMap = new Map<string, number>();
    filtered.forEach(s => {
      subjectMap.set(s.subject, (subjectMap.get(s.subject) || 0) + s.duration);
    });

    const subjectBreakdown = Array.from(subjectMap.entries())
      .map(([name, duration]) => ({ name, duration: Math.round(duration / 60) }))
      .sort((a, b) => b.duration - a.duration);

    return { filtered, totalSeconds, subjectBreakdown, title };
  }, [selectedDay, analysisTab, sessions, currentCalendarDate]);

  const changeMonth = (dir: 'prev' | 'next') => {
    const d = new Date(currentCalendarDate);
    d.setMonth(currentCalendarDate.getMonth() + (dir === 'next' ? 1 : -1));
    setCurrentCalendarDate(d);
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar space-y-8 animate-fade-in pb-20 pr-2">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
         <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Study Stats</h1>
            <p className="text-zinc-500 text-sm mt-1">Review your daily progress and study habits.</p>
         </div>
         <div className="flex bg-zinc-900/40 p-1 rounded-xl border border-white/5 backdrop-blur-md">
            {(['Daily', 'Weekly', 'Monthly'] as TimeRange[]).map(r => (
                <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${timeRange === r ? 'bg-white text-black shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    {r}
                </button>
            ))}
         </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Clock} value={`${dailyStats.totalHours}h`} label="Time Today" color="text-nexus-electric" />
          <StatCard icon={Activity} value={`${dailyStats.avgSession}m`} label="Avg Session" color="text-nexus-violet" />
          <StatCard icon={Target} value={`${dailyStats.taskEfficiency}%`} label="Tasks Done" color="text-emerald-400" />
          <StatCard icon={Zap} value={dailyStats.sessionCount} label="Sessions" color="text-rose-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-8 rounded-[2.5rem] bg-zinc-900/20 border border-white/5 backdrop-blur-xl h-[400px] flex flex-col group relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-nexus-electric/5 blur-[80px] rounded-full pointer-events-none" />
            <div className="flex justify-between items-center mb-10 relative z-10">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-nexus-electric" />
                    Study Progress
                </h3>
            </div>
            
            <div className="flex-1 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sessions.slice(-14).map(s => ({ label: s.date.split('-').slice(1).join('/'), minutes: s.duration / 60 }))}>
                        <defs>
                            <linearGradient id="progressionGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={accentColor} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={accentColor} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} opacity={0.1} />
                        <XAxis dataKey="label" stroke="#52525b" tick={{fill: '#71717a', fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} dy={10} />
                        <YAxis stroke="#52525b" tick={{fill: '#71717a', fontSize: 10}} axisLine={false} tickLine={false} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '10px' }}
                            cursor={{ stroke: accentColor, strokeWidth: 1 }} 
                        />
                        <Area type="monotone" dataKey="minutes" stroke={accentColor} strokeWidth={3} fillOpacity={1} fill="url(#progressionGradient)" animationDuration={1000} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="p-8 rounded-[2.5rem] bg-zinc-900/20 border border-white/5 backdrop-blur-xl h-[400px] flex flex-col relative overflow-hidden group shadow-xl">
            <div className="mb-6 relative z-10">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-emerald-400" />
                    Task Progress
                </h3>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <div className="text-4xl font-black text-white tracking-tighter">{dailyStats.taskEfficiency}%</div>
                        <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1">Today's Goal</div>
                    </div>
                </div>
                <div className="w-full h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={[ { name: 'Finished', value: dailyStats.doneTasks }, { name: 'Remaining', value: dailyStats.pendingTasks || 1 } ]}
                                cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={8} dataKey="value" stroke="none"
                            >
                                <Cell fill={accentColor} />
                                <Cell fill="#18181b" />
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 p-8 rounded-[2.5rem] bg-zinc-900/20 border border-white/5 backdrop-blur-xl min-h-[500px] flex flex-col shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 uppercase tracking-tight">
                            <CalendarIcon className="w-5 h-5 text-nexus-electric" />
                            Study Calendar
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1 uppercase font-bold tracking-widest">Your History</p>
                    </div>
                    <div className="flex items-center gap-4 bg-black/40 p-1 rounded-xl border border-white/5 shadow-inner">
                        <button onClick={() => changeMonth('prev')} className="p-2 hover:bg-white/5 text-zinc-400 rounded-lg transition-all"><ChevronLeft className="w-4 h-4" /></button>
                        <span className="text-xs font-black text-white uppercase tracking-widest min-w-[120px] text-center">
                            {currentCalendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={() => changeMonth('next')} className="p-2 hover:bg-white/5 text-zinc-400 rounded-lg transition-all"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-7 gap-2 md:gap-3 text-center">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-2">{d}</div>
                    ))}
                    {calendarDays.map((d, i) => (
                        d ? (
                            <button
                                key={d.date}
                                onClick={() => setSelectedDay(d.date)}
                                className={`
                                    aspect-square rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all duration-300 relative group
                                    ${selectedDay === d.date ? 'bg-nexus-electric border-nexus-electric shadow-[0_0_20px_rgba(var(--nexus-accent-rgb),0.3)] scale-105' : 'bg-black/20 border-white/5 hover:border-white/20 hover:bg-black/40'}
                                `}
                            >
                                <span className={`text-xs font-bold ${selectedDay === d.date ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>{d.day}</span>
                                {d.totalMins > 0 && (
                                    <div 
                                        className={`w-1 h-1 rounded-full animate-pulse ${selectedDay === d.date ? 'bg-white' : 'bg-nexus-electric shadow-[0_0_8px_rgba(var(--nexus-accent-rgb),0.8)]'}`} 
                                    />
                                )}
                            </button>
                        ) : (
                            <div key={`empty-${i}`} className="aspect-square opacity-0" />
                        )
                    ))}
                </div>
            </div>

            <div className="p-8 rounded-[2.5rem] bg-zinc-900/40 border border-white/5 backdrop-blur-xl flex flex-col shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-nexus-electric to-transparent" />
                
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h4 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-1">Summary</h4>
                        <h3 className="text-xl font-bold text-white tracking-tight">{analysisData?.title}</h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-black border border-white/5 flex items-center justify-center">
                        <Layers className="w-5 h-5 text-nexus-electric" />
                    </div>
                </div>

                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 mb-8">
                    {(['Day', 'Week', 'Month'] as AnalysisTab[]).map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setAnalysisTab(tab)}
                            className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${analysisTab === tab ? 'bg-white text-black shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="flex-1 space-y-8 overflow-y-auto custom-scrollbar pr-2">
                    {analysisData?.subjectBreakdown.length ? (
                        <div className="space-y-6">
                            <h5 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-4">Subjects Studied</h5>
                            {analysisData.subjectBreakdown.map((sub, i) => (
                                <div key={sub.name} className="space-y-2 animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
                                    <div className="flex justify-between items-end">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-black flex items-center justify-center border border-white/5">
                                                <Zap className="w-3 h-3 text-nexus-violet" />
                                            </div>
                                            <span className="text-[11px] font-bold text-white uppercase tracking-wider">{sub.name}</span>
                                        </div>
                                        <span className="text-[9px] font-mono text-zinc-500 uppercase">{sub.duration} MIN</span>
                                    </div>
                                    <div className="h-1 bg-black/60 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-nexus-electric rounded-full transition-all duration-1000" 
                                            style={{ width: `${Math.min(100, (sub.duration / (analysisData.totalSeconds/60)) * 100)}%` }} 
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-30">
                            <Search className="w-12 h-12 text-zinc-500" />
                            <p className="text-[10px] font-black uppercase tracking-[0.4em]">No sessions found</p>
                        </div>
                    )}
                </div>

                {analysisData && analysisData.totalSeconds > 0 && (
                    <div className="mt-8 pt-6 border-t border-white/5">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Study Time</p>
                                <p className="text-2xl font-black text-white leading-none">
                                    {(analysisData.totalSeconds / 3600).toFixed(1)}
                                    <span className="text-xs text-zinc-500 ml-1 font-bold">HOURS</span>
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-full border-4 border-nexus-electric/20 border-t-nexus-electric animate-spin duration-[3s]" />
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, value, label, color }: any) => (
    <div className={`p-8 rounded-3xl border border-white/5 bg-zinc-900/10 backdrop-blur-sm group hover:border-white/10 transition-all hover:bg-zinc-900/20 shadow-xl`}>
        <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform shadow-inner">
                <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-black leading-tight">{label}</span>
        </div>
        <div className={`text-4xl font-black text-white tracking-tighter group-hover:translate-x-1 transition-transform`}>{value}</div>
    </div>
);
