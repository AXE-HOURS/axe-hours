import React, { useState, useEffect, useRef } from 'react';
import { PrimaryButton } from '../components/PrimaryButton';
import { Modal } from '../components/Modal';
import { LegalModal } from '../components/LegalModal';
import { useFirebase } from '../context/FirebaseContext';
import firebaseConfig from '../../firebase-applet-config.json';
import { playAudioCue as playAudio } from '../utils/audio';
import { 
  Wand2, 
  ArrowRight, 
  Mail, 
  Lock, 
  Sparkles, 
  Check, 
  ChevronDown,
  Radio,
  Workflow,
  Layers,
  Tv,
  Flame,
  Activity,
  Play,
  TrendingUp,
  Cpu,
  Zap,
  Database,
  LockKeyhole,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Clock,
  Terminal,
  ShieldCheck,
  ZapOff,
  User
} from 'lucide-react';

interface LandingPageProps {
  onEnter: (userData: { email: string; name?: string; handle?: string; avatar?: string }) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | null>(null);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [dustParticles, setDustParticles] = useState<Array<{ id: number; size: number; x: number; y: number; delay: number; duration: number }>>([]);
  const [activePipelineSection, setActivePipelineSection] = useState<number>(0);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  // Authenticated state & Firebase methods
  const { loginWithGoogle, loginWithEmail, signUpWithEmail } = useFirebase();

