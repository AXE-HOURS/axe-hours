import React from 'react';
import { LayoutDashboard, Lightbulb, Bookmark, Zap, BarChart3, Settings, Crown, Plus, LogOut, User, TrendingUp, Download, History } from 'lucide-react';

interface GenerationItem {
  id: number;
  title: string;
  content: string;
  date: string;
}

interface UserData {
  email: string;
  name?: string;
  handle?: string;
  avatar?: string;
  tier?: string;
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  recentGenerations: GenerationItem[];
  onSelectHistory: (item: GenerationItem) => void;
  onLogout: () => void;
  user: UserData | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  recentGenerations = [], 
  onSelectHistory, 
  onLogout, 
  user 
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profile', label: 'Profile System', icon: User },
    { id: 'generator', label: 'Generate Ideas', icon: Lightbulb },
    { id: 'saved', label: 'Saved Ideas', icon: Bookmark },
    { id: 'viral', label: 'Viral Hooks', icon: Zap },
    { id: 'competitor-intel', label: 'Competitor Intel', icon: TrendingUp },
    { id: 'script-fetcher', label: 'Script Fetcher', icon: Download },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'activity-log', label: 'Activity Trail', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside id="sidebar-container" className="fixed left-0 top-0 h-full w-64 bg-[#0a0614]/80 backdrop-blur-3xl border-r border-[#ffffff0a] flex flex-col z-50 hidden md:flex">
      {/* Cyber Grid element on background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(157,80,187,0.02)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none" />

      <div className="p-6 border-b border-white/5 relative">
        <div className="flex items-center gap-2">
          <h1 id="sidebar-logo" className="text-xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300">
            AXE HOURS
          </h1>
          <span className="text-[10px] bg-red-500/10 border border-red-500/20 text-red-400 font-mono px-1 py-0.5 rounded animate-pulse">
            AI
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[9px] font-mono tracking-widest text-[#10b981] uppercase font-bold">SYSTEM_ONLINE</span>
        </div>
      </div>

      <nav id="sidebar-nav" className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto custom-scrollbar relative z-10">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`sidebar-nav-item-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group cursor-pointer border ${
                isActive 
                  ? 'bg-purple-500/10 text-purple-300 border-purple-500/20 shadow-[0_0_15px_rgba(157,80,187,0.08)]' 
                  : 'text-gray-400 border-transparent hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={18} className={`transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-purple-400' : 'text-gray-400'}`} />
                <span className="font-semibold text-sm tracking-wide">{item.label}</span>
              </div>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc]" />
              )}
            </button>
          );
        })}

        {recentGenerations && recentGenerations.length > 0 && (
          <div id="recent-generations-sidebar-sec" className="mt-10 px-4 pb-4">
            <h3 id="sidebar-recent-titles" className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.2em] mb-4 opacity-70">
              Recent Generations
            </h3>
            <div className="space-y-3">
              {recentGenerations.slice(0, 3).map((item) => (
                <button 
                  key={item.id}
                  id={`recent-gen-item-${item.id}`}
                  onClick={() => onSelectHistory(item)}
                  className="w-full text-left p-3 rounded-xl bg-white/5 border border-white/5 hover:border-purple-500/40 hover:bg-white/10 transition-all group animate-in fade-in cursor-pointer"
                >
                  <span className="block text-xs font-medium text-white/90 truncate group-hover:text-white">
                    {item.title}
                  </span>
                  <span className="text-[9px] text-gray-500 mt-1 block">
                    {item.date}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      <div id="sidebar-footer" className="p-4 space-y-2 border-t border-white/5">
        {user?.tier === 'pro' ? (
          <div 
            id="sidebar-tier-active-badge-pro"
            className="w-full flex items-center gap-3 px-4 py-3 bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-xl"
          >
            <Crown size={18} className="text-purple-400 animate-pulse" />
            <span className="text-xs font-bold tracking-wider uppercase font-sans">Pro Creator Active</span>
          </div>
        ) : user?.tier === 'agency' ? (
          <div 
            id="sidebar-tier-active-badge-agency"
            className="w-full flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 tracking-wider rounded-xl"
          >
            <Crown size={18} className="text-yellow-400 animate-bounce" />
            <span className="text-xs font-bold tracking-wider uppercase font-sans text-amber-400">Agency Elite Active</span>
          </div>
        ) : (
          <button 
            id="sidebar-upgrade-btn"
            onClick={() => setActiveTab('settings')}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
          >
            <Crown size={20} className="text-yellow-400" />
            <span>Upgrade to Pro</span>
          </button>
        )}
        
        <button 
          id="sidebar-logout-btn"
          onClick={onLogout} 
          className="w-full flex items-center gap-3 px-4 py-3 text-red-400/80 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all group cursor-pointer"
        >
          <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
          <span className="font-medium">Log Out</span>
        </button>

        <button 
          id="sidebar-new-project-btn"
          onClick={() => setActiveTab('generator')} 
          className="w-full mt-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-[1.02] active:scale-95 cursor-pointer"
        >
          <Plus size={20} />
          <span className="font-bold tracking-wide uppercase text-sm">New Project</span>
        </button>
      </div>
    </aside>
  );
};
