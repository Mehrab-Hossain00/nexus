
import React, { useEffect, useState } from 'react';
import { UserProfile, AppView, ScheduleEvent, TaskStatus, ActivityLog } from '../types.ts';
import { Zap, Target, BookOpen, Clock, ArrowRight, Play, Sparkles, Calendar, Cloud, CloudOff, AlertTriangle, Activity } from 'lucide-react';
import { dbService } from '../services/dbService.ts';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase.ts';

interface DashboardProps {
  user: UserProfile;
  onViewChange: (view: AppView) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onViewChange }) => {
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const [stats, setStats] = useState({ pending: 0, done: 0, eventsToday: 0, total: 0 });
  const [nextEvent, setNextEvent] = useState<ScheduleEvent | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [dailyProgress, setDailyProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [tasks, schedule, sessions] = await Promise.all([
          dbService.getTasks(user.uid),
          dbService.getSchedule(user.uid),
          dbService.getSessions(user.uid, new Date().toISOString().split('T')[0])
        ]);

        const pending = tasks.filter(t => t.status === TaskStatus.PENDING).length;
        const done = tasks.filter(t => t.status === TaskStatus.DONE).length;
        
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const upcoming = [...schedule]
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
          .find(e => {
            const [h, m] = e.startTime.split(':').map(Number);
            return (h * 60 + m) > currentMinutes;
          });

        const totalStudySeconds = sessions.reduce((acc, s) => acc + s.duration, 0);
        const goal = (user.dailyGoalMinutes || 120) * 60;
        setDailyProgress(Math.min(100, (totalStudySeconds / goal) * 100));

        setStats({ pending, done, eventsToday: schedule.length, total: tasks.length });
        setNextEvent(upcoming || null);
      } catch (error) {
        console.error(error);
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
  }, [user.uid, user.dailyGoalMinutes]);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar space-y-8 animate-fade-in pb-10 pr-2">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            {currentDate}
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            Hello, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-rose-400">{user.name.split(' ')[0]}</span>.
          </h1>
        </div>
      </header>

      <div className="p-6 rounded-3xl bg-zinc-900/30 border border-white/5 backdrop-blur-xl">
        <div className="flex justify-between items-center mb-4">
           <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Today's Progress Goal</h3>
           <span className="text-indigo-400 font-mono font-bold">{Math.round(dailyProgress)}%</span>
        </div>
        <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 p-0.5">
           <div 
             className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(99,102,241,0.5)]" 
             style={{ width: `${dailyProgress}%` }} 
           />
        </div>
        <p className="text-zinc-500 text-[10px] mt-4 uppercase font-medium">Keep going to reach your {user.dailyGoalMinutes || 120} minute goal.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <KPICard icon={Calendar} value={loading ? "-" : stats.eventsToday.toString()} label="Events Today" color="text-amber-400" />
        <KPICard icon={BookOpen} value={loading ? "-" : stats.done.toString()} label="Tasks Finished" color="text-emerald-400" />
        <KPICard icon={Target} value={loading ? "-" : stats.pending.toString()} label="Pending Tasks" color="text-rose-400" />
        <KPICard icon={Clock} value={loading ? "-" : stats.total.toString()} label="Total Tasks" color="text-indigo-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 relative group rounded-3xl overflow-hidden border border-white/10 bg-zinc-900/30 backdrop-blur-xl flex flex-col justify-center min-h-[300px] p-8 md:p-10">
          {nextEvent ? (
            <div className="space-y-6">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-widest rounded-full mb-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Up Next
                  </span>
                  <h2 className="text-3xl font-bold text-white tracking-tight">{nextEvent.title}</h2>
                  <p className="text-zinc-400 font-medium">{nextEvent.subject || 'General'}</p>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => onViewChange(AppView.FOCUS)} className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-xl active:scale-95 shadow-lg">
                    <Play className="w-4 h-4 fill-black" />
                    Start Studying
                  </button>
                </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <Calendar className="w-12 h-12 text-zinc-700" />
              <h2 className="text-2xl font-bold text-white">No upcoming events</h2>
            </div>
          )}
        </div>

        <div className="space-y-6">
           <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest pl-1 flex items-center gap-2">
             <Activity className="w-3 h-3" /> Recent Activity
           </h3>
           <div className="space-y-3">
             {activities.map(act => (
                <div key={act.id} className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5 flex gap-4 animate-slide-up">
                   <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center border border-white/5 shrink-0">
                      <Zap className={`w-4 h-4 ${act.type.includes('session') ? 'text-emerald-400' : 'text-indigo-400'}`} />
                   </div>
                   <div className="min-w-0">
                      <p className="text-xs text-white font-medium truncate"><span className="text-indigo-400">{act.userName}</span> {act.type.replace('_', ' ')}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{act.subject || 'Activity'}</p>
                   </div>
                </div>
             ))}
             {activities.length === 0 && <p className="text-zinc-600 text-xs italic text-center py-10">Nothing to show yet.</p>}
           </div>
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ icon: Icon, value, label, color }: any) => (
  <div className="p-6 rounded-3xl bg-zinc-900/30 border border-white/5 transition-all hover:scale-[1.02] hover:bg-zinc-900/50">
    <div className="w-12 h-12 rounded-2xl bg-zinc-900/80 border border-white/5 flex items-center justify-center mb-6 shadow-inner">
      <Icon className={`w-6 h-6 ${color}`} />
    </div>
    <div className="text-3xl font-bold text-white mb-1 tracking-tight">{value}</div>
    <div className="text-zinc-500 text-sm font-medium">{label}</div>
  </div>
);
