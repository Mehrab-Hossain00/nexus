import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Calendar, 
  Clock, 
  BrainCircuit, 
  BarChart2, 
  LogOut,
  Menu,
  X,
  Sparkles
} from 'lucide-react';
import { AppView } from '../types';

interface SidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { view: AppView.DASHBOARD, icon: LayoutDashboard, label: 'Dashboard' },
    { view: AppView.TASKS, icon: CheckSquare, label: 'Tasks' },
    { view: AppView.SCHEDULE, icon: Calendar, label: 'Schedule' },
    { view: AppView.FOCUS, icon: Clock, label: 'Focus' },
    { view: AppView.TUTOR, icon: BrainCircuit, label: 'AI Tutor' },
    { view: AppView.ANALYTICS, icon: BarChart2, label: 'Analytics' },
  ];

  const handleNavClick = (view: AppView) => {
    onChangeView(view);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-6 right-6 z-50 p-2 bg-zinc-900/80 backdrop-blur-md rounded-full border border-white/10 text-white shadow-lg active:scale-90 transition-transform"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar Container */}
      <aside 
        className={`
          fixed md:relative z-40 h-full w-72 
          bg-black/40 backdrop-blur-xl border-r border-white/5
          flex flex-col justify-between transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12 group cursor-default">
            {/* Minimalist Logo */}
            <div className="w-10 h-10 bg-black border border-white/10 rounded-xl flex items-center justify-center relative overflow-hidden group-hover:border-white/20 transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]">
               <div className="absolute top-0 right-0 w-3 h-3 bg-indigo-500 blur-[8px] rounded-full opacity-75" />
               <Sparkles className="w-5 h-5 text-white relative z-10 group-hover:scale-110 transition-transform duration-500" />
            </div>
            <div>
              <span className="font-bold text-white text-lg tracking-tight block leading-none group-hover:text-indigo-100 transition-colors">Nexus</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-medium group-hover:text-indigo-400 transition-colors">Study Pro</span>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = currentView === item.view;
              return (
                <button
                  key={item.view}
                  onClick={() => handleNavClick(item.view)}
                  className={`
                    w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden group
                    hover:scale-[1.02] active:scale-[0.98]
                    ${isActive 
                      ? 'bg-gradient-to-r from-indigo-500/10 to-transparent border-l-2 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.1)]' 
                      : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5 border-l-2 border-transparent hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]'}
                  `}
                >
                  <item.icon className={`w-5 h-5 transition-colors duration-300 ${isActive ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'group-hover:text-zinc-300'}`} />
                  <span className={`relative z-10 ${isActive ? 'text-white' : ''}`}>{item.label}</span>
                  
                  {/* Subtle hover accent for non-active items */}
                  {!isActive && <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-8 border-t border-white/5">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-zinc-500 hover:text-rose-400 hover:bg-rose-500/5 transition-all duration-300 group hover:scale-[1.02] active:scale-[0.98]"
          >
            <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};