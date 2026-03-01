
import React from 'react';
import { motion } from 'motion/react';
import { Award, Lock, Check, Star, Zap, Target, BookOpen, Flame } from 'lucide-react';
import { UserProfile, Achievement } from '../types.ts';

interface AchievementsProps {
  user: UserProfile;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'a1', title: 'Novice Scholar', description: 'Complete your first study session', icon: 'BookOpen', requirement: 1, type: 'sessions' },
  { id: 'a2', title: 'Deep Diver', description: 'Complete 10 study sessions', icon: 'Zap', requirement: 10, type: 'sessions' },
  { id: 'a3', title: 'Task Ninja', description: 'Finish 20 tasks', icon: 'Target', requirement: 20, type: 'tasks' },
  { id: 'a4', title: 'Unstoppable', description: 'Reach a 7-day streak', icon: 'Flame', requirement: 7, type: 'streak' },
  { id: 'a5', title: 'Nexus Sage', description: 'Reach Level 10', icon: 'Award', requirement: 10, type: 'level' },
];

export const Achievements: React.FC<AchievementsProps> = ({ user }) => {
  const getIcon = (iconName: string, isUnlocked: boolean) => {
    const props = { className: `w-8 h-8 ${isUnlocked ? 'text-nexus-electric' : 'text-zinc-600'}` };
    switch (iconName) {
      case 'BookOpen': return <BookOpen {...props} />;
      case 'Zap': return <Zap {...props} />;
      case 'Target': return <Target {...props} />;
      case 'Flame': return <Flame {...props} />;
      case 'Award': return <Award {...props} />;
      default: return <Star {...props} />;
    }
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar space-y-8 animate-fade-in pb-20 pr-2">
      <header>
        <h1 className="text-3xl font-bold text-white tracking-tight">Hall of Achievements</h1>
        <p className="text-zinc-500 text-sm mt-1">Your journey through the Nexus, immortalized in badges.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {ACHIEVEMENTS.map((ach) => {
          const isUnlocked = (user.badges || []).includes(ach.id);
          
          return (
            <motion.div
              key={ach.id}
              whileHover={{ scale: 1.02 }}
              className={`p-8 rounded-[2.5rem] border backdrop-blur-xl flex flex-col items-center text-center relative overflow-hidden transition-all ${isUnlocked ? 'bg-nexus-electric/5 border-nexus-electric/20 shadow-[0_0_40px_rgba(124,58,237,0.1)]' : 'bg-zinc-900/20 border-white/5 opacity-60'}`}
            >
              <div className="w-20 h-20 rounded-3xl bg-black border border-white/5 flex items-center justify-center mb-6 relative">
                {getIcon(ach.icon, isUnlocked)}
                {!isUnlocked && <Lock className="absolute -top-2 -right-2 w-6 h-6 text-zinc-700 bg-black rounded-full p-1 border border-white/10" />}
                {isUnlocked && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="absolute inset-0 bg-nexus-electric/20 rounded-3xl blur-xl"
                  />
                )}
              </div>

              <h3 className={`text-lg font-black ${isUnlocked ? 'text-white' : 'text-zinc-500'}`}>{ach.title}</h3>
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed">{ach.description}</p>

              {isUnlocked && (
                <div className="mt-6 flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                  <Check className="w-3 h-3" /> Unlocked
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
