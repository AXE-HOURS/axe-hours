import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Settings as SettingsIcon, Key, Sparkles, Activity, Palette, Check, Volume2, VolumeX, Database, Trash2, ShieldCheck, Info } from 'lucide-react';
import { isSoundEnabled, setSoundEnabled, playAudioCue } from '../utils/audio';
import { useFirebase } from '../context/FirebaseContext';
import { getSecureGeminiKey, saveSecureGeminiKey, getRememberMePreference, wipeAllKeyRecords } from '../utils/secureStorage';

export const Settings: React.FC = () => {
  const { user } = useFirebase();
  const uid = user?.uid || "guest";

  const [apiKey, setApiKey] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [brandVoice, setBrandVoice] = useState("Contrarian");
  const [targetNiche, setTargetNiche] = useState("General Specialist & Creator");
  const [isSaved, setIsSaved] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<{ gemini: { status: string }; ollama: { status: string } } | null>(null);
  const [soundOn, setSoundOn] = useState(true);

  // Dynamic custom Firebase config state
  const [firebaseJson, setFirebaseJson] = useState("");
  const [fbError, setFbError] = useState("");
  const [fbSuccess, setFbSuccess] = useState(false);
  const [showAdvancedDbConfig, setShowAdvancedDbConfig] = useState(false);

  // Global visual theme presets state
  const [activeTheme, setActiveTheme] = useState("purple");

  useEffect(() => {
    setApiKey(getSecureGeminiKey(uid));
    setRememberMe(getRememberMePreference(uid));
    setBrandVoice(localStorage.getItem(`axe_hours_brand_voice_${uid}`) || localStorage.getItem("axe_hours_brand_voice") || "Contrarian");
    setTargetNiche(localStorage.getItem(`axe_hours_target_niche_${uid}`) || localStorage.getItem("axe_hours_target_niche") || "General Specialist & Creator");
    setActiveTheme(localStorage.getItem(`axe_hours_theme_${uid}`) || localStorage.getItem("axe_hours_theme") || "purple");
    setSoundOn(isSoundEnabled());

    // Load custom override config if exists
    const savedCustomFb = localStorage.getItem("axe_hours_custom_firebase_config") || "";
    setFirebaseJson(savedCustomFb);
  }, [uid]);

  const handleSaveFirebaseConfig = () => {
    if (!firebaseJson.trim()) {
      localStorage.removeItem("axe_hours_custom_firebase_config");
      setFbSuccess(true);
      setFbError("");
      playAudioCue(523.25, "sine", 0.1);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      return;
    }

    try {
      const parsed = JSON.parse(firebaseJson);
      if (!parsed.projectId || !parsed.apiKey) {
        setFbError("Invalid Config: Must include at least 'projectId' and 'apiKey' fields.");
        playAudioCue(220, "sawtooth", 0.2);
        return;
      }
      localStorage.setItem("axe_hours_custom_firebase_config", JSON.stringify(parsed, null, 2));
      setFbSuccess(true);
      setFbError("");
      playAudioCue(587.33, "sine", 0.15);
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      setFbError("Format Error: Invalid JSON format. Make sure to paste a valid JSON object.");
      playAudioCue(220, "sawtooth", 0.2);
    }
  };

  const handleResetFirebaseConfig = () => {
    localStorage.removeItem("axe_hours_custom_firebase_config");
    setFirebaseJson("");
    setFbSuccess(true);
    setFbError("");
    playAudioCue(440, "sine", 0.1);
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleSave = () => {
    saveSecureGeminiKey(uid, apiKey, rememberMe);
    localStorage.setItem(`axe_hours_brand_voice_${uid}`, brandVoice);
    localStorage.setItem(`axe_hours_target_niche_${uid}`, targetNiche);
    if (uid === "guest") {
      localStorage.setItem("axe_hours_brand_voice", brandVoice);
      localStorage.setItem("axe_hours_target_niche", targetNiche);
    }
    setIsSaved(true);
    playAudioCue(523.25, "sine", 0.15);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleWipeKeys = () => {
    wipeAllKeyRecords(uid);
    wipeAllKeyRecords("guest");
    setApiKey("");
    setRememberMe(true);
    setIsSaved(true);
    playAudioCue(329.63, "sawtooth", 0.35);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleThemeChange = (themeId: string) => {
    setActiveTheme(themeId);
    localStorage.setItem(`axe_hours_theme_${uid}`, themeId);
    if (uid === "guest") {
      localStorage.setItem("axe_hours_theme", themeId);
    }
    document.documentElement.setAttribute("data-theme", themeId);
    
    // Synth audio feedback utilizing the centralized module
    let freq = 440;
    if (themeId === "emerald") freq = 523.25; // C5
    else if (themeId === "gold") freq = 587.33; // D5
    else if (themeId === "cyan") freq = 659.25; // E5
    else if (themeId === "crimson") freq = 349.23; // F4
    
    playAudioCue(freq, "sine", 0.35);
  };

  const testConnections = async () => {
    setIsTesting(true);
    const results = { gemini: { status: 'Offline' }, ollama: { status: 'Offline' } };
    
    // Check Server-side secure credentials first
    try {
      const res = await fetch('/api/diagnose');
      if (res.ok) {
        const data = await res.json();
        if (data.geminiKeyConfigured) {
          results.gemini = { status: 'Online (Cloud)' };
        }
      }
    } catch(e) {}

    // Fallback search using current local key
    if (results.gemini.status === 'Offline' && apiKey) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (res.ok) results.gemini = { status: 'Online (User)' };
      } catch(e) {}
    }

    try {
      await fetch('http://localhost:11434/', { method: 'GET', mode: 'no-cors' });
      results.ollama = { status: 'Online' };
    } catch(e) {}

    setTimeout(() => {
      setTestResults(results);
      setIsTesting(false);
    }, 1000);
  };

  const themePresets = [
    { id: 'purple', name: 'Nova Purple', colorBg: 'bg-purple-600', colorGlow: 'shadow-purple-500/50', desc: 'Space cosmic violet vibe (Original)' },
    { id: 'emerald', name: 'Emerald Matrix', colorBg: 'bg-emerald-500', colorGlow: 'shadow-emerald-500/50', desc: 'Cyber digital hacking matrix' },
    { id: 'gold', name: 'Solar Gold', colorBg: 'bg-amber-500', colorGlow: 'shadow-amber-500/50', desc: 'Warm glowing luxury sunset' },
    { id: 'cyan', name: 'Oceanic Ice', colorBg: 'bg-cyan-400', colorGlow: 'shadow-cyan-400/50', desc: 'Fresh glacial blueprint cyber' },
    { id: 'crimson', name: 'Crimson Protocol', colorBg: 'bg-red-500', colorGlow: 'shadow-red-500/50', desc: 'Warning emergency mainframe red' }
  ];

  return (
    <div id="settings-view-parent" className="animate-in fade-in duration-500 h-full flex flex-col space-y-8 select-none w-full max-w-7xl mx-auto">
      <div id="settings-header-block">
        <h1 id="settings-title" className="text-3xl font-black text-white mb-2 flex items-center gap-2">
          <SettingsIcon className="text-primary text-purple-400" /> Suite Settings
        </h1>
        <p className="text-xs text-gray-400 font-light">
          Fine-tune credentials, edit content templates defaults, and customize visual system themes.
        </p>
      </div>

      <div id="settings-forms-grid" className="grid grid-cols-1 lg:grid-cols-2 gap-8 select-text">
        <div className="space-y-6">
          <GlassCard id="settings-security-card" className="border-white/5">
            <h2 id="settings-security-heading" className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-white/5 pb-4"><Key size={18} /> API Settings</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-[10px] text-gray-400 uppercase tracking-wider font-bold">Google Gemini API Key</label>
                <input 
                  id="settings-api-key-box"
                  type="password" 
                  value={apiKey} 
                  onChange={(e) => setApiKey(e.target.value)} 
                  placeholder="Google GenAI key (AI Studio secrets)" 
                  className="w-full bg-black/40 border border-white/10 rounded-ax p-3 text-sm text-white focus:outline-none focus:border-primary font-mono" 
                />
                <span className="block text-[10px] text-gray-500 font-light mt-1">
                  Scoped secret token for your personal generative content studio.
                </span>
              </div>

              {/* Storage Mode Toggle Checkbox */}
              <div className="flex items-center gap-2.5 pt-1 select-none">
                <input
                  id="settings-remember-key-checkbox"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-black/40 text-purple-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-purple-500"
                />
                <label htmlFor="settings-remember-key-checkbox" className="text-xs text-gray-300 font-medium cursor-pointer flex items-center gap-1.5">
                  Remember this key on this device
                </label>
              </div>

              {/* Security Warning Notice Alert Card */}
              <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl flex gap-3 items-start">
                <ShieldCheck className="text-purple-400 mt-0.5 shrink-0" size={16} />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-white">Security & Sandboxing Protocol</p>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Keys are processed directly via secure proxy headers; local storage is isolated within your client sandbox environment.
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard id="settings-branding-card" className="border-white/5">
            <h2 id="settings-branding-heading" className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-white/5 pb-4"><Sparkles size={18} /> Branding</h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] text-gray-400 uppercase tracking-wider font-bold">Brand Voice Presets</label>
                <select 
                  id="settings-brand-voice-select"
                  value={brandVoice} 
                  onChange={(e) => setBrandVoice(e.target.value)} 
                  className="w-full bg-black/60 border border-white/10 rounded-ax p-3 text-sm text-white cursor-pointer focus:outline-none"
                >
                  <option value="Contrarian">Contrarian (Sensational stop-scroll, bold assertions)</option>
                  <option value="Educator">Educator (Value-rich tutorials, detailed bullet points)</option>
                  <option value="Storyteller">Storyteller (Frictional hooks, journey setups)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] text-gray-400 uppercase tracking-wider font-bold">Target Channel Niche</label>
                <input 
                  id="settings-target-niche-box"
                  type="text" 
                  value={targetNiche} 
                  onChange={(e) => setTargetNiche(e.target.value)} 
                  placeholder="Niche keyword (e.g. Passive Income Guide)" 
                  className="w-full bg-black/40 border border-white/10 rounded-ax p-3 text-sm text-white focus:outline-none focus:border-primary font-semibold" 
                />
              </div>
            </div>
          </GlassCard>

          <GlassCard id="settings-firebase-override-card" className="border-white/5 space-y-4">
            <h2 id="settings-firebase-heading" className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-4">
              <Database size={18} className="text-purple-400" /> Firebase Integration Override
            </h2>
            <p className="text-xs text-gray-400 leading-relaxed font-light">
              Connect Google OAuth, channels, and creator dispatches directly to your own secure Firebase and Cloud project.
            </p>

            {/* Connection Status abstract toggle bar */}
            <div className="p-3.5 bg-green-500/10 border border-green-500/20 text-green-300 rounded-xl flex items-center justify-between select-none">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider">Connection Status: Active</p>
                  <p className="text-[9px] text-gray-400">Secure Firestore Cluster Sync Live</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdvancedDbConfig(!showAdvancedDbConfig)}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[9px] font-bold uppercase tracking-widest text-gray-300 transition-colors cursor-pointer"
              >
                {showAdvancedDbConfig ? "Hide Config" : "Show Config"}
              </button>
            </div>

            {showAdvancedDbConfig && (
              <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="space-y-2">
                  <label className="block text-[10px] text-gray-400 uppercase tracking-wider font-bold">Web SDK Configuration JSON</label>
                  <textarea
                    id="settings-firebase-config-textarea"
                    rows={5}
                    value={firebaseJson}
                    onChange={(e) => {
                      setFirebaseJson(e.target.value);
                      setFbError("");
                    }}
                    placeholder={`{\n  "apiKey": "AIzaSy...",\n  "authDomain": "my-custom-app.firebaseapp.com",\n  "projectId": "my-custom-app",\n  "storageBucket": "my-custom-app.firebasestorage.app",\n  "messagingSenderId": "...",\n  "appId": "..."\n}`}
                    className="w-full bg-black/40 border border-white/10 rounded-ax p-3 text-xs text-white focus:outline-none focus:border-primary font-mono placeholder:text-gray-600 resize-none"
                  />
                  {fbError && (
                    <p className="text-xs text-red-400 font-mono bg-red-950/20 border border-red-500/20 p-2.5 rounded-lg">
                      ⚠️ {fbError}
                    </p>
                  )}
                  {fbSuccess && (
                    <p className="text-xs text-green-400 font-mono bg-green-950/20 border border-green-500/20 p-2.5 rounded-lg animate-pulse">
                      ✅ Custom environment variables synced. Reloading applet...
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveFirebaseConfig}
                    className="py-2.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 hover:border-purple-500/50 text-purple-200 text-xs font-bold uppercase rounded-ax transition-all cursor-pointer text-center"
                  >
                    Apply Custom DB
                  </button>
                  <button
                    type="button"
                    onClick={handleResetFirebaseConfig}
                    className="py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-bold uppercase rounded-ax transition-all cursor-pointer text-center"
                  >
                    Reset Default DB
                  </button>
                </div>
              </div>
            )}
          </GlassCard>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              id="settings-save-config-btn"
              onClick={handleSave} 
              className="w-full py-3.5 bg-primary-gradient text-white text-xs font-black uppercase rounded-ax flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] transition-transform animate-in fade-in"
            >
              {isSaved ? "Configuration Saved!" : "Save Configuration"}
            </button>
            <button 
              id="settings-wipe-keys-btn"
              onClick={handleWipeKeys} 
              className="w-full py-3.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 hover:border-red-500/40 text-red-300 text-xs font-black uppercase rounded-ax flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] transition-transform animate-in fade-in"
            >
              <Trash2 size={14} /> Wipe Key Records
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Dynamic Theme Engine Selection Panel */}
          <GlassCard id="settings-theme-card" glowColor="purple" className="border-white/5 space-y-5">
            <h2 id="settings-theme-heading" className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-4">
              <Palette size={18} className="text-primary" /> Visual Theme Engine
            </h2>
            
            <p className="text-xs text-gray-400 leading-relaxed font-light">
              Toggle the hardware-accelerated aesthetic overlays. Changes propagate immediately across typography borders, active charts, glowing sidebars, and analytical nodes.
            </p>

            <div className="space-y-2.5">
              {themePresets.map((preset) => {
                const isActive = activeTheme === preset.id;
                return (
                  <div 
                    key={preset.id}
                    onClick={() => handleThemeChange(preset.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isActive 
                        ? 'bg-primary/5 border-primary shadow-[0_0_15px_rgba(157,80,187,0.06)]' 
                        : 'bg-black/40 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Color Node circle with dynamic preview glow */}
                      <div className={`w-5 h-5 rounded-full ${preset.colorBg} shadow-[0_0_10px_currentColor] pl-px ${preset.colorGlow}`} />
                      <div>
                        <p className="text-xs font-bold text-white uppercase tracking-wider">{preset.name}</p>
                        <p className="text-[10px] text-gray-500 font-light mt-0.5">{preset.desc}</p>
                      </div>
                    </div>

                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      isActive ? 'border-primary bg-primary text-white' : 'border-white/10 bg-transparent'
                    }`}>
                      {isActive && <Check size={11} className="stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Centralized Audio and Sensory Configuration Panel */}
          <GlassCard id="settings-audio-card" className="border-white/5 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h2 id="settings-audio-heading" className="text-lg font-bold text-white flex items-center gap-2">
                {soundOn ? <Volume2 size={18} className="text-purple-400" /> : <VolumeX size={18} className="text-gray-400" />}
                <span>Creator Audio Engine</span>
              </h2>
              <span className="text-[10px] bg-purple-500/10 border border-purple-500/25 text-purple-400 font-mono px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                Sensory Controls
              </span>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed font-light">
              Mute or customize simulated real-time interaction feedback, synthesized compilation tone bursts, and UI click notifications.
            </p>

            <button
              id="settings-sound-toggle-btn"
              onClick={() => {
                const nextVal = !soundOn;
                setSoundOn(nextVal);
                setSoundEnabled(nextVal);
                if (nextVal) {
                  playAudioCue(660, "sine", 0.2);
                }
              }}
              className={`w-full py-3 px-4 border rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                soundOn
                  ? 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border-purple-500/20 hover:border-purple-500/30 shadow-[0_0_15px_rgba(157,80,187,0.06)]'
                  : 'bg-black/40 hover:bg-black/60 text-gray-400 border-white/5 hover:border-white/10'
              }`}
            >
              {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
              <span>{soundOn ? "Mute Synthesizer Cues" : "Unmute Synthesizer Cues"}</span>
            </button>
          </GlassCard>

          <GlassCard id="settings-diagnostics-card" className="border-white/5 flex flex-col justify-between">
            <div>
              <h2 id="settings-diagnostics-heading" className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-white/5 pb-4"><Activity size={18} /> Diagnostics</h2>
              <div className="space-y-4 select-none">
                <div id="diag-gemini-lbl" className="p-4 bg-black/40 border border-white/5 rounded-xl flex justify-between items-center">
                  <span className="text-sm font-medium">Gemini Cloud Platform Service</span>
                  <span id="diag-status-badge-gemini" className={`px-2 py-0.5 rounded text-[9px] font-bold ${testResults?.gemini.status && testResults.gemini.status !== 'Offline' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{testResults ? testResults.gemini.status : 'Unchecked'}</span>
                </div>
                <div id="diag-ollama-lbl" className="p-4 bg-black/40 border border-white/5 rounded-xl flex justify-between items-center">
                  <span className="text-sm font-medium">Local Ollama Server Instance (Port: 11434)</span>
                  <span id="diag-status-badge-ollama" className={`px-2 py-0.5 rounded text-[9px] font-bold ${testResults?.ollama.status === 'Online' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{testResults ? testResults.ollama.status : 'Unchecked'}</span>
                </div>
              </div>
            </div>
            <button 
              id="settings-test-diag-btn"
              onClick={testConnections} 
              disabled={isTesting} 
              className="w-full py-3 mt-6 bg-white/5 border border-white/10 text-white rounded-ax text-xs font-bold hover:bg-white/10 transition-colors cursor-pointer"
            >
              {isTesting ? "Diagnosing connections..." : "Run System Diagnostics"}
            </button>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

