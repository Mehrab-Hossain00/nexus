import React, { useEffect, useState } from 'react';
import { UserProfile, AppView, ScheduleEvent, TaskStatus, ActivityLog } from '../types.ts';
import { Zap, Target, BookOpen, Clock, ArrowRight, Play, Sparkles, Calendar, Activity, TrendingUp, Flame, Trophy, Brain, Check } from 'lucide-react';
import { dbService } from '../services/dbService.ts';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase.ts';

interface DashboardProps {
  user: UserProfile;
  onViewChange: (view: AppView) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onViewChange }) => {
  const [stats, setStats] = useState({ pending: 0, done: 0, eventsToday: 0, total: 0 });
  const [nextEvent, setNextEvent] = useState<ScheduleEvent | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [dailyProgress, setDailyProgress] = useState(0);
  const [focusPulse, setFocusPulse] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        
        const [tasks, schedule, allSessions] = await Promise.all([
          dbService.getTasks(user.uid),
          dbService.getSchedule(user.uid),
          dbService.getSessions(user.uid) 
        ]);

        const pending = tasks.filter(t => t.status === TaskStatus.PENDING).length;
        const done = tasks.filter(t => t.status === TaskStatus.DONE).length;
        
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const todayEvents = schedule.filter(e => (e.date || todayStr) === todayStr);
        const upcoming = [...todayEvents]
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
          .find(e => {
            const [h, m] = e.startTime.split(':').map(Number);
            return (h * 60 + m) > currentMinutes;
          });

        const todaySessions = allSessions.filter(s => s.date === todayStr);
        const todayStudySeconds = todaySessions.reduce((acc, s) => acc + s.duration, 0);
        const dailyGoalSecs = (user.dailyGoalMinutes || 120) * 60;
        setDailyProgress(Math.min(100, (todayStudySeconds / dailyGoalSecs) * 100));

        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const last7DaysSessions = allSessions.filter(s => s.timestamp >= sevenDaysAgo);

        const totalActualMins = last7DaysSessions.reduce((acc, s) => acc + s.duration, 0) / 60;
        const totalGoalMins = (user.dailyGoalMinutes || 120) * 7;
        const volumeScore = Math.min(1, totalActualMins / totalGoalMins);

        const uniqueDaysStudied = new Set(last7DaysSessions.map(s => s.date)).size;
        const rhythmScore = uniqueDaysStudied / 7;

        const momentumScore = Math.min(1, (user.streak || 0) / 7);

        const calculatedPulse = Math.round(
          (volumeScore * 0.4 + rhythmScore * 0.4 + momentumScore * 0.2) * 100
        );

        setFocusPulse(calculatedPulse);
        setStats({ pending, done, eventsToday: todayEvents.length, total: tasks.length });
        setNextEvent(upcoming || null);
      } catch (error) {
        console.error("Dashboard Load Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const actQuery = query(collection(db, 'activities'), orderBy('timestamp', 'desc'), limit(5));
    const unsubActs = onSnapshot(actQuery, (snap) => {
       setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLog)));
    });

    return () => unsubActs();
  }, [user.uid, user.dailyGoalMinutes, user.streak]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar animate-fade-in pb-20 px-1">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            {greeting()}, <span className="text-nexus-electric font-black">{user.name.split(' ')[0]}</span>
          </h1>
          <p className="text-nexus-slate text-sm font-medium mt-1">Welcome back to your high-performance workspace.</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="glass px-4 py-2 rounded-xl flex items-center gap-2 border-white/10">
                <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                <span className="text-sm font-bold text-white">{user.streak || 0} Day Streak</span>
            </div>
            <div className="glass px-4 py-2 rounded-xl flex items-center gap-2 border-white/10">
                <Trophy className="w-4 h-4 text-nexus-violet" />
                <span className="text-sm font-bold text-white">{user.xp || 0} XP</span>
            </div>
        </div>
      </header>

      <div className="bento-grid grid-rows-6 h-[1400px] md:h-[900px]">
        
        {/* Main Progress Bento Card */}
        <div className="col-span-12 md:col-span-8 row-span-3 glass-card rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-nexus-electric/10 blur-[100px] rounded-full -mr-20 -mt-20 group-hover:bg-nexus-electric/20 transition-all duration-700" />
          
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-10 md:mb-12">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-nexus-slate">Primary Focus</span>
                <h3 className="text-2xl md:text-3xl font-bold text-white mt-1">Daily Flow Objective</h3>
              </div>
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl glass flex items-center justify-center border-nexus-electric/20 shadow-[0_0_25px_rgba(var(--nexus-accent-rgb),0.1)] shrink-0">
                <Target className="w-6 h-6 md:w-7 md:h-7 text-nexus-electric" />
              </div>
            </div>
            
            <div className="space-y-6 md:space-y-8">
              <div className="flex justify-between items-end">
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl md:text-7xl font-black tracking-tighter text-white">{Math.round(dailyProgress)}</span>
                  <span className="text-2xl md:text-3xl font-bold text-nexus-slate">%</span>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-bold text-nexus-slate uppercase tracking-widest mb-1">XP Potential</p>
                   <p className="text-xl md:text-2xl font-bold text-white">+{Math.floor(dailyProgress * 5)} <span className="text-nexus-electric">pts</span></p>
                </div>
              </div>
              
              <div className="h-4 md:h-5 w-full bg-white/5 rounded-full overflow-hidden p-1 border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-nexus-violet to-nexus-electric rounded-full transition-all duration-1000 shadow-[0_0_25px_rgba(var(--nexus-accent-rgb),0.5)]"
                  style={{ width: `${dailyProgress}%` }}
                />
              </div>
              <p className="text-xs md:text-sm text-nexus-slate max-w-md leading-relaxed">Maintain your current pace to unlock a <span className="text-white font-bold">2x multiplier</span> for your next study session.</p>
            </div>
          </div>
          
          <div className="relative z-10 flex flex-wrap gap-3 mt-6">
            <button 
              // Fix: AppView.FOCUS does not exist. Use AppView.TIMER to initiate focus.
              onClick={() => onViewChange(AppView.TIMER)} 
              className="px-6 py-3 bg-white text-black text-sm font-black rounded-xl md:rounded-2xl flex items-center gap-2 active:scale-95 transition-all shadow-xl hover:bg-zinc-100"
            >
              <Play className="w-4 h-4 fill-black" />
              Initiate Focus
            </button>
            <button 
              onClick={() => onViewChange(AppView.ANALYTICS)} 
              className="px-6 py-3 glass text-white text-sm font-black rounded-xl md:rounded-2xl glass-card active:scale-95 transition-all"
            >
              Performance Metrics
            </button>
          </div>
        </div>

        {/* Course Card Bento */}
        <div className="col-span-12 md:col-span-4 row-span-2 glass-card rounded-[2.5rem] p-8 group flex flex-col justify-between relative overflow-hidden">
           <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-nexus-violet/5 blur-[60px] rounded-full group-hover:bg-nexus-violet/15 transition-all" />
           <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                 <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-nexus-violet">Next Academic Node</span>
                 <BookOpen className="w-5 h-5 text-nexus-slate group-hover:text-nexus-violet transition-colors" />
              </div>
              {nextEvent ? (
                <>
                  <h4 className="text-2xl font-black text-white truncate leading-tight">{nextEvent.title}</h4>
                  <p className="text-sm text-nexus-slate font-medium mt-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> {nextEvent.startTime} • {nextEvent.subject}
                  </p>
                </>
              ) : (
                <p className="text-sm text-nexus-slate italic">All nodes synchronized.</p>
              )}
           </div>
           <button onClick={() => onViewChange(AppView.SCHEDULE)} className="mt-8 flex items-center gap-2 text-xs font-black text-white group-hover:gap-4 transition-all uppercase tracking-[0.2em] relative z-10">
              Access Schedule <ArrowRight className="w-4 h-4 text-nexus-electric" />
           </button>
        </div>

        {/* Stats Bento - Activity */}
        <div className="col-span-12 md:col-span-4 row-span-4 glass-card rounded-[2.5rem] p-8 flex flex-col">
           <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-black text-white flex items-center gap-3">
                 <Activity className="w-5 h-5 text-nexus-electric" />
                 Activity Stream
              </h3>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
           </div>
           <div className="flex-1 space-y-4 overflow-hidden">
             {activities.map((act, i) => (
               <div key={act.id} className="flex items-center gap-4 p-4 glass rounded-3xl hover:bg-white/5 transition-all border-white/5 group" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="w-10 h-10 rounded-xl bg-nexus-black border border-white/5 flex items-center justify-center group-hover:border-nexus-electric transition-all">
                     <Brain className="w-5 h-5 text-nexus-violet" />
                  </div>
                  <div className="flex-1 min-w-0">
                     <p className="text-sm text-white font-bold truncate group-hover:text-nexus-electric transition-colors">{act.userName}</p>
                     <p className="text-[10px] text-nexus-slate font-black uppercase tracking-widest mt-0.5">{act.type.replace('_', ' ')} • {act.subject || 'Core'}</p>
                  </div>
               </div>
             ))}
           </div>
        </div>

        {/* Small Analytics Bento cards */}
        <div className="col-span-12 md:col-span-4 row-span-1 glass-card rounded-[2.5rem] p-6 flex items-center justify-between group text-left">
           <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-nexus-slate">Completion Index</p>
              <p className="text-3xl font-black text-white mt-1">{stats.done}<span className="text-nexus-slate text-sm ml-1">/{stats.total}</span></p>
           </div>
           <div className="w-12 h-12 rounded-2xl glass flex items-center justify-center border-nexus-electric/20 group-hover:scale-110 transition-transform">
              <Check className="w-6 h-6 text-nexus-electric" />
           </div>
        </div>

        <div className="col-span-12 md:col-span-4 row-span-1 glass-card rounded-[2.5rem] p-6 flex items-center justify-between group text-left">
           <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-nexus-slate">Focus Pulse</p>
              <p className="text-3xl font-black text-white mt-1">{focusPulse}<span className="text-nexus-slate text-sm ml-1">%</span></p>
           </div>
           <div className="w-12 h-12 rounded-2xl glass flex items-center justify-center border-nexus-violet/20 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6 text-nexus-violet" />
           </div>
        </div>

      </div>
    </div>
  );
};
