import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, X, Sparkles, Bot, ChevronDown, 
  Settings, Zap, Layers, Cpu, Play, Search, Code, Sliders
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { useFirebase } from '../context/FirebaseContext';
import { getSecureGeminiKey } from '../utils/secureStorage';

interface AIPopoutAssistantProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

interface Message {
  id: number;
  sender: 'user' | 'bot';
  text: string;
  actionPayload?: {
    view?: string;
    playbookTab?: string;
  };
}

export const AIPopoutAssistant: React.FC<AIPopoutAssistantProps> = ({ currentView, setCurrentView }) => {
  const { user } = useFirebase();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: 'bot',
      text: "Welcome to AXE HOURS! ⚡\n\nI am your AI Retention Co-pilot. I can help you instantly navigate our suite, answer creator questions, or prepare visual setups.\n\nWhat would you like to create or focus on first? Select an actionable path below or chat with me directly!"
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<{
    value: number;
    timeRemainingSec: number;
    status: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clear any active intervals on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Close chatbot when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        containerRef.current && 
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Proactively pop up after a pleasant 1.5s brand landing delay (only once per session)
  useEffect(() => {
    const hasWelcomeOpened = sessionStorage.getItem("axe_hours_welcome_chat_opened");
    if (!hasWelcomeOpened) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        sessionStorage.setItem("axe_hours_welcome_chat_opened", "true");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Soft scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Handle support route mapping based on input text or quick payload codes
  const handleActionRedirection = (text: string) => {
    const q = text.toLowerCase();
    
    if (q.includes("script") || q.includes("write") || q.includes("generate") || q.includes("draft") || q.includes("generator")) {
      setCurrentView('generator');
      return { view: 'generator', desc: "AI Generator Dashboard" };
    } else if (q.includes("hook") || q.includes("viral") || q.includes("tension") || q.includes("title")) {
      setCurrentView('viral');
      return { view: 'viral', desc: "Viral Hooks library" };
    } else if (q.includes("competitor") || q.includes("spy") || q.includes("stats") || q.includes("channel")) {
      setCurrentView('competitor-intel');
      return { view: 'competitor-intel', desc: "Competitor Intelligence station" };
    } else if (q.includes("simulator") || q.includes("pacing") || q.includes("pace")) {
      window.dispatchEvent(new CustomEvent('open-playbook', { detail: { tab: 'simulator' } }));
      return { playbookTab: 'simulator', desc: "Interactive Pacing Simulator" };
    } else if (q.includes("secrets") || q.includes("pacing secret") || q.includes("playbook")) {
      window.dispatchEvent(new CustomEvent('open-playbook', { detail: { tab: 'secrets' } }));
      return { playbookTab: 'secrets', desc: "Retention Secrets Blueprint" };
    } else if (q.includes("key") || q.includes("settings") || q.includes("gemini") || q.includes("api")) {
      setCurrentView('settings');
      return { view: 'settings', desc: "Workspace Settings" };
    } else if (q.includes("analytics") || q.includes("ctr") || q.includes("charts")) {
      setCurrentView('analytics');
      return { view: 'analytics', desc: "Analytics Forecast View" };
    } else if (q.includes("log") || q.includes("history") || q.includes("activity")) {
      setCurrentView('activity-log');
      return { view: 'activity-log', desc: "Workspace Activity Log" };
    } else if (q.includes("saved") || q.includes("vault") || q.includes("idea")) {
      setCurrentView('saved');
      return { view: 'saved', desc: "Saved Blueprint Vault" };
    }
    return null;
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputValue;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now(), sender: 'user', text: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Initial Progress Setup
    setProgress({
      value: 0,
      timeRemainingSec: 3.5,
      status: "Initializing Retention AI engine..."
    });

    const startTime = Date.now();
    const durationLimit = 3500; // 3.5 seconds

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(96, Math.floor((elapsed / durationLimit) * 100));
      const remaining = Math.max(0.1, Number((3.5 - elapsed / 1000).toFixed(1)));
      
      let currentStatus = "Synthesizing workspace variables...";
      if (pct < 15) {
        currentStatus = "Reading conversation blueprint context...";
      } else if (pct < 35) {
        currentStatus = "Analyzing lifestyle trend metrics...";
      } else if (pct < 55) {
        currentStatus = "Configuring hook & pacing templates...";
      } else if (pct < 75) {
        currentStatus = "Compiling generator preset payload...";
      } else if (pct < 90) {
        currentStatus = "Awaiting final studio workspace sync...";
      } else {
        currentStatus = "Injecting settings directly into AI Generator...";
      }

      setProgress({
        value: pct,
        timeRemainingSec: remaining,
        status: currentStatus
      });
    }, 100);

    // Run proactive navigation action in parallel with response
    const action = handleActionRedirection(textToSend);

    // Helper to gracefully finish the progress bar, sync layout, and print the bot response
    const finishProgressAndShowMessage = async (botMsg: Message) => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      
      setProgress({
        value: 100,
        timeRemainingSec: 0,
        status: "Sync complete! Settings mapped successfully."
      });
      
      // Let user observe the completed pay-off status
      await new Promise(resolve => setTimeout(resolve, 800));
      setProgress(null);
      setMessages(prev => [...prev, botMsg]);
    };

    try {
      const uid = user?.uid || "guest";
      const savedKey = getSecureGeminiKey(uid);
      const historyData = messages.slice(-10).map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const res = await fetch("/api/support-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: textToSend,
          history: historyData,
          customKey: savedKey,
          uid
        })
      });

      if (!res.ok) {
        throw new Error("Chat service returned an error.");
      }

      const data = await res.json();
      
      let botResponseText = data.text || "";
      let loadActionData = null;

      // Extract dynamic generator loading actions if present in the response
      const loadRegex = /\[ACTION_LOAD_GENERATOR:\s*(\{[\s\S]*?\})\]/;
      const match = botResponseText.match(loadRegex);
      if (match) {
        try {
          loadActionData = JSON.parse(match[1]);
          botResponseText = botResponseText.replace(loadRegex, "").trim();
        } catch (e) {
          console.error("Failed to parse [ACTION_LOAD_GENERATOR] JSON payload:", e);
        }
      }

      let activeAction = action;
      if (loadActionData) {
        // Trigger matching state loaders in AIGenerator Component
        window.dispatchEvent(new CustomEvent('load-generator-settings', { detail: loadActionData }));
        setCurrentView('generator');
        activeAction = { view: 'generator', desc: "AI Generator Workspace (Loaded settings via Co-pilot)" };
        botResponseText = `⚡ Action Triggered: Loaded Creator Settings into [AI Generator]!\n\n${botResponseText}`;
      } else if (activeAction) {
        botResponseText = `⚡ Action Triggered: Navigated to [${activeAction.desc}]!\n\n${botResponseText}`;
      }

      await finishProgressAndShowMessage({
        id: Date.now() + 1,
        sender: 'bot',
        text: botResponseText,
        actionPayload: activeAction || undefined
      });

    } catch (err) {
      console.error("Onboarding assist error:", err);
      let botResponseText = "";
      let loadActionData = null;
      const q = textToSend.toLowerCase();

      // Client-side fail-safe response builder
      if (q.includes("morning") || q.includes("routine") || q.includes("anti-5") || q.includes("dopamine") || (q.includes("load") && q.includes("setting"))) {
        botResponseText = "⚡ Sandbox Fallback Co-pilot:\n\nPrepared and loaded 'The Anti-5 AM Club' morning routine settings successfully!";
        loadActionData = {
          prompt: "Write a 50-second high-retention lifestyle script about a low-dopamine morning routine that beats the 5 AM club. Start with a Negative Contrast hook, use rapid pacing, and end with a loop CTA.",
          brandVoice: "Contrarian",
          targetNiche: "Biohacking & Wellness",
          duration: "60s Short-form",
          visualStyle: "Natural morning glow silhouettes"
        };
      }

      let activeAction = action;
      if (loadActionData) {
        window.dispatchEvent(new CustomEvent('load-generator-settings', { detail: loadActionData }));
        setCurrentView('generator');
        activeAction = { view: 'generator', desc: "AI Generator Workspace" };
        botResponseText = `⚡ Action Triggered: Loaded Creator Settings into [AI Generator]!\n\n${botResponseText}`;
      } else {
        botResponseText = "I encountered an error replying to that query. Let's redirect you immediately!";
        if (activeAction) {
          botResponseText = `⚡ Loaded Page: ${activeAction.desc}.\n\nLet's get down to business! Let me know if you need specific advice.`;
        }
      }

      await finishProgressAndShowMessage({
        id: Date.now() + 1,
        sender: 'bot',
        text: botResponseText,
        actionPayload: activeAction || undefined
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Use a ref to always point to the latest handleSendMessage function
  const handleSendMessageRef = useRef(handleSendMessage);
  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  });

  // Listen for custom assistant navigation triggers from other parts of the application
  useEffect(() => {
    const handleAssistantNav = (e: Event) => {
      const customEvent = e as CustomEvent<{ query?: string; view?: string }>;
      const { query, view } = customEvent.detail || {};
      
      setIsOpen(true);
      if (view) {
        setCurrentView(view);
      }
      if (query) {
        // Run with a very small delay to ensure the chat window is fully open and active
        setTimeout(() => {
          handleSendMessageRef.current(query);
        }, 100);
      }
    };

    window.addEventListener('trigger-assistant-navigation', handleAssistantNav);
    return () => {
      window.removeEventListener('trigger-assistant-navigation', handleAssistantNav);
    };
  }, [setCurrentView]);

  const onboardingChips = [
    { label: "✍️ Write Viral Script", query: "I want to generate a short-form video script" },
    { label: "🪝 Explore Viral Hooks", query: "Show me the viral hooks and psychological triggers" },
    { label: "📊 Spy on Competitors", query: "I want to spy on competitor channels statistics" },
    { label: "🧪 Try Pacing Simulator", query: "Open the interactive pacing simulator" },
    { label: "⚙️ Setup Gemini API Key", query: "Configure my Gemini API Key in Settings" }
  ];

  return (
    <div ref={containerRef} id="proactive-onboarding-co-pilot-container" className="fixed bottom-4 right-4 z-[9999] font-sans max-w-[calc(100vw-2rem)]">
      
      {/* GLOWING TRIGGER CHAT BUBBLE BUTTON */}
      {!isOpen && (
        <button
          id="assistant-launcher-bubble"
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-primary-gradient border border-primary/40 flex items-center justify-center text-white shadow-[0_8px_32px_rgba(157,80,187,0.4)] hover:shadow-[0_12px_40px_rgba(157,80,187,0.6)] cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 group relative ml-auto select-none"
        >
          {/* Internal Pulse Ripple waves */}
          <span className="absolute inset-0 rounded-full bg-primary/25 animate-ping opacity-60 pointer-events-none" />
          <Bot size={24} className="group-hover:rotate-12 transition-transform duration-300 pointer-events-none" />
          
          {/* Subtle Attention Prompt Banner badge */}
          <span className="absolute -top-1 -right-1 bg-emerald-500 text-[8px] font-black tracking-wider text-black px-1.5 py-0.5 rounded-full border border-black animate-bounce">
            LIVE
          </span>
        </button>
      )}

      {/* EXPANDED INTERACTIVE ASSISTANT WINDOW */}
      {isOpen && (
        <div 
          id="assistant-co-pilot-body" 
          className="w-[310px] xs:w-[350px] sm:w-[380px] max-w-full h-[480px] xs:h-[530px] flex flex-col border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-300 relative bg-black/85 backdrop-blur-xl group overscroll-contain"
          style={{ overscrollBehavior: 'contain' }}
        >
          {/* Cybernetic Grid Backdrop Decoration */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-20 z-0" />
          
          {/* Cybernetic Corner Decorators - futuristic brackets */}
          <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-white/20 rounded-tl-sm opacity-40 group-hover:opacity-80 transition-opacity pointer-events-none z-0" />
          <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-white/20 rounded-tr-sm opacity-40 group-hover:opacity-80 transition-opacity pointer-events-none z-0" />
          <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-white/20 rounded-bl-sm opacity-40 group-hover:opacity-80 transition-opacity pointer-events-none z-0" />
          <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-white/20 rounded-br-sm opacity-40 group-hover:opacity-80 transition-opacity pointer-events-none z-0" />

          {/* High precision side line highlights */}
          <div className="absolute top-1/2 -translate-y-1/2 left-0 w-[1px] h-1/2 bg-gradient-to-b from-transparent via-white/25 to-transparent pointer-events-none z-0" />

          {/* Strictly bounded vertical flex stack */}
          <div className="relative z-10 flex flex-col h-full w-full overflow-hidden">
            {/* Top Header Controls bar */}
            <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/15 border-b border-white/5 flex items-center justify-between select-none shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-primary-gradient flex items-center justify-center text-white shadow-md shadow-primary/25 relative">
                  <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <Bot size={15} />
                </div>
                <div>
                  <h3 className="font-sans font-extrabold text-xs text-white tracking-widest uppercase flex items-center gap-1">
                    Retention AI Co-pilot
                    <Sparkles size={11} className="text-secondary animate-pulse" />
                  </h3>
                  <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold">Active Studio Assistant</p>
                </div>
              </div>

              <button
                id="assistant-minimize-controls"
                onClick={() => setIsOpen(false)}
                className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg border border-white/5 cursor-pointer transition-all active:scale-95"
              >
                <ChevronDown size={14} />
              </button>
            </div>

            {/* Active Conversation Message Area */}
            <div 
              className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/20 select-text"
              style={{ overscrollBehaviorY: 'contain' }}
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.sender === 'bot' && (
                    <div className="h-6 w-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                      <Bot size={12} />
                    </div>
                  )}
                  
                  <div
                    className={`p-3 rounded-2xl max-w-[82%] text-xs font-sans leading-relaxed transition-all relative ${
                      m.sender === 'user'
                        ? 'bg-primary text-white font-medium rounded-tr-none'
                        : 'bg-white/5 border border-white/5 text-gray-200 rounded-tl-none whitespace-pre-wrap'
                    }`}
                  >
                    {m.text}
                    
                    {/* Action Success Badge indicator inside chat message */}
                    {m.actionPayload && (
                      <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-wider">
                        <Zap size={10} className="text-emerald-400 animate-pulse" />
                        Loaded Module Successfully
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Futuristic Cybernetic Progress Bar Configurator Panel */}
              {progress && (
                <div className="flex gap-2.5 justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="h-6 w-6 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0 mt-1">
                    <Cpu size={12} className="animate-spin text-secondary" style={{ animationDuration: '3s' }} />
                  </div>
                  <div className="flex-1 p-3.5 bg-white/5 border border-white/10 rounded-2xl rounded-tl-none text-xs text-gray-300 space-y-2.5 shadow-md shadow-black/40">
                    <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest">
                      <span className="flex items-center gap-1.5 text-secondary">
                        <Sparkles size={10} className="text-secondary animate-pulse" />
                        AI Co-pilot Workspace Configurator
                      </span>
                      <span className="text-emerald-400 font-mono text-[11px] font-bold">
                        {Math.floor(progress.value)}%
                      </span>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                      <div 
                        className="h-full bg-primary-gradient rounded-full shadow-[0_0_12px_rgba(157,80,187,0.8)] transition-all duration-100 ease-out"
                        style={{ width: `${progress.value}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-mono font-medium text-gray-400">
                      <span className="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px]">
                        <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full shrink-0 animate-pulse" />
                        {progress.status}
                      </span>
                      {progress.timeRemainingSec > 0 ? (
                        <span className="text-right text-gray-400 font-bold shrink-0 pl-2">
                          Est: <span className="text-emerald-400 font-extrabold">{progress.timeRemainingSec}s</span>
                        </span>
                      ) : (
                        <span className="text-right text-emerald-400 font-black animate-bounce shrink-0 pl-2">
                          SYNC READY!
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* AI Generation Loading Wave indicator */}
              {isLoading && !progress && (
                <div className="flex gap-2.5 justify-start">
                  <div className="h-6 w-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-primary shrink-0">
                    <Bot size={12} />
                  </div>
                  <div className="p-3 bg-white/5 border border-white/5 rounded-2xl rounded-tl-none text-xs text-on-surface-variant flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                    <span>Synthesizing workspace state...</span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action Suggestion Chips Slider pane */}
            <div className="px-4 py-2 border-t border-white/5 bg-[#050507] hover:bg-black/60 transition-colors shrink-0">
              <p className="text-[9px] text-on-surface-variant font-black uppercase tracking-wider mb-1.5 select-none">Quick Actions:</p>
              <div className="flex flex-wrap gap-1.5 max-h-[72px] overflow-y-auto custom-scrollbar pr-1">
                {onboardingChips.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(chip.query)}
                    disabled={isLoading}
                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 hover:text-white rounded-xl text-[10px] font-bold text-left transition-all cursor-pointer whitespace-nowrap active:scale-95 disabled:pointer-events-none disabled:opacity-40"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat User Input Area */}
            <div className="p-3.5 bg-[#08080c] border-t border-white/5 flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
                disabled={isLoading}
                placeholder="Ask anything, do task, switch views..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-on-surface-variant focus:outline-none focus:border-primary transition-colors font-medium disabled:opacity-40"
              />
              
              <button
                id="assistant-submit-button"
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isLoading}
                className="p-2 bg-primary hover:bg-primary-hover text-white rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none active:scale-95 shadow-md shadow-primary/20"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
