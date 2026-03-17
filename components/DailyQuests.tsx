
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Target, Check, Zap, RefreshCw, Clock, Calendar, Sparkles } from 'lucide-react';
import { UserProfile, DailyQuest } from '../types.ts';
import { dbService } from '../services/dbService.ts';

interface DailyQuestsProps {
  user: UserProfile;
  onUpdateQuest: (type: 'study_time' | 'tasks_done' | 'pomodoro_count', amount: number) => void;
  onRefresh?: () => void;
}

export const DailyQuests: React.FC<DailyQuestsProps> = ({ user, onUpdateQuest, onRefresh }) => {
  const [quests, setQuests] = useState<DailyQuest[]>(user.dailyQuests || []);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  useEffect(() => {
    if (user.dailyQuests) {
      setQuests(user.dailyQuests);
    }
  }, [user.dailyQuests]);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar space-y-8 animate-fade-in pb-20 pr-2">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Daily Protocols</h1>
          <p className="text-zinc-500 text-sm mt-1">Complete daily objectives to maximize your cognitive output.</p>
        </div>
        <div className="flex items-center gap-4">
          {onRefresh && (
            <button 
              onClick={onRefresh}
              className="p-2.5 bg-nexus-card/50 border border-nexus-border rounded-xl hover:bg-nexus-card hover:text-nexus-electric transition-all backdrop-blur-md shadow-sm"
              title="Refresh Quests"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <div className="bg-nexus-electric/10 border border-nexus-electric/20 px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm">
             <Calendar className="w-4 h-4 text-nexus-electric" />
             <span className="text-xs font-bold text-white uppercase tracking-widest">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </header>

      {quests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-50">
          <Target className="w-16 h-16 text-zinc-600 mb-4" />
          <p className="text-zinc-500 font-bold uppercase tracking-widest">No Active Protocols</p>
          <p className="text-zinc-600 text-sm mt-2">Check back later for new assignments.</p>
          {onRefresh && (
            <button 
              onClick={onRefresh}
              className="mt-6 px-6 py-2.5 bg-nexus-electric/10 text-nexus-electric border border-nexus-electric/20 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-nexus-electric/20 transition-all shadow-sm"
            >
              Initialize New Protocols
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
        {quests.map((quest) => (
          <motion.div
            key={quest.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01 }}
            className={`p-6 rounded-3xl border backdrop-blur-md relative overflow-hidden group transition-all shadow-sm ${quest.completed ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-nexus-card/60 border-nexus-border hover:bg-nexus-card hover:border-nexus-electric/30 hover:shadow-[0_10px_30px_-10px_rgba(var(--nexus-accent-rgb),0.2)]'}`}
          >
            {quest.completed && (
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full -mr-20 -mt-20 pointer-events-none" />
            )}
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shrink-0 shadow-sm ${quest.completed ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-nexus-black/50 border-nexus-border text-nexus-electric group-hover:border-nexus-electric/30 transition-colors'}`}>
                  {quest.type === 'study_time' && <Clock className="w-6 h-6" />}
                  {quest.type === 'tasks_done' && <Check className="w-6 h-6" />}
                  {quest.type === 'pomodoro_count' && <Target className="w-6 h-6" />}
                </div>
                
                <div>
                  <h3 className={`text-lg font-bold tracking-tight ${quest.completed ? 'text-emerald-400' : 'text-white group-hover:text-nexus-electric transition-colors'}`}>{quest.title}</h3>
                  <p className="text-sm text-zinc-400 mt-1">{quest.description}</p>
                  
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center gap-1.5 bg-nexus-black/40 px-2.5 py-1 rounded-lg border border-nexus-border group-hover:border-white/10 transition-colors">
                      <Zap className="w-3 h-3 text-nexus-electric fill-nexus-electric" />
                      <span className="text-[10px] font-bold text-zinc-300">+{quest.rewardXp} XP</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-nexus-black/40 px-2.5 py-1 rounded-lg border border-nexus-border group-hover:border-white/10 transition-colors">
                      <Sparkles className="w-3 h-3 text-nexus-violet fill-nexus-violet" />
                      <span className="text-[10px] font-bold text-zinc-300">+{quest.rewardCredits} Credits</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 min-w-[200px]">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                  <span className={quest.completed ? 'text-emerald-400' : 'text-zinc-500'}>Progress</span>
                  <span className={quest.completed ? 'text-emerald-400' : 'text-white'}>{quest.current} / {quest.target}</span>
                </div>
                <div className="h-2.5 w-full bg-nexus-black/60 rounded-full overflow-hidden border border-nexus-border">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (quest.current / quest.target) * 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full ${quest.completed ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-nexus-electric shadow-[0_0_15px_rgba(var(--nexus-accent-rgb),0.5)]'}`}
                  />
                </div>
                {quest.completed && (
                  <div className="flex items-center gap-2 justify-end mt-1 text-emerald-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
                    <Check className="w-3 h-3" /> Completed
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      )}
    </div>
  );
};
