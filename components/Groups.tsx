
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Users, Plus, MessageSquare, 
  ArrowRight, X, Loader2, Send, Clock, BookOpen, 
  ChevronRight, ArrowLeft, User, Activity, Globe, Lock, Trash2, AlertTriangle, Brain, TrendingUp, Target, PieChart as PieChartIcon
} from 'lucide-react';
import { UserProfile, StudyGroup, GroupMessage, ActivityLog, UserStatus, StudySession, Task, TaskStatus } from '../types.ts';
import { dbService } from '../services/dbService.ts';
import { collection, query, orderBy, onSnapshot, addDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase.ts';

// Component for manually logging study sessions into history from the groups view
export const TaskManagerManualEntry = ({ user, onAdd }: { user: UserProfile, onAdd: () => void }) => {
    const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const duration = parseInt(f.get('duration') as string);
        const subject = f.get('subject') as string;
        if (!duration || !subject) return;

        await dbService.logSession({
            id: crypto.randomUUID(),
            userId: user.uid,
            subject,
            duration: duration * 60,
            timestamp: Date.now(),
            date: new Date().toISOString().split('T')[0]
        });
        await dbService.logActivity({
            userId: user.uid,
            userName: user.name, 
            type: 'session_completed',
            subject,
            duration: duration * 60
        });
        onAdd();
    };

    return (
        <form onSubmit={handleAdd} className="space-y-4 p-6 bg-zinc-900/30 rounded-2xl border border-white/5 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Add History</h3>
            <div className="grid grid-cols-2 gap-4">
                <input name="subject" placeholder="Subject" className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-nexus-electric/50 transition-colors" required />
                <input name="duration" type="number" placeholder="Minutes" className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-nexus-electric/50 transition-colors" required />
            </div>
            <button type="submit" className="w-full py-2 bg-white text-black font-bold rounded-xl text-xs active:scale-95 transition-transform hover:bg-zinc-100">Save Session</button>
        </form>
    );
};

// Interface for Groups component props
interface GroupsProps {
  user: UserProfile;
}

