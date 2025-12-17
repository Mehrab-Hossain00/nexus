
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Send, Image as ImageIcon, Sparkles, Bot, User, Plus, MessageSquare, Trash2, Menu, Zap, Loader2, RefreshCw } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { dbService } from '../services/dbService';
import { ChatMessage, ChatSession, UserProfile } from '../types';
import { Content, GenerateContentResponse } from '@google/genai';

interface AITutorProps {
  user?: UserProfile;
}

export const AITutor: React.FC<AITutorProps> = ({ user }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [needsSync, setNeedsSync] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use platform helper to check for API key on mount
  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore
      if (window.aistudio?.hasSelectedApiKey) {
        // @ts-ignore
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setNeedsSync(!hasKey);
      }
    };
    checkKey();
  }, []);

  const loadSessions = async () => {
    if (user?.uid) {
      const loaded = await dbService.getChatSessions(user.uid);
      setSessions(loaded);
    }
  };

  const getValidHistory = (msgs: ChatMessage[]): Content[] => {
    const history: Content[] = [];
    msgs.forEach((m) => {
      if (m.isError) return;
      if (history.length > 0 && history[history.length - 1].role === m.role) return;
      history.push({ role: m.role, parts: [{ text: m.text }] });
    });
    return history;
  };

  const handleSyncKey = async () => {
    setIsSyncing(true);
    try {
      // @ts-ignore
      if (window.aistudio?.openSelectKey) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        // Proceed immediately after triggering selection as per guidelines
        setNeedsSync(false);
        initializeChat();
      }
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setIsSyncing(false);
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

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && !imageFile) || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: input,
      timestamp: Date.now(),
      imageUrl: imageFile ? URL.createObjectURL(imageFile) : undefined
    };

    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    const currentFile = imageFile;
    setInput('');
    setImageFile(null);
    setIsLoading(true);

    try {
      let responseText = '';
      if (currentFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(currentFile);
        });
        const base64 = await base64Promise;
        responseText = await geminiService.analyzeImage(base64, currentFile.type, currentInput || "Analyze asset.");
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: responseText, timestamp: Date.now() }]);
      } else {
        const history = getValidHistory(messages.concat(userMsg));
        // Fresh chat instance creation to ensure correct API context
        const chat = geminiService.createChat(history.slice(0, -1));
        const result = await chat.sendMessageStream({ message: currentInput });
        const modelMsgId = crypto.randomUUID();
        setMessages(prev => [...prev, { id: modelMsgId, role: 'model', text: '', timestamp: Date.now() }]);

        let fullText = '';
        for await (const chunk of result) {
          const c = chunk as GenerateContentResponse;
          // .text is a property, not a method
          fullText += c.text || '';
          setMessages(prev => prev.map(m => m.id === modelMsgId ? { ...m, text: fullText } : m));
        }
        responseText = fullText;
      }

      if (!activeSessionId && user?.uid) {
        const title = currentInput.slice(0, 40) || "Nexus Session";
        const newSession: ChatSession = {
          id: crypto.randomUUID(),
          userId: user.uid,
          title,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [...messages, userMsg, { id: crypto.randomUUID(), role: 'model', text: responseText, timestamp: Date.now() }]
        };
        await dbService.saveChatSession(newSession);
        setActiveSessionId(newSession.id);
        loadSessions();
      } else if (activeSessionId) {
        const session = sessions.find(s => s.id === activeSessionId);
        if (session) {
          session.messages = [...session.messages, userMsg, { id: crypto.randomUUID(), role: 'model', text: responseText, timestamp: Date.now() }];
          session.updatedAt = Date.now();
          await dbService.saveChatSession(session);
        }
      }
    } catch (err: any) {
      console.error(err);
      // Reset sync state if error suggests API key issues
      if (err?.message?.includes("Requested entity was not found")) {
        setNeedsSync(true);
      }
      setMessages(prev => [...prev, { 
        id: crypto.randomUUID(), 
        role: 'model', 
        text: `**Connection Interrupted**\n\nThe Nexus Core requires a valid API connection. Please ensure your Nexus account is synced or check your workspace settings.`, 
        timestamp: Date.now(), 
        isError: true 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex bg-zinc-950/50 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-3xl animate-fade-in shadow-2xl relative">
      <div className={`absolute md:relative z-30 h-full w-72 bg-black border-r border-white/5 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:w-0'}`}>
        <div className="p-4 border-b border-white/5">
          <button onClick={() => { setActiveSessionId(null); setMessages([]); }} className="w-full flex items-center justify-center gap-2 bg-white text-black py-2.5 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-all active:scale-95 shadow-lg">
            <Plus className="w-4 h-4" /> New Session
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {sessions.map(s => (
            <button key={s.id} onClick={() => setActiveSessionId(s.id)} className={`w-full text-left p-3 rounded-xl flex items-center justify-between group transition-all ${activeSessionId === s.id ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-500 hover:bg-white/5'}`}>
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span className="truncate text-xs font-semibold">{s.title}</span>
              </div>
              <Trash2 onClick={(e) => { e.stopPropagation(); dbService.deleteChatSession(s.id); loadSessions(); }} className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose-500 transition-all" />
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 relative">
        {needsSync && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
            <button 
              onClick={handleSyncKey}
              disabled={isSyncing}
              className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-full shadow-[0_0_20px_rgba(79,70,229,0.5)] hover:bg-indigo-500 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-white" />}
              {isSyncing ? 'SYNCING...' : 'SYNC NEXUS CORE'}
            </button>
          </div>
        )}

        <div className="p-4 border-b border-white/5 flex items-center gap-3 bg-black/40 backdrop-blur-xl z-10">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-zinc-500 hover:text-white transition-colors"><Menu className="w-5 h-5" /></button>
          <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 shadow-xl"><Bot className="w-5 h-5" /></div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight leading-none mb-1">Nexus AI Tutor</h2>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Gemini 3 Pro • Academic Intelligence</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-10 custom-scrollbar">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-40 animate-fade-in">
              <Sparkles className="w-12 h-12 text-zinc-600" />
              <div className="space-y-2">
                <p className="text-sm font-bold text-white uppercase tracking-widest">Nexus Ready</p>
                <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">Ask academic questions, solve math with LaTeX, or analyze uploaded assets.</p>
              </div>
            </div>
          )}
          {messages.map(m => (
            <div key={m.id} className={`flex gap-5 ${m.role === 'user' ? 'flex-row-reverse' : ''} animate-slide-up`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${m.role === 'user' ? 'bg-white text-black' : 'bg-zinc-900 border border-white/10 text-indigo-400'}`}>
                {m.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={`max-w-[85%] space-y-3 ${m.role === 'user' ? 'text-right' : ''}`}>
                {m.imageUrl && <img src={m.imageUrl} className="max-w-sm rounded-2xl border border-white/10 shadow-2xl" alt="Study Asset" />}
                <div className={`
                    p-6 rounded-2xl text-sm leading-relaxed shadow-sm
                    ${m.isError ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20' : 
                      m.role === 'user' ? 'bg-zinc-800 text-white rounded-tr-none' : 
                      'bg-zinc-900/80 text-zinc-200 border border-white/5 rounded-tl-none'}
                `}>
                  {m.role === 'model' ? (
                    <div className="prose prose-invert prose-sm max-w-none text-left">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm, remarkMath]} 
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          code({node, inline, className, children, ...props}: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <SyntaxHighlighter style={vscDarkPlus as any} language={match[1]} PreTag="div" className="rounded-xl !bg-black/80 !p-5 !my-6 border border-white/5 !text-xs font-mono">
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : <code className="bg-indigo-500/10 px-2 py-0.5 rounded text-indigo-300 font-mono" {...props}>{children}</code>;
                          }
                        }}
                      >{m.text}</ReactMarkdown>
                    </div>
                  ) : <div className="whitespace-pre-wrap font-medium">{m.text}</div>}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
             <div className="flex gap-5 animate-pulse">
                <div className="w-9 h-9 bg-zinc-900 rounded-xl" />
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-8 bg-gradient-to-t from-black via-black to-transparent relative z-20">
          <form onSubmit={handleSend} className="max-w-5xl mx-auto flex items-end gap-3 bg-zinc-900/90 border border-white/10 p-3 rounded-2xl shadow-2xl transition-all focus-within:border-indigo-500/50 backdrop-blur-2xl">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
            <button type="button" onClick={() => fileInputRef.current?.click()} className={`p-3.5 rounded-xl transition-all ${imageFile ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`} title="Attach Image"><ImageIcon className="w-6 h-6" /></button>
            <div className="flex-1 flex flex-col min-w-0">
               {imageFile && (
                  <div className="px-3 py-1.5 mb-2 text-[10px] text-indigo-400 font-bold uppercase tracking-widest flex items-center justify-between bg-indigo-500/5 rounded-lg border border-indigo-500/10">
                     <span className="truncate">Context: {imageFile.name}</span>
                     <button type="button" onClick={() => setImageFile(null)} className="hover:text-rose-500">REMOVE</button>
                  </div>
               )}
               <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend(e)} placeholder="Inquire with Nexus Intelligence..." className="bg-transparent border-none py-3.5 px-2 text-sm text-white focus:ring-0 resize-none max-h-48 placeholder-zinc-600 font-medium" rows={1} />
            </div>
            <button type="submit" disabled={(!input.trim() && !imageFile) || isLoading} className="p-4 bg-white text-black rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-20 active:scale-95 shadow-xl flex items-center justify-center">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
