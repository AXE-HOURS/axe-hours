import React, { useState, useMemo, useEffect } from 'react';
import { 
  BookOpen, Sparkles, Shield, Cpu, RefreshCw, Layers, Zap, TrendingUp, HelpCircle,
  FileText, Play, Sliders, CheckCircle2, ChevronRight, Search, X, Activity, AlertTriangle
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { LegalModal } from './LegalModal';
import { useFirebase } from '../context/FirebaseContext';

export const Footer: React.FC = () => {
  const { dbUser, user } = useFirebase();
  const [isOpen, setIsOpen] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | null>(null);
  const [activeTab, setActiveTab] = useState<'getting-started' | 'features' | 'secrets' | 'simulator'>('getting-started');
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-open if first-time use or new account creation
  useEffect(() => {
    const uid = user?.uid || dbUser?.uid || "guest";
    const key = `axe_hours_playbook_seen_${uid}`;
    const hasSeen = localStorage.getItem(key);
    
    let isNewAccount = false;
    if (dbUser && dbUser.createdAt) {
      const createdTime = new Date(dbUser.createdAt).getTime();
      const now = Date.now();
      // If the account was created in the last 20 seconds, we show the playbook
      if (now - createdTime < 20000) {
        isNewAccount = true;
      }
    }

    if (!hasSeen || isNewAccount) {
      setIsOpen(true);
      localStorage.setItem(key, "true");
    }

    // Support global triggers for navigation inside playbook tabs
    const handleOpenPlaybook = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsOpen(true);
      if (customEvent.detail && customEvent.detail.tab) {
        setActiveTab(customEvent.detail.tab);
      }
    };
    window.addEventListener('open-playbook', handleOpenPlaybook);
    return () => window.removeEventListener('open-playbook', handleOpenPlaybook);
  }, [dbUser?.uid, dbUser?.createdAt, user?.uid]);

  // Simulator State
  const [hookDuration, setHookDuration] = useState<number>(3.0); // seconds
  const [cutFrequency, setCutFrequency] = useState<number>(2.0); // seconds
  const [deliverySpeed, setDeliverySpeed] = useState<number>(165); // WPM
  const [outroLoopStyle, setOutroLoopStyle] = useState<string>('loop'); // loop, standard, hard-cta
  const [styleNoEmojis, setStyleNoEmojis] = useState<boolean>(true);
  const [styleAuthority, setStyleAuthority] = useState<boolean>(false);
  const [styleAudioPacing, setStyleAudioPacing] = useState<boolean>(true);

  // Calculate simulated retention potential
  const retentionMetrics = useMemo(() => {
    let score = 65; // base baseline

    // 1. Hook Duration (optimal <= 3.5 seconds)
    if (hookDuration <= 3.5) {
      score += 15;
    } else if (hookDuration > 5.0) {
      score -= Math.round((hookDuration - 5.0) * 8);
    } else {
      score += 5;
    }

    // 2. Cut frequency (optimal 1.5 - 2.5s)
    if (cutFrequency >= 1.5 && cutFrequency <= 2.5) {
      score += 15;
    } else if (cutFrequency < 1.0) {
      score += 5; // too fast is flashy but okay for TikTok
    } else {
      score -= Math.round((cutFrequency - 2.5) * 10);
    }

    // 3. WPM Delivery speed (optimal 150 - 180 WPM for speed-subtitles)
    if (deliverySpeed >= 155 && deliverySpeed <= 175) {
      score += 10;
    } else if (deliverySpeed > 190) {
      score -= 5; // too rushed, hard to comprehend
    } else if (deliverySpeed < 130) {
      score -= 15; // too slow, viewer scrolls away
    }

    // 4. Outro type
    if (outroLoopStyle === 'loop') {
      score += 10; // seamless loops boost views significantly
    } else if (outroLoopStyle === 'hard-cta') {
      score -= 8; // hard CTA reduces continuation slightly but converts better
    }

    // 5. Stylistic Creator Guidelines checks
    if (styleNoEmojis) {
      score += 5; // Clean typography increases raw comprehension index
    }
    if (styleAuthority) {
      score += 6; // Authority tone keeps technical viewers engaged longer
    }
    if (styleAudioPacing) {
      score += 4; // Rhythm reset resets auditory clock to reduce dropoff rates
    }

    // Bound the score between 40% and 99%
    score = Math.max(42, Math.min(99, score));

    return {
      score,
      badge: score >= 88 ? 'VIRAL POTENTIAL' : score >= 75 ? 'STABLE' : 'RISKY',
      badgeColor: score >= 88 ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/20' : score >= 75 ? 'text-primary bg-primary/15 border-primary/20' : 'text-amber-400 bg-amber-500/15 border-amber-500/20',
      pacingTip: score >= 88 
        ? "Perfect setup. High-contrast loop paired with split-second editing cuts and strict creator style guidelines triggers instant neuro-lock."
        : score >= 75 
          ? "Solid overall structure. Re-tune your intro hooks below 3.5s or toggle on more rigid brand constraints to squeeze out max engagement." 
          : "Viewer dropoff risk detected. Increase video pacing (under 3s per B-Roll), adjust speech delivery rate, and enforce precise brand rules."
    };
  }, [hookDuration, cutFrequency, deliverySpeed, outroLoopStyle, styleNoEmojis, styleAuthority, styleAudioPacing]);

  // Combined searchable content index for help/documentation tabs
  const docsDirectory = {
    'getting-started': [
      {
        title: "The Ultimate 12-Hour Creator Flow",
        subtitle: "How to go from spark idea to ultra-retention short-form scripts",
        description: "AXE HOURS is designed as a streamlined creator operating system. The optimal flow is simple: generate script ideas using prompt presets inside the Architect, refine your visual copy dynamically with Viral Loops, audit your pacing metrics against top channels using Script Fetcher, and benchmark your progress using the Workspace Audit trail logs.",
        steps: [
          { phase: "Phase 1: Layouts", action: "Extracting short-form layouts using advanced preset cards with prompt details to compile high-retention outlines.", targetView: "generator", query: "Show me the Script Architect to generate short-form layouts" },
          { phase: "Phase 2: Buffer Bridge", action: "Utilizing the local state buffer transfer bridge to push transcript text or scripts directly across workspaces.", targetView: "script-fetcher", query: "Open the Script Fetcher so I can use the Data Bridge" },
          { phase: "Phase 3: Playground", action: "Executing A/B linguistic playground evaluations to compare metrics and copy variants side-by-side.", targetView: "generator", query: "Open the A/B comparative Retention Playground" },
          { phase: "Phase 4: Teleprompter", action: "Initiating the requestAnimationFrame Autoscroll Teleprompter & Speech Pacing Coach to practice live delivery.", targetView: "generator", query: "Show me the Speech Coach Teleprompter viewport" }
        ]
      }
    ],
    'features': [
      {
        title: "⚡ Core Tools Reference Manual",
        subtitle: "A detailed breakdown of every workspace module in your dashboard",
        items: [
          { name: "🎛️ Workspace Dashboard", info: "The main cockpit. Track viral metrics, view global activities stream, and filter compilations instantly using the new Real-time Search Input." },
          { name: "💡 Script Architect (AI Generator)", info: "Leverages Gemini API text engines. Mix advanced preset cards with prompt details to compile high-retention outlines, custom brand rules, and instant 1-Click Regeneration." },
          { name: "📋 Custom Creator Guidelines", info: "An integrated augmentation rules system. Define brand rules, tone guidelines (e.g. no emojis, direct speech) which are injected directly into Gemini's synthesis pipeline." },
          { name: "🔍 Real-time Search & Filter", info: "Instantly locate matching blueprints on your dashboard using titles, niches, or keywords. Includes immediate one-click copy actions for speedy scripts dispatch." },
          { name: "⭐ Saved Blueprint Vault", info: "A fully decentralized and synced local & cloud vault. Stores scripts and raw text nodes securely to access across browser instances." },
          { name: "⚡ Viral Hooks Engine", info: "15+ psychologically optimized hook templates. Select formula variables, generate live speech voiceovers, and instantly export compiled text straight to the Architect." },
          { name: "📈 Competitor Intelligence Analyzer", info: "Track YouTube and short-form channels. Live-scraps metrics, models competitor viewer distribution curves, and highlights successful niche frameworks." },
          { name: "📥 Script Fetcher (Transcript Decoder)", info: "Extract and decode speech transcripts directly from references. Runs semantic structure analyzers to map hook density and pacing parameters." },
          { name: "📊 Analytics & Quality Suite", info: "Indexes real-time visual statistics of generated assets. Audits readability, emotional valence distribution, and text density indexes." },
          { name: "⏰ Activity Trail Logs", info: "Automatically stamps your session activities (generations, competitor saves, script downloads) with date triggers. Features localized purging controls." }
        ]
      }
    ],
    'secrets': [
      {
        title: "🌌 Short-Form Retention Secrets",
        subtitle: "Data-backed video pacing blueprints utilized by the top 0.1%",
        hacks: [
          { rule: "Rule 1: The 3.2s Scroll-Stop Limit", detail: "If your visual or vocal hook spans more than 3.5 seconds before establishing the conflict, retention rates decay by up to 48%. Place your hook text boldly in the safe region." },
          { rule: "Rule 2: Neural Reset Events", detail: "Trigger a audio-visual rhythm change every 4 to 6 seconds. This can be a secondary zoom, a text highlight trigger, a sound effect spike, or a b-roll cut." },
          { rule: "Rule 3: Microscopic Code Boilerplate", detail: "99% of creators fail by over-complicating structures. Standardize your story structures into one of three formulas: Contrarian Loop, Authority Pivot, or Simple Secret-Unlock." },
          { rule: "Rule 4: Endless Replay Cycles", detail: "End your video mid-sentence or trigger an prompt that references the exact initial word of the intro hook. Safe loops double standard continuation scores." }
        ]
      }
    ]
  };

  // Simple reactive search filtering across titles, descriptions, and manual steps
  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return docsDirectory;

    const query = searchQuery.toLowerCase();
    const result: any = { 'getting-started': [], 'features': [], 'secrets': [] };

    // Filter getting started
    docsDirectory['getting-started'].forEach(item => {
      if (item.title.toLowerCase().includes(query) || 
          item.description.toLowerCase().includes(query) ||
          item.steps.some(s => s.action.toLowerCase().includes(query))) {
        result['getting-started'].push(item);
      }
    });

    // Filter features
    docsDirectory['features'].forEach(item => {
      const matchedItems = item.items.filter(i => i.name.toLowerCase().includes(query) || i.info.toLowerCase().includes(query));
      if (item.title.toLowerCase().includes(query) || matchedItems.length > 0) {
        result['features'].push({
          ...item,
          items: matchedItems.length > 0 ? matchedItems : item.items
        });
      }
    });

    // Filter secrets
    docsDirectory['secrets'].forEach(item => {
      const matchedHacks = item.hacks.filter(h => h.rule.toLowerCase().includes(query) || h.detail.toLowerCase().includes(query));
      if (item.title.toLowerCase().includes(query) || matchedHacks.length > 0) {
        result['secrets'].push({
          ...item,
          hacks: matchedHacks.length > 0 ? matchedHacks : item.hacks
        });
      }
    });

    return result;
  }, [searchQuery]);

  const hasSearchResults = useMemo(() => {
    return filteredDocs['getting-started'].length > 0 || 
           filteredDocs['features'].length > 0 || 
           filteredDocs['secrets'].length > 0;
  }, [filteredDocs]);

  return (
    <>
      {/* GLOBAL SCREEN FOOTER */}
      <footer id="axe-hours-global-footer" className="border-t border-white/5 bg-[#030304]/90 backdrop-blur-md py-6 px-4 md:px-8 mt-12 relative z-20 shrink-0 select-none">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          
          {/* Logo Brand Meta */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary-gradient flex items-center justify-center text-white shadow-md shadow-primary/20">
              <Cpu size={15} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[#fff] tracking-wider text-xs uppercase">AXE HOURS</span>
                <span className="text-[9px] font-mono font-black text-primary border border-primary/20 bg-primary/5 px-1.5 py-0.2 rounded-full">v5.2.0</span>
              </div>
              <p className="text-[10px] text-on-surface-variant font-light mt-0.5">High-retention creative synthesis and predictive orchestration suite.</p>
            </div>
          </div>

          {/* Quick links & Documentation Center Button */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-[11px]">
            <button 
              id="footer-playbook-trigger"
              onClick={() => { setIsOpen(true); setActiveTab('getting-started'); }}
              className="flex items-center gap-2 font-black text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 transition-all cursor-pointer active:scale-95"
            >
              <BookOpen size={13} className="text-primary" />
              📖 Interactive Creator Playbook
            </button>

            <span className="h-4 w-[1px] bg-white/10 hidden sm:block" />

            <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[10px] bg-emerald-500/10 border border-emerald-500/15 py-1 px-2.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>SYSTEM STATE: OPERATIONAL</span>
            </div>
          </div>
        </div>

        {/* Copy Indicator bar */}
        <div className="max-w-7xl mx-auto border-t border-white/5 mt-5 pt-4 flex flex-col xs:flex-row justify-between items-center gap-3 text-[10px] text-gray-500 font-mono">
          <p>© {new Date().getFullYear()} AXE HOURS. Built for top 0.1% retention strategists.</p>
          <div className="flex items-center gap-4">
            <button 
              type="button"
              onClick={() => setLegalModalType('privacy')} 
              className="hover:text-gray-300 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button 
              type="button"
              onClick={() => setLegalModalType('terms')} 
              className="hover:text-gray-300 transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <span className="h-3 w-[1px] bg-white/10" />
            <p className="flex items-center gap-1">
              <Shield size={10} className="text-primary/70" />
              <span>Secure Sandboxed cloud protocol locked</span>
            </p>
          </div>
        </div>
      </footer>

      {/* AXE Hours AI Legal Documents Modal */}
      <LegalModal 
        isOpen={!!legalModalType} 
        type={legalModalType || 'privacy'} 
        onClose={() => setLegalModalType(null)} 
      />

      {/* DETAILED INTERACTIVE CREATOR PLAYBOOK MODAL */}
      {isOpen && (
        <div id="playbook-modal-portal" className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-hidden animate-in fade-in duration-200">
          <GlassCard id="playbook-blueprint-window" className="w-full max-w-4xl h-[90vh] md:h-[80vh] h-full p-0 flex flex-col overflow-hidden border-white/15 shadow-[0_25px_65px_-12px_rgba(157,80,187,0.3)] animate-in zoom-in-95 duration-200 relative">
            
            {/* Header section with Close Button */}
            <div className="flex border-b border-white/5 p-4 md:p-5 justify-between items-center bg-black/40 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/15 border border-primary/20 text-primary">
                  <BookOpen size={18} className="animate-pulse" />
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-extrabold text-white flex items-center gap-2 font-sans">
                    AXE HOURS Creator Playbook
                    <span className="text-[9px] bg-primary-gradient px-2 py-0.5 rounded-full font-mono font-black uppercase text-white shadow-sm">Blueprints</span>
                  </h2>
                  <p className="text-[10px] text-on-surface-variant">The definitive architectural reference to viral short-form retention mechanics.</p>
                </div>
              </div>

              <button 
                id="playbook-close-button"
                onClick={() => setIsOpen(false)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-gray-400 hover:text-white transition-all cursor-pointer absolute top-4 right-4"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tab Controls Navigation */}
            <div className="flex flex-wrap border-b border-white/5 bg-[#050507] p-2 gap-1.5 shrink-0">
              <button
                onClick={() => setActiveTab('getting-started')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'getting-started' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
              >
                <Layers size={13} />
                🚀 Quick Start
              </button>

              <button
                onClick={() => setActiveTab('features')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'features' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
              >
                <Cpu size={13} />
                🛠️ Feature Directory
              </button>

              <button
                onClick={() => setActiveTab('secrets')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'secrets' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
              >
                <Zap size={13} />
                📈 Pacing Secrets
              </button>

              <button
                onClick={() => setActiveTab('simulator')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'simulator' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
              >
                <Sliders size={13} />
                🧪 Interactive Simulator
              </button>
            </div>

            {/* Inner Dashboard Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-black/20 custom-scrollbar">
              <div>
                
                {/* Global Search Bar (Only shown on non-simulator views) */}
                {activeTab !== 'simulator' && (
                  <div className="relative mb-5 w-full">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter documentation logs or hacks..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-primary transition-colors placeholder-on-surface-variant font-medium"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-[10px]"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}

                {/* 1. GETTING STARTED VIEW */}
                {activeTab === 'getting-started' && (
                  <div className="space-y-6">
                    {filteredDocs['getting-started'].map((doc, idx) => (
                      <div key={idx} className="space-y-4 animate-in fade-in duration-200">
                        <div className="border-b border-primary/20 pb-3">
                          <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                            <Sparkles size={16} className="text-primary" />
                            {doc.title}
                          </h3>
                          <p className="text-xs text-on-surface-variant mt-1">{doc.subtitle}</p>
                        </div>
                        
                        <p className="text-xs text-gray-300 leading-relaxed bg-[#0c0a12]/50 border border-purple-500/10 p-3.5 rounded-xl font-light">
                          {doc.description}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                          {doc.steps.map((st: any, sidx: number) => (
                            <div key={sidx} className="p-4 bg-white/5 border border-white/5 rounded-xl relative overflow-hidden group hover:border-primary/20 hover:bg-white/10 transition-all duration-300 flex flex-col justify-between">
                              <div>
                                <span className="text-[10px] font-bold text-primary font-mono uppercase tracking-widest">{st.phase}</span>
                                <p className="text-xs text-gray-200 mt-2 font-medium leading-relaxed">{st.action}</p>
                              </div>
                              {st.query && (
                                <button
                                  onClick={() => {
                                    window.dispatchEvent(new CustomEvent('trigger-assistant-navigation', { 
                                      detail: { query: st.query, view: st.targetView } 
                                    }));
                                  }}
                                  className="mt-3 self-start px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                                >
                                  Ask Assistant to Open
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {!hasSearchResults && (
                      <div className="text-center py-8 text-on-surface-variant text-xs">No documentation modules match your search phrase.</div>
                    )}
                  </div>
                )}

                {/* 2. CHANNELS / FEATURE REFERENCES */}
                {activeTab === 'features' && (
                  <div className="space-y-6">
                    {filteredDocs['features'].map((doc, idx) => (
                      <div key={idx} className="space-y-4 animate-in fade-in duration-200">
                        <div className="border-b border-primary/20 pb-3">
                          <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                            <Cpu size={16} className="text-primary" />
                            {doc.title}
                          </h3>
                          <p className="text-xs text-on-surface-variant mt-1">{doc.subtitle}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {doc.items.map((it, sidx) => (
                            <div key={sidx} className="p-3 bg-white/2 border border-white/5 rounded-xl space-y-1.5">
                              <h4 className="text-xs font-bold text-white">{it.name}</h4>
                              <p className="text-[11px] text-on-surface-variant leading-relaxed font-light">{it.info}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {!hasSearchResults && (
                      <div className="text-center py-8 text-on-surface-variant text-xs">No documentation modules match your search phrase.</div>
                    )}
                  </div>
                )}

                {/* 3. PACING & SEGMENTS SECRETS */}
                {activeTab === 'secrets' && (
                  <div className="space-y-6">
                    {filteredDocs['secrets'].map((doc, idx) => (
                      <div key={idx} className="space-y-4 animate-in fade-in duration-200">
                        <div className="border-b border-primary/20 pb-3">
                          <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                            <Zap size={16} className="text-primary" />
                            {doc.title}
                          </h3>
                          <p className="text-xs text-on-surface-variant mt-1">{doc.subtitle}</p>
                        </div>

                        <div className="space-y-3">
                          {doc.hacks.map((hk, sidx) => (
                            <div key={sidx} className="p-4 bg-white/2 border border-white/5 border-l-2 border-l-primary/40 rounded-r-xl flex items-start gap-3">
                              <div className="p-1.5 bg-primary/10 rounded-lg text-primary shrink-0 mt-0.5">
                                <CheckCircle2 size={12} />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-white">{hk.rule}</h4>
                                <p className="text-[11px] text-on-surface-variant mt-1 font-light leading-relaxed">{hk.detail}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {!hasSearchResults && (
                      <div className="text-center py-8 text-on-surface-variant text-xs">No documentation modules match your search phrase.</div>
                    )}
                  </div>
                )}

                {/* 4. INTERACTIVE PACING SIMULATOR */}
                {activeTab === 'simulator' && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="border-b border-primary/20 pb-3">
                      <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                        <Sliders size={16} className="text-primary" />
                        Interactive Predictive Retention Simulator
                      </h3>
                      <p className="text-xs text-on-surface-variant mt-1">
                        Calibrate your script properties below to dynamically compute real-time analytical score indices.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                      
                      {/* Sliders Input Panel */}
                      <div className="md:col-span-2 space-y-4 shrink-0 bg-white/2 p-4 rounded-xl border border-white/5">
                        
                        {/* Hook Slider */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <label className="text-gray-300 font-bold">Intro Hook Duration</label>
                            <span className="font-mono text-primary font-bold">{hookDuration.toFixed(1)}s</span>
                          </div>
                          <input
                            type="range"
                            min="1.0"
                            max="8.0"
                            step="0.5"
                            value={hookDuration}
                            onChange={(e) => setHookDuration(parseFloat(e.target.value))}
                            className="w-full accent-primary bg-black h-1 rounded-full cursor-pointer appearance-none"
                          />
                          <p className="text-[9px] text-on-surface-variant">Recommended: &lt; 3.5s. Long intros increase scroll-away ratios.</p>
                        </div>

                        {/* Cut frequency slider */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <label className="text-gray-300 font-bold">B-Roll Cut Frequency</label>
                            <span className="font-mono text-primary font-bold">{cutFrequency.toFixed(1)}s</span>
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="6.0"
                            step="0.5"
                            value={cutFrequency}
                            onChange={(e) => setCutFrequency(parseFloat(e.target.value))}
                            className="w-full accent-primary bg-black h-1 rounded-full cursor-pointer appearance-none"
                          />
                          <p className="text-[9px] text-on-surface-variant">Recommended: 1.5s - 2.5s. Slower editing cuts drag retention curves downward.</p>
                        </div>

                        {/* Speech delivery speed slider */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <label className="text-gray-300 font-bold">Vocal Delivery Speed (Words Per Min)</label>
                            <span className="font-mono text-primary font-bold">{deliverySpeed} WPM</span>
                          </div>
                          <input
                            type="range"
                            min="110"
                            max="220"
                            step="5"
                            value={deliverySpeed}
                            onChange={(e) => setDeliverySpeed(parseInt(e.target.value))}
                            className="w-full accent-primary bg-black h-1 rounded-full cursor-pointer appearance-none"
                          />
                          <p className="text-[9px] text-on-surface-variant">Recommended: 155 - 180 WPM. Slow speaking causes loss of attention spikes.</p>
                        </div>

                        {/* Outro loop trigger radio selections */}
                        <div className="space-y-2">
                          <label className="text-xs text-gray-300 font-bold">Outro Structure & CTA Pattern</label>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              onClick={() => setOutroLoopStyle('loop')}
                              className={`py-2 px-3 rounded-xl border text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${outroLoopStyle === 'loop' ? 'bg-primary/25 border-primary text-white' : 'bg-transparent border-white/5 text-gray-400 hover:text-white'}`}
                            >
                              Seamless Loop (+10)
                            </button>
                            <button
                              onClick={() => setOutroLoopStyle('standard')}
                              className={`py-2 px-3 rounded-xl border text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${outroLoopStyle === 'standard' ? 'bg-primary/25 border-primary text-white' : 'bg-transparent border-white/5 text-gray-400 hover:text-white'}`}
                            >
                              Soft Sign-off (+0)
                            </button>
                            <button
                              onClick={() => setOutroLoopStyle('hard-cta')}
                              className={`py-2 px-3 rounded-xl border text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${outroLoopStyle === 'hard-cta' ? 'bg-primary/25 border-primary text-white' : 'bg-transparent border-white/5 text-gray-400 hover:text-white'}`}
                            >
                              Hard Action CTA (-8)
                            </button>
                          </div>
                        </div>

                        {/* Creator Style Augmentation Checks */}
                        <div className="space-y-2 border-t border-white/5 pt-4">
                          <div className="flex justify-between items-center">
                            <label className="text-xs text-gray-300 font-bold">Augmented Creator Style Guidelines</label>
                            <span className="text-[9px] font-mono text-purple-400 font-bold uppercase tracking-widest">Enforced Directives</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <label className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${styleNoEmojis ? 'bg-purple-600/10 border-purple-500/40 text-white' : 'bg-transparent border-white/5 text-gray-400 hover:border-white/10'}`}>
                              <input
                                type="checkbox"
                                checked={styleNoEmojis}
                                onChange={(e) => setStyleNoEmojis(e.target.checked)}
                                className="rounded border-white/20 text-[#a855f7] focus:ring-0 cursor-pointer h-3.5 w-3.5 bg-black/60"
                              />
                              <div className="flex flex-col text-left">
                                <span className="text-[10px] font-bold">No Emojis (+5%)</span>
                                <span className="text-[8px] text-gray-500 leading-tight">Clutter-free text</span>
                              </div>
                            </label>

                            <label className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${styleAuthority ? 'bg-purple-600/10 border-purple-500/40 text-white' : 'bg-transparent border-white/5 text-gray-400 hover:border-white/10'}`}>
                              <input
                                type="checkbox"
                                checked={styleAuthority}
                                onChange={(e) => setStyleAuthority(e.target.checked)}
                                className="rounded border-white/20 text-[#a855f7] focus:ring-0 cursor-pointer h-3.5 w-3.5 bg-black/60"
                              />
                              <div className="flex flex-col text-left">
                                <span className="text-[10px] font-bold">Authority (+6%)</span>
                                <span className="text-[8px] text-gray-500 leading-tight">Tone of command</span>
                              </div>
                            </label>

                            <label className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${styleAudioPacing ? 'bg-purple-600/10 border-purple-500/40 text-white' : 'bg-transparent border-white/5 text-gray-400 hover:border-white/10'}`}>
                              <input
                                type="checkbox"
                                checked={styleAudioPacing}
                                onChange={(e) => setStyleAudioPacing(e.target.checked)}
                                className="rounded border-white/20 text-[#a855f7] focus:ring-0 cursor-pointer h-3.5 w-3.5 bg-black/60"
                              />
                              <div className="flex flex-col text-left">
                                <span className="text-[10px] font-bold font-sans">Audio SFX (+4%)</span>
                                <span className="text-[8px] text-gray-500 leading-tight">Rhythm resets</span>
                              </div>
                            </label>
                          </div>
                        </div>

                      </div>

                      {/* Score Result Panel */}
                      <div className="p-5 rounded-2xl bg-[#090714] border border-primary/20 space-y-4">
                        <div className="text-center">
                          <p className="text-[10px] text-on-surface-variant font-bold tracking-widest uppercase">Engine Diagnostic Score</p>
                          <div className="text-5xl font-black text-white mt-1 font-mono tracking-tight animate-pulse flex justify-center items-baseline gap-1">
                            {retentionMetrics.score}
                            <span className="text-xs text-primary">%</span>
                          </div>
                          
                          <span className={`inline-block border text-[8px] font-black px-2 py-0.5 rounded-full mt-3 tracking-widest select-none ${retentionMetrics.badgeColor}`}>
                            {retentionMetrics.badge}
                          </span>
                        </div>

                        <div className="p-3 bg-white/2 rounded-xl border border-white/5 space-y-2">
                          <h4 className="text-[10px] font-black text-gray-300 uppercase flex items-center gap-1">
                            <Activity size={10} className="text-primary" />
                            Diagnostic Feedback
                          </h4>
                          <p className="text-[11px] text-gray-400 leading-relaxed font-light font-sans">
                            {retentionMetrics.pacingTip}
                          </p>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Legal and Playbook metadata details */}
            <div id="playbook-modal-bottom-disclosure" className="border-t border-white/5 p-4 bg-[#0a0a0c]/80 flex flex-col xs:flex-row justify-between items-center text-[10px] text-gray-500 font-mono gap-3 shrink-0">
              <span className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/5 rounded-lg">
                <Shield size={12} className="text-primary/70 animate-pulse" />
                <span>Verified by AI Video Architect standards.</span>
              </span>
              <span>Active Session: ID-{Math.floor(Math.random() * 8999) + 1000}</span>
            </div>

          </GlassCard>
        </div>
      )}
    </>
  );
};
