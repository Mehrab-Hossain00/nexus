
import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Loader2, X, Search,
  Shield, MessageSquare, Send,
  Settings, TrendingUp, Award, Flame,
  Activity, Calendar as CalendarIcon, CheckCircle2, ChevronLeft, ChevronRight, Layers, Users, Plus, Zap
} from 'lucide-react';
import { UserProfile, StudyGroup, Task, StudySession, GroupMessage } from '../types.ts';
import { dbService } from '../services/dbService.ts';
import { collection, query, orderBy, onSnapshot, addDoc, doc, limit, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase.ts';
import { GoogleGenAI } from "@google/genai";

interface NexusHubProps {
  user: UserProfile;
  globalRankings?: UserProfile[];
}

type HubTab = 'groups' | 'leaderboard';

export const NexusHub: React.FC<NexusHubProps> = ({ user, globalRankings = [] }) => {
  const [activeTab, setActiveTab] = useState<HubTab>('groups');
  const [leaderboardMode, setLeaderboardMode] = useState<'global' | 'groups'>('global');
  // ... existing state ...
  const [currentUserData, setCurrentUserData] = useState<UserProfile>(user);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  
  const [myGroups, setMyGroups] = useState<StudyGroup[]>([]);
  const [publicGroups, setPublicGroups] = useState<StudyGroup[]>([]);
  const [isJoining, setIsJoining] = useState(false);
  const [groupCode, setGroupCode] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<(StudyGroup & { members: UserProfile[] }) | null>(null);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [groupModalTab, setGroupModalTab] = useState<'info' | 'chat'>('info');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (groupModalTab === 'chat') {
      scrollToBottom();
    }
  }, [groupMessages, groupModalTab]);
  const [selectedUserStats, setSelectedUserStats] = useState<{ tasks: Task[], sessions: StudySession[] } | null>(null);
  const [selectedUserCalendarDate, setSelectedUserCalendarDate] = useState(new Date());
  const [selectedUserSelectedDay, setSelectedUserSelectedDay] = useState<string | null>(new Date().toISOString().split('T')[0]);

  // ... existing effects and handlers ...

  const selectedUserCalendarDays = React.useMemo(() => {
    if (!selectedUserStats) return [];
    const year = selectedUserCalendarDate.getFullYear();
    const month = selectedUserCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) {
        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
        const daySessions = selectedUserStats.sessions.filter(s => s.date === dateStr);
        const totalMins = daySessions.reduce((acc, s) => acc + s.duration, 0) / 60;
        days.push({ day: i, date: dateStr, sessions: daySessions, totalMins });
    }
    return days;
  }, [selectedUserCalendarDate, selectedUserStats]);

  const selectedUserAnalysisData = React.useMemo(() => {
    if (!selectedUserStats || !selectedUserSelectedDay) return null;

    const filtered = selectedUserStats.sessions.filter(s => s.date === selectedUserSelectedDay);
    const totalSeconds = filtered.reduce((acc, s) => acc + s.duration, 0);
    const subjectMap = new Map<string, number>();
    filtered.forEach(s => {
      subjectMap.set(s.subject, (subjectMap.get(s.subject) || 0) + s.duration);
    });

    const subjectBreakdown = Array.from(subjectMap.entries())
      .map(([name, duration]) => ({ name, duration: Math.round(duration / 60) }))
      .sort((a, b) => b.duration - a.duration);

    return { filtered, totalSeconds, subjectBreakdown, title: new Date(selectedUserSelectedDay).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) };
  }, [selectedUserSelectedDay, selectedUserStats]);

  const groupMembers = React.useMemo(() => {
    const memberUids = new Set<string>();
    myGroups.forEach(g => g.members.forEach(m => memberUids.add(m)));
    return allUsers.filter(u => memberUids.has(u.uid));
  }, [allUsers, myGroups]);

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync current user data and groups
  useEffect(() => {
    const unsubUser = onSnapshot(doc(db, 'users', user.uid), async (snap) => {
      const data = snap.data() as UserProfile;
      if (data) {
        setCurrentUserData(data);
      }
    });

    const unsubAllUsers = onSnapshot(query(collection(db, 'users'), limit(100)), (snap) => {
      setAllUsers(snap.docs.map(d => d.data() as UserProfile));
      setIsLoading(false);
    });

    const unsubMyGroups = onSnapshot(query(collection(db, 'groups'), where("members", "array-contains", user.uid)), (snap) => {
      setMyGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudyGroup)));
    });

    const unsubPublicGroups = onSnapshot(query(collection(db, 'groups'), where("isPublic", "==", true)), (snap) => {
      setPublicGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudyGroup)));
    });

    return () => { 
      unsubUser(); 
      unsubAllUsers(); 
      unsubMyGroups(); 
      unsubPublicGroups(); 
    };
  }, [user.uid]);

  // Group Chat Listener
  useEffect(() => {
    if (!selectedGroup) {
      setGroupMessages([]);
      setGroupModalTab('info');
      return;
    }

    const q = query(
      collection(db, 'group_messages'),
      where('groupId', '==', selectedGroup.id),
      orderBy('timestamp', 'asc'),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap) => {
      setGroupMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as GroupMessage)));
    });

    return () => unsub();
  }, [selectedGroup?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedGroup) return;

    const msg = {
      groupId: selectedGroup.id,
      senderId: user.uid,
      senderName: user.name,
      text: newMessage.trim(),
    };

    setNewMessage('');
    await dbService.sendGroupMessage(msg);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      await dbService.createGroup({
        name: newGroupName,
        description: newGroupDesc,
        isPublic: true,
        ownerId: user.uid,
        members: [user.uid],
        groupCode: code,
        createdAt: Date.now()
      });
      setNewGroupName('');
      setNewGroupDesc('');
      setShowCreateGroup(false);
    } catch (err) {
      console.error("Failed to create group:", err);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupCode.trim()) return;
    setIsJoining(true);
    try {
      await dbService.joinGroupByCode(user.uid, groupCode);
      setGroupCode('');
    } catch (err: any) {
      alert(err.message || "Failed to join group");
    } finally {
      setIsJoining(false);
    }
  };

  const handleViewUser = async (target: UserProfile) => {
    setSelectedUser(target);
    setSelectedUserStats(null);
    setSelectedUserCalendarDate(new Date());
    setSelectedUserSelectedDay(new Date().toISOString().split('T')[0]);
    const tasks = await dbService.getTasks(target.uid);
    const sessions = await dbService.getSessions(target.uid);
    setSelectedUserStats({ tasks, sessions });
  };

  return (
    <div className="h-full flex flex-row-reverse bg-[#050505] animate-fade-in relative overflow-hidden font-sans selection:bg-nexus-electric selection:text-white">
      {/* Vertical Navigation Rail - Moved to right */}
      <nav className="w-20 md:w-24 shrink-0 border-l border-white/[0.05] flex flex-col items-center py-10 bg-black z-50">
        <div className="mb-12">
          <div className="w-12 h-12 rounded-2xl bg-nexus-electric/10 flex items-center justify-center border border-nexus-electric/20 shadow-2xl shadow-nexus-electric/10 group cursor-pointer hover:rotate-12 transition-transform duration-500">
            <Sparkles className="w-6 h-6 text-nexus-electric" />
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-8">
          {[
            { id: 'groups', icon: Users, label: 'GROUPS' },
            { id: 'leaderboard', icon: TrendingUp, label: 'RANK' }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as HubTab)} 
              className={`relative group flex flex-col items-center gap-2 transition-all duration-500 ${activeTab === tab.id ? 'text-white' : 'text-zinc-700 hover:text-zinc-400'}`}
            >
               <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${activeTab === tab.id ? 'bg-white text-black shadow-2xl scale-110' : 'bg-transparent'}`}>
                  <tab.icon className="w-5 h-5" />
               </div>
               <span className="text-[7px] font-bold uppercase tracking-[0.3em] opacity-0 group-hover:opacity-100 transition-opacity absolute -left-12 bg-black border border-white/10 px-2 py-1 rounded-md pointer-events-none z-50 whitespace-nowrap">
                  {tab.label}
               </span>
               {activeTab === tab.id && (
                 <div className="absolute -right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-nexus-electric rounded-full shadow-[0_0_15px_rgba(var(--nexus-accent-rgb),0.8)]" />
               )}
            </button>
          ))}
        </div>
      </nav>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Atmospheric Background Elements */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-nexus-electric/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-nexus-violet/5 blur-[100px] rounded-full pointer-events-none" />

        <main className="flex-1 overflow-y-auto custom-scrollbar relative z-10 p-12 md:p-20">
          <div className="max-w-5xl mx-auto pb-32">
            
            {activeTab === 'leaderboard' && (
              <div className="space-y-24 animate-fade-in pb-32">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                   <div>
                      <h3 className="text-[11px] font-bold text-nexus-electric uppercase tracking-[0.6em] mb-4">RANKINGS</h3>
                      <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tighter leading-[0.85] uppercase">Cognitive<br/>Elite</h1>
                   </div>
                   <div className="flex p-1.5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                      <button 
                        onClick={() => setLeaderboardMode('global')}
                        className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${leaderboardMode === 'global' ? 'bg-white text-black shadow-xl' : 'text-zinc-500 hover:text-white'}`}
                      >
                        Global
                      </button>
                      <button 
                        onClick={() => setLeaderboardMode('groups')}
                        className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${leaderboardMode === 'groups' ? 'bg-white text-black shadow-xl' : 'text-zinc-500 hover:text-white'}`}
                      >
                        My Groups
                      </button>
                   </div>
                </header>

                <div className="space-y-4">
                  {(leaderboardMode === 'global' ? allUsers : groupMembers)
                    .sort((a,b) => (b.xp || 0) - (a.xp || 0))
                    .map((u, i) => {
                    const isMe = u.uid === user.uid;
                    const isTop3 = i < 3;
                    return (
                      <div 
                        key={u.uid} 
                        onClick={() => handleViewUser(u)} 
                        className={`group relative flex items-center justify-between p-8 rounded-[2rem] border transition-all duration-700 cursor-pointer overflow-hidden ${isMe ? 'bg-white text-black border-white shadow-2xl scale-[1.02]' : 'bg-zinc-900/10 border-white/[0.03] hover:bg-zinc-900/20 hover:border-white/[0.08]'}`}
                      >
                        {isMe && <div className="absolute top-0 right-0 w-32 h-32 bg-nexus-electric/10 blur-[40px] rounded-full pointer-events-none" />}
                        
                        <div className="flex items-center gap-10 relative z-10">
                          <div className={`text-5xl font-bold tracking-tighter w-16 ${isMe ? 'text-black/20' : isTop3 ? 'text-nexus-electric' : 'text-zinc-800'}`}>
                            {(i + 1).toString().padStart(2, '0')}
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className={`w-16 h-16 rounded-2xl p-0.5 border transition-all duration-700 ${isMe ? 'border-black/10' : 'border-white/10'}`}>
                               <img src={u.avatar} className="w-full h-full rounded-[0.85rem] object-cover" alt={u.name} />
                            </div>
                            <div>
                              <h4 className={`text-xl font-bold tracking-tight ${isMe ? 'text-black' : 'text-white'}`}>
                                {u.name} 
                                {isMe && <span className="text-[9px] font-bold uppercase tracking-widest ml-3 px-2 py-0.5 bg-black text-white rounded-md">YOU</span>}
                              </h4>
                              <p className={`text-[9px] font-bold uppercase tracking-[0.3em] mt-2 ${isMe ? 'text-black/60' : 'text-zinc-600'}`}>
                                Level {u.level || 1} • <span className="font-mono">{u.xp || 0} XP</span>
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="text-right relative z-10">
                          <div className="flex items-center gap-3 justify-end">
                            <Flame className={`w-5 h-5 ${isMe ? 'text-black' : 'text-orange-500'}`} />
                            <span className={`text-3xl font-bold tracking-tighter ${isMe ? 'text-black' : 'text-white'}`}>{u.streak || 0}</span>
                          </div>
                          <p className={`text-[8px] font-bold uppercase tracking-[0.3em] mt-2 ${isMe ? 'text-black/40' : 'text-zinc-700'}`}>Day Streak</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {activeTab === 'groups' && (
              <div className="space-y-24 pb-32 animate-fade-in">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                   <div>
                      <h3 className="text-[11px] font-bold text-nexus-electric uppercase tracking-[0.6em] mb-4">COLLECTIVES</h3>
                      <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tighter leading-[0.85] uppercase">Study<br/>Groups</h1>
                   </div>
                   <button 
                     onClick={() => setShowCreateGroup(true)}
                     className="px-10 py-4 bg-white text-black text-[10px] font-bold uppercase tracking-[0.3em] rounded-2xl hover:bg-nexus-electric hover:text-white transition-all duration-500 shadow-2xl active:scale-95 flex items-center gap-3"
                   >
                     <Plus className="w-4 h-4" /> Create Group
                   </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                   <div className="space-y-10">
                      <div className="flex items-center gap-4 px-2">
                         <div className="h-px flex-1 bg-white/[0.05]" />
                         <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.5em]">Join by Code</h3>
                         <div className="h-px flex-1 bg-white/[0.05]" />
                      </div>
                      <form onSubmit={handleJoinGroup} className="relative group">
                         <input 
                           value={groupCode} 
                           onChange={e => setGroupCode(e.target.value)} 
                           className="w-full bg-zinc-900/10 border border-white/[0.05] rounded-[2rem] px-10 py-8 text-white text-2xl font-bold tracking-tight focus:border-nexus-electric/30 outline-none transition-all placeholder:text-zinc-900 shadow-2xl" 
                           placeholder="Enter 6-digit code..." 
                         />
                         <button 
                           type="submit" 
                           disabled={isJoining || !groupCode.trim()}
                           className="absolute right-4 top-1/2 -translate-y-1/2 px-8 py-4 bg-nexus-electric text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-nexus-violet transition-all disabled:opacity-20"
                         >
                           {isJoining ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join'}
                         </button>
                      </form>
                   </div>

                   <div className="space-y-10">
                      <div className="flex items-center gap-4 px-2">
                         <div className="h-px flex-1 bg-white/[0.05]" />
                         <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.5em]">My Groups</h3>
                         <div className="h-px flex-1 bg-white/[0.05]" />
                      </div>
                      <div className="space-y-4">
                         {myGroups.map(g => (
                            <div 
                              key={g.id} 
                              onClick={() => {
                                const members = allUsers.filter(u => g.members.includes(u.uid));
                                setSelectedGroup({ ...g, members: members as any });
                              }}
                              className="p-8 bg-zinc-900/10 border border-white/[0.03] rounded-[2rem] flex items-center justify-between hover:bg-zinc-900/20 transition-all duration-700 group relative overflow-hidden cursor-pointer"
                            >
                               <div className="flex items-center gap-6">
                                 <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl font-bold text-white">
                                    {g.name.charAt(0)}
                                 </div>
                                 <div className="text-left">
                                   <span className="text-lg font-bold text-white block tracking-tight">{g.name}</span>
                                   <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-2">{g.members.length} Members • {g.groupCode}</span>
                                 </div>
                               </div>
                               <div className="flex items-center gap-3">
                                  <div className="px-4 py-2 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                                     <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Active</span>
                                  </div>
                               </div>
                            </div>
                         ))}
                         {myGroups.length === 0 && (
                            <div className="p-20 text-center border border-dashed border-white/[0.05] rounded-[2rem] text-zinc-800 text-[10px] uppercase font-bold tracking-[0.5em]">
                               No groups joined
                            </div>
                         )}
                      </div>
                   </div>
                </div>

                <section className="space-y-10">
                   <div className="flex items-center gap-4 px-2">
                      <div className="h-px flex-1 bg-white/[0.05]" />
                      <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.5em]">Public Groups</h3>
                      <div className="h-px flex-1 bg-white/[0.05]" />
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {publicGroups.filter(g => !g.members.includes(user.uid)).map(g => (
                         <div key={g.id} className="p-10 bg-zinc-900/10 border border-white/[0.05] rounded-[2.5rem] flex flex-col justify-between hover:bg-zinc-900/20 transition-all duration-700 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-nexus-electric/5 blur-[40px] rounded-full pointer-events-none" />
                            <div className="relative z-10 mb-8">
                               <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl font-bold text-white mb-6">
                                  {g.name.charAt(0)}
                               </div>
                               <h4 className="text-xl font-bold text-white tracking-tight mb-2">{g.name}</h4>
                               <p className="text-[11px] text-zinc-600 leading-relaxed line-clamp-2">{g.description}</p>
                            </div>
                            <div className="relative z-10 flex items-center justify-between">
                               <span className="text-[9px] text-zinc-700 font-bold uppercase tracking-widest">{g.members.length} Members</span>
                               <button 
                                  onClick={() => dbService.joinGroupByCode(user.uid, g.groupCode)}
                                  className="px-6 py-2.5 bg-white text-black text-[9px] font-bold rounded-xl uppercase tracking-widest shadow-2xl hover:bg-nexus-electric hover:text-white transition-all duration-500"
                               >
                                  Join
                               </button>
                            </div>
                         </div>
                      ))}
                   </div>
                </section>

                {showCreateGroup && (
                   <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl animate-fade-in">
                      <div className="w-full max-w-lg bg-zinc-950 border border-white/[0.05] rounded-[3rem] p-12 shadow-2xl relative overflow-hidden animate-slide-up">
                         <div className="absolute top-0 right-0 w-64 h-64 bg-nexus-electric/5 blur-[80px] rounded-full pointer-events-none" />
                         <div className="flex justify-between items-center mb-10 relative z-10">
                            <h3 className="text-xl font-bold text-white uppercase tracking-[0.2em]">New Collective</h3>
                            <button onClick={() => setShowCreateGroup(false)} className="p-3 text-zinc-600 hover:text-white bg-white/[0.03] rounded-2xl transition-all"><X className="w-5 h-5" /></button>
                         </div>
                         <form onSubmit={handleCreateGroup} className="space-y-8 relative z-10">
                            <div className="space-y-4">
                               <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.3em] ml-2">Group Name</label>
                               <input 
                                 value={newGroupName} 
                                 onChange={e => setNewGroupName(e.target.value)} 
                                 className="w-full bg-white/[0.02] border border-white/[0.05] rounded-2xl px-6 py-4 text-white focus:border-nexus-electric/30 outline-none transition-all placeholder:text-zinc-800" 
                                 placeholder="e.g. Quantum Physics Elite" 
                               />
                            </div>
                            <div className="space-y-4">
                               <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.3em] ml-2">Description</label>
                               <textarea 
                                 value={newGroupDesc} 
                                 onChange={e => setNewGroupDesc(e.target.value)} 
                                 className="w-full bg-white/[0.02] border border-white/[0.05] rounded-2xl px-6 py-4 text-white focus:border-nexus-electric/30 outline-none transition-all placeholder:text-zinc-800 h-32 resize-none" 
                                 placeholder="What is this group about?" 
                               />
                            </div>
                            <button type="submit" className="w-full py-5 bg-white text-black rounded-2xl font-bold uppercase tracking-[0.3em] text-[10px] hover:bg-nexus-electric hover:text-white transition-all duration-500 shadow-2xl">
                               Initialize Collective
                            </button>
                         </form>
                      </div>
                   </div>
                )}
              </div>
            )}

           </div>
        </main>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
          <div className="w-full max-w-2xl bg-zinc-950 border border-white/[0.05] rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">
            <button onClick={() => setSelectedUser(null)} className="absolute top-8 right-8 p-2.5 text-zinc-600 hover:text-white bg-white/[0.03] rounded-xl transition-all z-10"><X className="w-5 h-5" /></button>
            
            <div className="flex items-center gap-8 mb-10">
              <div className="relative">
                <div className="w-28 h-28 rounded-[2rem] border border-white/10 p-1 bg-gradient-to-br from-white/10 to-transparent">
                   <img src={selectedUser.avatar} className="w-full h-full rounded-[1.75rem] object-cover shadow-2xl" alt={selectedUser.name} />
                </div>
                <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-black ${selectedUser.status === 'online' ? 'bg-emerald-500' : selectedUser.status === 'studying' ? 'bg-nexus-electric' : 'bg-zinc-700'}`} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">{selectedUser.name}</h2>
                <p className="text-nexus-electric text-[10px] font-bold uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                  <Zap className="w-3 h-3" /> Level {selectedUser.level || 1} • {selectedUser.xp || 0} XP
                </p>
                <div className="flex gap-3 mt-5">
                  <div className="px-4 py-1.5 bg-white/[0.02] border border-white/[0.05] rounded-xl flex items-center gap-2">
                    <Flame className="w-3 h-3 text-orange-500" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">{selectedUser.streak || 0} Day Streak</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-10">
              <div className="grid grid-cols-2 gap-6">
                <div className="p-8 bg-white/[0.02] border border-white/[0.03] rounded-[2rem] space-y-4 group hover:bg-white/[0.04] transition-all duration-500">
                  <div className="flex items-center gap-3 text-zinc-600 group-hover:text-nexus-electric transition-colors">
                    <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center border border-white/5">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">Tasks</span>
                  </div>
                  <p className="text-4xl font-bold text-white tracking-tighter">{selectedUserStats?.tasks.filter(t => t.status === 'DONE').length || 0}</p>
                </div>
                <div className="p-8 bg-white/[0.02] border border-white/[0.03] rounded-[2rem] space-y-4 group hover:bg-white/[0.04] transition-all duration-500">
                  <div className="flex items-center gap-3 text-zinc-600 group-hover:text-nexus-violet transition-colors">
                    <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center border border-white/5">
                      <Activity className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">Sessions</span>
                  </div>
                  <p className="text-4xl font-bold text-white tracking-tighter">{selectedUserStats?.sessions.length || 0}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-8 rounded-[2rem] bg-zinc-900/10 border border-white/[0.03] backdrop-blur-xl flex flex-col shadow-2xl">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-[10px] font-black text-zinc-500 flex items-center gap-3 uppercase tracking-[0.3em]">
                            <CalendarIcon className="w-4 h-4 text-nexus-electric" />
                            History
                        </h3>
                        <div className="flex items-center gap-3 bg-black/40 p-1 rounded-xl border border-white/[0.05]">
                            <button onClick={() => {
                                const d = new Date(selectedUserCalendarDate);
                                d.setMonth(d.getMonth() - 1);
                                setSelectedUserCalendarDate(d);
                            }} className="p-1.5 hover:bg-white/5 text-zinc-500 rounded-lg transition-all"><ChevronLeft className="w-4 h-4" /></button>
                            <span className="text-[8px] font-black text-white uppercase tracking-widest min-w-[70px] text-center">
                                {selectedUserCalendarDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                            </span>
                            <button onClick={() => {
                                const d = new Date(selectedUserCalendarDate);
                                d.setMonth(d.getMonth() + 1);
                                setSelectedUserCalendarDate(d);
                            }} className="p-1.5 hover:bg-white/5 text-zinc-500 rounded-lg transition-all"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                    </div>

                    <div className="flex-1 grid grid-cols-7 gap-2 text-center">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                            <div key={`${d}-${i}`} className="text-[8px] font-black text-zinc-700 uppercase tracking-widest mb-3">{d}</div>
                        ))}
                        {selectedUserCalendarDays.map((d, i) => (
                            d ? (
                                <button
                                    key={d.date}
                                    onClick={() => setSelectedUserSelectedDay(d.date)}
                                    className={`
                                        aspect-square rounded-xl border flex flex-col items-center justify-center gap-1 transition-all duration-500 relative group
                                        ${selectedUserSelectedDay === d.date ? 'bg-nexus-electric border-nexus-electric shadow-2xl shadow-nexus-electric/20 scale-105' : 'bg-black/20 border-white/[0.03] hover:border-white/[0.1] hover:bg-black/40'}
                                    `}
                                >
                                    <span className={`text-[10px] font-bold ${selectedUserSelectedDay === d.date ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-400'}`}>{d.day}</span>
                                    {d.totalMins > 0 && (
                                        <div 
                                            className={`w-1 h-1 rounded-full ${selectedUserSelectedDay === d.date ? 'bg-white' : 'bg-nexus-electric shadow-[0_0_8px_rgba(var(--nexus-accent-rgb),0.8)]'}`} 
                                        />
                                    )}
                                </button>
                            ) : (
                                <div key={`empty-${i}`} className="aspect-square opacity-0" />
                            )
                        ))}
                    </div>
                </div>

                <div className="p-8 rounded-[2rem] bg-zinc-900/10 border border-white/[0.03] backdrop-blur-xl flex flex-col relative overflow-hidden group shadow-2xl">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h4 className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-2">Intelligence</h4>
                            <h3 className="text-sm font-bold text-white tracking-tight uppercase tracking-widest">{selectedUserAnalysisData?.title}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-black border border-white/[0.05] flex items-center justify-center">
                            <Layers className="w-5 h-5 text-nexus-electric" />
                        </div>
                    </div>

                    <div className="flex-1 space-y-8 overflow-y-auto custom-scrollbar pr-2">
                        {selectedUserAnalysisData?.subjectBreakdown.length ? (
                            <div className="space-y-6">
                                {selectedUserAnalysisData.subjectBreakdown.map((sub, i) => (
                                    <div key={sub.name} className="space-y-2.5 animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                                        <div className="flex justify-between items-end">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-lg bg-black flex items-center justify-center border border-white/[0.05]">
                                                    <Zap className="w-3 h-3 text-nexus-violet" />
                                                </div>
                                                <span className="text-[10px] font-bold text-white uppercase tracking-widest">{sub.name}</span>
                                            </div>
                                            <span className="text-[9px] font-mono text-zinc-500 uppercase">{formatDuration(sub.duration)}</span>
                                        </div>
                                        <div className="h-1 bg-black/60 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-nexus-electric rounded-full transition-all duration-1000" 
                                                style={{ width: `${Math.min(100, (sub.duration / (selectedUserAnalysisData.totalSeconds/60)) * 100)}%` }} 
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-10">
                                <Search className="w-10 h-10 text-zinc-500" />
                                <p className="text-[9px] font-black uppercase tracking-[0.5em]">No Data Logs</p>
                            </div>
                        )}
                    </div>

                    {selectedUserAnalysisData && selectedUserAnalysisData.totalSeconds > 0 && (
                        <div className="mt-8 pt-6 border-t border-white/[0.03]">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[9px] font-black text-zinc-700 uppercase tracking-widest mb-1">Total Sync Time</p>
                                    <p className="text-2xl font-bold text-white leading-none tracking-tighter">
                                        {formatDuration(selectedUserAnalysisData.totalSeconds / 60)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-white/[0.03] flex gap-4">
              <button 
                onClick={() => setSelectedUser(null)}
                className="flex-1 py-3.5 bg-white/[0.02] border border-white/[0.05] text-zinc-400 text-[9px] font-bold uppercase tracking-widest rounded-xl hover:bg-white/[0.05] hover:text-white transition-all duration-500 active:scale-95"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedGroup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
          <div className="w-full max-w-2xl bg-zinc-950 border border-white/[0.05] rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">
            <button onClick={() => setSelectedGroup(null)} className="absolute top-8 right-8 p-2.5 text-zinc-600 hover:text-white bg-white/[0.03] rounded-xl transition-all z-10"><X className="w-5 h-5" /></button>
            
            <div className="flex items-center gap-8 mb-10">
              <div className="w-24 h-24 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center text-4xl font-bold text-white shadow-2xl">
                {selectedGroup.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-white tracking-tight">{selectedGroup.name}</h2>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">
                  CODE: {selectedGroup.groupCode} • {selectedGroup.members.length} Members
                </p>
              </div>
              <div className="flex p-1 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                <button 
                  onClick={() => setGroupModalTab('info')}
                  className={`px-6 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all ${groupModalTab === 'info' ? 'bg-white text-black shadow-xl' : 'text-zinc-500 hover:text-white'}`}
                >
                  Info
                </button>
                <button 
                  onClick={() => setGroupModalTab('chat')}
                  className={`px-6 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all ${groupModalTab === 'chat' ? 'bg-white text-black shadow-xl' : 'text-zinc-500 hover:text-white'}`}
                >
                  Chat
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-8">
              {groupModalTab === 'info' ? (
                <>
                  <div className="p-8 bg-white/[0.02] border border-white/[0.03] rounded-[2rem]">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mb-4">Description</h4>
                    <p className="text-sm text-zinc-400 leading-relaxed">{selectedGroup.description || 'No description provided.'}</p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] ml-2">Members</h4>
                    <div className="grid grid-cols-1 gap-3">
                      {(selectedGroup.members as unknown as UserProfile[]).map(member => (
                        <div 
                          key={member.uid} 
                          onClick={() => {
                            setSelectedGroup(null);
                            handleViewUser(member);
                          }}
                          className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl hover:bg-white/[0.05] transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-4">
                            <img src={member.avatar} className="w-10 h-10 rounded-xl object-cover" alt={member.name} />
                            <div>
                              <p className="text-sm font-bold text-white">{member.name}</p>
                              <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">Level {member.level || 1}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Flame className="w-3 h-3 text-orange-500" />
                            <span className="text-xs font-bold text-white">{member.streak || 0}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col">
                  <div className="flex-1 space-y-4 mb-4 overflow-y-auto custom-scrollbar pr-2 min-h-[300px]">
                    {groupMessages.map((msg) => {
                      const isMe = msg.senderId === user.uid;
                      return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">{msg.senderName}</span>
                            <span className="text-[8px] text-zinc-800 font-mono">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className={`px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-nexus-electric text-white rounded-tr-none' : 'bg-white/5 text-zinc-300 rounded-tl-none border border-white/5'}`}>
                            {msg.text}
                          </div>
                        </div>
                      );
                    })}
                    {groupMessages.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full opacity-20 py-20">
                        <MessageSquare className="w-12 h-12 mb-4" />
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em]">No messages yet</p>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <form onSubmit={handleSendMessage} className="relative">
                    <input 
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="w-full bg-white/[0.02] border border-white/[0.05] rounded-2xl px-6 py-4 text-white focus:border-nexus-electric/30 outline-none transition-all placeholder:text-zinc-800"
                    />
                    <button 
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-nexus-electric text-white rounded-xl hover:bg-nexus-violet transition-all disabled:opacity-20"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-white/[0.03]">
              <button 
                onClick={() => setSelectedGroup(null)}
                className="w-full py-4 bg-white/[0.02] border border-white/[0.05] text-zinc-400 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-white/[0.05] hover:text-white transition-all"
              >
                Close Collective
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
