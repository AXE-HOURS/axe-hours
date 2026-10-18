import React, { useState, useMemo } from 'react';
import { 
  BookOpen, Sparkles, Cpu, Sliders, Activity, 
  HelpCircle, Search, Volume2, Clock, CheckCircle2,
  TrendingUp, Radio, Download, Video
} from 'lucide-react';
import { Modal } from './Modal';
import { playAudioCue } from '../utils/audio';

interface PlaybookModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  setActiveView?: (view: string) => void;
}

export const PlaybookModal: React.FC<PlaybookModalProps> = ({
  isOpen,
  onClose,
  activeTab: externalActiveTab,
  setActiveTab: externalSetActiveTab,
  setActiveView
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<string>('getting-started');
  const activeTab = externalActiveTab || internalActiveTab;
  const setActiveTab = externalSetActiveTab || setInternalActiveTab;

  const [searchQuery, setSearchQuery] = useState<string>('');

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
      score += 5;
    } else {
      score -= Math.round((cutFrequency - 2.5) * 10);
    }

    // 3. WPM Delivery speed (optimal 150 - 180 WPM)
    if (deliverySpeed >= 155 && deliverySpeed <= 175) {
      score += 10;
    } else if (deliverySpeed > 190) {
      score -= 5;
    } else if (deliverySpeed < 130) {
      score -= 15;
    }

    // 4. Outro type
    if (outroLoopStyle === 'loop') {
      score += 10;
    } else if (outroLoopStyle === 'hard-cta') {
      score -= 8;
    }

    // 5. Stylistic Creator Guidelines checks
    if (styleNoEmojis) score += 5;
    if (styleAuthority) score += 6;
    if (styleAudioPacing) score += 4;

    // Bound the score between 42% and 99%
    score = Math.max(42, Math.min(99, score));

    // Dynamic Viewer Retention Drop-off Point Calculation
    const retentionAt30s = Math.min(96, Math.max(38, Math.round(score * 0.94 - (hookDuration > 3.5 ? (hookDuration - 3.5) * 5 : 0))));
    const dropoffSec = Math.round(Math.min(58, Math.max(12, (score / 100) * 52 + (cutFrequency <= 2.5 ? 6 : -8))));
    const dropoffDisplay = `Retains ~${retentionAt30s}% at 30s`;
    const dropoffPointDetailed = `Estimated Drop-off Point: ~${dropoffSec}s`;

    // Sound Design & Pacing Diagnostic Recommendation Pill
    let recommendationPill = "Optimal: High-frequency neuro-lock & dynamic audio-visual balance achieved.";
    let pillTone = "emerald";

    if (!styleAudioPacing) {
      recommendationPill = "Sound Design Alert: Enable Audio SFX rhythm resets to prevent mid-video auditory fatigue.";
      pillTone = "amber";
    } else if (cutFrequency > 2.5) {
      recommendationPill = "Pacing Diagnostic: Tighten B-Roll cut pacing below 2.5s to re-engage viewer visual focus.";
      pillTone = "amber";
    } else if (hookDuration > 3.5) {
      recommendationPill = "Intro Friction: Trim initial hook under 3.5s to maximize scroll-stop conversion.";
      pillTone = "amber";
    } else if (deliverySpeed < 145) {
      recommendationPill = "Speech Cadence: Elevate vocal delivery to ~165 WPM for optimal subtitle pacing.";
      pillTone = "purple";
    }

    return {
      score,
      badge: score >= 88 ? 'VIRAL POTENTIAL' : score >= 75 ? 'STABLE' : 'RISKY',
      badgeColor: score >= 88 
        ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/20' 
        : score >= 75 
          ? 'text-primary bg-primary/15 border-primary/20' 
          : 'text-amber-400 bg-amber-500/15 border-amber-500/20',
      pacingTip: score >= 88 
        ? "Perfect setup. High-contrast loop paired with split-second editing cuts and strict creator style guidelines triggers instant neuro-lock."
        : score >= 75 
          ? "Solid overall structure. Re-tune your intro hooks below 3.5s or toggle on more rigid brand constraints to squeeze out max engagement." 
          : "Viewer dropoff risk detected. Increase video pacing (under 3s per B-Roll), adjust speech delivery rate, and enforce precise brand rules.",
      dropoffDisplay,
      dropoffPointDetailed,
      recommendationPill,
      pillTone
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
          { phase: "Phase 4: Teleprompter", action: "Initiating the requestAnimationFrame Autoscroll Teleprompter & Speech Pacing Coach to practice live delivery.", targetView: "teleprompter", query: "Show me the Teleprompter Studio viewport" }
        ]
      }
    ],
    'features': [
      {
        title: "⚡ Core Tools Reference Manual",
        subtitle: "A detailed breakdown of every workspace module in your dashboard",
        items: [
          { name: "📹 Teleprompter Studio", info: "Velocity-based auto-scroll, Spoken-Only director cue stripping, horizontal mirror mode." },
          { name: "📡 Competitor Intel Radar", info: "Zero-quota native YouTube Atom RSS ingestion, real-time upload alerts, 1-click script extraction handoff." },
          { name: "⚡ Script Fetcher & Downloader", info: "Residential ASR fallback cascade, instant hook scoring, formatted TXT Blueprint Pack export." },
          { name: "🎛️ Workspace Dashboard", info: "The main cockpit. Track viral metrics, view global activities stream, and filter compilations instantly using the new Real-time Search Input." },
          { name: "💡 Script Architect (AI Generator)", info: "Leverages Gemini API text engines. Mix advanced preset cards with prompt details to compile high-retention outlines, custom brand rules, and instant 1-Click Regeneration." },
          { name: "📋 Custom Creator Guidelines", info: "An integrated augmentation rules system. Define brand rules, tone guidelines (e.g. no emojis, direct speech) which are injected directly into synthesis pipeline." },
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
          { rule: "Rule 2: Neural Reset Events", detail: "Trigger an audio-visual rhythm change every 4 to 6 seconds. This can be a secondary zoom, a text highlight trigger, a sound effect spike, or a b-roll cut." },
          { rule: "Rule 3: Microscopic Code Boilerplate", detail: "99% of creators fail by over-complicating structures. Standardize your story structures into one of three formulas: Contrarian Loop, Authority Pivot, or Simple Secret-Unlock." },
          { rule: "Rule 4: Endless Replay Cycles", detail: "End your video mid-sentence or trigger a prompt that references the exact initial word of the intro hook. Safe loops double standard continuation scores." }
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

  // Handle action click: close playbook modal AND navigate parent view
  const handleAskAssistantToOpen = (st: { targetView: string; query?: string }) => {
    // 1. Close this Playbook Modal immediately
    onClose();

    const targetView = st.targetView === 'generate-ideas' ? 'generator' : st.targetView;

    // 2. Set parent active view state
    if (setActiveView) {
      setActiveView(targetView);
    }
    window.dispatchEvent(new CustomEvent('change-active-view', { 
      detail: { view: targetView } 
    }));

    // 3. Trigger assistant navigation and query
    window.dispatchEvent(new CustomEvent('trigger-assistant-navigation', { 
      detail: { query: st.query, view: targetView } 
    }));

    playAudioCue(600);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-4xl">
      <div id="creator-playbook-content" className="space-y-6">
        
        {/* Header Title with Search Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-primary/20 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BookOpen size={20} className="text-primary" />
              Creator Knowledge &amp; Strategy Playbook
            </h2>
            <p className="text-xs text-on-surface-variant mt-1 font-light">
              Master the exact workflows, algorithm hacks, and viral parameters that power AXE HOURS.
            </p>
          </div>

          {/* Interactive Search Field */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search playbook..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="flex gap-2 overflow-x-auto border-b border-white/5 pb-2">
          {[
            { id: 'getting-started', label: '12-Hour Flow', icon: Sparkles },
            { id: 'features', label: 'Feature Directory', icon: Cpu },
            { id: 'secrets', label: 'Retention Secrets', icon: Activity },
            { id: 'simulator', label: 'Retention Simulator', icon: Sliders }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  playAudioCue(500);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(157,80,187,0.15)]' 
                    : 'text-on-surface-variant hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panes */}
        <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          
          {/* 1. GETTING STARTED / WORKFLOW */}
          {activeTab === 'getting-started' && (
            <div className="space-y-6">
              {filteredDocs['getting-started'].map((doc: any, idx: number) => (
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
                            type="button"
                            onClick={() => handleAskAssistantToOpen(st)}
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
              {filteredDocs['features'].map((doc: any, idx: number) => (
                <div key={idx} className="space-y-4 animate-in fade-in duration-200">
                  <div className="border-b border-primary/20 pb-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                      <Cpu size={16} className="text-primary" />
                      {doc.title}
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-1">{doc.subtitle}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {doc.items.map((it: any, sidx: number) => (
                      <div key={sidx} className="p-3 bg-white/2 border border-white/5 rounded-xl space-y-1.5 hover:border-primary/20 transition-colors">
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          {it.name}
                        </h4>
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

          {/* 3. SECRET SHORT-FORM ALGORITHM HACKS */}
          {activeTab === 'secrets' && (
            <div className="space-y-6">
              {filteredDocs['secrets'].map((doc: any, idx: number) => (
                <div key={idx} className="space-y-4 animate-in fade-in duration-200">
                  <div className="border-b border-primary/20 pb-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                      <Activity size={16} className="text-primary" />
                      {doc.title}
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-1">{doc.subtitle}</p>
                  </div>

                  <div className="space-y-3">
                    {doc.hacks.map((h: any, sidx: number) => (
                      <div key={sidx} className="p-3.5 bg-white/2 border border-white/5 rounded-xl space-y-1 hover:border-primary/20 transition-all">
                        <h4 className="text-xs font-bold text-white flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          {h.rule}
                        </h4>
                        <p className="text-[11px] text-on-surface-variant leading-relaxed pl-3.5 font-light">{h.detail}</p>
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

          {/* 4. INTERACTIVE RETENTION SIMULATOR */}
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
                    <label className="text-xs text-gray-300 font-bold">Outro Structure &amp; CTA Pattern</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setOutroLoopStyle('loop')}
                        className={`py-2 px-3 rounded-xl border text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${outroLoopStyle === 'loop' ? 'bg-primary/25 border-primary text-white' : 'bg-transparent border-white/5 text-gray-400 hover:text-white'}`}
                      >
                        Seamless Loop (+10)
                      </button>
                      <button
                        type="button"
                        onClick={() => setOutroLoopStyle('standard')}
                        className={`py-2 px-3 rounded-xl border text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${outroLoopStyle === 'standard' ? 'bg-primary/25 border-primary text-white' : 'bg-transparent border-white/5 text-gray-400 hover:text-white'}`}
                      >
                        Soft Sign-off (+0)
                      </button>
                      <button
                        type="button"
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

                {/* Live Output & Dynamic Diagnostics Panel */}
                <div className="p-5 rounded-2xl bg-[#090714] border border-primary/20 space-y-4">
                  {/* Score & Retention Percentage */}
                  <div className="text-center">
                    <p className="text-[10px] text-on-surface-variant font-bold tracking-widest uppercase">Retention Potential</p>
                    <div className="text-5xl font-black text-white mt-1 font-mono tracking-tight animate-pulse flex justify-center items-baseline gap-1">
                      {retentionMetrics.score}
                      <span className="text-xs text-primary">%</span>
                    </div>
                    
                    <span className={`inline-block border text-[8px] font-black px-2.5 py-0.5 rounded-full mt-3 tracking-widest select-none ${retentionMetrics.badgeColor}`}>
                      {retentionMetrics.badge}
                    </span>
                  </div>

                  {/* Estimated Viewer Retention Drop-off Point */}
                  <div className="p-3 bg-white/2 rounded-xl border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-gray-300 uppercase">
                      <span className="flex items-center gap-1.5">
                        <Clock size={11} className="text-primary" />
                        Retention Drop-off
                      </span>
                      <span className="text-emerald-400 font-mono">{retentionMetrics.dropoffDisplay}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                      {retentionMetrics.dropoffPointDetailed}
                    </p>
                  </div>

                  {/* Sound Design & Pacing Diagnostic Recommendation Pill */}
                  <div className={`p-3 rounded-xl border text-xs leading-relaxed space-y-1 select-none ${
                    retentionMetrics.pillTone === 'emerald' 
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300' 
                      : retentionMetrics.pillTone === 'amber'
                        ? 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                        : 'bg-purple-500/10 border-purple-500/25 text-purple-300'
                  }`}>
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[9px]">
                      <Volume2 size={12} className="shrink-0" />
                      <span>Sound &amp; Pacing Recommendation</span>
                    </div>
                    <p className="text-[10.5px] font-sans font-medium">
                      {retentionMetrics.recommendationPill}
                    </p>
                  </div>

                  {/* General Pacing Diagnostic Tip */}
                  <div className="p-3 bg-white/2 rounded-xl border border-white/5 space-y-1.5">
                    <h4 className="text-[10px] font-black text-gray-300 uppercase flex items-center gap-1">
                      <Activity size={10} className="text-primary" />
                      Algorithmic Feedback
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
    </Modal>
  );
};

export default PlaybookModal;

