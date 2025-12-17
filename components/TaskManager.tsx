import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Check, Trash2, Calendar, Tag, Filter, Loader2, Bell, Clock, AlertCircle, ChevronDown } from 'lucide-react';
import { Task, TaskPriority, TaskStatus, UserProfile } from '../types';
import { dbService } from '../services/dbService';

interface TaskManagerProps {
    user: UserProfile;
}

const REMINDER_OPTIONS = [
    { label: 'None', value: 0 },
    { label: '15 minutes before', value: 15 },
    { label: '1 hour before', value: 60 },
    { label: '1 day before', value: 1440 },
    { label: '2 days before', value: 2880 },
];

export const TaskManager: React.FC<TaskManagerProps> = ({ user }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Done'>('All');
  const [timeFilter, setTimeFilter] = useState<'All' | 'Today' | 'Week' | 'Month'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Notification Permission State
  const [permission, setPermission] = useState<NotificationPermission>(Notification.permission);

  useEffect(() => {
    loadTasks();
    if (Notification.permission === 'default') {
        Notification.requestPermission().then(setPermission);
    }
  }, [user.uid]);

  // Check for reminders every minute
  useEffect(() => {
      const checkReminders = () => {
          if (permission !== 'granted') return;
          
          tasks.forEach(task => {
              if (task.status === TaskStatus.PENDING && task.dueDate && task.reminderOffset) {
                  // Simple check logic
              }
          });
      };
      
      const interval = setInterval(checkReminders, 60000);
      return () => clearInterval(interval);
  }, [tasks, permission]);

  const loadTasks = async () => {
      setIsLoading(true);
      const fetchedTasks = await dbService.getTasks(user.uid);
      setTasks(fetchedTasks);
      setIsLoading(false);
  };

  const toggleStatus = async (id: string) => {
    // Optimistic UI update
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newStatus = task.status === TaskStatus.DONE ? TaskStatus.PENDING : TaskStatus.DONE;
    
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    await dbService.updateTaskStatus(id, newStatus);
  };

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await dbService.deleteTask(id);
  };

  const addTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const reminderVal = parseInt(formData.get('reminderOffset') as string);
    
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: formData.get('title') as string,
      subject: formData.get('subject') as string,
      priority: formData.get('priority') as TaskPriority,
      status: TaskStatus.PENDING,
      dueDate: formData.get('dueDate') as string,
      reminderOffset: reminderVal > 0 ? reminderVal : undefined,
      createdAt: Date.now()
    };
    
    // Optimistic add
    setTasks([newTask, ...tasks]);
    setIsModalOpen(false);
    
    if (permission === 'granted' && newTask.dueDate && newTask.reminderOffset) {
        const dueTime = new Date(newTask.dueDate).getTime();
        const delay = dueTime - (newTask.reminderOffset * 60 * 1000) - Date.now();
        if (delay > 0) {
            setTimeout(() => {
                new Notification(`Reminder: ${newTask.title}`, {
                    body: `Due in ${newTask.reminderOffset} minutes!`,
                    icon: '/favicon.ico'
                });
            }, delay);
        }
    }

    await dbService.addTask(newTask, user.uid);
  };

  const formatDueDate = (dateStr?: string) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Date Filtering Logic
  const isToday = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  };

  const isThisWeek = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
    const lastDay = new Date(today.setDate(today.getDate() - today.getDay() + 6));
    return d >= firstDay && d <= lastDay;
  };

  const isThisMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };

  const filteredTasks = tasks
    .filter(t => filter === 'All' || t.status === (filter === 'Done' ? TaskStatus.DONE : TaskStatus.PENDING))
    .filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()) || t.subject.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(t => {
        if (timeFilter === 'All') return true;
        if (!t.dueDate) return false; 
        if (timeFilter === 'Today') return isToday(t.dueDate);
        if (timeFilter === 'Week') return isThisWeek(t.dueDate);
        if (timeFilter === 'Month') return isThisMonth(t.dueDate);
        return true;
    });

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="shrink-0 space-y-8 pb-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Tasks</h1>
            <p className="text-zinc-500 text-sm mt-1">Manage your academic workload.</p>
            </div>
            <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:scale-95"
            >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
            </button>
        </header>

        {/* Controls */}
        <div className="flex flex-col gap-4">
            {/* Main Search and Status Filter */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search tasks..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-900/30 border border-white/5 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:bg-zinc-900/50 transition-all focus:shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                    />
                </div>
                <div className="flex bg-zinc-900/30 border border-white/5 rounded-xl p-1 gap-1">
                    {['All', 'Pending', 'Done'].map((f) => (
                        <button
                        key={f}
                        onClick={() => setFilter(f as any)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95
                            ${filter === f 
                            ? 'bg-zinc-800 text-white shadow-sm border border-white/5' 
                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                        >
                        {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Time Filters */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {['All', 'Today', 'Week', 'Month'].map((tf) => (
                    <button
                        key={tf}
                        onClick={() => setTimeFilter(tf as any)}
                        className={`
                            px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border transition-all whitespace-nowrap active:scale-95
                            ${timeFilter === tf 
                                ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                                : 'bg-zinc-900/30 border-white/5 text-zinc-500 hover:text-white hover:border-white/20'}
                        `}
                    >
                        {tf === 'All' ? 'All Time' : tf === 'Today' ? 'Today' : `This ${tf}`}
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 pb-10 pr-2">
        <div className="grid grid-cols-1 gap-3 relative min-h-[200px]">
            {isLoading && (
                <div className="absolute inset-0 flex items-start justify-center pt-20 bg-black/50 z-10 backdrop-blur-sm rounded-xl">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
            )}
            
            {filteredTasks.map(task => (
            <div 
                key={task.id}
                className={`
                group flex items-center gap-5 p-5 rounded-2xl border transition-all duration-300 animate-fade-in
                ${task.status === TaskStatus.DONE 
                    ? 'bg-zinc-900/10 border-white/5 opacity-50' 
                    : 'bg-zinc-900/30 border-white/5 hover:border-indigo-500/30 hover:bg-zinc-900/50 hover:shadow-[0_5px_20px_-5px_rgba(0,0,0,0.5)] hover:scale-[1.01]'}
                `}
            >
                <button 
                    onClick={() => toggleStatus(task.id)} 
                    className={`
                        w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-300 active:scale-90
                        ${task.status === TaskStatus.DONE 
                            ? 'bg-emerald-500 border-emerald-500 text-black' 
                            : 'border-zinc-600 hover:border-indigo-400 text-transparent hover:shadow-[0_0_10px_rgba(99,102,241,0.3)]'}
                    `}
                >
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </button>
                
                <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-medium text-base text-white truncate transition-all ${task.status === TaskStatus.DONE ? 'line-through text-zinc-500' : 'group-hover:text-indigo-100'}`}>{task.title}</h3>
                    {task.reminderOffset && task.status !== TaskStatus.DONE && (
                        <div className="group/bell relative">
                            <Bell className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20 animate-pulse" />
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/5 group-hover:border-white/10 transition-colors">
                        <Tag className="w-3 h-3 text-indigo-400" /> {task.subject}
                    </span>
                    {task.dueDate && (
                        <span className={`flex items-center gap-1.5 ${new Date(task.dueDate) < new Date() && task.status !== TaskStatus.DONE ? 'text-rose-400 font-bold' : ''}`}>
                            <Calendar className="w-3 h-3" /> {formatDueDate(task.dueDate)}
                        </span>
                    )}
                </div>
                </div>

                <div className={`
                px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-[0_0_10px_rgba(0,0,0,0.2)]
                ${task.priority === TaskPriority.HIGH ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-rose-900/10' : 
                    task.priority === TaskPriority.MEDIUM ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-900/10' : 
                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-900/10'}
                `}>
                {task.priority}
                </div>

                <button onClick={() => deleteTask(task.id)} className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-2 text-zinc-600 hover:text-rose-400 transition-all hover:bg-rose-500/10 rounded-lg active:scale-90">
                <Trash2 className="w-4 h-4" />
                </button>
            </div>
            ))}
            {!isLoading && filteredTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-zinc-600 border border-dashed border-white/5 rounded-3xl bg-zinc-900/10">
                <Filter className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm">No tasks found matching your filters.</p>
            </div>
            )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-[#09090b] border border-white/10 rounded-3xl p-8 shadow-2xl animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
            
            <h2 className="text-2xl font-bold text-white mb-6">Create Task</h2>
            <form onSubmit={addTask} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Title</label>
                <input name="title" required className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500/50 focus:bg-black/50 outline-none transition-all focus:shadow-[0_0_15px_rgba(99,102,241,0.1)]" placeholder="e.g. Study for Finals" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Subject</label>
                  <input name="subject" required className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500/50 outline-none transition-all" placeholder="e.g. Math" />
                </div>
                <div>
                   <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Priority</label>
                   <select name="priority" className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500/50 outline-none transition-all appearance-none">
                     <option value={TaskPriority.HIGH}>High Priority</option>
                     <option value={TaskPriority.MEDIUM}>Medium Priority</option>
                     <option value={TaskPriority.LOW}>Low Priority</option>
                   </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Due Date</label>
                    <input name="dueDate" type="datetime-local" className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500/50 outline-none transition-all [color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Reminder</label>
                    <div className="relative">
                        <select name="reminderOffset" className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500/50 outline-none transition-all appearance-none">
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
                <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl hover:from-indigo-500 hover:to-violet-500 transition-all shadow-lg shadow-indigo-500/20 active:scale-95">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};