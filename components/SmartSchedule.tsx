
import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Calendar as CalendarIcon, Clock, Plus, Tag, X, ChevronRight, Trash2, Loader2, ChevronLeft } from 'lucide-react';
import { ScheduleEvent, UserProfile } from '../types';
import { geminiService } from '../services/geminiService';
import { dbService } from '../services/dbService';

interface SmartScheduleProps {
    user: UserProfile;
    subjects: string[];
    setSubjects: React.Dispatch<React.SetStateAction<string[]>>;
}

export const SmartSchedule: React.FC<SmartScheduleProps> = ({ user, subjects, setSubjects }) => {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  
  const [viewMode, setViewMode] = useState<'Day' | 'Week' | 'Month'>('Day');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [showAiModal, setShowAiModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [isAddingSubject, setIsAddingSubject] = useState(false);

  useEffect(() => {
    loadSchedule();
  }, [user.uid]);

  const loadSchedule = async () => {
    setIsLoading(true);
    const fetchedEvents = await dbService.getSchedule(user.uid);
    setEvents(fetchedEvents);
    setIsLoading(false);
  };

  const deleteEvent = async (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    await dbService.deleteScheduleEvent(id);
  };

  const toDateString = (date: Date) => date.toISOString().split('T')[0];

  const navigateDate = (direction: 'prev' | 'next') => {
      const newDate = new Date(selectedDate);
      if (viewMode === 'Day') newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 1 : -1));
      if (viewMode === 'Week') newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
      if (viewMode === 'Month') newDate.setMonth(selectedDate.getMonth() + (direction === 'next' ? 1 : -1));
      setSelectedDate(newDate);
  };

  const getWeekDays = (date: Date) => {
      const start = new Date(date);
      start.setDate(date.getDate() - date.getDay()); 
      const days = [];
      for (let i = 0; i < 7; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          days.push(d);
      }
      return days;
  };

  const filteredEvents = useMemo(() => {
      if (viewMode === 'Day') {
          const dateStr = toDateString(selectedDate);
          return events.filter(e => (e.date || toDateString(new Date())) === dateStr);
      } 
      else if (viewMode === 'Week') {
          const days = getWeekDays(selectedDate);
          const startStr = toDateString(days[0]);
          const endStr = toDateString(days[6]);
          return events.filter(e => {
              const d = e.date || toDateString(new Date());
              return d >= startStr && d <= endStr;
          });
      }
      else { 
          const y = selectedDate.getFullYear();
          const m = selectedDate.getMonth();
          return events.filter(e => {
              const d = new Date(e.date || new Date());
              return d.getFullYear() === y && d.getMonth() === m;
          });
      }
  }, [events, viewMode, selectedDate]);

  const toggleSubject = (sub: string) => {
    if (selectedSubjects.includes(sub)) {
      setSelectedSubjects(prev => prev.filter(s => s !== sub));
    } else {
      setSelectedSubjects(prev => [...prev, sub]);
    }
  };

  const addCustomSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubjectName.trim() && !subjects.includes(newSubjectName.trim())) {
        setSubjects(prev => [...prev, newSubjectName.trim()]);
        setSelectedSubjects(prev => [...prev, newSubjectName.trim()]); 
        setNewSubjectName('');
        setIsAddingSubject(false);
    }
  };

  const removeCustomSubject = (e: React.MouseEvent, sub: string) => {
    e.stopPropagation();
    setSubjects(prev => prev.filter(s => s !== sub));
    setSelectedSubjects(prev => prev.filter(s => s !== sub));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && selectedSubjects.length === 0) return;
    
    setIsGenerating(true);
    try {
      let finalPrompt = prompt;
      if (selectedSubjects.length > 0) {
        finalPrompt = `${prompt}. Subjects to include: ${selectedSubjects.join(", ")}.`;
      }
      
      const generated = await geminiService.generateSchedule(finalPrompt);
      const todayStr = toDateString(new Date());
      
      for (const event of generated) {
          const eventWithDate = { ...event, date: todayStr };
          await dbService.saveScheduleEvent(eventWithDate, user.uid);
      }
      
      await loadSchedule();
      setShowAiModal(false);
      setPrompt('');
      setSelectedSubjects([]);
    } catch (err) {
      alert("Plan generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const dateVal = formData.get('date') as string || toDateString(new Date());
    
    const newEvent: ScheduleEvent = {
        id: crypto.randomUUID(),
        title: formData.get('title') as string,
        subject: formData.get('subject') as string || undefined,
        startTime: formData.get('startTime') as string,
        date: dateVal,
        durationMinutes: parseInt(formData.get('duration') as string),
        type: formData.get('type') as any,
        description: formData.get('description') as string
    };
    
    setShowManualModal(false);
    await dbService.saveScheduleEvent(newEvent, user.uid);
    await loadSchedule();
  };

  const GroupedEventList = ({ eventsForDay }: { eventsForDay: ScheduleEvent[] }) => (
      <div className="space-y-4">
          {eventsForDay.length === 0 ? (
              <div className="text-zinc-600 text-xs italic p-4 border border-dashed border-white/5 rounded-xl text-center">No events</div>
          ) : (
              eventsForDay.sort((a,b) => a.startTime.localeCompare(b.startTime)).map(event => (
                  <div key={event.id} className="relative pl-4 pr-6 border-l-2 border-white/10 hover:border-indigo-500 transition-colors py-1 group">
                      <div className="text-xs text-zinc-500 font-mono mb-1">{event.startTime}</div>
                      <div className="font-medium text-white text-sm truncate pr-2 group-hover:text-indigo-200 transition-colors">{event.title}</div>
                      {event.subject && <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">{event.subject}</div>}
                      
                      <button 
                        onClick={() => deleteEvent(event.id)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 text-zinc-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete event"
                      >
                          <Trash2 className="w-3.5 h-3.5" />
                      </button>
                  </div>
              ))
          )}
      </div>
  );

  return (
    <div className="h-full flex flex-col space-y-6 animate-fade-in relative pb-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Schedule</h1>
          <p className="text-zinc-500 text-sm mt-1">Plan your study routine.</p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={() => setShowManualModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900/50 hover:bg-zinc-800 text-white font-medium rounded-xl transition-all border border-white/10 backdrop-blur-md hover:border-white/20 active:scale-95"
            >
                <Plus className="w-4 h-4" />
                <span>Add Event</span>
            </button>
            <button 
                onClick={() => setShowAiModal(true)}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] hover:scale-105 active:scale-95"
            >
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span>Generate Plan</span>
            </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-zinc-900/20 p-2 rounded-2xl border border-white/5">
         <div className="flex items-center bg-black/40 rounded-xl p-1">
             {['Day', 'Week', 'Month'].map(m => (
                 <button
                    key={m}
                    onClick={() => setViewMode(m as any)}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 ${viewMode === m ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                 >
                     {m}
                 </button>
             ))}
         </div>
         
         <div className="flex items-center gap-4">
             <button onClick={() => navigateDate('prev')} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white active:scale-90 transition-transform"><ChevronLeft className="w-5 h-5" /></button>
             <span className="text-white font-medium min-w-[150px] text-center">
                 {viewMode === 'Day' && selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                 {viewMode === 'Week' && `Week of ${getWeekDays(selectedDate)[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                 {viewMode === 'Month' && selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
             </span>
             <button onClick={() => navigateDate('next')} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white active:scale-90 transition-transform"><ChevronRight className="w-5 h-5" /></button>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar relative min-h-[400px]">
         {viewMode === 'Day' && (
            <div className="space-y-8 pl-0 pb-20 relative pt-4">
                {isLoading && (
                    <div className="absolute inset-0 flex items-start justify-center pt-20 bg-black/50 z-20 backdrop-blur-sm">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    </div>
                )}
                
                {!isLoading && filteredEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-zinc-600 bg-zinc-900/10 border border-dashed border-white/5 rounded-3xl mx-4">
                        <CalendarIcon className="w-12 h-12 mb-4 opacity-20" />
                        <p className="font-medium text-zinc-500">No events for this day.</p>
                    </div>
                ) : (
                    filteredEvents.sort((a, b) => a.startTime.localeCompare(b.startTime)).map((event, index) => (
                        <div key={event.id} className="relative pl-24 group animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                            <div className="absolute left-4 top-6 w-16 text-right text-xs font-mono text-zinc-500 group-hover:text-white transition-colors">
                                {event.startTime}
                            </div>
                            <div className={`
                                absolute left-[92px] top-6 w-4 h-4 rounded-full border-[3px] z-10 bg-black transition-all duration-300 group-hover:scale-125 group-hover:shadow-[0_0_15px_currentColor]
                                ${event.type === 'study' ? 'border-indigo-500 text-indigo-500' : 
                                event.type === 'break' ? 'border-emerald-500 text-emerald-500' : 
                                event.type === 'exam' ? 'border-rose-500 text-rose-500' : 'border-zinc-500 text-zinc-500'}
                            `} />
                            <div className={`
                                p-6 rounded-2xl border-y border-r border-l-4 transition-all duration-300 relative overflow-hidden group-hover:-translate-y-1 group-hover:shadow-lg group-hover:scale-[1.01]
                                ${event.type === 'break' ? 'bg-emerald-900/5 border-white/5 border-l-emerald-500 hover:bg-emerald-900/10' : 
                                event.type === 'exam' ? 'bg-rose-900/5 border-white/5 border-l-rose-500 hover:bg-rose-900/10' : 
                                'bg-zinc-900/30 border-white/5 border-l-indigo-500 hover:border-indigo-500/30 hover:bg-zinc-900/50 hover:shadow-[0_10px_30px_-10px_rgba(99,102,241,0.2)]'}
                            `}>
                                <div className="flex justify-between items-start mb-3 relative z-10">
                                    <div className="flex flex-col gap-1">
                                        <h3 className="font-bold text-white text-lg tracking-tight group-hover:text-indigo-100 transition-colors">{event.title}</h3>
                                        {event.subject && (
                                            <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5
                                                ${event.type === 'break' ? 'text-emerald-400' : event.type === 'exam' ? 'text-rose-400' : 'text-indigo-400'}
                                            `}>
                                                <Tag className="w-3 h-3" />
                                                {event.subject}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center text-xs font-mono text-zinc-500 bg-black/20 px-3 py-1.5 rounded-full border border-white/5 group-hover:border-white/10">
                                            <Clock className="w-3 h-3 mr-2" />
                                            {event.durationMinutes} min
                                        </div>
                                        <button 
                                            onClick={() => deleteEvent(event.id)}
                                            className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            title="Delete event"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-sm text-zinc-400 leading-relaxed relative z-10">{event.description || `Session: ${event.title}`}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
         )}

         {viewMode === 'Week' && (
             <div className="grid grid-cols-1 md:grid-cols-7 gap-4 min-w-[800px] pb-8">
                 {getWeekDays(selectedDate).map((day) => {
                     const dateStr = toDateString(day);
                     const dayEvents = events.filter(e => (e.date || toDateString(new Date())) === dateStr);
                     const isToday = dateStr === toDateString(new Date());
                     return (
                         <div key={dateStr} className={`bg-zinc-900/20 rounded-xl border ${isToday ? 'border-indigo-500/50 bg-indigo-500/5 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'border-white/5'} p-3 min-h-[300px] hover:bg-zinc-800/30 transition-colors`}>
                             <div className={`text-center mb-4 pb-2 border-b ${isToday ? 'border-indigo-500/30' : 'border-white/5'}`}>
                                 <div className={`text-xs font-bold uppercase ${isToday ? 'text-indigo-400' : 'text-zinc-500'}`}>{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                 <div className={`text-lg font-bold ${isToday ? 'text-white' : 'text-zinc-300'}`}>{day.getDate()}</div>
                             </div>
                             <GroupedEventList eventsForDay={dayEvents} />
                         </div>
                     );
                 })}
             </div>
         )}
         
         {viewMode === 'Month' && (
             <div className="grid grid-cols-7 gap-2">
                 {Array.from({ length: new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate() }, (_, i) => {
                     const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i + 1);
                     const dateStr = toDateString(d);
                     const dayEvents = events.filter(e => (e.date || toDateString(new Date())) === dateStr);
                     const isToday = dateStr === toDateString(new Date());
                     return (
                         <div key={i} className={`aspect-square bg-zinc-900/30 rounded-lg border ${isToday ? 'border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]' : 'border-white/5'} p-2 hover:bg-zinc-800/50 transition-all hover:scale-105 cursor-pointer relative group`}>
                             <div className={`text-xs font-bold ${isToday ? 'text-indigo-400' : 'text-zinc-500'}`}>{i + 1}</div>
                             {dayEvents.length > 0 && (
                                 <div className="mt-2 space-y-1">
                                     {dayEvents.slice(0, 3).map(e => (
                                         <div key={e.id} className="w-full h-1.5 rounded-full bg-indigo-500/50" />
                                     ))}
                                 </div>
                             )}
                         </div>
                     );
                 })}
             </div>
         )}
      </div>

      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#09090b] border border-white/10 rounded-3xl p-8 shadow-2xl animate-fade-in relative overflow-hidden">
             <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500" />
             <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                    AI Planner
                 </h3>
                 <button onClick={() => setShowAiModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                     <X className="w-5 h-5" />
                 </button>
             </div>
             
             <form onSubmit={handleGenerate}>
                <div className="mb-6">
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Your Subjects</label>
                    <div className="flex flex-wrap gap-2">
                        {subjects.map(sub => (
                            <button
                                key={sub}
                                type="button"
                                onClick={() => toggleSubject(sub)}
                                className={`
                                    text-xs px-4 py-2 rounded-full border transition-all duration-300 font-medium group relative active:scale-95
                                    ${selectedSubjects.includes(sub) 
                                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)] pr-8' 
                                        : 'bg-zinc-900 text-zinc-400 border-white/5 hover:border-white/20 hover:bg-zinc-800'}
                                `}
                            >
                                {sub}
                                {selectedSubjects.includes(sub) && (
                                    <span 
                                        onClick={(e) => { e.stopPropagation(); removeCustomSubject(e, sub); }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-white/20 rounded-full"
                                    >
                                        <X className="w-3 h-3" />
                                    </span>
                                )}
                            </button>
                        ))}
                        {isAddingSubject ? (
                            <div className="flex items-center gap-2 bg-zinc-900 border border-indigo-500/50 rounded-full px-3 py-1 animate-fade-in">
                                <input 
                                    autoFocus
                                    value={newSubjectName}
                                    onChange={(e) => setNewSubjectName(e.target.value)}
                                    placeholder="Name..."
                                    className="bg-transparent border-none text-xs text-white focus:outline-none w-24"
                                />
                                <button onClick={addCustomSubject} className="text-indigo-400 hover:text-white"><Plus className="w-3 h-3" /></button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setIsAddingSubject(true)}
                                className="text-xs px-3 py-2 rounded-full border border-dashed border-zinc-700 text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
                            >
                                <Plus className="w-3 h-3" /> Add
                            </button>
                        )}
                    </div>
                </div>
                <div className="mb-6">
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Requirements</label>
                    <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe your goals for today..."
                        className="w-full h-32 bg-zinc-900/50 border border-white/10 rounded-xl p-4 text-white focus:border-indigo-500/50 outline-none resize-none transition-all text-sm"
                    />
                </div>
                <button 
                    type="submit" 
                    disabled={isGenerating || (!prompt && selectedSubjects.length === 0)}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl transition-all shadow-lg active:scale-[0.98]"
                >
                    {isGenerating ? 'Generating...' : 'Generate Schedule'}
                </button>
             </form>
          </div>
        </div>
      )}

      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#09090b] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-bold text-white">Add Event</h3>
                 <button onClick={() => setShowManualModal(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
             </div>
            <form onSubmit={handleManualAdd} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Title</label>
                <input name="title" required className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500/50 outline-none" placeholder="e.g. Read Book" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Date</label>
                  <input name="date" type="date" required defaultValue={toDateString(new Date())} className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white [color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Start Time</label>
                  <input name="startTime" type="time" required className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white [color-scheme:dark]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Subject</label>
                  <select name="subject" className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500/50 outline-none transition-all">
                      {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                   <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Type</label>
                   <select name="type" className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none">
                     <option value="study">Study</option>
                     <option value="break">Break</option>
                     <option value="exam">Exam</option>
                     <option value="other">Other</option>
                   </select>
                </div>
              </div>
              <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Duration (min)</label>
                  <input name="duration" type="number" min="5" step="5" defaultValue="50" required className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white" />
              </div>
              <button type="submit" className="w-full mt-4 px-6 py-3.5 bg-white text-black font-bold rounded-xl active:scale-95">Add Event</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
