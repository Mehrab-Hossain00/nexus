import React, { useEffect, useState } from 'react';
import { UserProfile, AppView, ScheduleEvent, TaskStatus } from '../types';
import { Zap, Target, BookOpen, Clock, ArrowRight, Play, Sparkles, Calendar } from 'lucide-react';
import { dbService } from '../services/dbService';

interface DashboardProps {
  user: UserProfile;
  onViewChange: (view: AppView) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onViewChange }) => {
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const [stats, setStats] = useState({ pending: 0, done: 0, eventsToday: 0, total: 0 });
  const [nextEvent, setNextEvent] = useState<ScheduleEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tasks, schedule] = await Promise.all([
          dbService.getTasks(user.uid),
          dbService.getSchedule(user.uid)
        ]);

        const pending = tasks.filter(t => t.status === TaskStatus.PENDING).length;
        const done = tasks.filter(t => t.status === TaskStatus.DONE).length;
        
        // Find next event based on current time
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        
        // Sort schedule by time just in case
        const sortedSchedule = [...schedule].sort((a, b) => a.startTime.localeCompare(b.startTime));
        
        const upcoming = sortedSchedule.find(e => {
            const [h, m] = e.startTime.split(':').map(Number);
            return (h * 60 + m) > currentMinutes;
        });

        setStats({
          pending,
          done,
          eventsToday: schedule.length,
          total: tasks.length
        });
        setNextEvent(upcoming || null);
      } catch (error) {
        console.error("Dashboard data load failed", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user.uid]);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar space-y-10 animate-fade-in pb-10 pr-2">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            {currentDate}
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
            Hello, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-rose-400 animate-pulse-slow">{user.name.split(' ')[0]}</span>.
          </h1>
        </div>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <KPICard 
          icon={Calendar} 
          value={loading ? "-" : stats.eventsToday.toString()} 
          label="Events Today" 
          color="text-amber-400" 
          borderColor="border-amber-500" 
          gradient="from-amber-500/20 to-transparent" 
        />
        <KPICard 
          icon={BookOpen} 
          value={loading ? "-" : stats.done.toString()} 
          label="Tasks Completed" 
          color="text-emerald-400" 
          borderColor="border-emerald-500" 
          gradient="from-emerald-500/20 to-transparent" 
        />
        <KPICard 
          icon={Target} 
          value={loading ? "-" : stats.pending.toString()} 
          label="Pending Items" 
          color="text-rose-400" 
          borderColor="border-rose-500" 
          gradient="from-rose-500/20 to-transparent" 
        />
        <KPICard 
          icon={Clock} 
          value={loading ? "-" : stats.total.toString()} 
          label="Total Tasks" 
          color="text-indigo-400" 
          borderColor="border-indigo-500" 
          gradient="from-indigo-500/20 to-transparent" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Up Next Hero */}
        <div className="lg:col-span-2 relative group rounded-3xl overflow-hidden border border-white/10 bg-zinc-900/30 backdrop-blur-xl transition-all duration-500 hover:border-indigo-500/30 hover:shadow-[0_0_30px_rgba(79,70,229,0.15)] hover:scale-[1.005]">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-zinc-900/0 to-purple-600/10 opacity-50 group-hover:opacity-100 transition-duration-700" />
          
          <div className="p-8 md:p-10 relative z-10 flex flex-col h-full justify-between min-h-[300px]">
            {nextEvent ? (
                <>
                    <div className="flex justify-between items-start">
                    <div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-widest rounded-full mb-4 backdrop-blur-md shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Up Next
                        </span>
                        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">{nextEvent.title}</h2>
                        <p className="text-zinc-400 font-medium">{nextEvent.subject || 'General'}</p>
                    </div>
                    <div className="text-right hidden sm:block">
                        <div className="text-4xl font-mono font-bold text-white tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500">
                            {nextEvent.startTime}
                        </div>
                        <div className="text-zinc-500 text-sm font-medium mt-1">Today</div>
                    </div>
                    </div>
                    
                    <div>
                        <p className="text-zinc-500 text-sm mb-8 max-w-lg line-clamp-2">
                            {nextEvent.description || "Get ready for your next session."}
                        </p>
                        <div className="flex flex-wrap gap-4">
                        <button 
                            onClick={() => onViewChange(AppView.FOCUS)}
                            className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-indigo-50 transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(99,102,241,0.4)]"
                        >
                            <Play className="w-4 h-4 fill-black" />
                            Start Session
                        </button>
                        <button 
                            onClick={() => onViewChange(AppView.SCHEDULE)}
                            className="flex items-center gap-2 px-6 py-3 bg-black/40 text-white font-medium rounded-xl border border-white/10 hover:bg-white/5 hover:border-white/20 transition-all backdrop-blur-md hover:scale-[1.02] active:scale-[0.98]"
                        >
                            View Details
                        </button>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-500">
                        <Calendar className="w-8 h-8 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">No upcoming events</h2>
                    <p className="text-zinc-500 max-w-xs">Your schedule is clear for the rest of the day. Time to relax or get ahead.</p>
                    <button 
                        onClick={() => onViewChange(AppView.SCHEDULE)}
                        className="mt-4 px-6 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 hover:border-white/30 transition-all text-sm font-medium hover:scale-105 active:scale-95"
                    >
                        Plan Schedule
                    </button>
                </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
           <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest pl-1">Quick Actions</h3>
           <div className="grid gap-3">
             <QuickAction 
              label="Ask AI Tutor" 
              desc="Get help with a concept" 
              icon={Sparkles}
              color="group-hover:text-indigo-400 group-hover:border-indigo-500/30 group-hover:shadow-indigo-500/20"
              onClick={() => onViewChange(AppView.TUTOR)}
            />
             <QuickAction 
              label="Add New Task" 
              desc="Capture an assignment" 
              icon={Target}
              color="group-hover:text-rose-400 group-hover:border-rose-500/30 group-hover:shadow-rose-500/20"
              onClick={() => onViewChange(AppView.TASKS)}
            />
             <QuickAction 
              label="Plan My Day" 
              desc="Generate schedule" 
              icon={Clock}
              color="group-hover:text-emerald-400 group-hover:border-emerald-500/30 group-hover:shadow-emerald-500/20"
              onClick={() => onViewChange(AppView.SCHEDULE)}
            />
           </div>
           
           <div className="p-6 rounded-3xl bg-gradient-to-b from-zinc-900/50 to-black border border-white/5 backdrop-blur-md mt-4 relative overflow-hidden group hover:border-indigo-500/20 transition-colors hover:shadow-[0_0_30px_rgba(99,102,241,0.1)]">
             <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/10 blur-2xl rounded-full group-hover:bg-indigo-500/20 transition-colors duration-500" />
             <div className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-4">Daily Inspiration</div>
             <p className="text-white font-serif italic text-lg leading-relaxed relative z-10">"The beautiful thing about learning is that no one can take it away from you."</p>
             <p className="text-zinc-500 text-xs mt-3">— B.B. King</p>
           </div>
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ icon: Icon, value, label, color, borderColor, gradient }: any) => (
  <div className={`
    p-6 rounded-3xl bg-zinc-900/30 backdrop-blur-md border border-white/5 border-t-4 ${borderColor}
    transition-all duration-300 group relative overflow-hidden shadow-lg
    hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]
  `}>
    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} blur-3xl rounded-full opacity-20 -mr-10 -mt-10 pointer-events-none group-hover:opacity-40 transition-opacity duration-500`} />
    
    <div className={`w-12 h-12 rounded-2xl bg-zinc-900/80 border border-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg relative z-10`}>
      <Icon className={`w-6 h-6 ${color}`} />
    </div>
    <div className="text-3xl font-bold text-white mb-1 tracking-tight">{value}</div>
    <div className="text-zinc-500 text-sm font-medium">{label}</div>
  </div>
);

const QuickAction = ({ label, desc, onClick, icon: Icon, color }: any) => (
  <button 
    onClick={onClick}
    className={`w-full p-4 rounded-2xl bg-zinc-900/30 border border-white/5 hover:bg-zinc-900/60 transition-all text-left group flex items-center gap-4 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] ${color}`}
  >
    <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center border border-white/5 group-hover:border-current transition-colors">
        <Icon className="w-5 h-5 text-zinc-400 group-hover:text-current transition-colors" />
    </div>
    <div className="flex-1">
      <div className="text-white font-semibold text-sm group-hover:text-white transition-colors">{label}</div>
      <div className="text-zinc-600 text-xs group-hover:text-zinc-500">{desc}</div>
    </div>
    <ArrowRight className="w-4 h-4 text-zinc-700 group-hover:text-white group-hover:translate-x-1 transition-all" />
  </button>
);