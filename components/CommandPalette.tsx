import React, { useState, useEffect } from 'react';
import { Search, LayoutDashboard, CheckSquare, Calendar, Clock, BrainCircuit, BarChart2, Settings, X, ArrowRight, Zap, Share2 } from 'lucide-react';
import { AppView } from '../types.ts';

interface CommandPaletteProps {
  onClose: () => void;
  onNavigate: (view: AppView) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ onClose, onNavigate }) => {
  const [query, setQuery] = useState('');

  const commands = [
    { view: AppView.DASHBOARD, icon: LayoutDashboard, label: 'Home', keywords: 'home dashboard main' },
    { view: AppView.TASKS, icon: CheckSquare, label: 'Tasks', keywords: 'todo homework assignment' },
    { view: AppView.SCHEDULE, icon: Calendar, label: 'Schedule', keywords: 'calendar schedule plan' },
    { view: AppView.TIMER, icon: Clock, label: 'Timer', keywords: 'pomodoro stopwatch timer session focus' },
    { view: AppView.HUB, icon: Share2, label: 'Social', keywords: 'social groups chat feed status' },
    { view: AppView.TUTOR, icon: BrainCircuit, label: 'AI Help', keywords: 'ai tutor gpt chat help' },
    { view: AppView.ANALYTICS, icon: BarChart2, label: 'Stats', keywords: 'stats graphs performance analytics' },
    { view: AppView.SETTINGS, icon: Settings, label: 'Settings', keywords: 'settings profile config theme' },
  ];

  const filtered = commands.filter(c => 
    c.label.toLowerCase().includes(query.toLowerCase()) || 
    c.keywords.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 animate-fade-in">
      <div className="absolute inset-0 bg-nexus-black/70 backdrop-blur-md" onClick={onClose} />
      
      <div className="w-full max-w-xl bg-nexus-card border border-white/10 rounded-3xl shadow-2xl relative z-10 overflow-hidden ring-1 ring-white/5 animate-slide-up">
        <div className="relative border-b border-white/5">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-nexus-slate" />
          <input 
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Where do you want to go?"
            className="w-full bg-transparent border-none px-16 py-6 text-white placeholder-nexus-slate focus:outline-none text-xl font-medium"
          />
          <button onClick={onClose} className="absolute right-6 top-1/2 -translate-y-1/2 p-2 hover:bg-white/5 rounded-xl text-nexus-slate transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-3 bg-nexus-black/40">
           <div className="px-4 py-3 text-[10px] font-black text-nexus-slate uppercase tracking-[0.3em]">Navigation</div>
           <div className="space-y-1">
             {filtered.map((cmd) => (
               <button
                 key={cmd.view}
                 onClick={() => onNavigate(cmd.view)}
                 className="w-full flex items-center justify-between p-4 rounded-2xl text-left hover:bg-nexus-electric/10 group transition-all border border-transparent hover:border-nexus-electric/20"
               >
                 <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl bg-nexus-black border border-white/5 flex items-center justify-center group-hover:bg-nexus-electric group-hover:text-white transition-all shadow-inner">
                       <cmd.icon className="w-6 h-6" />
                    </div>
                    <div>
                       <div className="text-white font-black text-lg group-hover:text-nexus-electric transition-colors leading-tight">{cmd.label}</div>
                       <div className="text-[10px] text-nexus-slate uppercase tracking-widest font-black mt-1">Section</div>
                    </div>
                 </div>
                 <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
                    <ArrowRight className="w-5 h-5 text-nexus-electric" />
                 </div>
               </button>
             ))}
             {filtered.length === 0 && (
               <div className="py-16 flex flex-col items-center justify-center text-center opacity-40">
                  <Zap className="w-12 h-12 mb-4 text-nexus-slate" />
                  <p className="text-white font-bold text-lg">No results found.</p>
               </div>
             )}
           </div>
        </div>

        <div className="p-5 bg-nexus-black/80 border-t border-white/5 flex items-center justify-between">
           <div className="flex gap-6">
              <div className="flex items-center gap-2">
                 <kbd className="text-[10px] font-black text-white bg-white/10 px-2 py-1 rounded-lg border border-white/10">ESC</kbd>
                 <span className="text-[9px] font-black text-nexus-slate uppercase tracking-widest">Close</span>
              </div>
           </div>
           <div className="text-[9px] font-black text-nexus-electric uppercase tracking-[0.3em]">Nexus Pro</div>
        </div>
      </div>
    </div>
  );
};