export const Groups: React.FC<GroupsProps> = ({ user }) => {
  const [activeGroup, setActiveGroup] = useState<StudyGroup | null>(null);
  const [userGroups, setUserGroups] = useState<StudyGroup[]>([]);
  const [publicGroups, setPublicGroups] = useState<StudyGroup[]>([]);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [groupMembers, setGroupMembers] = useState<UserProfile[]>([]);
  const [view, setView] = useState<'list' | 'chat'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [msgInput, setMsgInput] = useState('');
  
  const [inspectingMember, setInspectingMember] = useState<UserProfile | null>(null);
  const [memberStats, setMemberStats] = useState<{ hours: string, progress: number, subjectBreakdown: {name: string, mins: number}[] } | null>(null);
  const [loadingMemberStats, setLoadingMemberStats] = useState(false);
  const [showFullReport, setShowFullReport] = useState(false);

  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  const msgEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInitial();
  }, [user.uid]);

  useEffect(() => {
    if (activeGroup) {
        const qMsg = query(collection(db, 'groups', activeGroup.id, 'messages'), orderBy('timestamp', 'asc'));
        const unsubMsg = onSnapshot(qMsg, (snap) => {
            setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as GroupMessage)));
        });

        const unsubMembers = onSnapshot(collection(db, 'users'), (snap) => {
           const allUsers = snap.docs.map(d => d.data() as UserProfile);
           setGroupMembers(allUsers.filter(u => activeGroup.members.includes(u.uid)));
        });

        return () => { unsubMsg(); unsubMembers(); };
    }
  }, [activeGroup]);

  useEffect(() => {
    if (inspectingMember) {
        fetchInspectedMemberStats(inspectingMember.uid);
    } else {
        setMemberStats(null);
        setShowFullReport(false);
    }
  }, [inspectingMember]);

  const fetchInspectedMemberStats = async (uid: string) => {
    setLoadingMemberStats(true);
    try {
        const today = new Date().toISOString().split('T')[0];
        const [allSessions, tasks] = await Promise.all([
            dbService.getSessions(uid),
            dbService.getTasks(uid)
        ]);
        
        const sessions = allSessions.filter(s => s.date === today);
        const totalMinsToday = sessions.reduce((acc, s) => acc + s.duration, 0) / 60;
        const hoursToday = (totalMinsToday / 60).toFixed(1);
        
        const doneTasks = tasks.filter(t => t.status === TaskStatus.DONE).length;
        const progress = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;

        const breakdownMap = new Map<string, number>();
        sessions.forEach(s => breakdownMap.set(s.subject, (breakdownMap.get(s.subject) || 0) + s.duration / 60));
        const breakdown = Array.from(breakdownMap.entries()).map(([name, mins]) => ({ name, mins: Math.round(mins) }));

        setMemberStats({ hours: hoursToday, progress, subjectBreakdown: breakdown });
    } catch (e) {
        console.error("Error fetching stats", e);
    } finally {
        setLoadingMemberStats(false);
    }
  };

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadInitial = async () => {
    setIsLoading(true);
    try {
        const [ug, pg] = await Promise.all([
            dbService.getUserGroups(user.uid),
            dbService.getPublicGroups()
        ]);
        setUserGroups(ug);
        setPublicGroups(pg.filter(g => !g.members.includes(user.uid)));
    } finally {
        setIsLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const newGroup: Partial<StudyGroup> = {
        name: f.get('name') as string,
        description: f.get('desc') as string,
        isPublic: f.get('visibility') === 'public',
        ownerId: user.uid,
        members: [user.uid],
        groupCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        createdAt: Date.now()
    };
    const id = await dbService.createGroup(newGroup);
    await dbService.logActivity({ userId: user.uid, userName: user.name, type: 'created_group', subject: newGroup.name });
    setIsModalOpen(false);
    loadInitial();
  };

  const handleJoinByCode = async () => {
    if (!joinCode) return;
    try {
        await dbService.joinGroupByCode(user.uid, joinCode);
        await dbService.logActivity({ userId: user.uid, userName: user.name, type: 'joined_group' });
        setJoinCode('');
        loadInitial();
    } catch (e) { alert("Code not found"); }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgInput.trim() || !activeGroup) return;
    await addDoc(collection(db, 'groups', activeGroup.id, 'messages'), {
        senderId: user.uid,
        senderName: user.name,
        text: msgInput,
        timestamp: Date.now()
    });
    setMsgInput('');
  };

  const handleInspectMember = async (member: UserProfile) => {
    setInspectingMember(member);
  };

  const handleDeleteGroup = async () => {
    if (!deletingGroupId) return;
    try {
        await dbService.deleteGroup(deletingGroupId);
        setDeletingGroupId(null);
        if (activeGroup?.id === deletingGroupId) {
            setView('list');
            setActiveGroup(null);
        }
        loadInitial();
    } catch (err) {
        alert("Deletion failed.");
    }
  };

  if (view === 'chat' && activeGroup) {
      return (
          <div className="h-full flex flex-col animate-fade-in relative">
              <header className="flex items-center justify-between p-4 bg-zinc-900/40 border border-white/5 rounded-2xl mb-4 backdrop-blur-xl shadow-2xl relative z-10">
                  <div className="flex items-center gap-4">
                      <button onClick={() => setView('list')} className="p-2 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-white transition-all active:scale-90">
                          <ArrowLeft className="w-5 h-5" />
                      </button>
                      <div>
                          <h2 className="text-white font-bold tracking-tight flex items-center gap-2">
                              {activeGroup.name}
                              <span className="text-[10px] bg-nexus-electric/20 text-nexus-electric px-2 py-0.5 rounded-full font-mono uppercase border border-nexus-electric/20">{activeGroup.groupCode}</span>
                          </h2>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{groupMembers.length} Members Online</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-3">
                      <div className="flex -space-x-2 mr-2">
                          {groupMembers.slice(0, 5).map(m => (
                              <button 
                                key={m.uid} 
                                onClick={() => handleInspectMember(m)}
                                className="w-8 h-8 rounded-full border-2 border-black bg-zinc-800 transition-transform hover:scale-110 hover:z-20 relative focus:outline-none focus:ring-2 focus:ring-nexus-electric"
                              >
                                  <img src={m.avatar} className="w-full h-full rounded-full" title={m.name} />
                              </button>
                          ))}
                      </div>
                      {activeGroup.ownerId === user.uid && (
                          <button 
                            onClick={() => setDeletingGroupId(activeGroup.id)}
                            className="p-2.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all active:scale-95"
                            title="Delete Group"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                      )}
                  </div>
              </header>

              <div className="flex-1 flex gap-4 min-h-0">
                  <div className="flex-1 flex flex-col bg-zinc-900/10 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-sm shadow-inner relative">
                      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                          {messages.map((m) => (
                              <div key={m.id} className={`flex flex-col ${m.senderId === user.uid ? 'items-end' : 'items-start'} group`}>
                                  <span className="text-[10px] text-zinc-500 font-bold mb-1 px-2 group-hover:text-zinc-400 transition-colors uppercase tracking-widest">{m.senderName}</span>
                                  <div className={`
                                      px-4 py-2.5 rounded-2xl max-w-[80%] text-sm backdrop-blur-md border transition-all duration-300
                                      ${m.senderId === user.uid 
                                          ? 'bg-nexus-electric/20 text-white border-nexus-electric/30 hover:border-nexus-electric/50 hover:bg-nexus-electric/30' 
                                          : 'bg-white/5 text-zinc-200 border-white/10 hover:border-white/20 hover:bg-white/10'}
                                  `}>
                                      {m.text}
                                  </div>
                              </div>
                          ))}
                          <div ref={msgEndRef} />
                      </div>
                      <form onSubmit={handleSendMessage} className="p-4 bg-zinc-900/40 backdrop-blur-xl border-t border-white/5 flex gap-2">
                          <input 
                            value={msgInput}
                            onChange={e => setMsgInput(e.target.value)}
                            placeholder="Type a message..." 
                            className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-nexus-electric/50 outline-none transition-all placeholder:text-zinc-600" 
                          />
                          <button 
                            type="submit" 
                            disabled={!msgInput.trim()}
                            className={`
                                p-3 rounded-xl transition-all active:scale-90 shadow-lg flex items-center justify-center
                                ${msgInput.trim() 
                                    ? 'bg-nexus-electric text-white hover:bg-nexus-violet hover:shadow-[0_0_20px_rgba(var(--nexus-accent-rgb),0.4)]' 
                                    : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}
                            `}
                          >
                            <Send className="w-5 h-5" />
                          </button>
                      </form>
                  </div>

                  <aside className="w-72 shrink-0 flex flex-col gap-4">
                      <div className="flex-1 bg-zinc-900/10 border border-white/5 rounded-3xl p-6 overflow-y-auto custom-scrollbar backdrop-blur-sm">
                          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6">Who's Here</h3>
                          <div className="space-y-4">
                              {groupMembers.map(m => (
                                  <button 
                                    key={m.uid} 
                                    onClick={() => handleInspectMember(m)}
                                    className="w-full flex items-start gap-3 group text-left transition-all p-2 rounded-xl hover:bg-white/5 active:scale-[0.98]"
                                  >
                                      <div className="relative shrink-0 transition-transform group-hover:scale-105">
                                          <img src={m.avatar} className="w-10 h-10 rounded-lg bg-zinc-800 border border-white/5" />
                                          <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-black transition-colors ${m.status === 'online' ? 'bg-emerald-500' : m.status === 'studying' ? 'bg-nexus-electric' : m.status === 'break' ? 'bg-amber-500' : 'bg-zinc-600'}`} />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                          <p className="text-xs font-bold text-white truncate group-hover:text-nexus-electric transition-colors">{m.name}</p>
                                          {m.status === 'studying' ? (
                                              <div className="flex items-center gap-1 mt-0.5 text-nexus-electric font-bold uppercase tracking-tighter text-[9px] animate-pulse">
                                                  <Brain className="w-2.5 h-2.5" />
                                                  <span className="truncate">Studying {m.currentSubject || 'General'}</span>
                                              </div>
                                          ) : (
                                              <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-tighter mt-0.5">{m.status || 'offline'}</p>
                                          )}
                                      </div>
                                  </button>
                              ))}
                          </div>
                      </div>
                  </aside>
              </div>

              {inspectingMember && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                      <div className={`w-full max-w-sm bg-zinc-900 border border-white/10 rounded-3xl p-8 shadow-2xl relative transition-all duration-500 ${showFullReport ? 'max-h-[80vh] overflow-y-auto custom-scrollbar' : ''}`}>
                          <button onClick={() => setInspectingMember(null)} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                          
                          <div className="flex flex-col items-center text-center space-y-4 mb-8">
                             <img src={inspectingMember.avatar} className="w-20 h-20 rounded-2xl bg-black border border-white/10 shadow-xl" />
                             <div>
                                <h3 className="text-xl font-bold text-white">{inspectingMember.name}</h3>
                                <div className="flex items-center justify-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${inspectingMember.status === 'studying' ? 'bg-nexus-electric' : 'bg-zinc-500'}`} />
                                    <p className="text-xs text-nexus-electric uppercase font-bold tracking-widest">{inspectingMember.status || 'offline'}</p>
                                </div>
                             </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-6">
                             <div className="p-4 bg-black/40 rounded-2xl border border-white/5 text-center flex flex-col items-center justify-center hover:bg-black/60 transition-colors">
                                <p className="text-zinc-500 text-[9px] font-bold uppercase mb-1 flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5" /> Study Today
                                </p>
                                {loadingMemberStats ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-zinc-700" />
                                ) : (
                                    <p className="text-lg font-bold text-white">{memberStats?.hours || "0.0"}h</p>
                                )}
                             </div>
                             <div className="p-4 bg-black/40 rounded-2xl border border-white/5 text-center flex flex-col items-center justify-center hover:bg-black/60 transition-colors">
                                <p className="text-zinc-500 text-[9px] font-bold uppercase mb-1 flex items-center gap-1">
                                    <Target className="w-2.5 h-2.5" /> Goal Progress
                                </p>
                                {loadingMemberStats ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-zinc-700" />
                                ) : (
                                    <p className="text-lg font-bold text-white">{memberStats?.progress || "0"}%</p>
                                )}
                             </div>
                          </div>

                          {showFullReport && memberStats && (
                              <div className="space-y-6 animate-slide-up border-t border-white/5 pt-6 mt-6">
                                  <div className="space-y-4">
                                      <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                          <TrendingUp className="w-3 h-3 text-nexus-electric" /> Subject Breakdown
                                      </h4>
                                      <div className="space-y-3">
                                          {memberStats.subjectBreakdown.length > 0 ? memberStats.subjectBreakdown.map(sub => (
                                              <div key={sub.name} className="space-y-1.5">
                                                  <div className="flex justify-between items-center text-[10px]">
                                                      <span className="text-zinc-300 font-medium">{sub.name}</span>
                                                      <span className="text-zinc-500 font-mono">{sub.mins}m</span>
                                                  </div>
                                                  <div className="h-1 bg-black/60 rounded-full overflow-hidden">
                                                      <div 
                                                        className="h-full bg-nexus-electric rounded-full transition-all duration-1000" 
                                                        style={{ width: `${Math.min(100, (sub.mins / 120) * 100)}%` }} 
                                                      />
                                                  </div>
                                              </div>
                                          )) : (
                                              <p className="text-[10px] text-zinc-600 italic">No subjects logged today.</p>
                                          )}
                                      </div>
                                  </div>
                                  
                                  <div className="p-4 bg-nexus-electric/5 rounded-2xl border border-nexus-electric/10">
                                      <div className="flex items-center gap-3 mb-2">
                                          <div className="p-1.5 bg-nexus-electric/10 rounded-lg">
                                              <Brain className="w-3.5 h-3.5 text-nexus-electric" />
                                          </div>
                                          <span className="text-xs font-bold text-white">Academic Health</span>
                                      </div>
                                      <p className="text-[10px] text-zinc-500 leading-relaxed">
                                          {memberStats.progress > 80 ? 'Exceptional focus today. Keeping up with all assigned tasks.' : 
                                           memberStats.progress > 50 ? 'Steady progress. Focused on core objectives.' : 
                                           'Getting started with the daily routine. Focus recommended.'}
                                      </p>
                                  </div>
                              </div>
                          )}

                          <button 
                            onClick={() => setShowFullReport(!showFullReport)}
                            className={`w-full mt-6 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.98]
                                ${showFullReport ? 'bg-zinc-800 text-zinc-300' : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'}`}
                          >
                            {showFullReport ? (
                                <><X className="w-3.5 h-3.5" /> Close Report</>
                            ) : (
                                <><PieChartIcon className="w-3.5 h-3.5" /> View Progress Report</>
                            )}
                          </button>
                      </div>
                  </div>
              )}
          </div>
      );
  }

  return (
    <div className="h-full flex flex-col space-y-8 animate-fade-in">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Study Groups</h1>
          <p className="text-zinc-500 text-sm mt-1">Study and collaborate with others.</p>
        </div>
        <div className="flex gap-3">
            <div className="flex bg-zinc-900/50 rounded-xl border border-white/5 p-1 backdrop-blur-md">
                <input 
                   placeholder="Invite Code" 
                   value={joinCode}
                   onChange={e => setJoinCode(e.target.value)}
                   className="bg-transparent text-xs px-4 py-2 outline-none text-white w-28 uppercase font-mono placeholder:text-zinc-600" 
                />
                <button onClick={handleJoinByCode} className="px-4 py-1.5 bg-nexus-electric text-white text-xs font-bold rounded-lg hover:bg-nexus-violet active:scale-95 transition-all shadow-lg shadow-nexus-electric/20">Join</button>
            </div>
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-6 py-2.5 bg-white text-black font-bold rounded-xl active:scale-95 shadow-xl hover:bg-zinc-100 transition-all">
                <Plus className="w-4 h-4" />
                <span>Create Group</span>
            </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-10 pr-2">
         <section className="bg-zinc-900/10 rounded-3xl p-8 border border-white/5 mb-8 backdrop-blur-sm shadow-inner">
            <TaskManagerManualEntry user={user} onAdd={loadInitial} />
         </section>

         <section>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 pl-1 flex items-center gap-2">
                <Lock className="w-3 h-3" /> Your Private Groups
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userGroups.map(g => (
                    <div 
                        key={g.id}
                        className="p-6 rounded-3xl bg-zinc-900/10 border border-white/5 text-left group hover:border-nexus-electric/30 transition-all hover:bg-zinc-900/30 relative overflow-hidden backdrop-blur-sm"
                    >
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                                <Users className="w-6 h-6 text-nexus-electric" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-500 font-mono bg-black/20 px-2 py-0.5 rounded border border-white/5">{g.groupCode}</span>
                                {g.ownerId === user.uid && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setDeletingGroupId(g.id); }}
                                        className="p-1.5 text-zinc-600 hover:text-rose-400 transition-colors hover:bg-rose-500/10 rounded-lg"
                                        title="Delete Group"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <button 
                            onClick={() => { setActiveGroup(g); setView('chat'); }}
                            className="block w-full text-left relative z-10 focus:outline-none"
                        >
                            <h4 className="text-lg font-bold text-white mb-2 group-hover:text-nexus-electric transition-colors">{g.name}</h4>
                            <p className="text-xs text-zinc-500 line-clamp-2 mb-4 leading-relaxed group-hover:text-zinc-400 transition-colors">{g.description}</p>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-nexus-electric uppercase tracking-widest group-hover:text-nexus-violet">
                                <Activity className="w-3 h-3 animate-pulse" /> {g.members.length} Active Users
                            </div>
                        </button>
                    </div>
                ))}
            </div>
         </section>

         <section>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 pl-1 flex items-center gap-2">
                <Globe className="w-3 h-3" /> Find Public Groups
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {publicGroups.map(g => (
                    <div key={g.id} className="p-6 rounded-3xl bg-zinc-900/10 border border-white/5 flex flex-col justify-between backdrop-blur-sm group hover:border-white/20 transition-all">
                        <div>
                            <h4 className="text-lg font-bold text-white mb-2 group-hover:text-nexus-electric transition-colors">{g.name}</h4>
                            <p className="text-xs text-zinc-500 line-clamp-3 mb-6 leading-relaxed">{g.description}</p>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{g.members.length} Users</span>
                            <button 
                                onClick={async () => {
                                    await dbService.joinGroupByCode(user.uid, g.groupCode);
                                    loadInitial();
                                }}
                                className="px-4 py-2 bg-nexus-electric/10 border border-nexus-electric/20 text-nexus-electric rounded-xl text-xs font-bold hover:bg-nexus-electric hover:text-white transition-all active:scale-95 shadow-lg shadow-nexus-electric/10"
                            >
                                Join Now
                            </button>
                        </div>
                    </div>
                ))}
            </div>
         </section>
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
              <div className="w-full max-w-md bg-[#09090b] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-nexus-electric to-rose-500" />
                  <h2 className="text-2xl font-bold text-white mb-6">New Study Group</h2>
                  <form onSubmit={handleCreateGroup} className="space-y-5">
                      <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Group Name</label>
                          <input name="name" required className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-nexus-electric/50 outline-none transition-all" />
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Description</label>
                          <textarea name="desc" className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-nexus-electric/50 outline-none h-24 resize-none transition-all" />
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Privacy</label>
                          <select name="visibility" className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-nexus-electric/50 transition-all appearance-none cursor-pointer">
                              <option value="private">Private (Invite Only)</option>
                              <option value="public">Public (Open to All)</option>
                          </select>
                      </div>
                      <div className="flex gap-3 mt-8">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-zinc-400 font-bold hover:text-white transition-colors">Cancel</button>
                          <button type="submit" className="flex-1 py-3 bg-white text-black font-bold rounded-xl shadow-lg active:scale-95 hover:bg-zinc-100 transition-colors">Create</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {deletingGroupId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-zinc-900 border border-rose-500/20 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/20">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white tracking-tight">Delete this group?</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">
                This will permanently delete the group and all chat history.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setDeletingGroupId(null)}
                className="flex-1 py-3 bg-zinc-800 text-white font-bold rounded-xl active:scale-95 hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteGroup}
                className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl shadow-lg active:scale-95 hover:bg-rose-500 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
