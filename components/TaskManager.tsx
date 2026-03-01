import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Check, Trash2, Calendar, Tag, Filter, Loader2, Bell, X, AlertCircle, History } from 'lucide-react';
import { Task, TaskPriority, TaskStatus, UserProfile } from '../types';
import { dbService } from '../services/dbService';

interface TaskManagerProps {
    user: UserProfile;
    onTriggerXP: (amount: number, x?: number, y?: number) => void;
    onUpdateQuest: (type: 'study_time' | 'tasks_done' | 'pomodoro_count', amount: number) => void;
}

const REMINDER_OPTIONS = [
    { label: 'None', value: 0 },
    { label: '15 mins before', value: 15 },
    { label: '1 hour before', value: 60 },
    { label: '1 day before', value: 1440 },
];

export const TaskManager: React.FC<TaskManagerProps> = ({ user, onTriggerXP, onUpdateQuest }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'Today' | 'History' | 'Done'>('Today');
  const [historyPeriod, setHistoryPeriod] = useState<'Week' | 'Month' | 'All'>('Week');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, [user.uid]);

  const loadTasks = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedTasks = await dbService.getTasks(user.uid);
        setTasks(fetchedTasks);
      } catch (err: any) {
        setError(`Sync error: ${err.code || 'Sync failed'}`);
      } finally {
        setIsLoading(false);
      }
  };

  const toggleStatus = async (id: string, e: React.MouseEvent) => {
    const originalTasks = [...tasks];
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newStatus = task.status === TaskStatus.DONE ? TaskStatus.PENDING : TaskStatus.DONE;
    
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    
    try {
      await dbService.updateTaskStatus(id, newStatus);
      if (newStatus === TaskStatus.DONE) {
        const xp = task.priority === TaskPriority.HIGH ? 50 : task.priority === TaskPriority.MEDIUM ? 30 : 15;
        
        // Calculate position for XP popup
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        onTriggerXP(xp, rect.left, rect.top);
        
        onUpdateQuest('tasks_done', 1);
      }
    } catch (err) {
      setTasks(originalTasks);
      setError("Update failed.");
      setTimeout(() => setError(null), 3000);
    }
  };

  const deleteTask = async (id: string) => {
    const originalTasks = [...tasks];
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      await dbService.deleteTask(id);
    } catch (err) {
      setTasks(originalTasks);
      setError("Delete failed.");
      setTimeout(() => setError(null), 3000);
    }
  };

  const addTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const reminderVal = parseInt(formData.get('reminderOffset') as string);
    const dueDateVal = formData.get('dueDate') as string;
    
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: formData.get('title') as string,
      subject: formData.get('subject') as string,
      priority: formData.get('priority') as TaskPriority,
      status: TaskStatus.PENDING,
      dueDate: dueDateVal || undefined,
      reminderOffset: reminderVal > 0 ? reminderVal : undefined,
      createdAt: Date.now()
    };
    
    const originalTasks = [...tasks];
    setTasks([newTask, ...tasks]);
    setIsModalOpen(false);
    
    try {
      await dbService.addTask(newTask, user.uid);
    } catch (err: any) {
      setTasks(originalTasks);
      setError(`Save failed.`);
      setTimeout(() => setError(null), 5000);
    }
  };

  const filteredTasks = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return tasks.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           t.subject.toLowerCase().includes(searchTerm.toLowerCase());
      
      const taskDate = new Date(t.createdAt).toISOString().split('T')[0];
      const isToday = taskDate === todayStr;

      if (filter === 'Today') return matchesSearch && isToday && t.status === TaskStatus.PENDING;
      if (filter === 'Done') return matchesSearch && t.status === TaskStatus.DONE;
      if (filter === 'History') return matchesSearch && !isToday;
      return matchesSearch;
    });
  }, [tasks, filter, searchTerm]);

  const historyStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = Date.now();
    let ms = 0;
    if (historyPeriod === 'Week') ms = 7 * 24 * 60 * 60 * 1000;
    else if (historyPeriod === 'Month') ms = 30 * 24 * 60 * 60 * 1000;
    else ms = Infinity;

    const pastTasks = tasks.filter(t => {
        const taskDate = new Date(t.createdAt).toISOString().split('T')[0];
        return taskDate !== todayStr && (ms === Infinity || t.createdAt >= now - ms);
    });
    
    const completed = pastTasks.filter(t => t.status === TaskStatus.DONE).length;
    const missed = pastTasks.filter(t => t.status === TaskStatus.PENDING).length;
    return { completed, missed };
  }, [tasks, historyPeriod]);

  return (
    <div className="h-full flex flex-col animate-fade-in relative">
      {error && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white px-6 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-3 animate-bounce border border-rose-400/50">
           <AlertCircle className="w-5 h-5" />
           <span>{error}</span>
           <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="shrink-0 space-y-8 pb-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Daily Tasks</h1>
            <p className="text-zinc-500 text-sm mt-1">Manage your work for today.</p>
            </div>
            <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-nexus-electric hover:bg-nexus-violet text-white font-semibold rounded-xl transition-all shadow-lg active:scale-95"
            >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
            </button>
        </header>

        <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-nexus-electric transition-colors" />
                <input 
                    type="text" 
                    placeholder="Search tasks..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-zinc-900/30 border border-white/5 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-nexus-electric/50 transition-all shadow-inner"
                />
            </div>
            <div className="flex bg-zinc-900/30 border border-white/5 rounded-xl p-1 gap-1">
                {['Today', 'History', 'Done'].map((f) => (
                    <button
                    key={f}
                    onClick={() => setFilter(f as any)}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all
                        ${filter === f 
                        ? 'bg-zinc-800 text-white shadow-sm' 
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                    >
                    {f}
                    </button>
                ))}
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 pb-10 pr-2">
        {filter === 'History' && (
          <div className="space-y-4 mb-6 animate-slide-up">
            <div className="flex justify-center">
                <div className="flex bg-zinc-900/40 p-1 rounded-xl border border-white/5">
                    {['Week', 'Month', 'All'].map(p => (
                        <button 
                            key={p} 
                            onClick={() => setHistoryPeriod(p as any)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${historyPeriod === p ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-zinc-900/40 border border-white/5 rounded-3xl text-center group">
                   <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                      <Check className="w-5 h-5 text-emerald-400" />
                   </div>
                   <p className="text-2xl font-black text-white">{historyStats.completed}</p>
                   <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1">Finished</p>
                </div>
                <div className="p-6 bg-zinc-900/40 border border-white/5 rounded-3xl text-center group">
                   <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center mx-auto mb-3 border border-rose-500/20 group-hover:scale-110 transition-transform">
                      <X className="w-5 h-5 text-rose-400" />
                   </div>
                   <p className="text-2xl font-black text-white">{historyStats.missed}</p>
                   <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1">Not Done</p>
                </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 relative min-h-[200px]">
            {isLoading && (
                <div className="absolute inset-0 flex items-start justify-center pt-20 bg-black/50 z-10 backdrop-blur-sm rounded-xl">
                    <Loader2 className="w-8 h-8 animate-spin text-nexus-electric" />
                </div>
            )}
            
            {filteredTasks.map(task => (
            <div 
                key={task.id}
                className={`
                group flex items-center gap-5 p-5 rounded-2xl border transition-all duration-300 animate-fade-in
                ${task.status === TaskStatus.DONE 
                    ? 'bg-zinc-900/10 border-white/5 opacity-50' 
                    : 'bg-zinc-900/30 border-white/5 hover:border-nexus-electric/30 hover:bg-zinc-900/50'}
                `}
            >
                <button 
                    onClick={(e) => toggleStatus(task.id, e)} 
                    className={`
                        w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-300 active:scale-90
                        ${task.status === TaskStatus.DONE 
                            ? 'bg-emerald-500 border-emerald-500 text-black' 
                            : 'border-zinc-600 hover:border-nexus-electric text-transparent'}
                    `}
                >
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </button>
                
                <div className="flex-1 min-w-0">
                    <h3 className={`font-medium text-base text-white truncate transition-all ${task.status === TaskStatus.DONE ? 'line-through text-zinc-500' : ''}`}>{task.title}</h3>
                    <div className="flex items-center gap-4 text-xs text-zinc-500 mt-1">
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/5 uppercase font-bold tracking-widest text-[9px]">
                            {task.subject}
                        </span>
                        {filter !== 'Today' && (
                           <span className="text-[10px] font-medium opacity-50">{new Date(task.createdAt).toLocaleDateString()}</span>
                        )}
                    </div>
                </div>

                <div className={`
                px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border
                ${task.priority === TaskPriority.HIGH ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                    task.priority === TaskPriority.MEDIUM ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}
                `}>
                {task.priority}
                </div>

                <button onClick={() => deleteTask(task.id)} className="p-2 text-zinc-600 hover:text-rose-400 transition-all hover:bg-rose-500/10 rounded-lg">
                <Trash2 className="w-4 h-4" />
                </button>
            </div>
            ))}
            {!isLoading && filteredTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-zinc-600 border border-dashed border-white/5 rounded-[2rem] bg-zinc-900/10">
                {filter === 'Today' ? (
                  <>
                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4"><Check className="w-6 h-6 text-zinc-700" /></div>
                    <p className="text-sm font-medium">All clear for today!</p>
                  </>
                ) : (
                  <>
                    <Filter className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm">No tasks found.</p>
                  </>
                )}
            </div>
            )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-[#09090b] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-nexus-electric to-nexus-violet" />
            <h2 className="text-2xl font-bold text-white mb-6">New Task</h2>
            <form onSubmit={addTask} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Name</label>
                <input name="title" required className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-nexus-electric/50 outline-none transition-all" placeholder="e.g. Study Physics" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Subject</label>
                  <input name="subject" required className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-nexus-electric/50 outline-none transition-all" placeholder="e.g. Physics" />
                </div>
                <div>
                   <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Priority</label>
                   <select name="priority" className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-nexus-electric/50 outline-none transition-all appearance-none cursor-pointer">
                     <option value={TaskPriority.MEDIUM}>Medium</option>
                     <option value={TaskPriority.HIGH}>High</option>
                     <option value={TaskPriority.LOW}>Low</option>
                   </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Due Date</label>
                    <input name="dueDate" type="datetime-local" className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-nexus-electric/50 outline-none transition-all [color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Reminder</label>
                    <div className="relative">
                        <select name="reminderOffset" className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-nexus-electric/50 outline-none transition-all appearance-none cursor-pointer">
                            {REMINDER_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <Bell className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                    </div>
                  </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-zinc-400 hover:text-white font-medium transition-colors hover:bg-white/5 rounded-xl">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-white text-black font-bold rounded-xl transition-all shadow-lg active:scale-95">Add Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
