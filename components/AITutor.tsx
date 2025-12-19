
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Send, Image as ImageIcon, Sparkles, MessageSquare, Trash2, Plus, Menu, X, Loader2, ShieldAlert, Edit2, Check, AlertTriangle } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { dbService } from '../services/dbService';
import { ChatMessage, ChatSession, UserProfile } from '../types';

interface AITutorProps {
  user: UserProfile;
}

export const AITutor: React.FC<AITutorProps> = ({ user }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renamingTitle, setRenamingTitle] = useState('');
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSessions = async () => {
    if (user?.uid) {
      try {
        const loaded = await dbService.getChatSessions(user.uid);
        setSessions(loaded.sort((a, b) => b.updatedAt - a.updatedAt));
      } catch (err) {
        console.error("Failed to load chats", err);
      }
    }
  };

  const initializeChat = () => {
    const session = sessions.find(s => s.id === activeSessionId);
    if (session) {
      setMessages(session.messages);
    } else {
      setMessages([]);
    }
  };

  useEffect(() => {
    if (user?.uid) loadSessions();
  }, [user?.uid]);

  useEffect(() => {
    initializeChat();
  }, [activeSessionId, sessions.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const updateOrCreateSession = async (newMessages: ChatMessage[], title: string) => {
    if (!user?.uid) return;

    if (!activeSessionId) {
      const newSession: ChatSession = {
        id: crypto.randomUUID(),
        userId: user.uid,
        title: title.slice(0, 30) || "New Chat",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: newMessages,
      };
      await dbService.saveChatSession(newSession);
      setActiveSessionId(newSession.id);
      loadSessions();
    } else {
      const existing = sessions.find(s => s.id === activeSessionId);
      if (existing) {
        const updated: ChatSession = {
          ...existing,
          messages: newMessages,
          updatedAt: Date.now(),
        };
        await dbService.saveChatSession(updated);
        loadSessions();
      }
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingSessionId || !renamingTitle.trim()) return;

    const session = sessions.find(s => s.id === renamingSessionId);
    if (session) {
      const updated = { ...session, title: renamingTitle.trim(), updatedAt: Date.now() };
      await dbService.saveChatSession(updated);
      setRenamingSessionId(null);
      loadSessions();
    }
  };

  const startRenaming = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingSessionId(session.id);
    setRenamingTitle(session.title);
  };

  const confirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingSessionId(id);
  };

  const handleDeleteSession = async () => {
    if (!deletingSessionId) return;
    try {
      await dbService.deleteChatSession(deletingSessionId);
      if (activeSessionId === deletingSessionId) {
        handleNewChat();
      }
      setDeletingSessionId(null);
      loadSessions();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && !imageFile) || isLoading) return;

    const currentInput = input;
    const currentFile = imageFile;
    
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: currentInput || (currentFile ? "Tell me about this image." : ""),
      timestamp: Date.now(),
      imageUrl: currentFile ? URL.createObjectURL(currentFile) : undefined
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setImageFile(null);
    setIsLoading(true);

    try {
      if (currentFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(currentFile);
        });
        const base64 = await base64Promise;
        const responseText = await geminiService.analyzeImage(base64, currentFile.type, currentInput || "Analyze image.");
        const modelMsg: ChatMessage = { id: crypto.randomUUID(), role: 'model', text: responseText, timestamp: Date.now() };
        const finalMessages = [...newMessages, modelMsg];
        setMessages(finalMessages);
        await updateOrCreateSession(finalMessages, currentInput || "Image Help");
        setIsLoading(false);
      } else {
        const history = newMessages.map(m => ({ 
          role: m.role, 
          text: m.text 
        }));

        const modelMsgId = crypto.randomUUID();
        const initialModelMsg: ChatMessage = { id: modelMsgId, role: 'model', text: '', timestamp: Date.now() };
        setMessages(prev => [...prev, initialModelMsg]);

        let fullText = '';
        const stream = geminiService.chatStream(history);
        
        setIsLoading(false); 
        let hasStarted = false;

        for await (const chunk of stream) {
          if (!hasStarted) hasStarted = true;
          fullText += chunk;
          setMessages(prev => prev.map(m => m.id === modelMsgId ? { ...m, text: fullText } : m));
        }

        if (!hasStarted) throw new Error("Could not get a response.");
        
        const finalModelMsg = { ...initialModelMsg, text: fullText };
        await updateOrCreateSession([...newMessages, finalModelMsg], currentInput);
      }
    } catch (err: any) {
      console.error("Chat Error:", err);
      const isKeyError = err.message === "API_KEY_MISSING" || err.message?.includes("API key");
      
      setMessages(prev => [...prev, { 
        id: crypto.randomUUID(), 
        role: 'model', 
        text: isKeyError 
          ? `**AI Connection Error**\n\nI need an API key to work. Please make sure one is set up.`
          : `**Something went wrong**\n\n${err.message || "I lost connection. Please try again."}`, 
        timestamp: Date.now(),
        isError: true
      }]);
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setInput('');
    setImageFile(null);
  };

  return (
    <div className="flex h-full rounded-3xl bg-zinc-900/10 border border-white/5 overflow-hidden animate-fade-in backdrop-blur-xl">
      <aside 
        className={`
          bg-black/40 border-r border-white/5 transition-all duration-500 flex flex-col
          ${isSidebarOpen ? 'w-72' : 'w-0 opacity-0 -translate-x-full pointer-events-none'}
        `}
      >
        <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
          <h2 className="text-white font-bold tracking-tight flex items-center gap-2">
             <MessageSquare className="w-4 h-4 text-indigo-400" />
             Chat History
          </h2>
          <button 
            onClick={handleNewChat}
            className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors border border-indigo-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {sessions.map(session => (
            <div 
              key={session.id}
              onClick={() => activeSessionId !== session.id && setActiveSessionId(session.id)}
              className={`
                group relative p-3 rounded-xl cursor-pointer transition-all border
                ${activeSessionId === session.id 
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-white' 
                  : 'border-transparent text-zinc-500 hover:bg-white/5 hover:text-zinc-300'}
              `}
            >
              {renamingSessionId === session.id ? (
                <form onSubmit={handleRename} className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <input 
                    autoFocus
                    value={renamingTitle}
                    onChange={e => setRenamingTitle(e.target.value)}
                    className="bg-zinc-800 border border-indigo-500 text-xs text-white px-2 py-1 rounded w-full outline-none"
                    onBlur={() => setRenamingSessionId(null)}
                  />
                  <button type="submit" className="text-indigo-400 hover:text-indigo-200">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                <>
                  <div className="text-sm font-medium truncate pr-16">{session.title}</div>
                  <div className="text-[10px] opacity-50 font-mono mt-1">
                    {new Date(session.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => startRenaming(session, e)}
                      className="p-1.5 text-zinc-500 hover:text-indigo-400 transition-all hover:bg-indigo-500/10 rounded-lg"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => confirmDelete(session.id, e)}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 transition-all hover:bg-rose-500/10 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="py-8 text-center text-zinc-600 text-xs italic">
              No chats yet.
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full bg-transparent relative overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-black/20 backdrop-blur-md">
           <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-white/5 text-zinc-500 hover:text-white rounded-lg transition-colors"
              >
                 <Menu className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-white font-bold tracking-tight flex items-center gap-2">
                   {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> : <Sparkles className="w-4 h-4 text-indigo-400" />}
                   {activeSessionId ? sessions.find(s => s.id === activeSessionId)?.title : 'AI Study Help'}
                </h2>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Helpful AI Active • Gemini Pro</div>
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
          {messages.length === 0 && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-6">
               <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.1)]">
                  <Sparkles className="w-10 h-10 text-indigo-400" />
               </div>
               <div>
                  <h3 className="text-white font-bold text-xl mb-2">How can I help you?</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">Ask anything about your studies, upload notes for an explanation, or get help with homework.</p>
               </div>
            </div>
          )}
          
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div className={`
                max-w-[85%] md:max-w-[75%] rounded-2xl p-4 md:p-6
                ${msg.role === 'user' 
                  ? 'bg-zinc-800/80 text-white border border-white/5 ml-12' 
                  : msg.isError ? 'bg-rose-500/10 border-rose-500/20 text-rose-200' : 'bg-indigo-500/5 text-zinc-100 border border-white/5 mr-12'}
              `}>
                {msg.role === 'model' && (
                  <div className="flex items-center gap-2 mb-4">
                     <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${msg.isError ? 'border-rose-500/30 bg-rose-500/20 text-rose-400' : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400'}`}>
                        {msg.isError ? <ShieldAlert className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                     </div>
                     <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${msg.isError ? 'text-rose-400' : 'text-indigo-400'}`}>
                        {msg.isError ? 'Alert' : 'AI Response'}
                     </span>
                  </div>
                )}
                
                {msg.imageUrl && (
                  <img src={msg.imageUrl} alt="Uploaded" className="max-w-full rounded-xl mb-4 border border-white/10 shadow-lg" />
                )}
                
                <div className="prose prose-invert prose-sm max-w-none text-zinc-200 leading-relaxed">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      code({node, inline, className, children, ...props}: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            className="rounded-xl border border-white/5 shadow-2xl my-4 !bg-black/50"
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className="bg-white/10 px-1.5 py-0.5 rounded text-indigo-300 font-mono text-xs" {...props}>
                            {children}
                          </code>
                        );
                      }
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-black/40 backdrop-blur-xl border-t border-white/5 shrink-0">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto">
            {imageFile && (
              <div className="flex items-center gap-3 p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl mb-3">
                 <div className="w-12 h-12 rounded-lg bg-indigo-500/20 flex items-center justify-center overflow-hidden border border-indigo-500/30">
                    <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover" />
                 </div>
                 <div className="flex-1 overflow-hidden">
                    <div className="text-xs font-bold text-white truncate">{imageFile.name}</div>
                    <div className="text-[10px] text-indigo-400 uppercase font-mono">Image Selected</div>
                 </div>
                 <button onClick={() => setImageFile(null)} className="p-1.5 hover:bg-white/10 rounded-full text-zinc-500 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                 </button>
              </div>
            )}
            
            <div className="relative group">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={imageFile ? "What should I do with this image?" : "Ask a question..."}
                disabled={isLoading}
                className="w-full bg-zinc-900/60 border border-white/10 rounded-2xl pl-4 pr-32 py-4 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-all text-sm md:text-base"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  accept="image/*"
                  className="hidden"
                />
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 text-zinc-500 hover:text-indigo-400 hover:bg-white/5 rounded-xl transition-all"
                  title="Upload notes or image"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <button 
                  type="submit"
                  disabled={isLoading || (!input.trim() && !imageFile)}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 active:scale-95"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {deletingSessionId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-zinc-900 border border-rose-500/20 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/20">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white tracking-tight">Delete this chat?</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">
                This will permanently delete this conversation and its history. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setDeletingSessionId(null)}
                className="flex-1 py-3 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700 transition-colors active:scale-95"
              >
                Keep It
              </button>
              <button 
                onClick={handleDeleteSession}
                className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-500 transition-colors shadow-lg shadow-rose-900/20 active:scale-95"
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
