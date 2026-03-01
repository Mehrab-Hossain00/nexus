
import React, { useState, useEffect } from 'react';
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
  Sparkles,
  Settings,
  Share2,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Award,
  Users
} from 'lucide-react';
import { AppView, UserProfile } from '../types.ts';

interface SidebarProps {
  user: UserProfile;
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  onLogout: () => void;
  activeTimerMins?: number | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, currentView, onChangeView, onLogout, activeTimerMins }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('nexus_sidebar_collapsed') === 'true');

  useEffect(() => {
    localStorage.setItem('nexus_sidebar_collapsed', isCollapsed.toString());
  }, [isCollapsed]);

  const navItems = [
    { view: AppView.DASHBOARD, icon: LayoutDashboard, label: 'Home' },
    { view: AppView.TASKS, icon: CheckSquare, label: 'Tasks' },
    { view: AppView.SCHEDULE, icon: Calendar, label: 'Schedule' },
    { view: AppView.TIMER, icon: Clock, label: 'Timer' },
    { view: AppView.HUB, icon: Users, label: 'Groups' },
    { view: AppView.SHOP, icon: ShoppingBag, label: 'Shop' },
    { view: AppView.ACHIEVEMENTS, icon: Award, label: 'Badges' },
    { view: AppView.TUTOR, icon: BrainCircuit, label: 'AI Help' },
    { view: AppView.ANALYTICS, icon: BarChart2, label: 'Stats' },
    { view: AppView.SETTINGS, icon: Settings, label: 'Settings' },
  ];

  const handleNavClick = (view: AppView) => {
    onChangeView(view);
    setIsOpen(false);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-6 right-6 z-50 p-2 bg-zinc-900/80 backdrop-blur-md rounded-full border border-white/10 text-white shadow-lg active:scale-90 transition-transform"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <aside 
        className={`
          fixed md:relative z-40 h-full
          bg-black/40 backdrop-blur-xl border-r border-white/5
          flex flex-col justify-between transition-all duration-500 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${isCollapsed ? 'w-24' : 'w-72'}
        `}
      >
        <div className={`p-8 flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center ${isCollapsed ? 'px-4' : 'px-8'}`}>
          <div className={`flex items-center gap-3 mb-12 group cursor-pointer w-full ${isCollapsed ? 'justify-center' : ''}`} onClick={() => setIsCollapsed(!isCollapsed)}>
            <div className="w-10 h-10 shrink-0 bg-black border border-white/10 rounded-xl flex items-center justify-center relative overflow-hidden group-hover:border-nexus-electric transition-all duration-300">
               <div className="absolute top-0 right-0 w-3 h-3 bg-nexus-electric blur-[8px] rounded-full opacity-75" />
               <Sparkles className="w-5 h-5 text-white relative z-10" />
            </div>
            {!isCollapsed && (
              <div className="animate-fade-in whitespace-nowrap">
                <span className="font-bold text-white text-lg tracking-tight block leading-none">Nexus</span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-medium">Study Pro</span>
              </div>
            )}
            {!isCollapsed && <ChevronLeft className="w-4 h-4 text-zinc-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />}
          </div>

          <nav className="space-y-2 w-full">
            {navItems.map((item) => {
              const isActive = currentView === item.view;
              const hasTimer = item.view === AppView.TIMER && activeTimerMins !== null;
              
              return (
                <button
                  key={item.view}
                  onClick={() => handleNavClick(item.view)}
                  className={`
                    w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden group
                    ${isCollapsed ? 'justify-center' : ''}
                    ${isActive 
                      ? 'bg-gradient-to-r from-nexus-electric/10 to-transparent border-l-2 border-nexus-electric shadow-[0_0_20px_rgba(var(--nexus-accent-rgb),0.1)]' 
                      : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5 border-l-2 border-transparent'}
                  `}
                  title={isCollapsed ? item.label : undefined}
                >
                  <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-nexus-electric' : 'group-hover:text-zinc-300'}`} />
                  {!isCollapsed && <span className={`relative z-10 flex-1 text-left ${isActive ? 'text-white' : ''}`}>{item.label}</span>}
                  
                  {hasTimer && (
                    <span className={`relative z-10 px-2 py-0.5 rounded-md bg-nexus-electric text-[9px] font-bold text-white animate-pulse ${isCollapsed ? 'absolute top-1 right-1' : ''}`}>
                        {activeTimerMins}m
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className={`p-6 border-t border-white/5 space-y-4 flex flex-col ${isCollapsed ? 'items-center' : ''}`}>
          <div 
            onClick={() => handleNavClick(AppView.SETTINGS)}
            className={`flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-nexus-electric/30 transition-all cursor-pointer group w-full ${isCollapsed ? 'justify-center p-2' : ''}`}
          >
              <img src={user.avatar} className="w-10 h-10 rounded-xl bg-black border border-white/10 group-hover:scale-105 transition-transform shrink-0" alt="Avatar" />
              {!isCollapsed && (
                <div className="min-w-0 animate-fade-in">
                    <p className="text-xs font-bold text-white truncate">{user.name}</p>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Connected</p>
                </div>
              )}
          </div>

          <button
            onClick={onLogout}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-zinc-500 hover:text-rose-400 hover:bg-rose-500/5 transition-all duration-300 w-full ${isCollapsed ? 'justify-center' : ''}`}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 md:hidden" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
};
