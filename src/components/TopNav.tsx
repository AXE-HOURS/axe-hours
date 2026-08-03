import React, { useState, useEffect } from 'react';
import { 
  Search, Bell, HelpCircle, User, Award, Video, Check, BookOpen, Sparkles, Wand2,
  Menu, X, LayoutDashboard, Lightbulb, Bookmark, Zap, BarChart3, Settings, Crown, LogOut, Plus, History
} from 'lucide-react';
import { Modal } from './Modal';
import { PrimaryButton } from './PrimaryButton';
import { getSecureGeminiKey } from '../utils/secureStorage';

interface GenerationItem {
  id: number;
  title: string;
  content: string;
  date: string;
  type?: 'saved' | 'history';
}

interface UserData {
  email: string;
  name?: string;
  handle?: string;
  avatar?: string;
}

interface TopNavProps {
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
  user: UserData | null;
  onUpdateUser: (userData: UserData) => void;
  onSelectHistory: (item: GenerationItem) => void;
  setCurrentView: (view: string) => void;
  currentView: string;
  onOpenTour?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ 
  showNotifications, 
  setShowNotifications, 
  user, 
  onUpdateUser, 
  onSelectHistory, 
  setCurrentView,
  currentView,
  onOpenTour
}) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [name, setName] = useState(user?.name || "");
  const [handle, setHandle] = useState(user?.handle || "@creator");
  const [avatar, setAvatar] = useState(user?.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [supportQuery, setSupportQuery] = useState("");
  const [supportMessages, setSupportMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; id: number }>>([
    {
      id: 1,
      sender: 'bot',
      text: "⚡ Welcome to Axe Hours Support Desk! Ask me any setup, key integration, local Ollama decoding, or click optimization questions!"
    }
  ]);
  const [isSupportLoading, setIsSupportLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GenerationItem[]>([]);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setHandle(user.handle || "@creator");
      setAvatar(user.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100");
    }
  }, [user]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.notifications-wrapper')) {
        setShowNotifications(false);
      }
      if (!target.closest('.search-wrapper')) {
        setSearchQuery("");
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [setShowNotifications]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const uid = user?.uid || "guest";
    const history: GenerationItem[] = JSON.parse(
      localStorage.getItem(`axe_hours_recent_generations_${uid}`) || 
      localStorage.getItem("axe_hours_recent_generations") || "[]"
    );
    const saved: GenerationItem[] = JSON.parse(
      localStorage.getItem(`axe_hours_saved_ideas_${uid}`) || 
      localStorage.getItem("axe_hours_saved_ideas") || "[]"
    );

    const matchedHistory = history.filter(item => 
      item.title.toLowerCase().includes(lowerQuery) || 
      (item.content && item.content.toLowerCase().includes(lowerQuery))
    ).map(item => ({ ...item, type: 'history' as const }));

    const matchedSaved = saved.filter(item => 
      item.title.toLowerCase().includes(lowerQuery) || 
      (item.content && item.content.toLowerCase().includes(lowerQuery))
    ).map(item => ({ ...item, type: 'saved' as const }));

    setSearchResults([...matchedHistory, ...matchedSaved].slice(0, 5));
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateUser && user) {
      onUpdateUser({
        ...user,
        name,
        handle,
        avatar
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsProfileOpen(false);
      }, 1200);
    }
  };

  const avatars = [
    { url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100", label: "Tech Male" },
    { url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100", label: "Tech Female" },
    { url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100", label: "Retro Creator" }
  ];

  const askSupportAI = async (customQuery?: string) => {
    const queryText = typeof customQuery === 'string' ? customQuery.trim() : supportQuery.trim();
    if (!queryText) return;

    // Append user query to log
    const userMsg = { id: Date.now(), sender: 'user' as const, text: queryText };
    const updatedMessages = [...supportMessages, userMsg];
    setSupportMessages(updatedMessages);
    setSupportQuery("");
    setIsSupportLoading(true);

    try {
      const uid = user?.uid || "guest";
      const savedKey = getSecureGeminiKey(uid);
      // Construct history array format for backend (filter last 10 messages for token hygiene)
      const historyData = updatedMessages.slice(-10).map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const res = await fetch("/api/support-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: queryText,
          history: historyData,
          customKey: savedKey,
          uid
        })
      });

      if (!res.ok) {
        throw new Error("Failed to get response from Support Bot.");
      }

      const data = await res.json();
      setSupportMessages(prev => [...prev, { id: Date.now() + 1, sender: 'bot' as const, text: data.text }]);
    } catch (err: any) {
      console.error("Support desk chat trigger error:", err);
      setSupportMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        sender: 'bot' as const, 
        text: "⚡ Help Supervisor Network Error:\nI couldn't reach the support service. Please verify your connection or retry your question!" 
      }]);
    } finally {
      setIsSupportLoading(false);
    }
  };

  const mobileNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profile', label: 'Profile System', icon: User },
    { id: 'generator', label: 'Generate Ideas', icon: Lightbulb },
    { id: 'saved', label: 'Saved Ideas', icon: Bookmark },
    { id: 'viral', label: 'Viral Hooks', icon: Zap },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'activity-log', label: 'Activity Trail', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header id="topnav-component" className="sticky top-0 w-full h-16 bg-black/40 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 md:px-8 z-30 select-none">
      
      {/* Mobile Toggle & Logo Group */}
      <div className="flex items-center gap-3">
        <button 
          id="topnav-mobile-menu-btn"
          onClick={(e) => {
            e.stopPropagation();
            setIsMobileMenuOpen(true);
          }}
          className="p-1 md:hidden text-gray-400 hover:text-white transition-colors cursor-pointer"
          title="Toggle Navigation Menu"
        >
          <Menu size={22} />
        </button>
        
        <h1 className="md:hidden text-sm font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
          AXE HOURS
        </h1>
      </div>

      <div id="topnav-search-group" className="relative flex-1 max-w-[140px] xs:max-w-[200px] sm:max-w-xs md:max-w-md mx-2 search-wrapper z-40">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant animate-pulse" size={14} />
        <input 
          id="topnav-search-input"
          type="text" 
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search..." 
          className="w-full bg-white/5 border border-white/10 rounded-full py-1.5 pl-9 pr-3 focus:outline-none focus:border-primary/50 transition-colors text-xs text-white placeholder-on-surface-variant"
        />

        {searchQuery.trim() && (
          <div id="topnav-search-results-dropdown" className="absolute left-0 right-[-80px] xs:right-0 top-11 bg-[#0a0a0c] border border-white/20 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_35px_rgba(157,80,187,0.2)] p-4 max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-1 text-white select-text">
            <h4 id="topnav-dropdown-title" className="text-[10px] uppercase font-bold text-primary tracking-wider mb-2.5 pb-1.5 border-b border-white/5">
              Workspace Matches ({searchResults.length})
            </h4>
            
            {searchResults.length === 0 ? (
              <p id="topnav-search-empty-text" className="text-center text-xs text-on-surface-variant py-5 font-light">No blueprints or history match your search.</p>
            ) : (
              <div id="topnav-search-items-list" className="space-y-1">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    id={`search-result-item-${item.id}`}
                    onClick={() => {
                      if (onSelectHistory) onSelectHistory(item);
                      if (setCurrentView) setCurrentView('generator');
                      setSearchQuery("");
                    }}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <span className="block text-xs font-semibold text-white group-hover:text-primary transition-colors truncate">
                        {item.title}
                      </span>
                      <span className="block text-[10px] text-on-surface-variant truncate mt-0.5 font-light font-mono">
                        {item.content || "Empty prompt context"}
                      </span>
                    </div>
                    <span id={`result-item-badge-${item.id}`} className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                      item.type === 'saved' 
                        ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' 
                        : 'bg-primary/10 text-primary border border-primary/20'
                    }`}>
                      {item.type}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div id="topnav-actions-group" className="flex items-center gap-2.5 sm:gap-4 notifications-wrapper">
        <button 
          id="topnav-tour-btn"
          type="button"
          onClick={() => onOpenTour?.()}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 border border-purple-500/25 hover:border-purple-500/40 text-purple-200 hover:text-white rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 animate-pulse cursor-pointer"
          title="Start Workspace Interactive Walkthrough"
        >
          <Sparkles size={11} className="text-pink-400 rotate-12" />
          <span>Quick Tour</span>
        </button>

        <button 
          id="topnav-help-btn"
          onClick={(e) => {
            e.stopPropagation();
            setIsHelpOpen(true);
          }}
          className="text-on-surface-variant hover:text-primary transition-colors hover:scale-105 cursor-pointer p-1"
          title="Creator Help Center"
        >
          <HelpCircle size={20} />
        </button>

        <button 
          id="topnav-bell-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowNotifications(!showNotifications);
          }}
          className="relative text-on-surface-variant hover:text-primary transition-colors hover:scale-105 cursor-pointer p-1"
        >
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(157,80,187,0.8)]"></span>
        </button>
        
        <div className="h-6 w-px bg-white/10 hidden xs:block"></div>

        <button 
          id="topnav-profile-trigger"
          onClick={() => setCurrentView('profile')}
          className="flex items-center gap-2 hover:opacity-85 transition-opacity text-left cursor-pointer"
          title="Creator Profile"
        >
          <div className="text-right hidden sm:block">
            <p id="topnav-user-name" className="text-xs font-bold leading-none text-white">{user?.name || 'Creator'}</p>
            <p id="topnav-user-tier" className="text-[9px] text-primary font-bold tracking-widest uppercase mt-0.5">Pro Plan</p>
          </div>
          <div id="topnav-avatar-container" className="w-8 h-8 rounded-full bg-white/10 border border-white/20 overflow-hidden shrink-0">
            <img id="topnav-avatar-img" src={user?.avatar || avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
        </button>
      </div>

      {showNotifications && (
        <div id="topnav-notifications-dropdown" className="absolute right-4 md:right-8 top-16 w-72 xs:w-80 bg-[#0a0a0c] border border-white/20 rounded-ax shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_35px_rgba(157,80,187,0.22)] p-4 animate-in fade-in slide-in-from-top-2 text-white z-50 select-text">
          <h3 id="notifications-title" className="font-bold mb-3 text-xs uppercase tracking-wider text-primary">Notifications</h3>
          <div className="space-y-3">
            <div id="notif-card-1" className="p-3 bg-white/5 border border-white/5 rounded-ax text-xs hover:border-primary/30 transition-colors cursor-pointer leading-relaxed">
              <p className="text-primary font-bold">New Hook Matrix ready!</p>
              <p className="opacity-70 mt-1">AI Video Architect constructed 5 target-niche hook suggestions.</p>
            </div>
            <p id="notif-empty-hint" className="text-center text-[10px] text-on-surface-variant py-2 font-light">No more notifications</p>
          </div>
        </div>
      )}

      {/* MOBILE DRAWER MODAL OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          id="mobile-drawer-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-start md:hidden animate-in fade-in duration-200"
        >
          <div 
            id="mobile-drawer-content"
            onClick={(e) => e.stopPropagation()}
            className="w-64 max-w-[80vw] h-full bg-[#0a0614] border-r border-white/10 p-5 flex flex-col justify-between animate-in slide-in-from-left duration-200 relative"
          >
            <div>
              <div className="flex justify-between items-center pb-4 mb-5 border-b border-white/5">
                <span className="text-sm font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                  AXE HOURS
                </span>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="p-1 text-gray-400 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-1.5">
                {mobileNavItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentView(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all duration-200 text-left text-xs font-semibold ${
                      item.id === currentView ? 'bg-purple-500/10 text-purple-300 border-purple-500/20' : 'text-gray-400 border-transparent hover:bg-white/5'
                    }`}
                  >
                    <item.icon size={16} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 border-t border-white/5 pt-4">
              <button 
                onClick={() => {
                  setIsHelpOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left py-2.5 px-3.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all flex items-center gap-3"
              >
                <HelpCircle size={16} />
                <span>Quick Help Desk</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. CREATOR HELP CENTER MODAL */}
      <Modal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} title="Creator Help Center">
        <div id="help-modal-content-area" className="space-y-6 select-text pr-1">
          {/* Interactive Guided Tour Callout Card */}
          <div className="p-4 bg-gradient-to-b from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl space-y-2.5">
            <div className="flex items-start gap-2.5">
              <Sparkles size={16} className="text-purple-400 animate-pulse mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-white tracking-wide">Interactive Onboarding Walkthrough</h4>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">Let our virtual setup wizard walk you through every workspace module (Dashboard metrics, Custom style controllers, Saved local vault, AI Preset engines) step-by-step.</p>
              </div>
            </div>
            <button 
              type="button"
              id="help-modal-start-tour-btn"
              onClick={() => {
                setIsHelpOpen(false);
                onOpenTour?.();
              }}
              className="w-full py-2 bg-primary-gradient text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Wand2 size={12} className="animate-pulse" />
              <span>Launch Interactive Walkthrough</span>
            </button>
          </div>

          <div>
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <BookOpen size={14} />
              Creator Quick-Start Guide
            </h3>
            <ul className="space-y-2 text-xs text-gray-300 leading-relaxed font-light">
              <li className="flex gap-2">
                <span className="text-primary font-bold">01.</span>
                <span>Go to Settings and add your <strong>Google Gemini API Key</strong> to configure high-speed cloud generation.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">02.</span>
                <span>Open the <strong>AI Generator</strong> and select your active engine (Gemini Cloud, Ollama Local, or Sandbox Mode).</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">03.</span>
                <span>Tailor templates in the <strong>Hooks Library</strong> with custom parameters, copy compiled scripts, and review conversion forecasts in the <strong>Analytics</strong> panel.</span>
              </li>
            </ul>
          </div>

          <div className="border-t border-white/5 pt-5">
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sparkles size={14} />
              Interactive Help Desk Bot
            </h3>
            
            <div className="space-y-3.5">
              {/* Message History Scroller */}
              <div className="bg-black/40 border border-white/5 rounded-xl p-3 h-[240px] overflow-y-auto custom-scrollbar space-y-3.5 select-text">
                {supportMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}>
                    <div className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                      msg.sender === 'user' 
                        ? 'bg-primary-gradient text-white border border-primary/25 rounded-tr-none font-bold' 
                        : 'bg-white/5 border border-white/5 text-gray-200 rounded-tl-none font-mono'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                ))}
                
                {isSupportLoading && (
                  <div className="flex justify-start animate-pulse">
                    <div className="bg-white/5 border border-white/5 rounded-xl rounded-tl-none p-3 text-xs text-primary font-bold flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Suggestions Chips */}
              <div className="flex flex-wrap gap-1.5 pt-0.5 select-none">
                <button 
                  id="help-chip-gemini"
                  type="button"
                  onClick={() => askSupportAI("🔑 Setup Gemini Key")} 
                  className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-primary/10 border border-white/5 hover:border-primary/20 text-[10px] text-gray-300 hover:text-white transition-all cursor-pointer font-medium"
                >
                  🔑 Gemini Key setup
                </button>
                <button 
                  id="help-chip-ctr"
                  type="button"
                  onClick={() => askSupportAI("📈 Increase CTR")} 
                  className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-primary/10 border border-white/5 hover:border-primary/20 text-[10px] text-gray-300 hover:text-white transition-all cursor-pointer font-medium"
                >
                  📈 Boost video CTR
                </button>
                <button 
                  id="help-chip-ollama"
                  type="button"
                  onClick={() => askSupportAI("🐳 Run Ollama Local")} 
                  className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-primary/10 border border-white/5 hover:border-primary/20 text-[10px] text-gray-300 hover:text-white transition-all cursor-pointer font-medium"
                >
                  🐳 Ollama local server
                </button>
                <button 
                  id="help-chip-suite"
                  type="button"
                  onClick={() => askSupportAI("🚀 Suite info tour")} 
                  className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-primary/10 border border-white/5 hover:border-primary/20 text-[10px] text-gray-300 hover:text-white transition-all cursor-pointer font-medium"
                >
                  🚀 Suite tour info
                </button>
              </div>

              {/* Bot Input bar */}
              <div className="flex gap-2">
                <input
                  id="support-bot-input"
                  type="text"
                  value={supportQuery}
                  onChange={(e) => setSupportQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      askSupportAI();
                    }
                  }}
                  placeholder="Ask support bot..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary placeholder-on-surface-variant"
                />
                <button
                  id="support-bot-submit-btn"
                  onClick={() => askSupportAI()}
                  disabled={isSupportLoading}
                  className="px-4 bg-primary-gradient text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer hover:opacity-90 transition-opacity"
                >
                  Ask
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* 2. CREATOR PROFILE MANAGER MODAL */}
      <Modal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} title="Creator Profile Settings">
        <form id="profile-settings-form" onSubmit={handleProfileSubmit} className="space-y-5">
          {saveSuccess && (
            <div id="profile-success-toast" className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold flex items-center gap-1.5 animate-pulse">
              <Check size={14} />
              Profile updated and hot-reloaded!
            </div>
          )}

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-2">Display Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
              <input
                id="profile-displayName-input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-2">Channel Handle</label>
            <div className="relative">
              <Video className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
              <input
                id="profile-handle-input"
                type="text"
                required
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@handle"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-2">Choose Avatar preset</label>
            <div className="flex gap-4 mt-2">
              {avatars.map((av, index) => (
                <button
                  type="button"
                  key={index}
                  id={`avatar-choice-btn-${index}`}
                  onClick={() => setAvatar(av.url)}
                  className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all relative cursor-pointer ${
                    avatar === av.url ? 'border-primary scale-105 shadow-[0_0_12px_rgba(157,80,187,0.4)]' : 'border-white/10 hover:border-white/30'
                  }`}
                  title={av.label}
                >
                  <img src={av.url} alt={av.label} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  {avatar === av.url && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <Check size={16} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            
            <div className="mt-4">
              <label className="block text-[9px] uppercase text-gray-500 mb-1">Or Input Custom Image URL</label>
              <input
                id="profile-custom-avatar-url"
                type="text"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://..."
                className="w-full bg-white/2 border border-white/5 rounded-lg p-2 text-[10px] text-white focus:outline-none focus:border-primary font-mono"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
            <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-gray-500 font-bold">
              <span>Plan Status</span>
              <span className="text-primary font-extrabold flex items-center gap-1">
                <Award size={10} />
                Creator Pro Edition
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-white mt-2">
              <span>Monthly Generations</span>
              <span className="font-bold">Unlimited</span>
            </div>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-primary-gradient w-full rounded-full" />
            </div>
          </div>

          <PrimaryButton id="profile-save-submit" className="w-full mt-3 flex items-center justify-center py-3 text-xs font-bold uppercase tracking-wider" type="submit">
            Save & Hot-Reload
          </PrimaryButton>
        </form>
      </Modal>
    </header>
  );
};
