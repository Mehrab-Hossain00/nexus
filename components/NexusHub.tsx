
import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Plus, MessageSquare, Send, Globe, Lock, Trash2, 
  Brain, Zap, Sparkles, Loader2, X, Heart, MessageCircle, 
  MoreHorizontal, Image as ImageIcon, Search, ArrowLeft, 
  Check, Camera, Compass, Home, Bookmark, Shield, User,
  Mail, Settings, Filter, TrendingUp, UserPlus, Clock
} from 'lucide-react';
import { UserProfile, StudyGroup, SocialPost, DirectMessage, PostComment } from '../types.ts';
import { dbService } from '../services/dbService.ts';
import { collection, query, orderBy, onSnapshot, addDoc, doc, limit, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase.ts';
import { GoogleGenAI } from "@google/genai";

interface NexusHubProps {
  user: UserProfile;
}

type HubTab = 'feed' | 'find' | 'messages';

export const NexusHub: React.FC<NexusHubProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<HubTab>('feed');
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [friendsList, setFriendsList] = useState<UserProfile[]>([]);
  const [currentUserData, setCurrentUserData] = useState<UserProfile>(user);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingRequestsSent, setPendingRequestsSent] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [statusInput, setStatusInput] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [generateVibe, setGenerateVibe] = useState(false);
  
  const [activeDM, setActiveDM] = useState<UserProfile | null>(null);
  const [dmMessages, setDmMessages] = useState<DirectMessage[]>([]);
  const [dmInput, setDmInput] = useState('');

  const [selectedPostComments, setSelectedPostComments] = useState<{ postId: string, comments: PostComment[] } | null>(null);
  const [commentInput, setCommentInput] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync current user data and friends list
  useEffect(() => {
    const unsubUser = onSnapshot(doc(db, 'users', user.uid), async (snap) => {
      const data = snap.data() as UserProfile;
      if (data) {
        setCurrentUserData(data);
        if (data.friends?.length) {
          const fSnap = await getDocs(query(collection(db, 'users'), where('uid', 'in', data.friends)));
          setFriendsList(fSnap.docs.map(d => d.data() as UserProfile));
        } else {
          setFriendsList([]);
        }
      }
    });

    const unsubPosts = onSnapshot(query(collection(db, 'posts'), orderBy('timestamp', 'desc'), limit(50)), (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as SocialPost)));
      setIsLoading(false);
    });

    return () => { unsubUser(); unsubPosts(); };
  }, [user.uid]);

  // Handle Search logic - Fetch and filter client-side for case-insensitivity
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      setIsSearching(true);
      const delay = setTimeout(async () => {
        try {
          const snap = await getDocs(collection(db, 'users'));
          const allUsers = snap.docs.map(d => d.data() as UserProfile);
          const filtered = allUsers.filter(u => 
            u.uid !== user.uid && 
            u.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
          setSearchResults(filtered);
        } catch (err) {
          console.error("Search failed:", err);
        } finally {
          setIsSearching(false);
        }
      }, 300);
      return () => clearTimeout(delay);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery, user.uid]);

  useEffect(() => {
    if (activeDM) {
      const unsub = onSnapshot(collection(db, 'direct_messages'), (snap) => {
        const msgs = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as DirectMessage))
          .filter(m => 
            (m.senderId === user.uid && m.receiverId === activeDM.uid) || 
            (m.senderId === activeDM.uid && m.receiverId === user.uid)
          )
          .sort((a, b) => a.timestamp - b.timestamp);
        setDmMessages(msgs);
        
        msgs.filter(m => !m.seen && m.receiverId === user.uid).forEach(m => dbService.markAsSeen(m.id));
      });
      return unsub;
    }
  }, [activeDM, user.uid]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusInput.trim()) return;
    setIsPosting(true);
    
    let imageUrl = undefined;
    if (generateVibe) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: `A clean, aesthetic, modern study room background related to: ${statusInput.slice(0, 40)}. Natural light, high quality.` }] },
            config: { imageConfig: { aspectRatio: "1:1" } }
        });
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) { imageUrl = `data:image/png;base64,${part.inlineData.data}`; break; }
            }
        }
      } catch (err) { console.warn("Image gen failed"); }
    }

    await dbService.createPost({
      userId: user.uid,
      userName: user.name,
      userAvatar: user.avatar || '',
      type: 'manual',
      content: statusInput,
      imageUrl
    });
    
    setStatusInput('');
    setGenerateVibe(false);
    setIsPosting(false);
  };

  const handleSendFriendRequest = async (target: UserProfile) => {
    if (pendingRequestsSent.includes(target.uid)) return;
    try {
      await dbService.sendFriendRequest(target.uid, currentUserData);
      setPendingRequestsSent(prev => [...prev, target.uid]);
    } catch (err) {
      console.error("Friend request error:", err);
    }
  };

  const handleReact = async (postId: string, emoji: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const reaction = post.reactions.find(r => r.emoji === emoji);
    const hasReacted = reaction?.uids.includes(user.uid);
    await dbService.addReaction(postId, emoji, user.uid, !hasReacted);
  };

  const handleOpenComments = async (postId: string) => {
    const q = query(collection(db, 'posts', postId, 'comments'), orderBy('timestamp', 'asc'));
    const snap = await getDocs(q);
    setSelectedPostComments({
      postId,
      comments: snap.docs.map(d => ({ id: d.id, ...d.data() } as PostComment))
    });
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !selectedPostComments) return;
    
    try {
      await dbService.addComment(selectedPostComments.postId, {
        userId: user.uid,
        userName: user.name,
        userAvatar: user.avatar || '',
        text: commentInput
      });
      
      setCommentInput('');
      handleOpenComments(selectedPostComments.postId);
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  const handleSendDM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmInput.trim() || !activeDM) return;
    await dbService.sendDM({
        senderId: user.uid,
        receiverId: activeDM.uid,
        text: dmInput
    });
    setDmInput('');
  };

  return (
    <div className="h-full flex flex-col bg-nexus-black animate-fade-in relative overflow-hidden">
      <nav className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/5 backdrop-blur-3xl bg-black/40 sticky top-0 z-40">
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 rounded-lg bg-nexus-electric/20 flex items-center justify-center border border-nexus-electric/30">
              <Sparkles className="w-5 h-5 text-nexus-electric" />
           </div>
           <h1 className="text-xl font-black text-white tracking-tighter">Social Hub</h1>
        </div>
        
        <div className="flex bg-zinc-900/60 p-1 rounded-2xl border border-white/5 shadow-inner">
           <button onClick={() => setActiveTab('feed')} className={`px-5 py-2 rounded-xl flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'feed' ? 'bg-white text-black shadow-lg scale-105' : 'text-zinc-500 hover:text-zinc-300'}`}>
              <Home className="w-3.5 h-3.5" /> Feed
           </button>
           <button onClick={() => setActiveTab('find')} className={`px-5 py-2 rounded-xl flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'find' ? 'bg-white text-black shadow-lg scale-105' : 'text-zinc-500 hover:text-zinc-300'}`}>
              <Search className="w-3.5 h-3.5" /> Find People
           </button>
           <button onClick={() => setActiveTab('messages')} className={`px-5 py-2 rounded-xl flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'messages' ? 'bg-white text-black shadow-lg scale-105' : 'text-zinc-500 hover:text-zinc-300'}`}>
              <Mail className="w-3.5 h-3.5" /> Messages
           </button>
        </div>

        <div className="flex items-center gap-4">
           <div className="hidden lg:flex flex-col items-end mr-2">
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">{user.name}</span>
              <div className="flex items-center gap-1 mt-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-nexus-electric animate-pulse shadow-[0_0_8px_rgba(var(--nexus-accent-rgb),0.8)]" />
                 <span className="text-[8px] text-nexus-electric font-black uppercase tracking-widest">Active</span>
              </div>
           </div>
           <img src={user.avatar} className="w-9 h-9 rounded-xl border border-white/10 ring-1 ring-white/5" alt="Profile" />
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        <main className={`flex-1 overflow-y-auto custom-scrollbar ${activeTab === 'messages' ? 'p-0' : 'p-6'}`}>
          <div className={`${activeTab === 'messages' ? 'w-full h-full' : 'max-w-2xl mx-auto pb-32 space-y-8'}`}>
            
            {activeTab === 'feed' && (
              <>
                <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar scroll-smooth">
                   <button onClick={() => setActiveTab('find')} className="flex flex-col items-center gap-2 shrink-0 group">
                      <div className="w-16 h-16 rounded-full p-1 border-2 border-dashed border-white/20 flex items-center justify-center hover:border-nexus-electric transition-all bg-black/20">
                         <Plus className="w-6 h-6 text-zinc-500 group-hover:text-nexus-electric" />
                      </div>
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Add Friend</span>
                   </button>
                   {friendsList.map(u => (
                      <button key={u.uid} onClick={() => { setActiveDM(u); setActiveTab('messages'); }} className="flex flex-col items-center gap-2 shrink-0 group">
                         <div className={`w-16 h-16 rounded-full p-1 border-2 transition-all ${u.status === 'studying' ? 'border-nexus-electric shadow-[0_0_12px_rgba(var(--nexus-accent-rgb),0.3)]' : 'border-white/10'}`}>
                            <div className="w-full h-full rounded-full overflow-hidden bg-black border border-white/5 relative">
                               <img src={u.avatar} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={u.name} />
                               {u.status === 'studying' && <div className="absolute inset-0 bg-nexus-electric/20 flex items-center justify-center animate-pulse"><Zap className="w-4 h-4 text-white fill-white" /></div>}
                            </div>
                         </div>
                         <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest truncate w-16 text-center">{u.name.split(' ')[0]}</span>
                      </button>
                   ))}
                </div>

                <div className="bg-zinc-900/30 border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-2xl relative overflow-hidden group shadow-2xl">
                   <form onSubmit={handleCreatePost} className="space-y-6">
                      <div className="flex gap-5">
                         <img src={user.avatar} className="w-12 h-12 rounded-2xl border border-white/10 shadow-lg" alt="Your Avatar" />
                         <textarea 
                            value={statusInput}
                            onChange={e => setStatusInput(e.target.value)}
                            placeholder="Share your progress..."
                            className="flex-1 bg-transparent border-none text-white text-lg placeholder:text-zinc-600 resize-none outline-none py-2 h-20 font-medium"
                         />
                      </div>
                      <div className="flex justify-between items-center pt-6 border-t border-white/5">
                         <div className="flex gap-4">
                            <button type="button" onClick={() => setGenerateVibe(!generateVibe)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${generateVibe ? 'bg-nexus-electric text-white border-nexus-electric shadow-lg shadow-nexus-electric/20' : 'bg-black/40 border-white/5 text-zinc-500 hover:text-white'}`}>
                               <Sparkles className="w-3 h-3" /> AI Post Art
                            </button>
                         </div>
                         <button disabled={isPosting || !statusInput.trim()} type="submit" className="px-8 py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50 flex items-center gap-2">
                            {isPosting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Post Update'}
                         </button>
                      </div>
                   </form>
                </div>

                <div className="space-y-10">
                   {posts.map(post => (
                      <div key={post.id} className="bg-zinc-900/20 border border-white/5 rounded-[2.5rem] overflow-hidden group transition-all hover:bg-zinc-900/30">
                         <div className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                               <img src={post.userAvatar} className="w-11 h-11 rounded-2xl border border-white/10 shadow-lg" alt={post.userName} />
                               <div>
                                  <h4 className="text-sm font-bold text-white flex items-center gap-2 tracking-tight">{post.userName}</h4>
                                  <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                                     {new Date(post.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Update
                                  </p>
                               </div>
                            </div>
                            <button className="p-2.5 hover:bg-white/5 rounded-xl text-zinc-600 transition-colors"><MoreHorizontal className="w-5 h-5" /></button>
                         </div>

                         {post.imageUrl && (
                            <div className="mx-6 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl">
                               <img src={post.imageUrl} className="w-full aspect-square object-cover" alt="Post media" />
                            </div>
                         )}

                         {post.type === 'session_complete' && !post.imageUrl && (
                            <div className="mx-6 p-8 bg-nexus-electric/5 border border-nexus-electric/10 rounded-[2rem] flex justify-between items-center relative overflow-hidden group/session">
                               <div className="flex items-center gap-6 relative z-10">
                                  <div className="w-14 h-14 rounded-2xl bg-black border border-white/10 flex items-center justify-center shadow-xl">
                                     <Zap className="w-7 h-7 text-nexus-electric fill-nexus-electric" />
                                  </div>
                                  <div>
                                     <p className="text-[10px] font-black text-nexus-electric uppercase tracking-widest mb-1">Session Complete</p>
                                     <h5 className="text-3xl font-black text-white">{Math.round(post.duration! / 60)}<span className="text-sm text-zinc-500 ml-1">MINS</span></h5>
                                  </div>
                               </div>
                               <div className="text-right relative z-10">
                                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Subject</p>
                                  <p className="text-lg font-black text-white uppercase tracking-tighter">{post.subject}</p>
                               </div>
                            </div>
                         )}

                         <div className="p-8">
                            <div className="text-base text-zinc-300 leading-relaxed font-medium">{post.content}</div>
                            <div className="flex items-center gap-6 mt-8 pt-6 border-t border-white/5">
                               <div className="flex gap-2">
                                  {post.reactions.map(r => (
                                     <button key={r.emoji} onClick={() => handleReact(post.id, r.emoji)} className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 border ${r.uids.includes(user.uid) ? 'bg-nexus-electric/20 border-nexus-electric text-white scale-105' : 'bg-black/40 border-white/5 text-zinc-500 hover:border-white/10'}`}>
                                        {r.emoji} <span className="font-mono">{r.count}</span>
                                     </button>
                                  ))}
                               </div>
                               <button onClick={() => handleOpenComments(post.id)} className="text-zinc-500 hover:text-white transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                  <MessageCircle className="w-4 h-4" /> {post.commentCount} Comments
                                </button>
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
              </>
            )}

            {activeTab === 'find' && (
              <div className="space-y-12 pb-32 animate-fade-in">
                 <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center">
                       {isSearching ? <Loader2 className="w-6 h-6 text-nexus-electric animate-spin" /> : <Search className="w-6 h-6 text-zinc-500 group-focus-within:text-nexus-electric transition-colors" />}
                    </div>
                    <input 
                      value={searchQuery} 
                      onChange={e => setSearchQuery(e.target.value)} 
                      className="w-full bg-zinc-900/30 border border-white/10 rounded-[2rem] pl-16 pr-8 py-5 text-white focus:border-nexus-electric/50 outline-none transition-all placeholder:text-zinc-600 text-lg shadow-xl" 
                      placeholder="Search for people by name..." 
                    />
                 </div>
                 
                 {searchResults.length > 0 ? (
                   <section className="animate-slide-up">
                      <div className="flex items-center gap-2 mb-6 px-2">
                         <Users className="w-4 h-4 text-nexus-electric" />
                         <h3 className="text-xs font-black text-white uppercase tracking-[0.4em]">Search Results</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {searchResults.map(u => {
                          const isFriend = currentUserData.friends?.includes(u.uid);
                          const isPending = pendingRequestsSent.includes(u.uid);
                          return (
                            <div key={u.uid} className="p-6 bg-zinc-900/20 border border-white/10 rounded-[2.5rem] flex items-center justify-between hover:bg-zinc-900/30 transition-all group">
                              <div className="flex items-center gap-4">
                                <img src={u.avatar} className="w-12 h-12 rounded-2xl border border-white/5 group-hover:scale-105 transition-transform" alt={u.name} />
                                <div className="text-left">
                                  <span className="text-sm font-bold text-white block">{u.name}</span>
                                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{u.status || 'Offline'}</span>
                                </div>
                              </div>
                              {isFriend ? (
                                <span className="px-4 py-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest border border-white/5 rounded-xl bg-black/20">Already Friends</span>
                              ) : isPending ? (
                                <span className="px-4 py-2 text-[10px] text-nexus-electric font-bold uppercase tracking-widest border border-nexus-electric/20 rounded-xl bg-nexus-electric/10">Pending...</span>
                              ) : (
                                <button 
                                  onClick={() => handleSendFriendRequest(u)} 
                                  className="px-6 py-2 bg-nexus-electric text-white text-[10px] font-bold rounded-xl uppercase tracking-widest shadow-lg hover:bg-nexus-violet transition-all active:scale-95 flex items-center gap-2"
                                >
                                  <UserPlus className="w-3 h-3" /> Add Friend
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                   </section>
                 ) : searchQuery.length > 1 && !isSearching && (
                    <div className="p-12 text-center border border-dashed border-white/5 rounded-[2.5rem] text-zinc-600 animate-fade-in">
                       No results found for "{searchQuery}"
                    </div>
                 )}

                 <section>
                    <div className="flex items-center gap-2 mb-8 px-2">
                       <Clock className="w-4 h-4 text-emerald-400" />
                       <h3 className="text-xs font-black text-white uppercase tracking-[0.4em]">Friend Requests</h3>
                    </div>
                    {(currentUserData.friendRequests || []).length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                         {currentUserData.friendRequests?.map(r => (
                           <div key={r.from} className="p-6 bg-zinc-900/30 border border-white/10 rounded-[2.5rem] flex items-center justify-between hover:bg-zinc-900/40 transition-all shadow-xl">
                             <div className="flex items-center gap-4">
                               <img src={r.avatar} className="w-14 h-14 rounded-2xl border border-white/5" alt={r.name} />
                               <div className="text-left">
                                  <span className="text-sm font-bold text-white block">{r.name}</span>
                                  <span className="text-[10px] text-nexus-electric font-bold uppercase tracking-widest">Requested to connect</span>
                               </div>
                             </div>
                             <div className="flex flex-col gap-2">
                               <button 
                                  onClick={() => dbService.acceptFriendRequest(user.uid, r.from)} 
                                  className="px-6 py-2 bg-white text-black text-[10px] font-bold rounded-xl uppercase tracking-widest shadow-lg hover:bg-zinc-200 transition-all active:scale-95"
                               >
                                  Accept
                               </button>
                             </div>
                           </div>
                         ))}
                      </div>
                    ) : (
                      <div className="p-16 text-center border border-dashed border-white/5 rounded-[2.5rem] text-zinc-600 italic animate-fade-in bg-zinc-900/5">
                        Your inbox is empty. Search for friends above to grow your network.
                      </div>
                    )}
                 </section>
              </div>
            )}

            {activeTab === 'messages' && (
               <div className="w-full h-full flex animate-fade-in">
                  <aside className="w-80 border-r border-white/10 flex flex-col bg-black/40 backdrop-blur-3xl shadow-2xl">
                     <div className="p-8 border-b border-white/5 flex items-center justify-between">
                        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Direct Messages</h3>
                        <Filter className="w-4 h-4 text-zinc-500" />
                     </div>
                     <div className="flex-1 p-3 space-y-2 overflow-y-auto custom-scrollbar">
                        {friendsList.map(u => (
                           <button 
                              key={u.uid} 
                              onClick={() => setActiveDM(u)}
                              className={`w-full flex items-center gap-4 p-4 rounded-[1.5rem] transition-all relative group ${activeDM?.uid === u.uid ? 'bg-nexus-electric/10 border border-nexus-electric/20 scale-[1.02] shadow-lg' : 'hover:bg-white/5'}`}
                           >
                              <div className="relative shrink-0">
                                 <img src={u.avatar} className="w-12 h-12 rounded-[1rem] border border-white/10 shadow-lg" alt={u.name} />
                                 <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-black shadow-lg ${u.status === 'online' ? 'bg-emerald-500' : u.status === 'studying' ? 'bg-nexus-electric' : u.status === 'break' ? 'bg-amber-500' : 'bg-zinc-700'}`} />
                              </div>
                              <div className="text-left min-w-0">
                                 <p className="text-xs font-bold text-white truncate uppercase tracking-widest">{u.name}</p>
                                 <p className="text-[9px] text-zinc-500 font-bold uppercase truncate tracking-tighter mt-1">{u.status === 'studying' ? `Studying ${u.currentSubject}` : u.status || 'Offline'}</p>
                              </div>
                           </button>
                        ))}
                        {friendsList.length === 0 && (
                          <div className="p-8 text-center text-zinc-600 text-[10px] uppercase font-bold tracking-widest">
                             No friends connected yet.
                          </div>
                        )}
                     </div>
                  </aside>

                  <div className="flex-1 flex flex-col relative bg-nexus-black shadow-inner">
                     {activeDM ? (
                        <>
                           <header className="p-8 border-b border-white/5 flex items-center justify-between bg-black/20 backdrop-blur-3xl shadow-sm">
                              <div className="flex items-center gap-5">
                                 <div className="relative">
                                    <img src={activeDM.avatar} className="w-12 h-12 rounded-[1rem] border border-white/10 shadow-2xl" alt={activeDM.name} />
                                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-black shadow-xl ${activeDM.status === 'online' ? 'bg-emerald-500' : activeDM.status === 'studying' ? 'bg-nexus-electric' : 'bg-zinc-700'}`} />
                                 </div>
                                 <div>
                                    <h2 className="text-sm font-bold text-white uppercase tracking-[0.2em] leading-none">{activeDM.name}</h2>
                                    <p className="text-[9px] text-nexus-electric font-bold uppercase tracking-[0.3em] mt-1.5 flex items-center gap-1.5">
                                      {activeDM.status === 'studying' ? <><Zap className="w-2.5 h-2.5" /> Studying {activeDM.currentSubject}</> : activeDM.status || 'Offline'}
                                    </p>
                                 </div>
                              </div>
                              <button onClick={() => setActiveDM(null)} className="p-3 bg-white/5 rounded-2xl text-zinc-500 hover:text-white transition-all shadow-xl active:scale-90"><X className="w-4 h-4" /></button>
                           </header>

                           <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-[radial-gradient(circle_at_center,rgba(var(--nexus-accent-rgb),0.03)_0%,transparent_70%)]">
                              {dmMessages.map((m) => (
                                 <div key={m.id} className={`flex flex-col ${m.senderId === user.uid ? 'items-end' : 'items-start'} animate-slide-up`}>
                                    <div className={`px-5 py-3 rounded-[1.5rem] max-w-[80%] text-sm border shadow-2xl transition-all ${m.senderId === user.uid ? 'bg-nexus-electric/20 border-nexus-electric/30 text-white rounded-tr-none shadow-nexus-electric/10' : 'bg-zinc-800/80 border-white/10 text-zinc-200 rounded-tl-none shadow-black/40'}`}>
                                       {m.text}
                                    </div>
                                    <div className="flex items-center gap-2 mt-2 px-1">
                                      <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                      {m.senderId === user.uid && m.seen && <Check className="w-2.5 h-2.5 text-nexus-electric" />}
                                    </div>
                                 </div>
                              ))}
                              <div ref={scrollRef} />
                           </div>

                           <form onSubmit={handleSendDM} className="p-8 bg-black/40 border-t border-white/10 flex gap-4 backdrop-blur-3xl">
                              <input 
                                value={dmInput} 
                                onChange={e => setDmInput(e.target.value)} 
                                placeholder="Type a message..." 
                                className="flex-1 bg-black/60 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-nexus-electric/50 outline-none transition-all placeholder:text-zinc-700 shadow-inner" 
                              />
                              <button type="submit" className="p-5 bg-white text-black rounded-2xl shadow-2xl active:scale-95 hover:bg-nexus-electric hover:text-white transition-all transform hover:-rotate-12">
                                 <Send className="w-5 h-5" />
                              </button>
                           </form>
                        </>
                     ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-20 space-y-8">
                           <div className="w-32 h-32 bg-nexus-electric/5 border border-nexus-electric/10 rounded-[3rem] flex items-center justify-center relative overflow-hidden group">
                               <div className="absolute inset-0 bg-gradient-to-tr from-nexus-electric/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                               <Mail className="w-12 h-12 text-nexus-electric group-hover:scale-110 transition-transform duration-500" />
                           </div>
                           <div className="max-w-xs">
                              <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-[0.2em]">Select a Chat</h3>
                              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.3em] leading-relaxed">Choose a friend from the sidebar to start synchronizing data.</p>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            )}

          </div>
        </main>

        {activeTab !== 'messages' && (
          <aside className="hidden lg:flex w-80 border-l border-white/10 p-8 flex-col space-y-12 overflow-y-auto custom-scrollbar bg-black/40 backdrop-blur-3xl">
             <section>
                <div className="flex items-center justify-between mb-8 px-2">
                   <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Top Students</h3>
                   <TrendingUp className="w-4 h-4 text-nexus-electric" />
                </div>
                <div className="space-y-4">
                   {friendsList.sort((a,b) => (b.xp || 0) - (a.xp || 0)).slice(0, 5).map((u, i) => (
                      <div key={u.uid} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-all group cursor-pointer border border-transparent hover:border-white/5 shadow-inner">
                         <div className="relative shrink-0">
                            <img src={u.avatar} className="w-10 h-10 rounded-xl border border-white/5 group-hover:scale-105 transition-transform" alt={u.name} />
                            <div className={`absolute -top-2 -left-2 w-6 h-6 bg-black border border-white/10 rounded-lg flex items-center justify-center text-[10px] font-black ${i === 0 ? 'text-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'text-nexus-electric'}`}>{i+1}</div>
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate uppercase tracking-widest">{u.name}</p>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{u.xp || 0} XP</p>
                         </div>
                      </div>
                   ))}
                   {friendsList.length === 0 && (
                      <div className="py-8 text-center text-zinc-700 text-[10px] font-bold uppercase tracking-widest">
                         Connect with peers to see rankings.
                      </div>
                   )}
                </div>
             </section>

             <section className="bg-nexus-electric/5 border border-nexus-electric/20 rounded-[2.5rem] p-8 relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-nexus-electric/10 blur-[40px] rounded-full pointer-events-none group-hover:scale-125 transition-transform duration-1000" />
                <div className="flex items-center gap-3 mb-4 relative z-10">
                   <Shield className="w-5 h-5 text-nexus-electric" />
                   <h4 className="text-[10px] font-bold text-white uppercase tracking-[0.3em]">Network Intelligence</h4>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed font-medium relative z-10 mb-6">
                   Your peers have focused for <span className="text-white font-black">128 hours</span> today. Join the flow.
                </p>
                <button onClick={() => setActiveTab('find')} className="w-full py-3 bg-nexus-electric text-white text-[9px] font-bold uppercase tracking-widest rounded-xl shadow-2xl hover:bg-nexus-violet transition-all active:scale-95 relative z-10">Expand Your Network</button>
             </section>

             <div className="mt-auto opacity-20 text-[8px] text-center font-black uppercase tracking-[0.5em] text-zinc-500">
                Nexus v4.2.1 Stable
             </div>
          </aside>
        )}
      </div>

      {selectedPostComments && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in">
           <div className="w-full max-w-xl bg-zinc-950 border border-white/10 rounded-t-[3rem] p-10 shadow-[0_-20px_100px_rgba(0,0,0,1)] relative overflow-hidden animate-slide-up h-[80vh] flex flex-col">
              <div className="flex justify-between items-center mb-10">
                 <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-nexus-electric" />
                    <h3 className="text-lg font-bold text-white uppercase tracking-[0.2em]">Thread Context</h3>
                 </div>
                 <button onClick={() => setSelectedPostComments(null)} className="p-3 text-zinc-500 hover:text-white bg-white/5 rounded-2xl transition-all"><X className="w-6 h-6" /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-8 mb-8">
                 {selectedPostComments.comments.map(c => (
                    <div key={c.id} className="flex gap-5 group/comment">
                       <img src={c.userAvatar} className="w-12 h-12 rounded-[1rem] border border-white/10 shrink-0 shadow-2xl group-hover:scale-105 transition-transform" alt={c.userName} />
                       <div className="flex-1 bg-white/5 rounded-2xl p-5 border border-white/5 group-hover:border-white/20 transition-all shadow-lg">
                          <div className="flex justify-between items-center mb-2">
                             <p className="text-xs font-bold text-white uppercase tracking-widest">{c.userName}</p>
                             <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">{new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          <p className="text-sm text-zinc-400 leading-relaxed font-medium">{c.text}</p>
                       </div>
                    </div>
                 ))}
                 {selectedPostComments.comments.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-20">
                       <MessageSquare className="w-16 h-16 mb-4" />
                       <p className="text-[10px] font-black uppercase tracking-[0.5em]">No Data Points in Thread</p>
                    </div>
                 )}
              </div>

              <form onSubmit={handleAddComment} className="flex gap-4 p-4 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-3xl shadow-inner">
                 <input 
                    value={commentInput} 
                    onChange={e => setCommentInput(e.target.value)} 
                    placeholder="Contribute to the analysis..." 
                    className="flex-1 bg-transparent border-none px-6 py-4 text-sm text-white focus:outline-none placeholder:text-zinc-700" 
                 />
                 <button type="submit" className="p-5 bg-nexus-electric text-white rounded-2xl shadow-2xl hover:bg-nexus-violet transition-all active:scale-95">
                    <Send className="w-5 h-5" />
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};