  // Create float dust particles on mount
  useEffect(() => {
    const particles = Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      size: Math.random() * 4 + 1.5,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * -30,
      duration: Math.random() * 20 + 20
    }));
    setDustParticles(particles);
  }, []);

  // Track mouse coordinates for dynamic halo glow
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Automated Matrix pipeline progression
  useEffect(() => {
    autoPlayRef.current = setInterval(() => {
      setActivePipelineSection((prev) => (prev + 1) % 4);
    }, 6000);

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
        autoPlayRef.current = null;
      }
    };
  }, []);

  const handlePipelineSelect = (index: number) => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
    setActivePipelineSection(index);
    playAudio(659, "sine", 0.15);

    // Re-engage auto-advance after standard user interaction
    autoPlayRef.current = setInterval(() => {
      setActivePipelineSection((prev) => (prev + 1) % 4);
    }, 8000);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      if (authMode === 'signup') {
        await signUpWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
      setIsAuthModalOpen(false);
      playAudio(880, "sine", 0.3);
    } catch (e: any) {
      console.error(e);
      let friendlyMsg = e.message || "Authentication failed.";
      if (friendlyMsg.includes("user-not-found") || friendlyMsg.includes("wrong-password") || friendlyMsg.includes("invalid-credential")) {
        friendlyMsg = "Invalid email or password. Please try again.";
      } else if (friendlyMsg.includes("email-already-in-use")) {
        friendlyMsg = "An account with this email already exists. Try logging in instead.";
      } else if (friendlyMsg.includes("weak-password")) {
        friendlyMsg = "Password is too weak. Must be at least 6 characters.";
      }
      setError(friendlyMsg);
      playAudio(220, "sawtooth", 0.4);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      await loginWithGoogle();
      setIsAuthModalOpen(false);
      playAudio(1046, "sine", 0.25);
    } catch (e: any) {
      console.error(e);
      let errMsg = e.message || "Google single sign-on failed.";
      
      const isUnauthDomain = errMsg.includes("unauthorized-domain") || 
                             (e.code && e.code.includes("unauthorized-domain")) || 
                             String(e).includes("unauthorized-domain");
                             
      if (isUnauthDomain) {
        const configProjId = firebaseConfig?.projectId || "axe-hours-youtube-engine";
        errMsg = `⚠️ Unauthorized Domain Error:\n\nThe hosting domain for this app ("${window.location.hostname}") is not in your Firebase project's authorized domains list.\n\nTo resolve this instantly:\n1. Open this link (or go to your Firebase Console settings):\n   https://console.firebase.google.com/project/${configProjId}/authentication/settings\n2. Click the "Authorized domains" tab.\n3. Click "Add domain" and enter exactly:\n   ${window.location.hostname}\n4. Click "Add" and try logging in again!`;
      }
      setError(errMsg);
      playAudio(220, "sawtooth", 0.4);
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = (mode: 'signup' | 'login') => {
    setAuthMode(mode);
    setError('');
    setShowEmailForm(false);
    setIsAuthModalOpen(true);
    playAudio(523, "sine", 0.1);
  };

  const pipelineNodes = [
    {
      id: 0,
      title: "Competitor Intel",
      tagline: "Live Scanner Matrix",
      icon: Radio,
      color: "from-pink-500 to-rose-500",
      glow: "shadow-rose-500/20",
      description: "Active YouTube channel tracking hook that monitors top creator handles. Instantly fires notifications upon new publications and logs stream metrics directly into Firebase.",
      tech: "YT Data API v3 + Firestore Sync"
    },
    {
      id: 1,
      title: "Script Fetcher",
      tagline: "Bridged Data Stream",
      icon: Workflow,
      color: "from-purple-500 to-indigo-500",
      glow: "shadow-indigo-500/20",
      description: "Channels fresh transcription datasets and structure maps over a high-performance content bridge. Auto-remixes titles and drafts layout-pacing guidelines.",
      tech: "SSE Stream Parser + Prompt Mixer"
    },
    {
      id: 2,
      title: "A/B Playground",
      tagline: "Dual Angle Duel",
      icon: Layers,
      color: "from-blue-500 to-cyan-500",
      glow: "shadow-cyan-500/20",
      description: "Lock dual script blueprints side-by-side. Compare curiosity loops, value bombs, and pattern breaks with automated comparative analysis.",
      tech: "Gemini Pro / Local Ollama Duel"
    },
    {
      id: 3,
      title: "Teleprompter",
      tagline: "Active Scrolling Console",
      icon: Tv,
      color: "from-emerald-500 to-teal-500",
      glow: "shadow-teal-500/20",
      description: "Launch scripts into an adaptive, high-contrast scrolling viewport with precise words-per-minute controls and responsive pacing tools.",
      tech: "WPM Engine + Audio Cue Sync"
    }
  ];

  const faqs = [
    {
      q: "How does the Dual-Engine AI system work?",
      a: "Axe Hours AI dynamically chooses the best content generator. If you configure a Google Gemini API Key in Settings, it uses high-speed cloud generation. Otherwise, it falls back to your local Ollama setup. You can also play inside Sandbox Mode out of the box!"
    },
    {
      q: "Can I customize the generated hooks for specific niches?",
      a: "Yes! The AI Video Architect customizes recommendations based on your video description, target audience, and selected viral templates (Negative, Value Bomb, Secrets, etc.)."
    },
    {
      q: "Is there a limit on generations under the Pro Plan?",
      a: "No! The Pro Plan unlocks unlimited generation queries, advanced circular retention forecasts, and prioritizes your API requests for maximum speed."
    }
  ];

  return (
    <div id="landing-page-root" className="min-h-screen bg-[#020205] text-white relative overflow-hidden font-sans select-none pb-24">
      {/* Dynamic Keyframes Injection */}
      <style>{`
        @keyframes scroll-grid {
          0% { background-position: 0 0; }
          100% { background-position: 0 1000px; }
        }
        .grid-3d-wireframe {
          width: 200%;
          height: 200%;
          position: absolute;
          top: -50%;
          left: -50%;
          background-image: 
            linear-gradient(to right, rgba(168, 85, 247, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(168, 85, 247, 0.08) 1px, transparent 1px);
          background-size: 60px 60px;
          transform: perspective(600px) rotateX(60deg);
          animation: scroll-grid 18s linear infinite;
        }
        @keyframes float-dust {
          0% { transform: translate(0, 0) scale(1); opacity: 0.15; }
          50% { transform: translate(60px, -120px) scale(1.4); opacity: 0.45; }
          100% { transform: translate(-30px, -240px) scale(0.7); opacity: 0; }
        }
        .animate-float-dust {
          animation: float-dust 25s linear infinite;
        }
        @keyframes float-badge {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-8px) scale(1.02); }
        }
        .hovering-token {
          animation: float-badge 6s ease-in-out infinite;
        }
        @keyframes pulse-neon-magenta {
          0%, 100% {
            text-shadow: 0 0 6px rgba(236,72,153,0.25), 0 0 15px rgba(168,85,247,0.12);
          }
          50% {
            text-shadow: 0 0 12px rgba(236,72,153,0.45), 0 0 25px rgba(168,85,247,0.25);
          }
        }
        .neon-pulse-text {
          animation: pulse-neon-magenta 4s ease-in-out infinite;
          background: linear-gradient(to right, #ffffff 15%, #f472b6 60%, #c084fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        @keyframes faq-neon-scan {
          0%, 100% {
            border-color: rgba(168, 85, 247, 0.15);
            box-shadow: 0 0 0 rgba(168, 85, 247, 0);
          }
          25% {
            border-color: rgba(236, 72, 153, 0.65);
            box-shadow: 0 0 14px rgba(236, 72, 153, 0.3);
          }
          50% {
            border-color: rgba(168, 85, 247, 0.65);
            box-shadow: 0 0 14px rgba(168, 85, 247, 0.3);
          }
        }
        .faq-scan-card {
          animation: faq-neon-scan 8s ease-in-out infinite;
        }
        @keyframes holo-glow-pulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(139, 92, 246, 0.15), inset 0 0 15px rgba(139, 92, 246, 0.05);
            border-color: rgba(139, 92, 246, 0.3);
          }
          50% {
            box-shadow: 0 0 40px rgba(139, 92, 246, 0.45), inset 0 0 25px rgba(139, 92, 246, 0.15);
            border-color: rgba(139, 92, 246, 0.75);
          }
        }
        .holo-card-glow {
          animation: holo-glow-pulse 4.5s ease-in-out infinite;
        }
        @keyframes radar-beam {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .radar-sweep {
          animation: radar-beam 4s linear infinite;
        }
        @keyframes stream-flow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .data-stream-flow {
          animation: stream-flow 2s linear infinite;
        }
        @keyframes duel-flash {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.03); opacity: 1; filter: brightness(1.2); }
        }
        .duel-card-a {
          animation: duel-flash 3s ease-in-out infinite;
        }
        .duel-card-b {
          animation: duel-flash 3s ease-in-out infinite;
          animation-delay: 1.5s;
        }
        @keyframes prompter-scroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(-70%); }
        }
        .teleprompter-text-scroll {
          animation: prompter-scroll 12s linear infinite;
        }
      `}</style>

      {/* BACKGROUND MATRICES */}
      {/* 3D Wireframe Grid */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-30">
        <div className="grid-3d-wireframe" />
      </div>

      {/* Cosmic Dust Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {dustParticles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full bg-gradient-to-br from-purple-400 via-pink-500 to-indigo-600 opacity-25 pointer-events-none animate-float-dust"
            style={{
              width: `${p.size}px`,
              height: `${p.size}px`,
              left: `${p.x}%`,
              top: `${p.y}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Intricate Glowing Circuit Mesh Pattern Overlay */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="circuits-mesh" width="140" height="140" patternUnits="userSpaceOnUse">
            <path d="M 20 20 L 120 20 M 120 20 L 120 120 M 20 120 L 20 20" fill="none" stroke="#a855f7" strokeWidth="0.75" strokeDasharray="4 4"/>
            <circle cx="20" cy="20" r="3.5" fill="#ec4899" />
            <circle cx="120" cy="20" r="3.5" fill="#a855f7" />
            <circle cx="120" cy="120" r="3.5" fill="#3b82f6" />
            <circle cx="20" cy="120" r="3.5" fill="#10b981" />
            <path d="M 20 20 L 50 50 L 80 50 L 100 70 L 100 100" fill="none" stroke="#f43f5e" strokeWidth="0.75" />
            <path d="M 120 20 L 90 50 L 60 50 L 40 70 L 40 100" fill="none" stroke="#8b5cf6" strokeWidth="0.75" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#circuits-mesh)" />
      </svg>

      {/* Dynamic Interaction Mouse Halo */}
      <div 
        id="landing-mouse-halo"
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300 hidden md:block"
        style={{
          background: `radial-gradient(800px at ${mousePos.x}px ${mousePos.y}px, rgba(236, 72, 153, 0.07) 0%, rgba(168, 85, 247, 0.04) 50%, transparent 80%)`
        }}
      />

      {/* Ambient Large Blurry Cosmic Light Orbs */}
      <div id="landing-orb-1" className="absolute top-[-10%] left-[-5%] w-[700px] h-[700px] rounded-full bg-pink-500/5 blur-[160px] pointer-events-none z-0" />
      <div id="landing-orb-2" className="absolute bottom-[10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-purple-500/5 blur-[140px] pointer-events-none z-0" />

      {/* NAVIGATION HEADER */}
      <header id="landing-header" className="relative z-10 max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <div id="landing-logo-container" className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.25)]">
            <Wand2 className="text-purple-400 animate-pulse" size={20} />
          </div>
          <span className="font-black tracking-widest text-lg md:text-xl bg-gradient-to-r from-white via-purple-200 to-pink-300 bg-clip-text text-transparent uppercase">
            Axe Hours AI
          </span>
        </div>
        <div id="landing-header-auth" className="flex items-center gap-3 md:gap-4">
          <button 
            id="landing-guest-hdr-btn" 
            onClick={() => {
              playAudio(880, "sine", 0.15);
              onEnter({ email: 'guest@axe-hours.ai', name: 'Guest Creator', handle: 'guest_creator', avatar: '' });
            }} 
            className="text-xs md:text-sm font-extrabold text-[#34d399] hover:text-[#6ee7b7] transition-colors py-2 px-3.5 flex items-center gap-1.5 cursor-pointer bg-emerald-500/10 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/20 shadow-md shadow-emerald-500/10"
          >
            Demo Workspace ⚡
          </button>
          <button id="landing-login-btn" onClick={() => openModal('login')} className="text-xs md:text-sm font-bold text-gray-200 hover:text-purple-300 transition-colors py-2 px-3 cursor-pointer">Log In</button>
          <PrimaryButton id="landing-signup-top-btn" onClick={() => openModal('signup')} className="py-2 px-4 md:px-5 text-xs md:text-sm font-bold cursor-pointer shadow-lg shadow-purple-500/20 border border-purple-500/40">Sign Up</PrimaryButton>
        </div>
      </header>

      {/* HERO SECTION */}
      <section id="landing-hero" className="relative z-10 max-w-5xl mx-auto text-center px-6 pt-14 pb-12 flex flex-col items-center justify-center">
        {/* Holographic Hovering Badge */}
        <div id="landing-badge" className="hovering-token inline-flex items-center gap-2 px-4.5 py-1.5 rounded-full bg-purple-500/15 border border-purple-500/35 backdrop-blur-xl mb-6 text-[11px] md:text-xs text-purple-200 font-black tracking-widest uppercase shadow-[0_0_20px_rgba(168,85,247,0.3)] select-none">
          <Sparkles size={13} className="text-pink-400 animate-spin-slow shrink-0" />
          <span>CYBER-GLASS PRO EDITION</span>
        </div>

        {/* Pulsing Neon Magenta Title */}
        <h1 id="landing-main-title" className="neon-pulse-text text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.08] mb-6">
          Unleash VIRAL HOOKS<br />
          at Light Speed.
        </h1>

        <p id="landing-subtitle" className="text-base sm:text-lg md:text-xl text-gray-300 max-w-2xl mx-auto font-normal leading-relaxed mb-9">
          Supercharge your competitor analytics, craft retention-optimized script blueprints, and stream high-converting media hooks from an integrated, futuristic command deck.
        </p>

        <div id="landing-hero-actions" className="flex flex-col sm:flex-row items-center gap-4">
          <PrimaryButton 
            id="landing-get-started-btn" 
            onClick={() => {
              playAudio(880, "sine", 0.25);
              onEnter({ email: 'guest@axe-hours.ai', name: 'Guest Creator', handle: 'guest_creator', avatar: '' });
            }} 
            className="px-7 py-3.5 text-sm md:text-base font-extrabold tracking-wider uppercase shadow-[0_0_30px_rgba(168,85,247,0.4)] cursor-pointer border border-purple-400/40 rounded-xl"
          >
            Launch Creator Command Center
            <ArrowRight size={18} />
          </PrimaryButton>
          <button 
            id="landing-scroll-demo-btn"
            onClick={() => openModal('signup')}
            className="px-6 py-3.5 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl text-xs md:text-sm font-extrabold uppercase tracking-wider text-white transition-all cursor-pointer hover:border-purple-500/40 shadow-md"
          >
            Establish Secure Vault
          </button>
        </div>
      </section>

      {/* PHASE 3: PRODUCTION PIPELINE MATRIX (CONNECTED 3D FLOW DIAGRAM) */}
      <section id="showcase" className="relative z-10 max-w-6xl mx-auto px-6 py-14">
        <div className="text-center mb-10 select-none">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-200 text-xs font-black uppercase tracking-widest mb-3">
            <Cpu size={12} className="animate-pulse" /> Core Processing Loop
          </div>
          <h2 id="showcase-title" className="text-3xl md:text-4xl font-black tracking-tight text-white uppercase">
            Production Pipeline Matrix
          </h2>
          <p id="showcase-desc" className="text-gray-300 max-w-lg mx-auto text-sm md:text-base mt-2 font-normal leading-relaxed">
            An interconnected sequence designed to optimize every facet of your content lifecycle. Select a node to decrypt its stream parameters.
          </p>
        </div>

        {/* 3D Flow Diagram Visual Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left: Interconnected Flow Column */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-5">
            {pipelineNodes.map((node, i) => {
              const NodeIcon = node.icon;
              const isActive = activePipelineSection === i;
              return (
                <div key={node.id} className="relative flex items-center">
                  {/* Connector arrow path */}
                  {i < 3 && (
                    <div className="absolute left-[28px] bottom-[-28px] w-1 h-[28px] bg-gradient-to-b from-purple-500/50 to-indigo-500/50 hidden lg:block z-0">
                      {isActive && (
                        <div className="absolute top-0 left-0 w-full h-1/2 bg-purple-400 animate-pulse" />
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => handlePipelineSelect(i)}
                    className={`w-full text-left p-4 rounded-xl transition-all duration-300 flex items-center gap-3.5 z-10 cursor-pointer border ${
                      isActive 
                        ? `bg-gradient-to-r ${node.color} bg-opacity-20 border-purple-400/60 shadow-lg ${node.glow} translate-x-2` 
                        : 'bg-black/50 hover:bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className={`p-2.5 rounded-lg shrink-0 transition-transform ${
                      isActive ? 'bg-black/50 scale-105 text-white' : 'bg-white/10 text-gray-300'
                    }`}>
                      <NodeIcon size={18} className={isActive ? 'animate-pulse text-purple-300' : ''} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[11px] font-mono tracking-widest text-purple-300 uppercase font-black">{node.tagline}</span>
                        {isActive && (
                          <span className="text-[9px] bg-black/60 text-emerald-300 font-mono px-1.5 py-0.5 rounded uppercase font-bold animate-pulse tracking-widest border border-emerald-500/40">Active Decrypt</span>
                        )}
                      </div>
                      <h3 className={`text-sm md:text-base font-black tracking-tight ${isActive ? 'text-white' : 'text-gray-200'}`}>
                        {i + 1}. {node.title}
                      </h3>
                    </div>
                    <ChevronRight size={16} className={`text-gray-400 shrink-0 transition-transform ${isActive ? 'translate-x-1 text-white' : ''}`} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Right: Dynamic "Cyber-Glass" Decryptor Box */}
          <div className="lg:col-span-7 bg-black/55 border border-purple-500/30 rounded-2xl p-6 relative flex flex-col justify-between shadow-[0_0_30px_rgba(168,85,247,0.15)] overflow-hidden select-text">
            {/* Tech tag watermarks */}
            <div className="absolute top-4.5 right-4.5 flex items-center gap-2 select-none">
              <span className="text-[11px] font-mono font-bold text-purple-300 uppercase bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded">
                {pipelineNodes[activePipelineSection].tech}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 select-none">
                <Terminal size={14} className="text-purple-400" />
                <span className="text-[11px] font-mono text-gray-400 uppercase tracking-widest font-bold">Pipeline Node {activePipelineSection + 1} Matrix Decrypt</span>
              </div>

              <div>
                <h3 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase">
                  {pipelineNodes[activePipelineSection].title}
                </h3>
                <p className="text-xs md:text-sm text-purple-300 font-mono font-bold mt-1 uppercase tracking-widest">
                  {pipelineNodes[activePipelineSection].tagline}
                </p>
              </div>

              <p className="text-xs md:text-sm text-gray-200 leading-relaxed font-normal">
                {pipelineNodes[activePipelineSection].description}
              </p>

              {/* Sub-visual Interactive Simulation Modules */}
              <div className="mt-6 mb-4">
                {activePipelineSection === 0 && (
                  <div className="bg-[#030307] border border-white/10 p-4 rounded-xl relative overflow-hidden h-[180px] flex flex-col justify-between">
                    <div className="absolute right-4 top-4 w-16 h-16 rounded-full border border-pink-500/20">
                      <div className="absolute inset-0 border border-dashed border-pink-500/40 rounded-full" />
                      <div className="absolute w-full h-0.5 bg-pink-500/60 top-1/2 left-0 origin-center radar-sweep" />
                      <span className="absolute top-1/3 left-1/4 w-1.5 h-1.5 rounded-full bg-pink-400 animate-ping" />
                    </div>
                    <div className="flex flex-col flex-1 min-h-0 justify-center pr-20">
                      <div className="text-[11px] font-mono text-pink-400 uppercase font-black mb-2 flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
                        Active Scanner Radar Stream
                      </div>
                      <div className="space-y-2 max-h-[110px] overflow-hidden">
                        <div className="flex items-center justify-between text-xs font-mono bg-black/60 p-2 rounded-lg border border-white/10">
                          <span className="text-gray-200 font-normal">Monitored: <strong className="text-white font-bold">@productivity_guru</strong></span>
                          <span className="text-emerald-400 font-bold uppercase text-[10px] animate-pulse flex items-center gap-1">⚡ Scanning</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono bg-black/60 p-2 rounded-lg border border-white/10">
                          <span className="text-gray-200 font-normal">Monitored: <strong className="text-white font-bold">@viral_developer</strong></span>
                          <span className="text-rose-400 font-bold uppercase text-[10px] animate-bounce flex items-center gap-1">🔥 1 New Upload!</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono border-t border-white/10 pt-2 mt-1 select-none">
                      Event listening loop: 5 monitored channels synced.
                    </div>
                  </div>
                )}

                {activePipelineSection === 1 && (
                  <div className="bg-[#030307] border border-white/10 p-4 rounded-xl h-[180px] flex flex-col justify-between relative overflow-hidden">
                    <div className="flex flex-col flex-1 min-h-0 justify-center space-y-2.5">
                      <div className="text-[11px] font-mono text-purple-300 uppercase font-black flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                        SSE Content Bridge & Parser
                      </div>
                      <div className="relative h-7 bg-black/70 rounded-lg border border-purple-500/30 overflow-hidden flex items-center px-3">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent data-stream-flow" />
                        <span className="text-xs font-mono text-purple-200 z-10 truncate font-bold">
                          GET /api/youtube/transcribe?v=8X2s_zK9_A ... 200 OK
                        </span>
                      </div>
                      <div className="p-2.5 bg-black/50 rounded-lg border border-white/10 text-xs text-gray-200 font-mono leading-relaxed">
                        Transcribed 48:12 audio stream. Compiled 3 core viral structure maps & guidelines. Ready for AI mixer.
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono border-t border-white/10 pt-2 mt-1 select-none">
                      Data bridge bandwidth: 100% optimized.
                    </div>
                  </div>
                )}

                {activePipelineSection === 2 && (
                  <div className="bg-[#030307] border border-white/10 p-4 rounded-xl h-[180px] flex flex-col justify-between">
                    <div className="flex flex-col flex-1 min-h-0 justify-center">
                      <div className="text-[11px] font-mono text-cyan-300 uppercase font-black mb-2 flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                        Interactive A/B Dual Play Blueprint
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="duel-card-a p-2.5 bg-purple-500/10 border border-purple-500/30 rounded-lg space-y-1.5">
                          <div className="text-[10px] font-mono text-purple-300 uppercase font-black">Angle A: Curiosity</div>
                          <p className="text-xs text-gray-200 truncate font-normal">"The hidden secret behind..."</p>
                          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-purple-400 h-full w-[94%]" />
                          </div>
                          <div className="text-[10px] font-mono text-gray-300 text-right font-bold">94% CTR</div>
                        </div>

                        <div className="duel-card-b p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg space-y-1.5">
                          <div className="text-[10px] font-mono text-cyan-300 uppercase font-black">Angle B: Negative</div>
                          <p className="text-xs text-gray-200 truncate font-normal">"Stop coding SaaS apps..."</p>
                          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-cyan-400 h-full w-[81%]" />
                          </div>
                          <div className="text-[10px] font-mono text-gray-300 text-right font-bold">81% CTR</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono border-t border-white/10 pt-2 mt-1 flex justify-between items-center select-none">
                      <span>Automated side-by-side comparative analysis</span>
                      <span className="text-cyan-300 font-black animate-pulse uppercase text-[9px] tracking-widest bg-cyan-500/20 px-1.5 py-0.5 rounded border border-cyan-500/30">Angle A Winner</span>
                    </div>
                  </div>
                )}

                {activePipelineSection === 3 && (
                  <div className="bg-[#030307] border border-white/10 p-4 rounded-xl h-[180px] flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 select-none z-20">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                      <span className="text-[10px] font-mono text-rose-400 font-bold uppercase">Recording</span>
                    </div>
                    <div className="flex flex-col flex-1 min-h-0 justify-center">
                      <div className="text-[11px] font-mono text-emerald-400 uppercase font-black mb-2 flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Teleprompter Console Stream
                      </div>
                      <div className="relative h-[85px] overflow-hidden bg-black/60 border border-white/10 rounded-lg p-3">
                        <div className="teleprompter-text-scroll text-xs md:text-sm font-black text-gray-200 font-mono leading-relaxed space-y-2 select-none pointer-events-none">
                          <p className="text-white">"Everyone tells you to code a SaaS to get rich."</p>
                          <p>"They are completely wrong."</p>
                          <p>"Here is the exact blueprint I used to build a viral product..."</p>
                          <p>"...in under twenty-four hours using AI models."</p>
                          <p>"Make sure to save this and copy the pipeline."</p>
                        </div>
                        {/* Shaders on top and bottom of scroll viewport */}
                        <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-b from-[#030307] to-transparent pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-full h-4 bg-gradient-to-t from-[#030307] to-transparent pointer-events-none" />
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono border-t border-white/10 pt-2 mt-1 flex justify-between items-center select-none">
                      <span>WPM speed: 135 words/minute</span>
                      <span>Line duration synced</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 select-none">
              <PrimaryButton 
                id="landing-matrix-action-btn"
                onClick={() => {
                  playAudio(880, "sine", 0.25);
                  onEnter({ email: 'guest@axe-hours.ai', name: 'Guest Creator', handle: 'guest_creator', avatar: '' });
                }}
                className="w-full py-3.5 text-xs md:text-sm uppercase font-extrabold tracking-wider cursor-pointer"
              >
                Access this Pipeline inside Workspace <ArrowRight size={16} />
              </PrimaryButton>
            </div>
          </div>
        </div>
      </section>

      {/* THREE CYBER-GLASS KEY BENEFITS */}
      <section id="features" className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div id="feat-card-1" className="bg-black/50 border border-white/10 rounded-2xl p-6 transition-all hover:border-purple-500/30 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]">
            <div className="p-2.5 bg-purple-500/15 rounded-xl w-fit text-purple-300 mb-4">
              <Zap size={22} className="animate-pulse" />
            </div>
            <h3 className="text-lg md:text-xl font-black text-white mb-2 uppercase tracking-tight">Viral Hook Architect</h3>
            <p className="text-xs md:text-sm text-gray-300 font-normal leading-relaxed">
              Generate high-retention Negative, Secrets, and Value Bomb hooks designed to grab attention within the first three seconds of a video.
            </p>
          </div>
          <div id="feat-card-2" className="bg-black/50 border border-white/10 rounded-2xl p-6 transition-all hover:border-pink-500/30 hover:shadow-[0_0_20px_rgba(236,72,153,0.15)]">
            <div className="p-2.5 bg-pink-500/15 rounded-xl w-fit text-pink-300 mb-4">
              <TrendingUp size={22} />
            </div>
            <h3 className="text-lg md:text-xl font-black text-white mb-2 uppercase tracking-tight">Thumbnail Strategist</h3>
            <p className="text-xs md:text-sm text-gray-300 font-normal leading-relaxed">
              Unlock composition guidelines, HSL color balance models, and text overlays that increase your Click-Through Rate.
            </p>
          </div>
          <div id="feat-card-3" className="bg-black/50 border border-white/10 rounded-2xl p-6 transition-all hover:border-blue-500/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]">
            <div className="p-2.5 bg-blue-500/15 rounded-xl w-fit text-blue-300 mb-4">
              <Activity size={22} />
            </div>
            <h3 className="text-lg md:text-xl font-black text-white mb-2 uppercase tracking-tight">Predictive Metrics</h3>
            <p className="text-xs md:text-sm text-gray-300 font-normal leading-relaxed">
              Predict CTR boosts, average retention drop points, and optimize scripts before recording footage in your studio.
            </p>
          </div>
        </div>
      </section>

      {/* PHASE 4: ONBOARDING & PREMIUM GLOW (HOLOGRAPHIC DISPLAYS) */}
      <section id="pricing" className="relative z-10 max-w-5xl mx-auto px-6 py-14">
        <div className="text-center mb-12 select-none">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-200 text-xs font-black uppercase tracking-widest mb-3">
            <ShieldCheck size={12} /> Secure Onboarding Plans
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight">Premium Creator Node Vaults</h2>
          <p className="text-xs md:text-sm text-gray-300 mt-2 font-normal">Select the bandwidth size configured for your digital production pipeline.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto items-stretch">
          {/* Creator Suite (Free Plan Hologram) */}
          <div id="price-card-free" className="bg-black/60 border border-white/15 rounded-2xl p-7 flex flex-col justify-between relative backdrop-blur-md transition-all hover:border-white/30 select-none">
            <div className="space-y-5">
              <div>
                <span className="text-[11px] font-mono font-bold text-gray-400 uppercase tracking-widest">Base Subscription</span>
                <h3 className="text-2xl font-black text-white tracking-tight uppercase mt-1">Creator Suite</h3>
                <p className="text-xs text-gray-300 font-normal mt-1">Perfect for sandbox testing and basic local layouts.</p>
              </div>

              <div className="py-4 border-y border-white/10">
                <div className="text-5xl font-black text-white flex items-baseline gap-1.5">
                  $0<span className="text-xs text-gray-400 font-mono font-bold uppercase tracking-widest"> / Forever</span>
                </div>
              </div>

              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-xs md:text-sm text-gray-200">
                  <div className="p-1 bg-white/10 border border-white/20 rounded-lg text-gray-300 shrink-0">
                    <Check size={12} />
                  </div>
                  <span>5 content generation cycles per month</span>
                </li>
                <li className="flex items-center gap-3 text-xs md:text-sm text-gray-200">
                  <div className="p-1 bg-white/10 border border-white/20 rounded-lg text-gray-300 shrink-0">
                    <Check size={12} />
                  </div>
                  <span>Standard local Ollama model integration</span>
                </li>
                <li className="flex items-center gap-3 text-xs md:text-sm text-gray-200">
                  <div className="p-1 bg-white/10 border border-white/20 rounded-lg text-gray-300 shrink-0">
                    <Check size={12} />
                  </div>
                  <span>Standard Sandbox script comparator deck</span>
                </li>
              </ul>
            </div>

            <button 
              id="price-free-action-btn" 
              onClick={() => openModal('signup')} 
              className="w-full py-3.5 mt-6 bg-white/10 hover:bg-white/15 border border-white/20 text-white rounded-xl font-bold uppercase tracking-widest text-xs md:text-sm cursor-pointer transition-colors shadow-md"
            >
              Configure Suite Node
            </button>
          </div>

          {/* Creator Pro (Premium Plan Hologram with Vibrant Pulse Violet Glow) */}
          <div id="price-card-pro" className="bg-[#030209]/90 rounded-2xl p-7 flex flex-col justify-between backdrop-blur-2xl transition-all border holo-card-glow relative">
            {/* Hologram badge */}
            <div className="absolute -top-3 right-5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.5)]">
              Recommended Node
            </div>

            <div className="space-y-5">
              <div>
                <span className="text-[11px] font-mono font-bold text-purple-300 uppercase tracking-widest">Enterprise Priority</span>
                <h3 className="text-2xl font-black text-white tracking-tight uppercase mt-1">Creator Pro</h3>
                <p className="text-xs text-purple-200 font-normal mt-1">High-bandwidth access to full production matrix pipelines.</p>
              </div>

              <div className="py-4 border-y border-purple-500/30">
                <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-pink-200 flex items-baseline gap-1.5">
                  $29<span className="text-xs text-purple-300 font-mono font-bold uppercase tracking-widest"> / Month</span>
                </div>
              </div>

              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-xs md:text-sm text-purple-100">
                  <div className="p-1 bg-purple-500/25 border border-purple-500/50 rounded-lg text-purple-300 shrink-0">
                    <Check size={12} />
                  </div>
                  <span>Unlimited generation and transcription cycles</span>
                </li>
                <li className="flex items-center gap-3 text-xs md:text-sm text-purple-100">
                  <div className="p-1 bg-purple-500/25 border border-purple-500/50 rounded-lg text-purple-300 shrink-0">
                    <Check size={12} />
                  </div>
                  <span>Priority Google Gemini cloud generation pipelines</span>
                </li>
                <li className="flex items-center gap-3 text-xs md:text-sm text-purple-100">
                  <div className="p-1 bg-purple-500/25 border border-purple-500/50 rounded-lg text-purple-300 shrink-0">
                    <Check size={12} />
                  </div>
                  <span>Full-speed automated channel upload notifications</span>
                </li>
                <li className="flex items-center gap-3 text-xs md:text-sm text-purple-100">
                  <div className="p-1 bg-purple-500/25 border border-purple-500/50 rounded-lg text-purple-300 shrink-0">
                    <Check size={12} />
                  </div>
                  <span>Cloud Firebase synchronization for ideas & activities</span>
                </li>
              </ul>
            </div>

            <PrimaryButton 
              id="price-pro-action-btn" 
              onClick={() => openModal('signup')} 
              className="w-full py-4.5 mt-8 text-sm md:text-base font-black uppercase tracking-widest cursor-pointer shadow-[0_0_30px_rgba(168,85,247,0.5)] border border-purple-400 rounded-2xl"
            >
              Unlock Pro Node Suite
            </PrimaryButton>
          </div>
        </div>
      </section>

      {/* PHASE 4 (Continued): FAQ ACCORDION BUTTONS WITH SEQUENTIAL ILLUMINATION NEON BORDERS */}
      <section id="accordion-faqs" className="relative z-10 max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12 select-none">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-200 text-xs md:text-sm font-black uppercase tracking-widest mb-4">
            <HelpCircle size={14} /> FAQ Portal
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight">🌐 SYSTEM KNOWLEDGE BASE</h2>
          <p className="text-sm md:text-base text-gray-300 mt-2 font-normal">Instant answers regarding engine capabilities, pipeline performance, and plan limits.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => {
            // Sequential delay for sequential neon border illumination scan
            const animationDelay = `${i * 2}s`;
            return (
              <div 
                key={i} 
                id={`faq-card-${i}`} 
                className="faq-scan-card bg-black/50 border border-white/10 rounded-2xl p-6 cursor-pointer transition-all hover:bg-black/70"
                style={{ animationDelay }}
                onClick={() => {
                  setActiveFaq(activeFaq === i ? null : i);
                  playAudio(659, "sine", 0.1);
                }}
              >
                <div className="flex justify-between items-center select-none">
                  <span className="font-bold text-base md:text-lg text-white">{faq.q}</span>
                  <ChevronDown size={20} className={`text-purple-400 transition-transform ${activeFaq === i ? 'rotate-180' : ''}`} />
                </div>
                {activeFaq === i && (
                  <p className="text-sm md:text-base text-gray-200 mt-4 leading-relaxed font-normal select-text border-t border-white/10 pt-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* GOOGLE & MULTI-PROVIDER ACCOUNT CHOOSER AUTHENTICATION MODAL */}
      <Modal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} maxWidthClass="max-w-3xl">
        <div id="google-auth-container" className="font-sans">
          {/* Header Bar */}
          <div className="flex items-center gap-2.5 pb-5 border-b border-[#303134] mb-6">
            <ShieldCheck size={20} className="text-purple-400 shrink-0" />
            <span className="text-sm font-medium text-[#e3e2e6]">Sign in options</span>
          </div>

          {/* Main Grid Content */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start py-2">
            {/* Left Column: Heading */}
            <div className="md:col-span-5 space-y-2">
              <h2 className="text-2xl sm:text-3xl font-normal text-[#e3e2e6] tracking-tight leading-tight">
                {showEmailForm ? (authMode === 'signup' ? "Create account" : "Sign in") : "Choose sign-in method"}
              </h2>
              <p className="text-sm text-[#c4c6d0]">
                to continue to <span className="font-semibold text-white">Axe Hours AI</span>
              </p>
            </div>

            {/* Right Column: Account Selection or Email Form */}
            <div className="md:col-span-7 space-y-5">
              {!showEmailForm ? (
                <div className="space-y-5">
                  {error && (
                    <div id="auth-error-display" className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs md:text-sm font-semibold leading-relaxed whitespace-pre-wrap font-mono">
                      {error}
                    </div>
                  )}

                  {/* Provider List */}
                  <div className="border-t border-b border-[#303134] divide-y divide-[#303134]">
                    {/* Google Row */}
                    <button
                      type="button"
                      id="auth-google-sso-btn"
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                      className="w-full py-3.5 px-3 flex items-center justify-between hover:bg-white/5 transition-colors text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[#2a2b2d] border border-[#3c4043] flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[#e3e2e6] group-hover:text-white truncate">
                            Continue with Google
                          </div>
                          <div className="text-xs text-[#9aa0a6] truncate">
                            Single click Google SSO
                          </div>
                        </div>
                      </div>
                      <Sparkles size={16} className="text-purple-400 shrink-0" />
                    </button>

                    {/* Email / Custom Password Row */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowEmailForm(true);
                        playAudio(784, "sine", 0.1);
                      }}
                      className="w-full py-3.5 px-3 flex items-center justify-between hover:bg-white/5 transition-colors text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[#1e1f20] border border-[#303134] flex items-center justify-center text-[#c4c6d0] shrink-0 group-hover:border-gray-400">
                          <Mail size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[#e3e2e6] group-hover:text-white truncate">
                            Email and Password
                          </div>
                          <div className="text-xs text-[#9aa0a6] truncate">
                            Sign in or create account directly
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-[#9aa0a6] group-hover:text-white shrink-0" />
                    </button>
                  </div>

                  <p className="text-xs text-[#9aa0a6] leading-relaxed pt-1">
                    Before using this app, you can review Axe Hours AI's{" "}
                    <span className="text-[#a8c7fa] underline cursor-pointer hover:text-[#c2e7ff]">Privacy Policy</span> and{" "}
                    <span className="text-[#a8c7fa] underline cursor-pointer hover:text-[#c2e7ff]">Terms of Service</span>.
                  </p>
                </div>
              ) : (
                /* Custom Email Form view */
                <form id="auth-submit-form" onSubmit={handleAuthSubmit} className="space-y-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmailForm(false);
                      setError('');
                    }}
                    className="text-xs text-[#a8c7fa] hover:underline flex items-center gap-1 mb-2 font-medium cursor-pointer"
                  >
                    ← Back to account options
                  </button>

                  {error && (
                    <div id="auth-error-display" className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs md:text-sm font-semibold leading-relaxed whitespace-pre-wrap font-mono">
                      {error}
                    </div>
                  )}

                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-medium text-[#c4c6d0] mb-1">Email address</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                          id="auth-email-input"
                          type="email" 
                          required 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)} 
                          placeholder="name@example.com" 
                          className="w-full bg-[#030307] border border-[#303134] rounded-xl py-3 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-purple-500 placeholder-gray-500" 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#c4c6d0] mb-1">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                          id="auth-password-input"
                          type="password" 
                          required 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          placeholder="••••••••" 
                          className="w-full bg-[#030307] border border-[#303134] rounded-xl py-3 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-purple-500 placeholder-gray-500" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span 
                      onClick={() => {
                        setAuthMode(authMode === 'signup' ? 'login' : 'signup');
                        setError('');
                        playAudio(784, "sine", 0.1);
                      }}
                      className="text-[#a8c7fa] hover:underline cursor-pointer font-medium"
                    >
                      {authMode === 'signup' ? "Already have an account? Sign in" : "Establish a brand new access account"}
                    </span>
                  </div>

                  <button 
                    id="auth-submit-action-btn" 
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-3 h-11 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-sm cursor-pointer transition-all shadow-md"
                  >
                    {isLoading ? "Consulting AI..." : (authMode === 'signup' ? "Create Account" : "Sign In")}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Footer Bar */}
          <div className="mt-8 pt-4 border-t border-[#303134] flex flex-col sm:flex-row items-center justify-between text-xs text-[#9aa0a6] gap-3">
            <div className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
              <span>English (United States)</span>
              <ChevronDown size={14} />
            </div>
            <div className="flex items-center gap-4">
              <button 
                type="button" 
                onClick={() => setLegalModalType('privacy')} 
                className="hover:text-white transition-colors cursor-pointer"
              >
                AXE Hours Privacy Policy
              </button>
              <button 
                type="button" 
                onClick={() => setLegalModalType('terms')} 
                className="hover:text-white transition-colors cursor-pointer"
              >
                Terms of Service
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* AXE Hours AI Legal Documents Modal */}
      <LegalModal 
        isOpen={!!legalModalType} 
        type={legalModalType || 'privacy'} 
        onClose={() => setLegalModalType(null)} 
      />
    </div>
  );
};
