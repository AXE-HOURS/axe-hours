import React, { useState, useMemo } from 'react';
import { 
  History, Calendar, Trash2, Search, Sliders, RefreshCw, 
  Lightbulb, Bookmark, Zap, TrendingUp, Download, User, Info, Check, ShieldAlert
} from 'lucide-react';
import { useFirebase, UserActivityItem } from '../context/FirebaseContext';
import { useToast } from '../context/ToastContext';
import { GlassCard } from '../components/GlassCard';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export const ActivityLog: React.FC = () => {
  const { userActivities, clearActivitiesDB } = useFirebase();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Statistics Calculation
  const totalCount = userActivities.length;
  
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    userActivities.forEach(act => {
      counts[act.actionType] = (counts[act.actionType] || 0) + 1;
    });
    return counts;
  }, [userActivities]);

  const mostFrequentType = useMemo(() => {
    if (totalCount === 0) return 'N/A';
    let maxType = 'N/A';
    let maxVal = 0;
    Object.entries(typeCounts).forEach(([t, count]) => {
      const val = count as number;
      if (val > maxVal) {
        maxType = t;
        maxVal = val;
      }
    });
    
    // Nice friendly format
    const format: Record<string, string> = {
      generate: 'AI Generation',
      save_idea: 'Saved Proposal',
      remove_idea: 'Purged Item',
      import_hook: 'Hook Import',
      competitor_intel: 'Niche Analysis',
      fetch_script: 'Script Download',
      profile_update: 'Profile Edit',
      custom_search: 'Audit Lookups'
    };
    return format[maxType] || maxType;
  }, [typeCounts, totalCount]);

  const lastActivityDate = useMemo(() => {
    if (totalCount === 0) return 'N/A';
    return userActivities[0].timestamp || 'Just now';
  }, [userActivities, totalCount]);

  // Chart Data Assembly (Group by day of week or date)
  const chartData = useMemo(() => {
    const last7Days: Record<string, number> = {};
    
    // Get last 7 calendar days labels
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });
      last7Days[label] = 0;
    }

    userActivities.forEach(act => {
      try {
        const d = new Date(act.createdAt);
        const label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });
        if (label in last7Days) {
          last7Days[label] += 1;
        }
      } catch (e) {
        // Fallback
      }
    });

    return Object.entries(last7Days).map(([date, count]) => ({
      date,
      "Log Events": count
    }));
  }, [userActivities]);

  // Filter logs based on category and search phrase
  const filteredActivities = useMemo(() => {
    return userActivities.filter(act => {
      const matchesCategory = category === 'all' || act.actionType === category;
      const matchesSearch = search.trim() === '' || 
        act.actionTitle.toLowerCase().includes(search.toLowerCase()) ||
        act.description.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [userActivities, category, search]);

  const handleClear = async () => {
    setIsClearing(true);
    try {
      await clearActivitiesDB();
      addToast("Successfully purged all activity history trails securely. 🌌", "info");
      setShowConfirmClear(false);
    } catch (e: any) {
      addToast("Failed to clear activities: " + (e?.message || e), "error");
    } finally {
      setIsClearing(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'generate':
        return <Lightbulb className="text-yellow-400" size={16} />;
      case 'save_idea':
        return <Bookmark className="text-[#a75ff0]" size={16} />;
      case 'remove_idea':
        return <Trash2 className="text-red-400" size={16} />;
      case 'import_hook':
        return <Zap className="text-pink-400" size={16} />;
      case 'competitor_intel':
        return <TrendingUp className="text-emerald-400" size={16} />;
      case 'fetch_script':
        return <Download className="text-cyan-400" size={16} />;
      case 'profile_update':
        return <User className="text-pink-400" size={16} />;
      default:
        return <History className="text-gray-400" size={16} />;
    }
  };

  // Human friendly category names
  const getCategoryLabel = (type: string) => {
    const labels: Record<string, string> = {
      generate: 'AI Generation',
      save_idea: 'Saved Idea',
      remove_idea: 'Idea Cleanup',
      import_hook: 'Hook Transfer',
      competitor_intel: 'Niche Focus',
      fetch_script: 'Script Extract',
      profile_update: 'Profile System',
      custom_search: 'Audit Lookups'
    };
    return labels[type] || type;
  };

  return (
    <div id="activity-log-view" className="space-y-8 animate-in fade-in duration-500 relative z-10 w-full max-w-7xl mx-auto select-none">
      
      {/* 1. Header Block */}
      <div id="activity-header" className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <History className="text-primary animate-pulse" size={28} />
            Workspace Audit Trail
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Real-time visual stream of creator milestones, script generations, and connected metadata lookups.
          </p>
        </div>

        {totalCount > 0 && (
          <button
            id="clear-logs-btn"
            onClick={() => setShowConfirmClear(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 hover:border-red-500/50 text-red-400 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg hover:shadow-red-500/5 active:scale-95 shrink-0"
          >
            <Trash2 size={14} />
            Purge Trail Logs
          </button>
        )}
      </div>

      {/* 2. Stats Deck */}
      <div id="activity-stats-deck" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard id="stat-card-total" className="p-5 flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all duration-500" />
          <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <History size={20} />
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">Total Actions Joined</p>
            <h3 className="text-2xl font-extrabold text-white mt-1">{totalCount}</h3>
          </div>
        </GlassCard>

        <GlassCard id="stat-card-frequent" className="p-5 flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-full blur-2xl group-hover:bg-pink-500/10 transition-all duration-500" />
          <div className="p-3.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
            <Zap size={20} />
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">Primary Workspace Event</p>
            <h3 className="text-xl font-extrabold text-white mt-1 truncate max-w-[180px]">{mostFrequentType}</h3>
          </div>
        </GlassCard>

        <GlassCard id="stat-card-last" className="p-5 flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-500" />
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Calendar size={20} />
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">Last Recorded Entry</p>
            <h3 className="text-xs font-bold text-white mt-2 font-mono truncate max-w-[180px]">{lastActivityDate}</h3>
          </div>
        </GlassCard>
      </div>

      {totalCount === 0 ? (
        <GlassCard id="empty-activities-card" className="p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-primary-50">
            <History size={24} className="opacity-80 animate-spin [animation-duration:12s]" />
          </div>
          <h2 className="text-lg font-bold text-white">Your audit logs are empty.</h2>
          <p className="text-on-surface-variant text-xs mt-2 max-w-sm mx-auto leading-relaxed">
            As you synthesize video blueprints, lock hook templates, or research competitor metrics across the suite, AXE HOURS will elegantly index entries here.
          </p>
        </GlassCard>
      ) : (
        <div id="active-activities-interface" className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Main Filter & List Deck */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Filter Toolbar */}
            <GlassCard id="activities-filter-bar" className="p-4 flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search log titles & events..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-primary transition-colors placeholder-on-surface-variant"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0 select-none">
                <Sliders size={12} className="text-on-surface-variant hidden xs:block" />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full sm:w-auto bg-[#0a0a0c] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-primary transition-all cursor-pointer font-bold"
                >
                  <option value="all">🔍 Show All Event Types</option>
                  <option value="generate">💡 AI Script Generations</option>
                  <option value="save_idea">⭐ Saved Proposals</option>
                  <option value="remove_idea">🗑️ Vault Purges</option>
                  <option value="import_hook">⚡ Hook Imports</option>
                  <option value="competitor_intel">📈 Competitor Intel</option>
                  <option value="fetch_script">📥 Script Fetches</option>
                </select>
              </div>
            </GlassCard>

            {/* Timestamps list */}
            <div id="activities-timeline" className="space-y-3 max-h-[580px] overflow-y-auto pr-1 pad-scroll scroll-smooth">
              {filteredActivities.length === 0 ? (
                <div id="no-filtered-results" className="p-12 text-center bg-white/2 border border-white/5 rounded-2xl">
                  <p className="text-on-surface-variant text-xs">No audited entries matched your active filter settings.</p>
                </div>
              ) : (
                filteredActivities.map((act) => (
                  <GlassCard 
                    key={act.id} 
                    id={`activity-item-card-${act.id}`}
                    className="p-4 border-l-2 hover:bg-white/5 border-l-primary/30 hover:border-l-primary flex gap-4 transition-all duration-300 animate-in fade-in"
                  >
                    <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      {getActivityIcon(act.actionType)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-1.5">
                        <h4 className="text-sm font-bold text-white truncate pr-2 select-text">
                          {act.actionTitle}
                        </h4>
                        
                        <span className="shrink-0 text-[9px] uppercase tracking-wider bg-white/5 border border-white/5 text-on-surface-variant px-1.5 py-0.5 rounded-full font-bold">
                          {getCategoryLabel(act.actionType)}
                        </span>
                      </div>
                      
                      <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed font-light scroll-py-1 select-text">
                        {act.description}
                      </p>

                      <div className="flex items-center gap-1.5 mt-3 text-[9px] font-mono text-gray-500">
                        <Calendar size={10} />
                        <span>{act.timestamp}</span>
                      </div>
                    </div>
                  </GlassCard>
                ))
              )}
            </div>
          </div>

          {/* Interactive Density Analytics Chart & Insights */}
          <div className="space-y-6">
            <GlassCard id="activities-visual-insights" className="p-5 relative overflow-hidden h-fit">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-primary mb-1">Event Logs Pulse</h3>
              <p className="text-[10px] text-on-surface-variant mt-0.5 mb-5 font-mono">DENSITY OVER THE LAST 7 DAYS</p>
              
              <div className="w-full h-44 mt-4 select-none pr-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <XAxis 
                      dataKey="date" 
                      stroke="#4b5563" 
                      fontSize={8} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="#4b5563" 
                      fontSize={8} 
                      tickLine={false} 
                      axisLine={false} 
                      allowDecimals={false} 
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0a0a0c',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '8px',
                        fontSize: '10px',
                        color: '#fff'
                      }}
                      itemStyle={{ color: '#c084fc' }}
                    />
                    <Bar 
                      dataKey="Log Events" 
                      fill="url(#gradient-purple-bar)" 
                      radius={[4, 4, 0, 0]} 
                    />
                    <defs>
                      <linearGradient id="gradient-purple-bar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a75ff0" stopOpacity={0.85} />
                        <stop offset="100%" stopColor="#c084fc" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="border-t border-white/5 pt-4 mt-4 space-y-3">
                <div className="flex gap-2 items-start text-[11px] leading-relaxed text-on-surface-variant">
                  <Info size={14} className="text-primary shrink-0 mt-0.5" />
                  <p>
                    AXE HOURS stores audit data securely in your Cloud database sandbox. Keeping telemetry records clean helps keep your creator account running optimally.
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* 3. CONFIRM PURGE MODAL OVERLAY */}
      {showConfirmClear && (
        <div id="purge-modal-overlay" className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[999] animate-in fade-in duration-200">
          <GlassCard id="purge-modal-container" className="max-w-md w-full p-6 border-red-500/30 shadow-[0_25px_60px_-15px_rgba(239,68,68,0.22)] animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-400 mb-4 pb-1 border-b border-white/5">
              <ShieldAlert size={22} className="animate-bounce" />
              <h3 className="text-lg font-bold">Relational Purge Security Check</h3>
            </div>
            
            <p className="text-xs text-gray-300 leading-relaxed mb-5">
              Warning: This is a destructive write-op that will clear your activity logs from Cloud Firestore database permanently.
            </p>

            <div className="bg-red-500/5 text-red-400/80 p-3 rounded-xl border border-red-500/10 text-[11px] leading-relaxed mb-5">
              All records of generations, competitor intel checks, transcript decodings, and proposal saves in your history will be purged completely. Active saved ideas/recent scripts are unaffected.
            </div>

            <div className="flex gap-3 justify-end font-bold uppercase tracking-wider text-[11px]">
              <button
                type="button"
                disabled={isClearing}
                onClick={() => setShowConfirmClear(false)}
                className="px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                Cancel
              </button>
              
              <button
                type="button"
                disabled={isClearing}
                onClick={handleClear}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isClearing ? (
                  <>
                    <RefreshCw className="animate-spin" size={12} />
                    Processing...
                  </>
                ) : (
                  <>
                    <Trash2 size={12} />
                    Confirm Purge
                  </>
                )}
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
