import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { TaskManager } from './components/TaskManager.tsx';
import { SmartSchedule } from './components/SmartSchedule.tsx';
import { FocusTimer } from './components/FocusTimer.tsx';
import { AITutor } from './components/AITutor.tsx';
import { Analytics } from './components/Analytics.tsx';
import { Login } from './components/Login.tsx';
import { authService } from './services/authService';
import { AppView, UserProfile } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initSession = async () => {
      try {
        const savedUser = await authService.restoreSession();
        if (savedUser) {
          setUser(savedUser);
        }
      } catch (e) {
        console.error("Session restore failed", e);
      } finally {
        setIsLoading(false);
      }
    };
    initSession();
  }, []);

  const handleLogin = (newUser: UserProfile) => {
    setUser(newUser);
    setCurrentView(AppView.DASHBOARD);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  if (isLoading) {
     return (
        <div className="flex h-screen w-screen items-center justify-center bg-black text-white">
           <div className="flex flex-col items-center gap-4">
               <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
               <p className="text-zinc-500 text-sm font-medium tracking-widest uppercase">Initializing Nexus</p>
           </div>
        </div>
     );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const renderView = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard user={user} onViewChange={setCurrentView} />;
      case AppView.TASKS:
        return <TaskManager user={user} />;
      case AppView.SCHEDULE:
        return <SmartSchedule user={user} />;
      case AppView.FOCUS:
        return <FocusTimer user={user} />;
      case AppView.TUTOR:
        return <AITutor user={user} />;
      case AppView.ANALYTICS:
        return <Analytics user={user} />;
      default:
        return <Dashboard user={user} onViewChange={setCurrentView} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-black text-zinc-100 font-sans">
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[128px] pointer-events-none -translate-x-1/2 -translate-y-1/2 z-0" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[128px] pointer-events-none translate-x-1/3 translate-y-1/3 z-0" />
      
      <div className="relative z-50 h-full">
        <Sidebar 
          currentView={currentView} 
          onChangeView={setCurrentView} 
          onLogout={handleLogout} 
        />
      </div>
      
      <main className="flex-1 h-full relative z-10 overflow-hidden">
        <div className="h-full w-full p-3 md:p-4">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default App;