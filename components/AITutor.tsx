import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Send, Image as ImageIcon, Sparkles, MessageSquare, Trash2, Plus, Menu, X, Loader2 } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { dbService } from '../services/dbService';
import { ChatMessage, ChatSession, UserProfile } from '../types';
import { Content, GenerateContentResponse } from '@google/genai';

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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      text: input || (imageFile ? "Analyze this asset." : ""),
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
        const modelMsg: ChatMessage = { id: crypto.randomUUID(), role: 'model', text: responseText, timestamp: Date.now() };
        setMessages(prev => [...prev, modelMsg]);
        
        const updatedMsgs = [...messages, userMsg, modelMsg];
        await updateOrCreateSession(updatedMsgs, currentInput || "Image Analysis");
      } else {
        const history = getValidHistory(messages.concat(userMsg));
        const chat = geminiService.createChat(history.slice(0, -1));
        const result = await chat.sendMessageStream({ message: currentInput });
        const modelMsgId = crypto.randomUUID();
        
        setMessages(prev => [...prev, { id: modelMsgId, role: 'model', text: '', timestamp: Date.now() }]);

        let fullText = '';
        for await (const chunk of result) {
          const c = chunk as GenerateContentResponse;
          fullText += c.text || '';
          setMessages(prev => prev.map(m => m.id === modelMsgId ? { ...m, text: fullText } : m));
        }
        responseText = fullText;
        // Fix: Explicitly typing the model response as ChatMessage to avoid type inference issues with role literal
        const modelMsg: ChatMessage = { id: modelMsgId, role: 'model', text: responseText, timestamp: Date.now() };
        const updatedMsgs = [...messages, userMsg, modelMsg];
        await updateOrCreateSession(updatedMsgs, currentInput);
      }
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, { 
        id: crypto.randomUUID(), 
        role: 'model', 
        text: `**Intelligence Link Interrupted**\n\nThe Nexus Core is experiencing turbulence. Please check your connection and try your request again.`, 
        timestamp: Date.now(), 
        isError: true 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrCreateSession = async (updatedMsgs: ChatMessage[], firstInput: string) => {
    if (!activeSessionId && user?.uid) {
      const title = firstInput.slice(0, 40) || "Nexus Session";
      const newSession: ChatSession = {
        id: crypto.randomUUID(),
        userId: user.uid,
        title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: updatedMsgs
      };
      await dbService.saveChatSession(newSession);
      setActiveSessionId(newSession.id);
      loadSessions();
    } else if (activeSessionId) {
      const session = sessions.find(s => s.id === activeSessionId);
      if (session) {
        const updatedSession = { ...session, messages: updatedMsgs, updatedAt: Date.now() };
        await dbService.saveChatSession(updatedSession);
        loadSessions();
      }
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await dbService.deleteChatSession(id);
    if (activeSessionId === id) {
      setActiveSessionId(null);
      setMessages([]);
    }
    loadSessions();
  };

  return (
    <div className="h-full flex bg-zinc-950/50 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-3xl animate-fade-in shadow-2xl relative">
      {/* Sidebar Toggle for Mobile */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden absolute top-4 left-4 z-50 p-2 bg-zinc-900 border border-white/10 rounded-lg text-white"
      >
        {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      <div className={`absolute md:relative z-40 h-full w-72 bg-black border-r border-white/5 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:w-0'}`}>
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
              <Trash2 onClick={(e) => handleDeleteSession(e, s.id)} className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose-500 transition-all" />
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar">
          {messages.length === 0 && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
              <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <Sparkles className="w-8 h-8 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Nexus Intelligence</h3>
                <p className="text-zinc-500 max-w-xs mt-1">Ready for academic assistance, multimodal analysis, and code generation.</p>
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
              <div className={`max-w-[85%] rounded-2xl p-4 ${m.role === 'user' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-zinc-900/50 border border-white/5 text-zinc-100 backdrop-blur-md'}`}>
                {m.imageUrl && <img src={m.imageUrl} alt="User input" className="max-w-xs rounded-xl mb-3 border border-white/10" />}
                <div className="prose prose-invert prose-sm max-w-none prose-indigo">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            className="rounded-xl border border-white/5 !bg-black/50"
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className="bg-black/50 px-1.5 py-0.5 rounded text-indigo-400" {...props}>
                            {children}
                          </code>
                        );
                      }
                    }}
                  >
                    {m.text}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4 animate-pulse">
              <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                <span className="text-xs font-medium text-zinc-500 tracking-widest uppercase">Nexus Computing...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-zinc-950/80 backdrop-blur-xl border-t border-white/5">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-3 relative">
            <input 
              type="file" 
              ref={fileInputRef} 
              hidden 
              onChange={(e) => setImageFile(e.target.files?.[0] || null)} 
              accept="image/*" 
            />
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()} 
              className={`p-3 rounded-xl border border-white/5 transition-all ${imageFile ? 'bg-indigo-500 text-white border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-zinc-900 text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything or provide an asset..."
              className="flex-1 bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:bg-zinc-900 transition-all text-sm"
            />
            <button 
              type="submit" 
              disabled={isLoading || (!input.trim() && !imageFile)}
              className="p-3 bg-white text-black rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-30 disabled:grayscale active:scale-95 shadow-xl"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <div className="mt-2 text-center">
            <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em]">Secured by Nexus Core Intelligence</span>
          </div>
        </div>
      </div>
    </div>
  );
};