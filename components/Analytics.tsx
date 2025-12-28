import React, { useEffect, useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { UserProfile, StudySession, Task, TaskStatus } from '../types.ts';
import { dbService } from '../services/dbService.ts';
import { Brain, Clock, Activity, Target, Zap, TrendingUp, Calendar, ChevronDown } from 'lucide-react';

interface AnalyticsProps {
    user: UserProfile;
}

type TimeRange = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';

// Using a CSS variable-aware approach for Recharts
const getThemeColor = () => getComputedStyle(document.documentElement).getPropertyValue('--nexus-accent').trim() || '#7C3AED';
const getThemeColorAlt = () => getComputedStyle(document.documentElement).getPropertyValue('--nexus-accent-alt').trim() || '#8B5CF6';

export const Analytics: React.FC<AnalyticsProps> = ({ user }) => {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('Daily');
  const [loading, setLoading] = useState(true);
  const [accentColor, setAccentColor] = useState('#7C3AED');

  useEffect(() => {
    setAccentColor(getThemeColor());
  }, [user.theme]);

  const COLORS = [accentColor, '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];
  const TASK_COLORS = [accentColor, '#27272a'];

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

  const filteredSessions = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    if (timeRange === 'Daily') {
      return sessions.filter(s => s.date === todayStr);
    } 
    
    if (timeRange === 'Weekly') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];
      return sessions.filter(s => s.date >= weekAgoStr);
    }

    if (timeRange === 'Monthly') {
      const monthPrefix = todayStr.substring(0, 7); // YYYY-MM
      return sessions.filter(s => s.date.startsWith(monthPrefix));
    }

    if (timeRange === 'Yearly') {
      const yearPrefix = todayStr.substring(0, 4); // YYYY
      return sessions.filter(s => s.date.startsWith(yearPrefix));
    }

    return sessions;
  }, [sessions, timeRange]);

  const stats = useMemo(() => {
    const totalSecs = filteredSessions.reduce((acc, s) => acc + s.duration, 0);
    const doneTasks = tasks.filter(t => t.status === TaskStatus.DONE).length;
    return {
        totalHours: Number((totalSecs / 3600).toFixed(1)),
        avgSession: filteredSessions.length > 0 ? Math.round((totalSecs / filteredSessions.length) / 60) : 0,
        nodesCount: filteredSessions.length,
        taskEfficiency: tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0,
        doneTasks,
        pendingTasks: tasks.length - doneTasks
    };
  }, [filteredSessions, tasks]);

  const subjectData = useMemo(() => {
    const subjectMap = new Map<string, number>();
    filteredSessions.forEach(s => {
        const sub = s.subject || 'General Study';
        subjectMap.set(sub, (subjectMap.get(sub) || 0) + (s.duration / 60));
    });
    return Array.from(subjectMap.entries())
        .map(([name, minutes]) => ({ name, minutes: Math.round(minutes) }))
        .sort((a, b) => b.minutes - a.minutes);
  }, [filteredSessions]);

  const progressionData = useMemo(() => {
    const timeMap = new Map<string, number>();
    const now = new Date();
    
    if (timeRange === 'Daily') {
        for (let i = 13; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            timeMap.set(d.toISOString().split('T')[0], 0);
        }
    } else if (timeRange === 'Weekly') {
        for (let i = 7; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - (i * 7));
            const day = d.getDay() || 7;
            d.setHours(-24 * (day - 1));
            timeMap.set(d.toISOString().split('T')[0], 0);
        }
    } else if (timeRange === 'Monthly') {
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            timeMap.set(d.toISOString().substring(0, 7), 0);
        }
    } else { 
        for (let i = 2; i >= 0; i--) {
            const d = new Date(now.getFullYear() - i, 0, 1);
            timeMap.set(d.getFullYear().toString(), 0);
        }
    }

    sessions.forEach(s => {
        let key = '';
        if (timeRange === 'Daily') key = s.date;
        else if (timeRange === 'Weekly') {
            const d = new Date(s.date);
            const day = d.getDay() || 7;
            d.setHours(-24 * (day - 1));
            key = d.toISOString().split('T')[0];
        }
        else if (timeRange === 'Monthly') key = s.date.substring(0, 7);
        else key = s.date.substring(0, 4);

        if (timeMap.has(key)) {
            timeMap.set(key, (timeMap.get(key) || 0) + (s.duration / 60));
        }
    });

    return Array.from(timeMap.entries()).map(([label, minutes]) => ({
        label: timeRange === 'Daily' ? label.split('-').slice(1).join('/') :
               timeRange === 'Weekly' ? `W-${label.split('-')[2]}` :
               timeRange === 'Monthly' ? new Date(label + '-01').toLocaleDateString(undefined, {month: 'short'}) : label,
        minutes: Math.round(minutes)
    }));
  }, [sessions, timeRange]);

  const taskDistribution = [
      { name: 'Finished', value: stats.doneTasks },
      { name: 'To Do', value: stats.pendingTasks }
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/95 border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-xl">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-nexus-electric" />
            <p className="text-sm font-bold text-white">{payload[0].value} <span className="text-zinc-500 font-normal">min</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar space-y-8 animate-fade-in pb-20 pr-2">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
         <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Your Activity</h1>
            <p className="text-zinc-500 text-sm mt-1">Track your progress over time.</p>
         </div>
         <div className="flex bg-zinc-900/40 p-1 rounded-xl border border-white/5 backdrop-blur-md">
            {(['Daily', 'Weekly', 'Monthly', 'Yearly'] as TimeRange[]).map(r => (
                <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${timeRange === r ? 'bg-nexus-electric text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    {r}
                </button>
            ))}
         </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Clock} value={`${stats.totalHours}h`} label="Total Study Time" color="text-nexus-electric" />
          <StatCard icon={Activity} value={`${stats.avgSession}m`} label="Average Session" color="text-nexus-violet" />
          <StatCard icon={Target} value={`${stats.taskEfficiency}%`} label="Tasks Finished" color="text-emerald-400" />
          <StatCard icon={Zap} value={stats.nodesCount} label="Study Sessions" color="text-rose-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-8 rounded-3xl bg-zinc-900/30 border border-white/5 backdrop-blur-xl h-[500px] flex flex-col hover:border-white/10 transition-all group">
            <div className="flex justify-between items-center mb-12">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-nexus-electric" />
                        Study Progress
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">Your learning habits over time</p>
                </div>
            </div>
            
            <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={progressionData}>
                        <defs>
                            <linearGradient id="progressionGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={accentColor} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={accentColor} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} opacity={0.2} />
                        <XAxis 
                            dataKey="label" 
                            stroke="#52525b" 
                            tick={{fill: '#71717a', fontSize: 10, fontWeight: 'bold'}} 
                            axisLine={false} 
                            tickLine={false} 
                            dy={10}
                        />
                        <YAxis 
                            stroke="#52525b" 
                            tick={{fill: '#71717a', fontSize: 10}} 
                            axisLine={false} 
                            tickLine={false} 
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: accentColor, strokeWidth: 1 }} />
                        <Area 
                            type="monotone" 
                            dataKey="minutes" 
                            stroke={accentColor} 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#progressionGradient)" 
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="p-8 rounded-3xl bg-zinc-900/30 border border-white/5 backdrop-blur-xl h-[500px] flex flex-col hover:border-white/10 transition-all">
            <div className="mb-8">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-emerald-400" />
                    Task Progress
                </h3>
                <p className="text-xs text-zinc-500 mt-1">How many tasks you've finished</p>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center relative min-h-[240px]">
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                    <div className="text-center">
                        <div className="text-4xl font-bold text-white tracking-tight">{stats.taskEfficiency}%</div>
                        <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mt-1">Done</div>
                    </div>
                </div>
                <div className="w-full h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={taskDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={75}
                                outerRadius={95}
                                paddingAngle={6}
                                dataKey="value"
                                animationDuration={1000}
                                stroke="none"
                            >
                                {taskDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={TASK_COLORS[index % TASK_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '10px', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="w-full mt-8 space-y-3">
                    <div className="flex justify-between items-center p-3 rounded-xl bg-black/40 border border-white/5">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-nexus-electric shadow-[0_0_8px_rgba(var(--nexus-accent-rgb),0.6)]" />
                            <span className="text-xs font-medium text-zinc-400">Finished</span>
                        </div>
                        <span className="text-xs font-bold text-white">{stats.doneTasks}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-xl bg-black/40 border border-white/5">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-zinc-800" />
                            <span className="text-xs font-medium text-zinc-400">To Do</span>
                        </div>
                        <span className="text-xs font-bold text-white">{stats.pendingTasks}</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="lg:col-span-3 p-8 rounded-3xl bg-zinc-900/30 border border-white/5 backdrop-blur-xl flex flex-col hover:border-white/10 transition-all">
            <div className="mb-10">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Brain className="w-5 h-5 text-rose-400" />
                    Time Spent by Subject
                </h3>
                <p className="text-xs text-zinc-500 mt-1">Breakdown of study time per topic</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {subjectData.length > 0 ? subjectData.map((item, idx) => {
                    const max = Math.max(...subjectData.map(d => d.minutes));
                    const percentage = (item.minutes / max) * 100;
                    return (
                        <div key={item.name} className="space-y-3 group">
                            <div className="flex justify-between items-end">
                                <span className="text-xs font-bold text-white group-hover:text-nexus-electric transition-colors truncate pr-2">{item.name}</span>
                                <span className="text-[10px] font-mono text-zinc-500 whitespace-nowrap">{item.minutes}m</span>
                            </div>
                            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 p-0.5 relative">
                                <div 
                                    className="h-full rounded-full transition-all duration-1000 ease-out" 
                                    style={{ 
                                        width: `${percentage}%`, 
                                        backgroundColor: COLORS[idx % COLORS.length],
                                        boxShadow: `0 0 10px ${COLORS[idx % COLORS.length]}55`
                                    }} 
                                />
                            </div>
                        </div>
                    );
                }) : (
                    <div className="col-span-full py-12 text-center text-zinc-600 italic text-sm">
                        No study time recorded yet. Start a session to see data here.
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, value, label, color }: any) => (
    <div className={`p-6 rounded-2xl border border-white/5 bg-zinc-900/20 backdrop-blur-sm group hover:border-white/10 transition-all hover:bg-zinc-900/40`}>
        <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
                <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-bold leading-tight">{label}</span>
        </div>
        <div className={`text-3xl font-bold text-white tracking-tight group-hover:translate-x-1 transition-transform`}>{value}</div>
    </div>
);
