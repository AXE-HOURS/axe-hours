import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from '../components/GlassCard';
import { 
  Sparkles, Copy, Check, Bookmark, Play, Pause, Plus, Trash2, 
  RotateCcw, FileDown, HelpCircle, TrendingUp, Gauge, 
  Lightbulb, Sliders, Clock, Volume2, Image, Video, Flame, 
  AlertTriangle, Zap, ArrowDown, X, RefreshCw, Folder, Download,
  Scale, ArrowLeftRight
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { generateThumbnailSpecs } from '../utils/thumbnailPromptGenerator';
import { playAudioCue as playAudio } from '../utils/audio';
import { useToast } from '../context/ToastContext';
import { useFirebase } from '../context/FirebaseContext';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useCalibrationBridge } from '../context/CalibrationBridgeContext';
import { getSecureGeminiKey } from '../utils/secureStorage';

interface GenerationItem {
  id: number;
  title: string;
  content: string;
  date: string;
}

interface AIGeneratorProps {
  saveToHistory: (title: string, content: string) => void;
  selectedHistoryItem: GenerationItem | null;
  clearSelectedHistoryItem: () => void;
}

interface TimelineSegment {
  id: string;
  timecode: string;
  label: string;
  visual: string;
  voiceover: string;
  caption: string;
  sfx: string;
  durationSec: number;
}

// Creative Presets & Blueprints templates
const VIDEO_TEMPLATES = [
  // Tech & Indie Hacking
  {
    name: "The Contrarian SaaS",
    prompt: "Stop doing standard coding marathons to launch SaaS. Instead, build using microscopic prompt-engineered workflows that scale to $2K MRR in 15 days.",
    voice: "Contrarian",
    category: "Tech",
    niche: "Tech, SaaS & Indiehacking",
    duration: "60s Short-form",
    style: "Cyber-glow console zoom-ins"
  },
  {
    name: "The 0.1% IDE Obsidian Setup",
    prompt: "The 0.1% software engineers do not use standard terminal layouts. Why this obscure configuration trick doubles coding velocity with zero cognitive load.",
    voice: "Storyteller",
    category: "Tech",
    niche: "Dev Productivity",
    duration: "60s Short-form",
    style: "Cinematic side-angle panning"
  },
  // Personal Finance & Business
  {
    name: "The Savings Account Scam",
    prompt: "Why standard high-yield savings accounts are secretly eating your purchasing power. Capital institutions are buying up obscure digital royalties to earn 12% passive yields.",
    voice: "Storyteller",
    category: "Finance",
    niche: "Personal Finance & Wealth",
    duration: "60s Short-form",
    style: "Sleek gold-accented geometric diagrams"
  },
  {
    name: "The Solopreneur Secret",
    prompt: "Stop trying to raise venture capital to build a business. How to build a solo profitable cashflow machine using automated AI assistants in under 48 hours for $0.",
    voice: "Contrarian",
    category: "Finance",
    niche: "Online Solopreneurs",
    duration: "180s Mid-form",
    style: "High contrast financial charts"
  },
  // Lifestyle & Travel Adventure
  {
    name: "Bali Bali Under $1k/mo",
    prompt: "Bali is secretly becoming too crowded, but travellers are moving to this hidden island paradise less than 2 hours away where you can live like royalty for under $800 a month.",
    voice: "Storyteller",
    category: "Travel",
    niche: "Travel & Digital Nomad",
    duration: "180s Mid-form",
    style: "Immersive drone landscape pans"
  },
  {
    name: "The One-Bag Travel Loop",
    prompt: "Stop packing massive suitcases for international flights. How to travel the world for 3 months using just one twenty-liter backpack, bypassing all luggage checks.",
    voice: "Educator",
    category: "Travel",
    niche: "One-Bag Travel Hacks",
    duration: "60s Short-form",
    style: "Quick cuts packing layout"
  },
  // Food & Cooking Academy
  {
    name: "The Acid Cookery Trick",
    prompt: "Stop dumping table salt on your food when it tastes flat. Why top Michelin star chefs use three obscure citric acid balancing ratios to trigger saliva receptors instantly.",
    voice: "Educator",
    category: "Food",
    niche: "Food & Cooking Academy",
    duration: "60s Short-form",
    style: "Close-up sizzling pan zoom-ins"
  },
  {
    name: "Restaurant Pasta Blueprint",
    prompt: "Stop boiling pasta standardly. Why top Italian chefs always utilize active starch water reduction to build intense, restaurant-grade cream texture with zero butter.",
    voice: "Contrarian",
    category: "Food",
    niche: "Chef Cooking Secrets",
    duration: "180s Mid-form",
    style: "Slow motion steam & sauce tosses"
  },
  // Fitness, Muscle & Health
  {
    name: "The Muscle Growth Fallacy",
    prompt: "Why 95% of gym-goers get zero results despite training hard 5 days a week. It is not your diet; it is the lack of proper eccentric range stabilization.",
    voice: "Educator",
    category: "Fitness",
    niche: "Fitness & Muscle Growth",
    duration: "180s Mid-form",
    style: "Anatomical muscle tracking highlights"
  },
  {
    name: "The 10-Minute Morning Reset",
    prompt: "Stop drinking caffeine the second you wake up. The 10-minute cortisol delay and cold face immersion sequence that naturally spikes alertness of your body by 250%.",
    voice: "Storyteller",
    category: "Fitness",
    niche: "Biohacking & Wellness",
    duration: "60s Short-form",
    style: "Natural morning glow silhouettes"
  },
  // Gaming & Entertainment
  {
    name: "The Map Mastery Glitch",
    prompt: "Why 99% of competitive gamers completely fail on this map loop. Using this hidden pixel positioning trick allows you to lock down the bomb site with zero assistance.",
    voice: "Contrarian",
    category: "Gaming",
    niche: "Gaming & Entertainment",
    duration: "180s Mid-form",
    style: "Dynamic live gameplay visual outlines"
  },
  {
    name: "The Retrogaming Revival",
    prompt: "The secret hardware industry thriving in retro consoles. How a micro $15 soldering modification turns old pixels into stunning 4K widescreen outputs.",
    voice: "Storyteller",
    category: "Gaming",
    niche: "Retro Electronics Hacks",
    duration: "180s Mid-form",
    style: "Macro zoom on motherboard pins"
  }
];

const HOOK_TRIGGERS = [
  "Stop doing...",
  "This is why 99% of...",
  "The underground secret...",
  "How I went from...",
  "Nobody is talking about...",
  "Unlock this cheat code...",
  "I tested this in 24 hours...",
  "Experts are lying to you about..."
];

const MIX_PRESETS = [
  {
    name: "Contrarian Loop Style",
    desc: "Amplify raw ideas specifically into contrarian arguments that challenge traditional industry ways to drive heavy content engagement.",
    anchor: "Stop doing standard traditional processes. Instead, build using microscopic optimized workflows that scale to massive yields in under 15 days."
  },
  {
    name: "Curiosity Loop Hook",
    desc: "Enshroud raw ideas in severe mystery, revealing obscure tricks only at the final segment.",
    anchor: "The top 0.1% of specialists do not use standard formats. Why this obscure configuration trick doubles operational speed with zero cognitive load."
  },
  {
    name: "Ultimate Value Bomb",
    desc: "Transform ideas into tactical step-by-step masterclasses with clear lists, bullet points, and high educational payoff.",
    anchor: "A step-by-step masterclass on automating complex creation pipelines from a simple markdown block utilizing Node and localized script compilers."
  },
  {
    name: "Negative Contrast Warning",
    desc: "Warning angle emphasizing the high failure rate of traditional routes to motivate immediate change.",
    anchor: "This is why 99% of creators fail to build sustainable results. Avoid these 3 fatal industry errors before deploying resources."
  }
];

interface DraftViralScoreResult {
  score: number;
  grade: string;
  title: string;
  color: string;
  meterColor: string;
  lengthFeedback: string;
  detectedWords: string[];
  tips: string[];
}

const calculateDraftViralScore = (text: string): DraftViralScoreResult => {
  if (!text || !text.trim()) {
    return {
      score: 0,
      grade: "F",
      title: "Silent Draft",
      color: "text-gray-500 border-gray-800/60 bg-white/2",
      meterColor: "bg-gray-800",
      lengthFeedback: "Input some draft hook ideas to activate analytics.",
      detectedWords: [],
      tips: [
        "Challenge a traditional assumption (e.g. 'Stop spending 6 months...').",
        "Introduce high-interest multipliers like '99%' or '$2K MRR' in the opening 3 seconds."
      ]
    };
  }

  const length = text.trim().length;
  let lenScore = 0;
  let lengthFeedback = "";
  let lengthStatus: 'brief' | 'optimal' | 'verbose' = 'brief';

  if (length < 35) {
    lenScore = 15;
    lengthFeedback = "Extremely concise hook. Add specific context to build enough drama.";
    lengthStatus = 'brief';
  } else if (length >= 35 && length <= 130) {
    lenScore = 40;
    lengthFeedback = "Optimal duration metrics! High performance audio-visual alignment sweet spot.";
    lengthStatus = 'optimal';
  } else {
    lenScore = 25;
    lengthFeedback = "A bit too wordy. Delete structural fillers to keep word rate sharp.";
    lengthStatus = 'verbose';
  }

  const clickTriggers = [
    { word: "stop", weight: 15 },
    { word: "99%", weight: 18 },
    { word: "0.1%", weight: 18 },
    { word: "secret", weight: 15 },
    { word: "fail", weight: 15 },
    { word: "cheat", weight: 18 },
    { word: "exposed", weight: 15 },
    { word: "unbelievable", weight: 12 },
    { word: "$", weight: 12 },
    { word: "mrr", weight: 15 },
    { word: "hacks", weight: 12 },
    { word: "blueprint", weight: 15 },
    { word: "automate", weight: 15 },
    { word: "micro", weight: 12 },
    { word: "never", weight: 12 },
    { word: "how i", weight: 15 },
    { word: "avoid", weight: 12 }
  ];

  const lowerText = text.toLowerCase();
  const detected: string[] = [];
  let keywordScore = 0;

  clickTriggers.forEach(({ word, weight }) => {
    if (lowerText.includes(word)) {
      detected.push(word);
      keywordScore += weight;
    }
  });

  keywordScore = Math.min(45, keywordScore);

  let triggerBonus = 0;
  if (/[!?]/.test(text)) triggerBonus += 10;
  
  // Checking for high interest focal emojis
  const emojiRegex = /[\uD800-\uDFFF]./g;
  if (emojiRegex.test(text)) triggerBonus += 5;

  const rawScore = 10 + lenScore + keywordScore + triggerBonus;
  const score = Math.min(100, Math.max(10, rawScore));

  let grade = "C";
  let title = "Unpolished";
  let color = "text-amber-400 border-amber-500/20 bg-amber-500/5";
  let meterColor = "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]";

  if (score >= 90) {
    grade = "A+";
    title = "Viral Dynamite";
    color = "text-[#10b981] border-[#10b981]/20 bg-[#10b981]/5";
    meterColor = "bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)]";
  } else if (score >= 80) {
    grade = "A";
    title = "High Velocity";
    color = "text-emerald-300 border-emerald-400/20 bg-emerald-400/5";
    meterColor = "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]";
  } else if (score >= 68) {
    grade = "B+";
    title = "Strong Growth";
    color = "text-purple-400 border-purple-500/20 bg-purple-500/5";
    meterColor = "bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.5)]";
  } else if (score >= 50) {
    grade = "B";
    title = "Moderate Pull";
    color = "text-blue-400 border-blue-500/20 bg-blue-500/5";
    meterColor = "bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]";
  }

  const tips: string[] = [];
  if (lengthStatus === 'brief') {
    tips.push("Add a specific conflict line or a dramatic revelation factor.");
  }
  if (lengthStatus === 'verbose') {
    tips.push("Trim filler words. Aim for 40-100 characters for snappy hook retention.");
  }
  if (detected.length === 0) {
    tips.push("Inject high-conversion words such as 'stop' or 'fail' in the opening concept.");
  }
  if (!/[!?]/.test(text)) {
    tips.push("Deploy double punctuation marks (e.g., '?!') to provoke high mental focus.");
  }
  if (!emojiRegex.test(text)) {
    tips.push("Use dramatic focal emojis (like '🚨', '🤫' or '⚡') to arrest eyes instantly.");
  }

  return {
    score,
    grade,
    title,
    color,
    meterColor,
    lengthFeedback,
    detectedWords: detected,
    tips
  };
};

interface TrendMatchScoreResult {
  score: number;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  density: number;
  matchedCount: number;
  totalWords: number;
  patternMatches: { keyword: string; category: string; count: number }[];
}

const calculateTrendMatchScore = (text: string): TrendMatchScoreResult => {
  if (!text || !text.trim()) {
    return {
      score: 0,
      title: "No Content Detected",
      description: "Generate or draft an AI script first to analyze keyword trend density.",
      color: "text-gray-500",
      bgColor: "bg-white/2",
      borderColor: "border-white/5",
      density: 0,
      matchedCount: 0,
      totalWords: 0,
      patternMatches: []
    };
  }

  // Count total words
  const words = text.split(/\s+/).filter(Boolean);
  const totalWords = words.length;

  const patterns = [
    { name: "Stop Doing", regex: /\bstop\s+doing\b|stop/gi, category: "Pattern Interrupt" },
    { name: "Extreme Stat (99%)", regex: /99%|95%|90%|0\.1%|10x/gi, category: "Extreme Stat" },
    { name: "The Secret Loop", regex: /secret|secrets|underground|clandestine/gi, category: "Mysterious Hook" },
    { name: "Cheat Code", regex: /cheat\s*code|cheat|cheats|hacks|hack/gi, category: "Value Catalyst" },
    { name: "Exposed/Unveiled", regex: /exposed|unveiled|revealed|leak|leaked/gi, category: "Curiosity Friction" },
    { name: "How To / How I", regex: /how\s+i|how\s+to/gi, category: "Case Study / Tutorial" },
    { name: "Avoid Mistakes", regex: /avoid|mistake|mistakes|fail|failure|error|errors/gi, category: "Psychological Threat" },
    { name: "Never", regex: /\bnever\b/gi, category: "Pattern Interrupt" },
    { name: "Blueprint / Formula", regex: /blueprint|formula|framework|system/gi, category: "Value Catalyst" },
    { name: "Nobody Talks About", regex: /nobody\s+is\s+talking\s+about|nobody\s+talks\s+about/gi, category: "Contrarian Loop" },
    { name: "Banned", regex: /banned|forbidden/gi, category: "Gatekeeping Friction" },
    { name: "Retention Loop", regex: /retention|hook|attention|drain/gi, category: "Audience Science" },
    { name: "Dollar / MRR", regex: /\$|mrr|payout|revenue|earning|earnings/gi, category: "High Ticket Magnet" },
    { name: "POV", regex: /\bpov\b/gi, category: "POV Anchor" }
  ];

  const patternMatches: { keyword: string; category: string; count: number }[] = [];
  let matchedCount = 0;

  patterns.forEach((p) => {
    const matches = text.match(p.regex);
    if (matches && matches.length > 0) {
      patternMatches.push({
        keyword: p.name,
        category: p.category,
        count: matches.length
      });
      matchedCount += matches.length;
    }
  });

  // Calculate density: matched instances / total words * 100
  const density = parseFloat(((matchedCount / Math.max(1, totalWords)) * 100).toFixed(2));

  // Determine scoring and status based on optimal copy density metrics
  let score = 0;
  let title = "Standard Academic";
  let description = "Low viral trigger density. Content is clear and educational, but could use more pattern interrupts for rapid short-form video feeds.";
  let color = "text-sky-400";
  let bgColor = "bg-sky-500/10";
  let borderColor = "border-sky-500/20";

  if (density === 0) {
    score = 10;
    title = "Inactive Catalyst";
    description = "No viral pattern keywords matched in the script. Target audience curiosity triggers are minimal.";
    color = "text-gray-400";
    bgColor = "bg-white/5";
    borderColor = "border-white/5";
  } else if (density > 0 && density < 1.2) {
    score = 45;
    title = "Academic Content Stance";
    description = "Quiet and explanatory. Good for document tutorials, but needs additional physical trigger keywords to compel scrolling viewers.";
    color = "text-sky-400";
    bgColor = "bg-sky-500/5";
    borderColor = "border-sky-500/10";
  } else if (density >= 1.2 && density < 3.2) {
    score = 85;
    title = "Optimal Viral Stance";
    description = "Perfect ratio! Solid balance of psychological anchors and educational structure to prevent 3-second viewer drop-off.";
    color = "text-emerald-400";
    bgColor = "bg-emerald-500/10";
    borderColor = "border-emerald-500/20";
  } else if (density >= 3.2 && density < 5.8) {
    score = 98;
    title = "High Velocity Hook";
    description = "Aggressive engagement patterns matched. Highly optimized copy designed deliberately to spark curiosity and keep loops open.";
    color = "text-purple-400";
    bgColor = "bg-purple-500/10";
    borderColor = "border-purple-500/20";
  } else {
    // density >= 5.8
    score = 70; // score decays for spammy clickbait density
    title = "Clickbait Hyper-saturation";
    description = "Suspiciously high pattern density. Overuse of trigger terms may cause viewer fatigue or trigger platform distribution dampeners.";
    color = "text-rose-400";
    bgColor = "bg-rose-500/10";
    borderColor = "border-rose-500/20";
  }

  // Final score scaled slightly by the diversity of different categories matched
  const distinctCategories = new Set(patternMatches.map(p => p.category)).size;
  const varietyBonus = distinctCategories * 3; // up to 15-20 points bonus
  score = Math.min(100, Math.max(10, Math.round(score + varietyBonus)));

  return {
    score,
    title,
    description,
    color,
    bgColor,
    borderColor,
    density,
    matchedCount,
    totalWords,
    patternMatches
  };
};


export const AIGenerator: React.FC<AIGeneratorProps> = ({ 
  saveToHistory, 
  selectedHistoryItem, 
  clearSelectedHistoryItem
}) => {
  const { user, dbUser, updateProfile, saveIdeaDB, logUserActivity } = useFirebase();
  const { sendToCalibrationLab } = useCalibrationBridge();
  const uid = user?.uid || "guest";

  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Structural Hook Angles
  const [angleAHook, setAngleAHook] = useState<string>("");
  const [angleBHook, setAngleBHook] = useState<string>("");
  const [angleCHook, setAngleCHook] = useState<string>("");

  // Comparative A/B Retention Playground States
  const [showPlayground, setShowPlayground] = useState<boolean>(false);
  const [comparisonLeft, setComparisonLeft] = useState<{ type: string; text: string; key: "A" | "B" | "C" } | null>(null);
  const [comparisonRight, setComparisonRight] = useState<{ type: string; text: string; key: "A" | "B" | "C" } | null>(null);

  // --- TELEPROMPTER & SPEECH COACH WIDGET STATE & HELPERS ---
  const [activePrompterText, setActivePrompterText] = useState<string>("");
  const [isScrolling, setIsScrolling] = useState<boolean>(false);
  const [prompterSettings, setPrompterSettings] = useState({ scrollSpeedWpm: 140 });
  const [prompterFontSize, setPrompterFontSize] = useState<"text-xl" | "text-3xl" | "text-5xl">("text-3xl");
  const dedicatedPrompterScrollRef = useRef<HTMLDivElement | null>(null);

  const getEstimatedWpm = (text: string) => {
    if (!text) return 140;
    const clean = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length === 0) return 140;
    
    const avgWordLen = words.reduce((acc, w) => acc + w.length, 0) / words.length;
    // Pacing formula: shorter average word length leads to faster speech tempo (higher WPM estimate)
    const estimated = Math.round(180 - (avgWordLen * 8));
    return Math.max(100, Math.min(220, estimated));
  };

  const handlePushToPrompter = (text: string) => {
    const est = getEstimatedWpm(text);
    setActivePrompterText(text);
    setPrompterSettings({ scrollSpeedWpm: est });
    setIsScrolling(false);
    
    showToast("Script pushed to 🎤 Speech Prompter! 🎙️", "success");
    
    setTimeout(() => {
      const el = document.getElementById("dedicated-teleprompter-coach-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 150);
  };

  // High impact attention words for scroll stop score
  const HIGH_IMPACT_WORDS = [
    "secret", "stop", "never", "always", "cheat", "hack", "viral", "unbelievable",
    "shocking", "exposed", "scam", "wrong", "delete", "destroy", "insane", "banned",
    "hidden", "fail", "success", "rich", "poor", "free", "nobody", "everyone", "warning",
    "danger", "illegal", "perfect", "worst", "best", "ruined", "mindblowing", "game",
    "change", "money", "algorithm", "creators", "youtube", "tiktok", "earn", "lose",
    "watch", "before", "immediately", "urgent"
  ];

  // Algorithmic Predictor 1: Hook Pacing
  const getHookPacing = (text: string) => {
    if (!text || !text.trim()) return { label: "N/A", duration: 0, wps: "0.0", colorClass: "text-gray-400 border-white/5 bg-white/5" };
    const clean = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
    const words = clean.split(/\s+/).filter(Boolean);
    const firstHookWords = words.slice(0, 15);
    const avgWordLength = firstHookWords.reduce((acc, w) => acc + w.length, 0) / (firstHookWords.length || 1);
    
    // Speaking tempo estimation: high energy creator speaks around 3.2 words per second.
    const speakingTempo = avgWordLength < 4.5 ? 3.4 : (avgWordLength < 5.5 ? 2.9 : 2.4); // words per second
    const estDuration = parseFloat((firstHookWords.length / speakingTempo).toFixed(1));
    
    let pacingLabel = "Moderate (Standard)";
    let colorClass = "text-blue-400 border-blue-500/20 bg-blue-500/10";
    if (speakingTempo > 3.1) {
      pacingLabel = "Rapid-Fire (Short-form optimized)";
      colorClass = "text-purple-400 border-purple-500/20 bg-purple-500/10";
    } else if (speakingTempo < 2.6) {
      pacingLabel = "Measured (Narrative/Storytelling)";
      colorClass = "text-amber-400 border-amber-500/20 bg-amber-500/10";
    }
    
    return {
      label: pacingLabel,
      duration: estDuration,
      wps: speakingTempo.toFixed(1),
      colorClass
    };
  };

  // Algorithmic Predictor 2: Scroll-Stop Score
  const getScrollStopScore = (text: string) => {
    if (!text || !text.trim()) return { score: 0, label: "N/A", color: "text-gray-400", bgColor: "bg-white/5", borderColor: "border-white/5", matchedWords: [] };
    const cleanText = text.toLowerCase();
    const words = cleanText.split(/\s+/).filter(Boolean).slice(0, 25);
    
    let matchCount = 0;
    const matchedWords: string[] = [];
    HIGH_IMPACT_WORDS.forEach(word => {
      if (cleanText.includes(word)) {
        matchCount++;
        if (matchedWords.length < 3) {
          matchedWords.push(word);
        }
      }
    });
    
    let score = 45; // base score
    score += matchCount * 12;
    
    // Hook length optimization bonus
    if (words.length >= 8 && words.length <= 16) {
      score += 15;
    } else {
      score -= 10;
    }
    
    score = Math.max(15, Math.min(100, score));
    
    let label = "Passive Hook";
    let color = "text-rose-400";
    let bgColor = "bg-rose-500/10";
    let borderColor = "border-rose-500/20";
    
    if (score >= 80) {
      label = "Excellent (Scroll-Stopper)";
      color = "text-emerald-400";
      bgColor = "bg-emerald-500/10";
      borderColor = "border-emerald-500/20";
    } else if (score >= 60) {
      label = "Moderate (Solid Attention)";
      color = "text-[#9e7bf3]";
      bgColor = "bg-[#9e7bf3]/10";
      borderColor = "border-[#9e7bf3]/20";
    }
    
    return { score, label, color, bgColor, borderColor, matchedWords };
  };

  // Algorithmic Predictor 3: Loop Fluidity
  const getLoopFluidity = (text: string) => {
    if (!text || !text.trim()) return { status: "Warning", score: 0, label: "No script content", rating: "Weak Link", color: "text-gray-400", bgColor: "bg-white/5", borderColor: "border-white/5" };
    const trimmed = text.trim();
    const lastChar = trimmed[trimmed.length - 1];
    
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length < 4) return { status: "Warning", score: 10, label: "Too short to loop", rating: "Weak Link", color: "text-rose-400", bgColor: "bg-rose-500/10", borderColor: "border-rose-500/20" };
    
    const firstWords = words.slice(0, 3).map(w => w.toLowerCase().replace(/[^a-z]/g, ""));
    const lastWords = words.slice(-3).map(w => w.toLowerCase().replace(/[^a-z]/g, ""));
    
    const isOpenEnding = [',', '…', '-'].includes(lastChar) || !['.', '!', '?'].includes(lastChar);
    const transitionalEnds = ["so", "because", "this", "why", "that", "like", "the", "with", "how", "for", "here", "is"];
    const endsInTransitional = transitionalEnds.some(w => lastWords.includes(w));
    const hasWordBridge = firstWords.some(fw => lastWords.includes(fw));
    
    let score = 20;
    if (isOpenEnding) score += 45;
    if (endsInTransitional) score += 25;
    if (hasWordBridge) score += 10;
    
    score = Math.min(100, score);
    const status = score >= 50 ? "Optimal" : "Warning";
    const label = score >= 80 
      ? "Infinite Loop (Seamless structural bridge)" 
      : (score >= 50 ? "Satisfactory Loop" : "Abrupt Loop (Attention-dropping gap)");
       
    const rating = score >= 80 ? "Perfect Bridge 🔄" : (score >= 50 ? "Functional Link 🔗" : "Abrupt Transition ⚠️");
    
    return {
      status,
      score,
      label,
      rating,
      color: status === "Optimal" ? "text-emerald-400" : "text-amber-400",
      bgColor: status === "Optimal" ? "bg-emerald-500/10" : "bg-amber-500/10",
      borderColor: status === "Optimal" ? "border-emerald-500/20" : "border-amber-500/20"
    };
  };

  const addToComparison = (angleKey: "A" | "B" | "C", angleName: string, angleText: string) => {
    if (!angleText || !angleText.trim()) {
      showToast("Cannot add empty angle content to comparison!", "warning");
      return;
    }

    if (!comparisonLeft) {
      setComparisonLeft({ type: angleName, text: angleText, key: angleKey });
      showToast(`"${angleName}" loaded as Model A! ⚖️`, "success");
    } else if (!comparisonRight) {
      setComparisonRight({ type: angleName, text: angleText, key: angleKey });
      setShowPlayground(true);
      showToast(`"${angleName}" loaded as Model B! Comparative Playground Active. 🚀`, "success");
      setTimeout(() => {
        document.getElementById("ab-retention-playground")?.scrollIntoView({ behavior: "smooth" });
      }, 200);
    } else {
      // Shift left to right, set right to new
      setComparisonLeft(comparisonRight);
      setComparisonRight({ type: angleName, text: angleText, key: angleKey });
      showToast(`Shifted comparison: "${angleName}" is now Model B! 🔄`, "info");
      setTimeout(() => {
        document.getElementById("ab-retention-playground")?.scrollIntoView({ behavior: "smooth" });
      }, 200);
    }
  };

  // Local dispatched drafts state
  const [dispatchedDrafts, setDispatchedDrafts] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('dispatched_drafts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [angleStatuses, setAngleStatuses] = useState<{A: string; B: string; C: string}>({
    A: "Draft",
    B: "Draft",
    C: "Draft"
  });

  const downloadAngleText = (angleName: string, text: string) => {
    if (!text || !text.trim()) {
      showToast("Cannot export empty script angle content!", "warning");
      return;
    }
    const element = document.createElement("a");
    const file = new Blob([text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${prompt ? prompt.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'script'}_${angleName.toLowerCase().replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    playAudio(440);
    showToast(`Successfully downloaded "${angleName}" TXT file! 📄`, "success");
  };

  const onDispatchScript = async (angleKey: "A" | "B" | "C", angleName: string, angleText: string) => {
    if (!angleText || !angleText.trim()) {
      showToast("Cannot dispatch empty script angle content!", "warning");
      return;
    }

    if (!user || !user.uid) {
      showToast("Please authenticate to dispatch script drafts to your cloud profile! 🌌", "warning");
      return;
    }

    const currentStatus = angleStatuses[angleKey];
    const scriptId = Date.now().toString();
    const docPath = `users/${user.uid}/dispatched_scripts/${scriptId}`;

    try {
      const scriptDocRef = doc(db, "users", user.uid, "dispatched_scripts", scriptId);
      
      const payload = {
        uid: user.uid,
        title: prompt || "Custom Script Concept",
        scriptBody: angleText,
        angleType: angleName,
        productionStatus: currentStatus,
        createdAt: serverTimestamp()
      };

      await setDoc(scriptDocRef, payload);

      // Successfully written to Firestore. Now proceed to local state and toast
      const newDispatch = {
        id: scriptId,
        text: angleText,
        title: prompt || "Custom Script Concept",
        angleType: angleName, // e.g. "Angle A (Curiosity Loop)", "Angle B (Negative Paradox)", "Angle C (Pattern Break)"
        status: currentStatus, // "Draft" | "Ready to Shoot" | "Produced"
        createdAt: new Date().toISOString()
      };

      setDispatchedDrafts(prev => {
        const updated = [...prev, newDispatch];
        localStorage.setItem('dispatched_drafts', JSON.stringify(updated));
        return updated;
      });

      playAudio(880);
      showToast("Script successfully dispatched to Drafts! 🚀", "success");

      // Also log user activity via logUserActivity
      try {
        logUserActivity('dispatch_script_draft', prompt || 'Script Idea', `Dispatched "${angleName}" draft as status: ${currentStatus}`);
      } catch (err) {
        console.warn("Could not log activity:", err);
      }
    } catch (err) {
      console.error("Firestore dispatch script failed:", err);
      handleFirestoreError(err, OperationType.WRITE, docPath);
    }
  };
  
  // Custom creator options
  const [engine, setEngine] = useState<"gemini" | "ollama" | "sandbox">("gemini");
  const [brandVoice, setBrandVoice] = useState("Contrarian");
  const [hookTone, setHookTone] = useState<"Exciting" | "Professional" | "Suspenseful" | "Minimalist">("Exciting");
  const [targetNiche, setTargetNiche] = useState("General Specialist & Creator");
  const [duration, setDuration] = useState("60s Short-form");
  const [visualStyle, setVisualStyle] = useState("Cyber-glow console zoom-ins");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const [customInstructions, setCustomInstructions] = useState(() => {
    return dbUser?.customInstructions || localStorage.getItem(`axe_hours_custom_instructions_guest`) || "";
  });

  useEffect(() => {
    if (dbUser?.customInstructions) {
      setCustomInstructions(dbUser.customInstructions);
    }
  }, [dbUser?.customInstructions]);

  const handleSaveCustomInstructions = async () => {
    try {
      if (user && dbUser) {
        await updateProfile({ customInstructions });
        playAudioCue(880);
        showToast("Creator Guidelines synchronized to your cloud profile! 🌌", "success");
      } else {
        localStorage.setItem(`axe_hours_custom_instructions_guest`, customInstructions);
        playAudioCue(880);
        showToast("Creator Guidelines saved locally to Sandbox memory! ⚡", "success");
      }
    } catch (err: any) {
      showToast("Could not save guidelines: " + (err?.message || err), "error");
    }
  };

  useEffect(() => {
    if (!result) {
      setAngleAHook("");
      setAngleBHook("");
      setAngleCHook("");
      return;
    }
    
    const option1Regex = /(?:Option 1|Angle A|Angle A \(Curiosity Loop\))\s*[:\-]\s*["'«“]?([^"'\n»”)]+)/i;
    const option2Regex = /(?:Option 2|Angle B|Angle B \(Negative Paradox\))\s*[:\-]\s*["'«“]?([^"'\n»”)]+)/i;
    const option3Regex = /(?:Option 3|Angle C|Angle C \(Immediate Pattern Break\))\s*[:\-]\s*["'«“]?([^"'\n»”)]+)/i;

    const opt1Match = result.match(option1Regex);
    const opt2Match = result.match(option2Regex);
    const opt3Match = result.match(option3Regex);

    let hA = opt1Match ? opt1Match[1].trim() : "";
    let hB = opt2Match ? opt2Match[1].trim() : "";
    let hC = opt3Match ? opt3Match[1].trim() : "";

    if (!hA || !hB || !hC) {
      const lines = result.split("\n");
      lines.forEach(line => {
        const lowerLine = line.toLowerCase();
        if (lowerLine.includes("option 1") || lowerLine.includes("angle a")) {
          const val = line.replace(/^(?:Option 1|Angle A)[:\-\s"']+/i, "").replace(/["'\s\)]+$/, "").trim();
          if (val.length > 10) hA = val;
        }
        if (lowerLine.includes("option 2") || lowerLine.includes("angle b")) {
          const val = line.replace(/^(?:Option 2|Angle B)[:\-\s"']+/i, "").replace(/["'\s\)]+$/, "").trim();
          if (val.length > 10) hB = val;
        }
        if (lowerLine.includes("option 3") || lowerLine.includes("angle c")) {
          const val = line.replace(/^(?:Option 3|Angle C)[:\-\s"']+/i, "").replace(/["'\s\)]+$/, "").trim();
          if (val.length > 10) hC = val;
        }
      });
    }

    const topic = prompt || "this secret concept";
    const cleanTopic = topic.replace(/\[BOOSTED PROMPT\]/g, "").replace(/Topic Challenge:/g, "").trim();

    if (!hA) {
      hA = `The math behind ${cleanTopic} is completely broken — and it's opening an unbreakable cognitive loophole. 🤫`;
    }
    if (!hB) {
      hB = `Stop trusting common advice about ${cleanTopic}. Why 99% of creators are completely wrong. 🚨`;
    }
    if (!hC) {
      hC = `This obscure ${cleanTopic} exploit is automating everything. Here is the rapid proof. ⚡`;
    }

    const cleanHook = (h: string) => h.replace(/^["'«“\s\-\*]+/g, "").replace(/["'»”]+$/g, "").trim();

    setAngleAHook(cleanHook(hA));
    setAngleBHook(cleanHook(hB));
    setAngleCHook(cleanHook(hC));
  }, [result, prompt]);
  
  // Active output tabs: "blueprint", "timeline", "ctr", "thumbnail", "coach"
  const [activeTab, setActiveTab] = useState<"blueprint" | "timeline" | "ctr" | "thumbnail" | "coach">("blueprint");
  const [isCopied, setIsCopied] = useState(false);

  // Sound Synthesizer Node - Forwarding to centralized audio module with mute guard
  const playAudioCue = (freq: number, type: OscillatorType = "sine") => {
    playAudio(freq, type, 0.25);
  };

  // Timeline scenes builder state
  const [timelineSegments, setTimelineSegments] = useState<TimelineSegment[]>([
    {
      id: "1",
      timecode: "0:00 - 0:03",
      label: "HOOK",
      visual: "Close-up zoom transition into a terminal screen reflecting deep purple shadows.",
      voiceover: "Stop spending 6 months coding a SaaS that nobody wants. Do this instead.",
      caption: "STOP CODING SAAS THE OLD WAY 🚨",
      sfx: "Vinyl scratch into low synth drone",
      durationSec: 3
    },
    {
      id: "2",
      timecode: "0:03 - 0:15",
      label: "LEAD-IN / RETENTION",
      visual: "Grid of 100 failed projects collapsing into a red trash bin on the left side.",
      voiceover: "99% of developers fail because they spend weeks over-engineering things before launching.",
      caption: "Why 99% of developers FAIL under launch",
      sfx: "Fast whoosh sweep tone",
      durationSec: 12
    },
    {
      id: "3",
      timecode: "0:15 - 0:45",
      label: "THE PAYLOAD",
      visual: "Fast terminal prompt creating a complete server.ts in exactly 4 lines of instructions.",
      voiceover: "Instead, take this simple Node script, wrap it into a micro-blueprint, and deploy in hours.",
      caption: "Deploy in hours using micro-blueprints ⚡",
      sfx: "High pitched success notification beep",
      durationSec: 30
    },
    {
      id: "4",
      timecode: "0:45 - 1:00",
      label: "CALL TO ACTION",
      visual: "Glowing callout button showing 'GET BLUEPRINT' with custom QR code highlight.",
      voiceover: "Type 'BLUEPRINT' in the comment column below, and I'll send this source code straight to your inbox.",
      caption: "Comment 'BLUEPRINT' for immediate access 👇",
      sfx: "Cybernetic chime cascade",
      durationSec: 15
    }
  ]);

  const [activeSegmentId, setActiveSegmentId] = useState<string>("1");

  // Title evaluator state
  const [customTitle, setCustomTitle] = useState("");
  const [titleAnalysis, setTitleAnalysis] = useState<{
    score: number;
    grade: string;
    matches: string[];
    suggestions: string[];
  } | null>(null);

  // Interactive Thumbnail Composer States
  const [thumbHeadline, setThumbHeadline] = useState("DONE IN 24H?!");
  const [thumbLeftMetric, setThumbLeftMetric] = useState("FAILED!");
  const [thumbLeftSub, setThumbLeftSub] = useState("$0 CONSOLE");
  const [thumbRightMetric, setThumbRightMetric] = useState("24H LIMIT");
  const [thumbRightSub, setThumbRightSub] = useState("$12,492 PAYOUT");
  const [thumbTheme, setThumbTheme] = useState<"magenta" | "emerald" | "cyan" | "gold">("magenta");
  const [thumbLayout, setThumbLayout] = useState<"thirds" | "split">("thirds");
  const [thumbFace, setThumbFace] = useState<"distressed" | "shocked" | "confident">("distressed");

  // Title / SEO Optimization generated package
  const [seoDescription, setSeoDescription] = useState("");
  const [seoHashtags, setSeoHashtags] = useState<string[]>([]);
  const [seoKeywords, setSeoKeywords] = useState<string[]>([]);
  const [isDescCopied, setIsDescCopied] = useState(false);
  
  // Prompt Mixer and Booster state
  const [selectedMixPresetIndex, setSelectedMixPresetIndex] = useState(0);
  const [isMixing, setIsMixing] = useState(false);
  const [mixLog, setMixLog] = useState("");
  const [prevRawPrompt, setPrevRawPrompt] = useState("");

  // --- TELEPROMPTER & PACING COACH STATE ---
  const [isPracticing, setIsPracticing] = useState(false);
  const [practiceTime, setPracticeTime] = useState(0);
  const [teleprompterMode, setTeleprompterMode] = useState<"segment" | "full">("segment");
  const [teleprompterFontSize, setTeleprompterFontSize] = useState<"sm" | "md" | "lg" | "xl">("lg");
  const [teleprompterSpeed, setTeleprompterSpeed] = useState<"slow" | "normal" | "fast">("normal");
  const [practiceAudioLevels, setPracticeAudioLevels] = useState<number[]>([15, 30, 10, 40, 20, 5, 25, 45, 12, 32]);
  const teleprompterTimerRef = useRef<NodeJS.Timeout | null>(null);
  const teleprompterScrollRef = useRef<HTMLDivElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const typewriterIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- TELEPROMPTER SPEECH VOICE SYNTHESIS ---
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const isPlayingVoiceRef = useRef(false);

  useEffect(() => {
    isPlayingVoiceRef.current = isPlayingVoice;
  }, [isPlayingVoice]);

  const [synthVoiceName, setSynthVoiceName] = useState("");
  const [synthVoices, setSynthVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [synthPitch, setSynthPitch] = useState<number>(1.0);
  const [synthRate, setSynthRate] = useState<number>(1.05);

  // Initialize Speech synthesis voice configs client-side for AIGenerator
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        const voicesList = window.speechSynthesis.getVoices();
        const enVoices = voicesList.filter(v => v.lang.startsWith('en'));
        setSynthVoices(enVoices);
        if (enVoices.length > 0 && !synthVoiceName) {
          const preferred = enVoices.find(v => v.lang.includes('US') || v.lang.includes('GB')) || enVoices[0];
          setSynthVoiceName(preferred.name);
        }
      };
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, [synthVoiceName]);

  // Handle play / pause voice synthesis
  const handlePlayVoiceSynth = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (isPlayingVoice) {
      window.speechSynthesis.cancel();
      setIsPlayingVoice(false);
      return;
    }

    if (!text || !text.trim()) {
      showToast("No text content is available to read.", "warning");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set selected voice
    if (synthVoiceName) {
      const voice = synthVoices.find(v => v.name === synthVoiceName);
      if (voice) utterance.voice = voice;
    }

    utterance.pitch = synthPitch;
    utterance.rate = synthRate;

    utterance.onend = () => {
      setIsPlayingVoice(false);
    };

    utterance.onerror = () => {
      setIsPlayingVoice(false);
    };

    setIsPlayingVoice(true);
    window.speechSynthesis.speak(utterance);
  };

  // Clean up teleprompter timer and speech on unmount
  useEffect(() => {
    return () => {
      if (typewriterIntervalRef.current) {
        clearInterval(typewriterIntervalRef.current);
      }
      if (teleprompterTimerRef.current) {
        clearInterval(teleprompterTimerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Practice state effect: stopwatch, auto-scroll, Web Audio mic spectrum visualizer
  useEffect(() => {
    if (isPracticing || isPlayingVoice) {
      if (isPracticing) {
        // 1. Reset prompter scroll position when practice starts
        if (teleprompterScrollRef.current) {
          teleprompterScrollRef.current.scrollTop = 0;
        }

        // 2. Start practice timer and auto-scroller
        let elapsed = 0;
        teleprompterTimerRef.current = setInterval(() => {
          elapsed += 1;
          setPracticeTime(elapsed);
          
          if (teleprompterScrollRef.current) {
            const scrollSpeedMultiplier = { slow: 0.12, normal: 0.28, fast: 0.52 };
            const pps = scrollSpeedMultiplier[teleprompterSpeed] * 120; // Scrolling velocity
            teleprompterScrollRef.current.scrollTop += pps;
          }
        }, 1000);
      }

      // 3. Web Audio microphone visualizer or beautiful simulation fallback
      let localStream: MediaStream | null = null;
      let localAudioCtx: AudioContext | null = null;
      let localAnalyser: AnalyserNode | null = null;

      const initAudio = async () => {
        try {
          if (isPracticing && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            micStreamRef.current = localStream;
            
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            localAudioCtx = new AudioContextClass();
            audioCtxRef.current = localAudioCtx;
            
            localAnalyser = localAudioCtx.createAnalyser();
            localAnalyser.fftSize = 64;
            analyserRef.current = localAnalyser;
            
            const source = localAudioCtx.createMediaStreamSource(localStream);
            source.connect(localAnalyser);
          }
        } catch (e) {
          console.log("Mic access denied or unavailable, utilizing trigonometric responsive wave fallback.", e);
        }
        
        // Canvas render loop
        const draw = () => {
          if (!canvasRef.current) return;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          
          const width = canvas.width;
          const height = canvas.height;
          ctx.clearRect(0, 0, width, height);
          
          let dataArray = new Uint8Array(32);
          if (localAnalyser) {
            localAnalyser.getByteFrequencyData(dataArray);
          } else {
            // High-fidelity natural voice spectrum simulator synced to speech or idle breathing
            const isSpeakingState = isPlayingVoiceRef.current;
            const time = Date.now() * 0.005;
            for (let i = 0; i < 32; i++) {
              let amp = 8;
              let variance = 10;
              if (isSpeakingState) {
                // Vibrant vocal waveforms when speaking
                amp = Math.sin(time * 2.2 + i * 0.4) * 85 + 110;
                variance = Math.sin(time * 4.5 + i * 0.8) * 35;
              } else {
                // Calm neutral idle flow
                amp = Math.sin(time * 0.5 + i * 0.15) * 6 + 10;
                variance = Math.sin(time * 1.5 + i * 0.3) * 3;
              }
              dataArray[i] = Math.max(3, amp + variance + (Math.random() * 5));
            }
          }
          
          const barWidth = (width / 32) - 1.5;
          for (let i = 0; i < 32; i++) {
            const val = dataArray[i]; // 0 - 255
            const percent = val / 255;
            const barHeight = Math.max(3, percent * height * 1.5);
            
            const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
            gradient.addColorStop(0, "rgba(157, 80, 187, 0.45)"); // Deep Purple
            gradient.addColorStop(0.5, "rgba(168, 85, 247, 0.85)"); // Vibrant Fuchsia
            gradient.addColorStop(1, "rgba(6, 182, 212, 1)"); // Bright Neon Cyan Tip
            
            ctx.fillStyle = gradient;
            const x = i * (barWidth + 1.5);
            const y = height - barHeight;
            
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0]);
            } else {
              ctx.rect(x, y, barWidth, barHeight);
            }
            ctx.fill();
          }
          
          animationFrameRef.current = requestAnimationFrame(draw);
        };
        
        draw();
      };
      
      initAudio();
    } else {
      // Practice deactivated: Tear down timers & Audio components cleanly
      if (teleprompterTimerRef.current) {
        clearInterval(teleprompterTimerRef.current);
        teleprompterTimerRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
      }
      if (audioCtxRef.current) {
        if (audioCtxRef.current.state !== "closed") {
          audioCtxRef.current.close().catch(() => {});
        }
        audioCtxRef.current = null;
      }
      setPracticeTime(0);
    }
    
    return () => {
      if (teleprompterTimerRef.current) {
        clearInterval(teleprompterTimerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isPracticing, isPlayingVoice, teleprompterSpeed]);

  const { addToast } = useToast();

  const viralScoreDetails = React.useMemo(() => {
    return calculateDraftViralScore(prompt);
  }, [prompt]);

  const trendScoreDetails = React.useMemo(() => {
    return calculateTrendMatchScore(result);
  }, [result]);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    addToast(msg, type);
  };

  useEffect(() => {
    const savedKey = getSecureGeminiKey(uid);
    const savedVoice = localStorage.getItem(`axe_hours_brand_voice_${uid}`) || localStorage.getItem("axe_hours_brand_voice");
    const savedNiche = localStorage.getItem(`axe_hours_target_niche_${uid}`) || localStorage.getItem("axe_hours_target_niche");

    if (savedKey) {
      setEngine("gemini");
    } else {
      setEngine("sandbox");
    }

    if (savedVoice) setBrandVoice(savedVoice);
    if (savedNiche) setTargetNiche(savedNiche);
  }, [uid]);

  // Sync selected history items
  useEffect(() => {
    if (selectedHistoryItem) {
      setPrompt(selectedHistoryItem.title);
      setResult(selectedHistoryItem.content);
      setIsSaved(false);
      clearSelectedHistoryItem();
      
      // Auto compile standard initial timeline from text if it contains standard markers
      parseScriptStructure(selectedHistoryItem.content);
    }
  }, [selectedHistoryItem, clearSelectedHistoryItem]);

  // Listen for external configuration commands (e.g., from AJ Popout Assistant / chatbot)
  useEffect(() => {
    const pendingPrompt = localStorage.getItem('pending_architect_prompt');
    if (pendingPrompt) {
      setPrompt(pendingPrompt); // Force-update the local text area state
      localStorage.removeItem('pending_architect_prompt'); // Consume and clear the buffer safely
    }

    const handleLoadSettings = (e: Event) => {
      const customEvent = e as CustomEvent;
      const data = customEvent.detail;
      if (data) {
        if (data.prompt !== undefined) setPrompt(data.prompt);
        if (data.brandVoice !== undefined) setBrandVoice(data.brandVoice);
        if (data.engine !== undefined) setEngine(data.engine);
        if (data.targetNiche !== undefined) setTargetNiche(data.targetNiche);
        if (data.duration !== undefined) setDuration(data.duration);
        if (data.visualStyle !== undefined) setVisualStyle(data.visualStyle);
        if (data.selectedCategory !== undefined) setSelectedCategory(data.selectedCategory);
        if (data.result !== undefined) {
          setResult(data.result);
          parseScriptStructure(data.result);
        }
        
        // Custom sound notification
        playAudioCue(880, "triangle");
        
        // Scroll deep workspace container into viewport
        setTimeout(() => {
          const workspaceEl = document.getElementById("ai-generator-workspace-main");
          if (workspaceEl) {
            workspaceEl.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 300);
      }
    };

    window.addEventListener("load-generator-settings", handleLoadSettings);
    return () => {
      window.removeEventListener("load-generator-settings", handleLoadSettings);
    };
  }, []);

  // Attempt to parse structured AI output into standard interactive cards
  const parseScriptStructure = (text: string) => {
    try {
      if (!text || !text.trim()) return;
      const segments: TimelineSegment[] = [];
      const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      let idCounter = 1;

      // Strategy 1: Check if there are explicit timestamp markers (e.g. 0:00 - 0:03)
      lines.forEach(line => {
        const timecodeRegex = /(\d+:\d+\s*(?:-|to)\s*\d+:\d+|\d+s\s*(?:-|to)\s*\d+s)/i;
        const hasTimecode = timecodeRegex.exec(line);
        
        if (hasTimecode) {
          const rawTimecode = hasTimecode[1];
          let remaining = line.replace(rawTimecode, "").trim();
          remaining = remaining.replace(/^[\s\-\*\[\]\:\d]+/g, "").trim();
          
          let label = "SEGMENT";
          const labelMatch = remaining.match(/^\[([^\]]+)\]/);
          if (labelMatch) {
            label = labelMatch[1].toUpperCase();
            remaining = remaining.replace(labelMatch[0], "").trim();
          } else {
            if (line.toUpperCase().includes("HOOK")) label = "HOOK";
            else if (line.toUpperCase().includes("CTA") || line.toUpperCase().includes("CALL TO ACTION")) label = "CTA";
            else if (line.toUpperCase().includes("CHALLENGE") || line.toUpperCase().includes("CONTRAST")) label = "CONTRAST";
            else if (line.toUpperCase().includes("DEVELOPMENT") || line.toUpperCase().includes("METHOD")) label = "METHOD";
          }
          
          remaining = remaining.replace(/^[:\s\-]+/g, "").trim();
          
          let visual = "AI Suggested visual scene instruction block.";
          let voiceover = remaining;
          
          if (remaining.toUpperCase().includes("VISUAL:") || remaining.toUpperCase().includes("VOICE:")) {
            const visIdx = remaining.toUpperCase().indexOf("VISUAL:");
            const voiceIdx = remaining.toUpperCase().indexOf("VOICE:");
            
            if (visIdx !== -1 && voiceIdx !== -1) {
              if (visIdx < voiceIdx) {
                visual = remaining.substring(visIdx + 7, voiceIdx).trim();
                voiceover = remaining.substring(voiceIdx + 6).trim();
              } else {
                voiceover = remaining.substring(voiceIdx + 6, visIdx).trim();
                visual = remaining.substring(visIdx + 7).trim();
              }
            } else if (visIdx !== -1) {
              visual = remaining.substring(visIdx + 7).trim();
              voiceover = remaining.substring(0, visIdx).trim();
            } else if (voiceIdx !== -1) {
              voiceover = remaining.substring(voiceIdx + 6).trim();
              visual = "Speak clearly with high enthusiasm.";
            }
          } else {
            if (label === "HOOK") {
              visual = "Close-up zoom transition into screen showing vibrant glowing color contrast.";
            } else if (label === "CTA") {
              visual = "Vibrant on-screen overlay text showing active community comment keywords.";
            }
          }
          
          visual = visual.replace(/^[:\s\-]+/g, "").trim();
          voiceover = voiceover.replace(/^[:\s\-]+/g, "").trim();
          if (!voiceover) voiceover = remaining || "Let's dive into the core details of this strategy.";

          segments.push({
            id: String(idCounter++),
            timecode: rawTimecode.trim(),
            label: label,
            visual: visual || "Dynamic high CTR visual frame.",
            voiceover: voiceover,
            caption: voiceover.substring(0, 32).toUpperCase() + "...",
            sfx: label === "HOOK" ? "Whoosh impact transition" : label === "CTA" ? "Digital ring notification chiming" : "Subtle cinematic ambient pulse",
            durationSec: 10
          });
        }
      });

      // Strategy 2: If we didn't find any explicit timecoded lines, scan for markdown list items & label titles
      if (segments.length === 0) {
        lines.forEach(line => {
          if (line.includes("[HOOK]") || line.includes("Option ") || line.includes("Scene ") || line.includes("Segment ") || line.startsWith("- ") || line.startsWith("* ")) {
            let label = "SEGMENT";
            if (line.toUpperCase().includes("HOOK")) label = "HOOK";
            else if (line.toUpperCase().includes("CTA") || line.toUpperCase().includes("CALL TO ACTION")) label = "CTA";
            else if (line.toUpperCase().includes("CHALLENGE") || line.toUpperCase().includes("CONTRAST")) label = "CONTRAST";
            else if (line.toUpperCase().includes("DEVELOPMENT") || line.toUpperCase().includes("METHOD")) label = "METHOD";
            
            let textPart = line.replace(/^[\s\-\*\[\]\d+]+/g, "").trim();
            textPart = textPart.replace(/^(HOOK|CTA|CHALLENGE|CONTRAST|DEVELOPMENT|METHOD|Scene\s*\d+|Option\s*\d+|Segment\s*\d+)[:\]\s\-]+/i, "").trim();
            
            if (textPart.length > 15) {
              segments.push({
                id: String(idCounter++),
                timecode: "0:00 - 0:10", // will be adjusted dynamically
                label: label,
                visual: label === "HOOK" ? "High pace pattern interrupt visual." : "Seamless professional graphic slide transition.",
                voiceover: textPart,
                caption: textPart.substring(0, 32).toUpperCase() + "...",
                sfx: label === "HOOK" ? "Heavy low-end cinematic drop" : "Standard audio slide transition pop",
                durationSec: 8
              });
            }
          }
        });
      }

      // Distribute timelines logically for any parsed segment blocks
      if (segments.length > 0) {
        let currentSeconds = 0;
        segments.forEach((seg, idx) => {
          let dur = 10;
          if (seg.label === "HOOK") dur = 3;
          else if (seg.label === "CTA") dur = 5;
          else if (idx === segments.length - 1) dur = 5;
          
          seg.durationSec = dur;
          
          const formatTime = (secs: number) => {
            const m = Math.floor(secs / 60);
            const s = secs % 60;
            return `${m}:${s < 10 ? '0' : ''}${s}`;
          };
          
          const startStr = formatTime(currentSeconds);
          currentSeconds += dur;
          const endStr = formatTime(currentSeconds);
          
          if (seg.timecode === "0:00 - 0:10") {
            seg.timecode = `${startStr} - ${endStr}`;
          }
        });
      }

      if (segments.length >= 2) {
        setTimelineSegments(segments);
        setActiveSegmentId(segments[0].id);
      }
    } catch (e) {
      console.error("Error in robust script parsing:", e);
    }
  };

  const handleTemplateClick = (tpl: typeof VIDEO_TEMPLATES[0]) => {
    setPrompt(tpl.prompt);
    setBrandVoice(tpl.voice);
    setTargetNiche(tpl.niche);
    setDuration(tpl.duration);
    setVisualStyle(tpl.style);
    playAudioCue(587.33); // D5
  };

  const handleInjectHook = (hook: string) => {
    setPrompt(prev => {
      if (!prev) return hook + " ";
      return prev + (prev.endsWith(" ") ? "" : " ") + hook + " ";
    });
    playAudioCue(659.25); // E5
  };

  const handleMixPrompt = async () => {
    if (!prompt) {
      showToast("Please enter a raw topic or custom prompt first to mix!");
      return;
    }
    
    setIsMixing(true);
    setMixLog("Connecting with AI Mixer...");
    playAudioCue(587.33, "sawtooth"); // D5
    
    const activePreset = MIX_PRESETS[selectedMixPresetIndex];
    setPrevRawPrompt(prompt);
    
    const logs = [
      "Analyzing topic intent...",
      "Injecting brand voice psychological drivers...",
      "Fusing hook anchors...",
      "Optimizing CTA retention flow...",
      "Compiling final boosted prompt!"
    ];

    let logIdx = 0;
    const logInterval = setInterval(() => {
      if (logIdx < logs.length - 1) {
        setMixLog(logs[logIdx]);
        logIdx++;
      }
    }, 400);

    if (engine === "sandbox") {
      setTimeout(() => {
        clearInterval(logInterval);
        
        let boosted = `[BOOSTED PROMPT]: ${activePreset.name} Mix\n\n`;
        boosted += `Topic Challenge: "${prompt}"\n`;
        boosted += `Suggested Format Angle: ${activePreset.name}\n\n`;
        
        if (selectedMixPresetIndex === 0) {
          boosted += `Stop doing traditional implementation for: "${prompt}". Why 99% of developers fail this step by over-complicating boilerplate. Instead, deploy this modern microscopic code shortcut that automates the exact flow in 15 minutes. Show exactly how anyone can replicate this immediate cheat code.`;
        } else if (selectedMixPresetIndex === 1) {
          boosted += `The 0.1% of advanced creators are using an underground loop trick to solve: "${prompt}". Why standard tutorials are hiding this productivity method, and how it reduces cognitive overhead with zero setup.`;
        } else if (selectedMixPresetIndex === 2) {
          boosted += `A highly tactical, step-by-step mastercode walkthrough on "${prompt}". Break it down into exact structured segments with actionable lists, so the audience can copy-paste and deploy instantly.`;
        } else {
          boosted += `This is why most attempts to build "${prompt}" fail catastrophically. The critical 3-second mistake that drains viewer retention, and the clean value formula to get successful results immediately.`;
        }
        
        setPrompt(boosted);
        setIsMixing(false);
        setMixLog("");
        showToast("AI Prompt mixed, engineered, and boosted successfully in Sandbox!");
        playAudioCue(880, "triangle"); // A5
      }, 2000);
      return;
    }

    const savedKey = getSecureGeminiKey(uid);
    const activeKey = engine === 'gemini' ? savedKey : null;

    try {
      const response = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPrompt: prompt,
          presetName: activePreset.name,
          presetPrompt: activePreset.anchor,
          customKey: activeKey,
          uid
        })
      });

      clearInterval(logInterval);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Mixer network response error");
      }

      const data = await response.json();
      if (data.enhancedPrompt) {
        setPrompt(data.enhancedPrompt);
        showToast("Gemini mixed & amplified your prompt structure!");
        playAudioCue(880, "triangle"); // A5
      } else {
        throw new Error("Missing enhanced prompt from API response.");
      }
    } catch (e: any) {
      console.error(e);
      showToast("Key missing or API Error. Reverted to Sandbox mixer engine.");
      
      let boosted = `[HEURISTIC MIXED PROMPT]: ${activePreset.name} Preset\n\n`;
      boosted += `Stop building traditional solutions for "${prompt}". Here is how we exploit a micro-automation recipe using specific creative triggers. Show exactly why standard pathways fall short and build the dynamic strategy now.`;
      setPrompt(boosted);
    } finally {
      setIsMixing(false);
      setMixLog("");
    }
  };

  const generateMagic = async () => {
    if (!prompt) return;
    setIsLoading(true);
    setResult("");
    setIsSaved(false);
    setActiveTab("blueprint");

    // Automatically trigger smooth scroll sequence to the results view once initiated
    setTimeout(() => {
      document.getElementById("ai-generator-workspace-tabs-group")?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 250);

    if (engine === 'sandbox') {
      runSandboxSimulation();
      return;
    }

    if (engine === 'ollama') {
      try {
        setResult("📡 Initializing connection to local Ollama server (http://localhost:11434)...\n(Make sure 'ollama run llama3' is active in your terminal with CORS authorization enabled)\n\n");
        const response = await fetch("http://localhost:11434/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama3",
            prompt: `You are a high-performance content psychologist, scriptwriter, and viral growth analyst. Assemble a detailed markdown video script blueprint.
Topic Challenge: "${prompt}"
Niche Target: ${targetNiche}
Voice Tone Rules: ${brandVoice} (Sub-tone Preset: ${hookTone})
Format: ${duration}
Aesthetic Vibe: ${visualStyle}

Ensure the script contains sections for [CORE CONCEPT & VIRAL ANGLE], [THE HOOK SCRIPTS (3 VARIATIONS)], [CHOSEN HOOK RETENTION FORMULA], [SCENE-BY-SCENE VISUAL BLUEPRINT], and [THUMBNAIL STRATEGIST ASSIGNED PLAN] with beautiful details. Adhere to custom directives: ${customInstructions}`,
            stream: false
          })
        });

        if (!response.ok) {
          throw new Error("Local Ollama responded with error state: " + response.status);
        }

        const data = await response.json();
        const generatedText = data.response || "";
        setIsLoading(false);
        if (generatedText) {
          setResult(generatedText);
          saveToHistory(prompt, generatedText);
          parseScriptStructure(generatedText);
          showToast("Local Ollama compiled script blueprint successfully! 🦾", "success");
        } else {
          throw new Error("No payload found in local generation response.");
        }
        return;
      } catch (e: any) {
        console.warn("Local Ollama loop offline or blocked. engaging sandbox compiler.", e);
        showToast("Local Ollama is offline or unavailable. Engaging Sandbox fallback simulation! ⚡", "warning");
        setResult("📡 Connection to 'http://localhost:11434' timed out.\nEngaging highly adaptive creator sandbox fallback generator...\n\n");
        setTimeout(() => runSandboxSimulation(), 1500);
        return;
      }
    }

    const savedKey = getSecureGeminiKey(uid);
    const activeKey = engine === 'gemini' ? savedKey : null;

    try {
      const response = await fetch("/api/generate-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          brandVoice,
          hookTone,
          targetNiche,
          style: visualStyle,
          duration,
          customKey: activeKey,
          customInstructions,
          uid
        })
      });

      if (!response.ok) {
        throw new Error("HTTP error " + response.status);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let streamBuffer = "";
      let generatedText = "";

      while (!done) {
        const { value, done: readerDone } = await reader!.read();
        done = readerDone;
        if (value) {
          streamBuffer += decoder.decode(value, { stream: !done });
          const lines = streamBuffer.split("\n");
          streamBuffer = lines.pop() || ""; // carry over partial line

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith("data: ")) {
              const dataStr = trimmedLine.slice(6);
              if (dataStr === "[DONE]") {
                done = true;
                break;
              }
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.text) {
                  generatedText += parsed.text;
                  setResult(generatedText);
                } else if (parsed.error) {
                  throw new Error(parsed.error);
                }
              } catch (e: any) {
                if (e.message) {
                  throw e;
                }
              }
            }
          }
        }
      }

      setIsLoading(false);
      if (generatedText) {
        saveToHistory(prompt, generatedText);
        parseScriptStructure(generatedText);
        showToast("Viral script blueprint generated and structured! 🚀", "success");
      }
    } catch (error: any) {
      console.warn("Gemini Cloud connection failed. Attempting automatic routing failover to Local Ollama...", error);
      setResult("📡 [FAILOVER TRIGGERED] Gemini Cloud unavailable or API rate limit reached.\nRouting pipeline to Local Ollama host (http://localhost:11434)... \n\n");
      showToast("Gemini Cloud failed. Testing automatic failover to local Ollama...", "warning");
      
      try {
        const response = await fetch("http://localhost:11434/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama3",
            prompt: `You are a high-performance content psychologist, scriptwriter, and viral growth analyst. Assemble a detailed video script blueprint as failover from Gemini Cloud.
Topic Challenge: "${prompt}"
Niche Target: ${targetNiche}
Voice Tone Rules: ${brandVoice} (Sub-tone Preset: ${hookTone})
Format: ${duration}
Aesthetic Vibe: ${visualStyle}

Ensure the script contains sections for [CORE CONCEPT & VIRAL ANGLE], [THE HOOK SCRIPTS (3 VARIATIONS)], [CHOSEN HOOK RETENTION FORMULA], [SCENE-BY-SCENE VISUAL BLUEPRINT], and [THUMBNAIL STRATEGIST ASSIGNED PLAN] with beautiful details. Adhere to custom directives: ${customInstructions}`,
            stream: false
          })
        });

        if (!response.ok) {
          throw new Error("Local Ollama responded with error code: " + response.status);
        }

        const data = await response.json();
        const generatedText = data.response || "";
        setIsLoading(false);
        if (generatedText) {
          setResult(generatedText);
          saveToHistory(prompt, generatedText);
          parseScriptStructure(generatedText);
          showToast("Routed failover session to local Ollama successfully! 🦾", "success");
        } else {
          throw new Error("Empty payload returned from local model.");
        }
      } catch (ollamaErr: any) {
        console.warn("Local Ollama failover failed or offline. Routing to Sandbox compiler.", ollamaErr);
        setResult("📡 [OLLAMA OFFLINE] Failover to Local Ollama failed.\nEngaging highly adaptive creator sandbox fallback generator...\n\n");
        showToast("AI Failover pipeline complete: Launching localized Sandbox model", "warning");
        setTimeout(() => runSandboxSimulation(), 1200);
      }
    }
  };

  const runSandboxSimulation = () => {
    setResult("⚡ COGNITIVE ROUTER CONFIGURED...\nDEPLOYING ADAPTATIVE CONTENT GENERATOR...\n\n");
    const query = prompt.toLowerCase();
    const nicheLower = targetNiche.toLowerCase();
    
    let themeTitle = prompt || "Untethered Achievement";
    // If it's a boosted prompt with structured Topic Challenge, extract the clean topic text
    if (themeTitle.includes('Topic Challenge: "')) {
      const match = themeTitle.match(/Topic Challenge:\s*"([^"]+)"/);
      if (match) {
        themeTitle = match[1];
      }
    } else if (themeTitle.includes("[BOOSTED PROMPT]")) {
      const parts = themeTitle.split("\n");
      const challengeLine = parts.find(p => p.toLowerCase().includes("challenge"));
      if (challengeLine) {
        themeTitle = challengeLine.replace(/[^"]*"([^"]+)"[^"]*/, "$1");
      } else {
        themeTitle = "Tech Workflow Mastery";
      }
    }
    
    // Ensure we don't have extremely long labels in simple template replacements
    if (themeTitle.length > 80) {
      themeTitle = themeTitle.substring(0, 77) + "...";
    }

    let generatedText = "";

    if (query.includes("math") || query.includes("science") || query.includes("conjecture") || query.includes("collatz") || query.includes("unsolved") || query.includes("solve")) {
      generatedText = `[CORE CONCEPT & VIRAL ANGLE]
Our core angle focuses on deconstructing highly complex mathematical concepts into captivating narrative journeys. The target click motivation is the "Illusion of Simplicity" – presenting a puzzle that looks easy but is mathematically unsolved.

[THE HOOK SCRIPTS (3 VARIATIONS)]
Option 1: "This math problem is so ridiculously simple, any primary school student can understand it. Yet, the world's most brilliant minds have spent almost a century trying to prove it — and many warn that it's a trap." (98% Potential)
Option 2: "They are lying to you about mathematical certainty. Let's look at a simple 3-step loop that completely breaks the rules of arithmetic." (95% Curiosity Curve)
Option 3: "If you start running this simple numerical sequence, you will hit an unbreakable cycle. Mathematics cannot prove why this happens." (92% Engagement Rate)

[CHOSEN HOOK RETENTION FORMULA]
Our target hook instantly presents a massive pain-point contrast: Simple rule vs Unsolvable paradox. This leverages curiosity loops and cognitive friction to force retention past the critical 3-second dropoff.

[SCENE-BY-SCENE VISUAL BLUEPRINT]
- 0:00 - 0:03 [HOOK]: Extreme close-up of chalk drawing a simple formula on a black canvas.
- 0:03 - 0:15 [CHALLENGE]: Visual representation of the numbers 4, 2, and 1 circling infinitely.
- 0:15 - 0:45 [DEVELOPMENT]: Detailing computer tests up to 2^68, and showing Paul Erdős's famous quote.
- 0:45 - 1:00 [CTA]: Screen showing a custom diagram overlay requesting comments about personal tests.

[THUMBNAIL STRATEGIST ASSIGNED PLAN]
- Core Layout Strategy: High contrast dark layout, chalk formulas scattered around.
- Ideal Contrast Elements: Electric azure glows contrasting with matte chalkboard files.
- Overlay Copy Text: "UNSOLVABLE?!"`;
    } else if (selectedCategory === "Food" || nicheLower.includes("cook") || nicheLower.includes("food") || nicheLower.includes("chef") || query.includes("pasta") || query.includes("chef") || query.includes("cook")) {
      generatedText = `[CORE CONCEPT & VIRAL ANGLE]
Our viral focus centres on disrupting traditional cooking mistakes in ${targetNiche}. The psychological angle is restaurant-grade perfection: showing the audience a simple organic ingredient shift or chemical balancing ratio that immediately spikes their saliva receptors.

[THE HOOK SCRIPTS (3 VARIATIONS)]
Option 1: "Stop dumping table salt on your food when it tastes flat. Why top Michelin chefs use three obscure citric acid ratios to trigger intense taste depth instantly." (95% Retention Potential)
Option 2: "They are lying to you about cooking pasta the old way. Let's look at a simple starch-reduction strategy that creates absolute cream texture with zero butter." (97% Curiosity Curve)
Option 3: "If you're still boiling your green vegetables standardly, you need to look at this simple 5-second shock ice-bath recipe trick." (92% Engagement Rate)

[CHOSEN HOOK RETENTION FORMULA]
Our hook relies on culinary disruption. We challenge conventional seasoning and boiling habits, creating immediate curiosity that commands watchtime past the 3-second mark.

[SCENE-BY-SCENE VISUAL BLUEPRINT]
- 0:00 - 0:03 [HOOK]: Extreme close-up of a hot skillet sizzling with olive oil and fresh garlic.
- 0:03 - 0:15 [CONTRAST]: Split visual comparing gray soggy broccoli with vibrant, crisp ice-shocked greens.
- 0:15 - 0:45 [METHOD]: Presenting the exact water starch ratio on screen with clear bold overlay badges.
- 0:45 - 1:00 [CTA]: Close-up of the dish being tossed beautifully with steam rising. Caption: "Comment 'RECIPE' for the secrets."

[THUMBNAIL STRATEGIST ASSIGNED PLAN]
- Core Layout Strategy: High saturate food shot in the center; left side reflects standard failure.
- Ideal Contrast Elements: Extreme crimson flames contrasted with matte charcoal cooking utensils.
- Overlay Copy Text: "MICHELIN BLUEPRINT"`;
    } else if (selectedCategory === "Finance" || nicheLower.includes("finance") || nicheLower.includes("wealth") || nicheLower.includes("money") || nicheLower.includes("invest") || query.includes("passive") || query.includes("saving") || query.includes("wealth")) {
      generatedText = `[CORE CONCEPT & VIRAL ANGLE]
Our viral focus is revealing hidden asset structures or cash flow strategies in ${targetNiche}. The cognitive loop levers are "The Inflation Scam" or "Unfair Leverage": highlighting how traditional advice keeps people poor while elite players exploit micro royalty streams.

[THE HOOK SCRIPTS (3 VARIATIONS)]
Option 1: "Why standard high-yield savings accounts are secretly eating your purchasing power. Top institutions are buying obscure digital royalties to earn 12% passive yields." (96% Gold Tier Potential)
Option 2: "The elite solopreneurs don't raise venture capital. Instead, they build micro automated cashflow machines in under 48 hours for $0." (98% Curiosity Curve)
Option 3: "If you're still investing standardly in broad index funds, step back and look at these three asset-hedging alternatives." (93% Engagement Rate)

[CHOSEN HOOK RETENTION FORMULA]
The hook targets systemic financial anxiety. By framing traditional saving as an active loss, we trigger strong psychological tension and promise a high-payoff automated shortcut.

[SCENE-BY-SCENE VISUAL BLUEPRINT]
- 0:00 - 0:03 [HOOK]: Sleek, high-contrast dark diagram tracking inflation vectors with neon gold accents.
- 0:03 - 0:15 [FRICTION]: Screen showing traditional bank interest statements collapsing into pixel dust.
- 0:15 - 0:45 [PAYOFF]: Staggered bullet-points outlining automated AI or digital property acquisitions.
- 0:45 - 1:00 [CTA]: Displaying a clean website mockup illustrating direct cash distributions. Caption: "Comment 'MUTINY' to escape."

[THUMBNAIL STRATEGIST ASSIGNED PLAN]
- Core Layout Strategy: Extreme zoom-in on bank interest screens with overlay red crosses.
- Ideal Contrast Elements: Glowing gold gold bars juxtaposed with faded corporate spreadsheets.
- Overlay Copy Text: "12% HACKED?!"`;
    } else if (selectedCategory === "Travel" || nicheLower.includes("travel") || nicheLower.includes("nomad") || nicheLower.includes("backpack") || query.includes("country") || query.includes("island") || query.includes("bag")) {
      generatedText = `[CORE CONCEPT & VIRAL ANGLE]
Our core angle centers on geographically- arbitrage and lifestyle hacking. We hook viewers with extreme luxurious benefits for tiny budgets, leveraging the physical desire for travel and escapism.

[THE HOOK SCRIPTS (3 VARIATIONS)]
Option 1: "Stop packing massive suitcases for long international voyages. This simple 20-liter backpack layout allows you to travel the world for 3 months with zero luggage fees." (94% Retention Potential)
Option 2: "They are lying to you about Bali prices. There is an elite island sanctuary less than 2 hours away where you can live like royalty for under $800 split-rent." (96% Curiosity Curve)
Option 3: "If you're still staying in standard travel hostels, you need to see this secret architectural villa compound." (91% Engagement Rate)

[CHOSEN HOOK RETENTION FORMULA]
Our hook uses geographic arbitrage. We contrast cheap costs with luxury living standards, opening a curiosity loop that gets viewers excited for the practical breakdown.

[SCENE-BY-SCENE VISUAL BLUEPRINT]
- 0:00 - 0:03 [HOOK]: Overwhelmingly gorgeous drone zoom of crystal blue waves crashing on a black volcanic sand beach.
- 0:03 - 0:15 [PROBLEM]: Frustrated tourist dragging massive suitcases in a crowded airport line with warning overlays.
- 0:15 - 0:45 [BLUEPRINT]: Quick cuts demonstrating packing layouts or digital nomad workspace views.
- 0:45 - 1:00 [CTA]: Aerial sunset shot of a gorgeous tropical shared workspace. Caption: "Comment 'PARADISE' for the map coordinates."

[THUMBNAIL STRATEGIST ASSIGNED PLAN]
- Core Layout Strategy: Split layout. Left: $800 modern villa. Right: Crowded grey office cubicle.
- Ideal Contrast Elements: Neon sea-foam green ocean waters paired with matte slate business suits.
- Overlay Copy Text: "BALI IS DEAD?"`;
    } else if (selectedCategory === "Fitness" || nicheLower.includes("fit") || nicheLower.includes("health") || nicheLower.includes("muscle") || nicheLower.includes("gym") || query.includes("weight") || query.includes("workout")) {
      generatedText = `[CORE CONCEPT & VIRAL ANGLE]
Our viral focus is physical and neurological biohacking. We disrupt normal gym lore by demonstrating correct biomechanics or circadian sleep optimization patterns that yields massive results.

[THE HOOK SCRIPTS (3 VARIATIONS)]
Option 1: "Why 95% of gym-goers get absolutely ZERO muscle gains despite training hard 5 days a week. It isn't your diet; it is the complete lack of eccentric tension optimization." (95% High Score)
Option 2: "Stop drinking espresso the second you wake up. This obscure 10-minute cortisol delay sequence naturally doubles your morning alertness with no crash." (98% Curiosity Curve)
Option 3: "If you are still performing standard overhead presses, you are slowly grinding down your rotator cuff joints." (90% Engagement Rate)

[CHOSEN HOOK RETENTION FORMULA]
The hook targets wasted gym effort. We challenge traditional workout lore with scientific biohacking, forcing viewers to pay attention to fix their mistakes.

[SCENE-BY-SCENE VISUAL BLUEPRINT]
- 0:00 - 0:03 [HOOK]: Extreme close-up of a dumbbell being lowered in slow motion with glowing muscular overlays.
- 0:03 - 0:15 [SCIENCE]: Quick dynamic skeletal movement overlay showing shoulder joint pressure values.
- 0:15 - 0:45 [BLUEPRINT]: Practical exercise demonstration showing exact elbow positioning.
- 0:45 - 1:00 [CTA]: Presenter demonstrating proper posture. Caption: "Comment 'TRAIN' for the free clinical split sheet."

[THUMBNAIL STRATEGIST ASSIGNED PLAN]
- Core Layout Strategy: Left side outlines joint damage in red; right side shows correct alignment in emerald green.
- Ideal Contrast Elements: High-saturation neon athletic orange contrasted with dark slate gym floors.
- Overlay Copy Text: "STOP DOING THIS"`;
    } else if (selectedCategory === "Gaming" || nicheLower.includes("game") || nicheLower.includes("esport") || nicheLower.includes("retro") || query.includes("console") || query.includes("pixel") || query.includes("map")) {
      generatedText = `[CORE CONCEPT & VIRAL ANGLE]
Our core angle captures elite spatial mastery or unique mechanical loops in competitive and retro titles. The curiosity trigger is showing hidden map glitches or hardware repairs that feel like magic to players.

[THE HOOK SCRIPTS (3 VARIATIONS)]
Option 1: "Why 99% of competitive players completely fail on this map loop. Using this hidden pixel placement allows you to lock down the entire site solo with zero backup." (96% Potential)
Option 2: "The retro gaming community is thriving. How a simple $15 soldering hardware modification turns old consoles into spectacular 4K widescreen outputs." (97% Curiosity Curve)
Option 3: "If you still fight the final boss using conventional sword combinations, you are missing this incredibly easy level cheat." (91% Engagement Rate)

[CHOSEN HOOK RETENTION FORMULA]
The hook promises unfair gameplay leverage. By demonstrating a pixel-perfect positional trick, we grab competitive gamer instincts and guarantee complete high retention path.

[SCENE-BY-SCENE VISUAL BLUEPRINT]
- 0:00 - 0:03 [HOOK]: Ultra-smooth 60fps game camera pan looking down a highly complex competitive level layout.
- 0:03 - 0:15 [EXPLOIT]: On-screen graphic highlighting exact player coordinate lines with yellow glow overlays.
- 0:15 - 0:45 [TUTORIAL]: Demonstration of the strategy succeeding against multiple opponents consecutively.
- 0:45 - 1:00 [CTA]: Close-up of a retro gamepad vibrating. Caption: "Comment 'GLITCH' to get the coordinate files."

[THUMBNAIL STRATEGIST ASSIGNED PLAN]
- Core Layout Strategy: Stylized gaming map HUD; right side shows direct pixel coordinates highlighted in neon cyan.
- Ideal Contrast Elements: Acid-yellow coordinate lines pop over a dark dark blue gaming background.
- Overlay Copy Text: "UNBEATABLE!"`;
    } else {
      generatedText = `[CORE CONCEPT & VIRAL ANGLE]
Our viral focus centres on disrupting traditional, slow assumptions in ${themeTitle}. The core psychological angle is immediate efficiency: showing the audience a high-speed, simplified framework that cuts out standard boilerplate and delivers successful outputs.

[THE HOOK SCRIPTS (3 VARIATIONS)]
Option 1: "Stop doing traditional implementation for ${themeTitle}. Why 99% of creators fail by overcomplicating their workflows, and the exact 12-hour automated cheat code." (94% Retention Potential)
Option 2: "The elite 0.1% are utilizing an underground productivity loophole for ${themeTitle} that saves them 20 hours a week with absolute freedom." (96% Curiosity Curve)
Option 3: "If you're still building ${themeTitle} the old way, you need to step away and look at this micro-solution map." (91% Engagement Rate)

[CHOSEN HOOK RETENTION FORMULA]
Our optimized hook presents a stark contrast: high effort/wasted time vs automated simplicity. This immediately disrupts the scroll feed, establishes cognitive tension, and maximizes early viewer retention.

[SCENE-BY-SCENE VISUAL BLUEPRINT]
- 0:00 - 0:03 [HOOK]: Rapid close-up transition of direct project files with clean bold fonts.
- 0:03 - 0:15 [PROBLEM]: Slide deck showcasing standard, slow failed attempts overlaying a frustration indicator.
- 0:15 - 0:45 [SOLUTION]: Interactive step-by-step display of the dynamic, streamlined template.
- 0:15 - 0:45 [SOLUTION]: Interactive step-by-step display of the dynamic, streamlined template.
- 0:45 - 1:00 [CTA]: Seamless custom screen requesting comments to access the raw repository folder instantly.

[THUMBNAIL STRATEGIST ASSIGNED PLAN]
- Core Layout Strategy: Flat 16:9 canvas split. Left features warning indicators; right highlights neon purple rewards.
- Ideal Contrast Elements: Extreme contrast magenta overlays paired with clean display typography.
- Overlay Copy Text: "DONE IN 12H"`;
    }

    // Infuse the selected hookTone preset into sandbox generation text for robust UI reflection
    let refinedText = generatedText;
    if (hookTone !== "Exciting") {
      refinedText = refinedText.replace("[CORE CONCEPT & VIRAL ANGLE]", `[CORE CONCEPT & VIRAL ANGLE] - CURRENT TONE PRESET: ${hookTone.toUpperCase()}`);
      refinedText = refinedText.replaceAll("Option 1: ", `Option 1 [${hookTone} style]: `);
      refinedText = refinedText.replaceAll("Option 2: ", `Option 2 [${hookTone} style]: `);
      refinedText = refinedText.replaceAll("Option 3: ", `Option 3 [${hookTone} style]: `);
    }

    const lines = refinedText.split("\n");
    let index = 0;
    
    typewriterIntervalRef.current = setInterval(() => {
      if (index < lines.length) {
        setResult(prev => prev + lines[index] + "\n");
        index++;
      } else {
        if (typewriterIntervalRef.current) {
          clearInterval(typewriterIntervalRef.current);
        }
        setIsLoading(false);
        saveToHistory(prompt, generatedText);
        parseScriptStructure(generatedText);
        showToast("AI script compiled successfully under Sandbox fallback! 📽️", "success");
      }
    }, 45);
  };

  const evaluateCustomTitle = () => {
    if (!customTitle) return;
    playAudioCue(523.25); // C5
    const len = customTitle.length;
    let score = 52;
    const clickTriggers = [
      "stop", "secret", "failed", "unbelievable", "how i", "99%", "0.1%", 
      "oblique", "cheat code", "free", "viral", "$", "mrr", "hacks", "exposed"
    ];
    const matches = clickTriggers.filter(w => customTitle.toLowerCase().includes(w));
    
    if (len >= 30 && len <= 58) score += 20;
    else if (len < 18) score -= 14;
    else score += 6;

    score += matches.length * 14;
    if (/[!?]/.test(customTitle)) score += 10;

    const finalScore = Math.min(99, Math.max(12, score));
    let grade = "C-";
    if (finalScore >= 92) grade = "A+";
    else if (finalScore >= 84) grade = "A";
    else if (finalScore >= 75) grade = "B+";
    else if (finalScore >= 66) grade = "B";
    else if (finalScore >= 55) grade = "C+";

    const suggestions: string[] = [];
    if (len < 30) suggestions.push("Extend the title slightly to 35-50 characters to increase curiosity factors.");
    if (len > 60) suggestions.push("Crop to under 58 characters to avoid ellipse clipping inside organic visual feeds.");
    if (matches.length === 0) suggestions.push("Inject a high-CTR emotional click trigger (e.g. 'Stop', 'Failed', 'Secret', '$').");
    if (!/[!?]/.test(customTitle)) suggestions.push("Deploy a curiosity-triggering double punctuation mark (e.g. '?!' or '!') to draw viewers.");

    setTitleAnalysis({ score: finalScore, grade, matches, suggestions });

    const formattedTitle = customTitle.trim();
    const mockDesc = `🚀 UNCOVERED: Special breakdown of "${formattedTitle.replace(/[!?]/g, "")}". 

In this video, we expose how traditional strategies lead to sub-optimal outcomes, and detail the exact execution blueprint used by high-performance studios to optimize engagement profiles. 

🎯 KEY TIMECODES:
0:00 - The Psychological Hook Pattern
0:15 - Breakdown of the Core System Framework
0:45 - High-Retention Demonstration
1:10 - Immediate Automation Execution Steps 

Comment 'BLUEPRINT' down below, and we'll send the entire raw source file straight to your inbox! #creatorsecrets #growthhacks #optimization`;

    setSeoDescription(mockDesc);

    const tags = ["#creators", "#saas", "#automation", "#viral"];
    if (formattedTitle.toLowerCase().includes("node") || formattedTitle.toLowerCase().includes("script")) {
      tags.push("#nodejs", "#javascript");
    }
    if (formattedTitle.toLowerCase().includes("developer") || formattedTitle.toLowerCase().includes("programmer")) {
      tags.push("#development", "#programming");
    }
    if (formattedTitle.toLowerCase().includes("money") || formattedTitle.toLowerCase().includes("$") || formattedTitle.toLowerCase().includes("mrr")) {
      tags.push("#solopreneur", "#income");
    }
    setSeoHashtags(tags);
    setSeoKeywords(["click-rate scaling", "retention strategies", "high performance algorithm", "CTR optimizer", "developer productivity hack"]);
  };

  const handleSave = async () => {
    if (!result) {
      showToast("No generated script to save! Please generate one first.", "warning");
      return;
    }

    try {
      if (user) {
        // Direct Firestore write to user subcollection matching firestore.rules
        const ideaId = Date.now().toString();
        const ideaRef = doc(db, "users", user.uid, "saved_ideas", ideaId);
        console.log("Attempting to write to path:", ideaRef.path);
        console.log("Saving data object:", {
          title: prompt,
          content: result,
          id: ideaId,
          userId: user.uid,
          category: selectedCategory || "All",
          niche: targetNiche || "General",
          brandVoice: brandVoice || "Contrarian",
          date: new Date().toLocaleTimeString(),
          createdAt: new Date().toISOString()
        });
        await setDoc(ideaRef, {
          id: ideaId,
          userId: user.uid,
          title: prompt || "Custom Script Concept",
          content: result,
          category: selectedCategory || "All",
          niche: targetNiche || "General",
          brandVoice: brandVoice || "Contrarian",
          date: new Date().toLocaleTimeString(),
          createdAt: new Date().toISOString() // Rules expect a string!
        });
        console.log("Write operation successful.");
        setIsSaved(true);
        playAudioCue(880);
        showToast("Idea secured to your cloud vault! 🌌", "success");
        
        // Log the activity
        try {
          await logUserActivity('save_idea', prompt || 'Script Idea', 'Saved generated script draft to favorites.');
        } catch (actErr) {
          console.warn("Could not log activity:", actErr);
        }
      } else {
        // Fallback to local sandbox save via saveIdeaDB to avoid silent failure!
        await saveIdeaDB({ title: prompt || "Custom Script Concept", content: result });
        setIsSaved(true);
        playAudioCue(880);
        showToast("Idea secured to local sandbox vault! ⚡", "success");
      }
    } catch (err: any) {
      console.error("Save failed:", err);
      showToast(err?.message || "Failed to save to cloud.", "error");
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setIsCopied(true);
      playAudioCue(987.77); // B5
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const updateSegment = (field: keyof TimelineSegment, value: any) => {
    setTimelineSegments(prev => prev.map(seg => {
      if (seg.id === activeSegmentId) {
        return { ...seg, [field]: value };
      }
      return seg;
    }));
  };

  const activeSegment = timelineSegments.find(s => s.id === activeSegmentId) || timelineSegments[0];

  // Dynamic Word Pacing Alert Calculator
  const wordCount = activeSegment ? activeSegment.voiceover.split(/\s+/).filter(Boolean).length : 0;
  const estimatedDuration = activeSegment ? activeSegment.durationSec : 5;
  const wordsPerMinute = estimatedDuration > 0 ? (wordCount / estimatedDuration) * 60 : 0;

  // Speeches and timings for live prompter and coach
  const fullScriptSpeech = timelineSegments.map(s => s.voiceover).filter(Boolean).join("\n\n");
  const practiceSpeechText = teleprompterMode === "segment" ? activeSegment?.voiceover : (fullScriptSpeech || result);
  const totalTargetDuration = teleprompterMode === "segment" 
    ? (activeSegment?.durationSec || 5) 
    : timelineSegments.reduce((acc, curr) => acc + (curr.durationSec || 0), 0);

  // Automated vertical autoscroll animation driven by isScrolling and prompterSettings.scrollSpeedWpm
  useEffect(() => {
    if (!isScrolling) return;

    let lastTime = performance.now();
    let scrollAccumulator1 = teleprompterScrollRef.current ? teleprompterScrollRef.current.scrollTop : 0;
    let scrollAccumulator2 = dedicatedPrompterScrollRef.current ? dedicatedPrompterScrollRef.current.scrollTop : 0;
    let animationId: number;

    const scrollLoop = (now: number) => {
      const delta = (now - lastTime) / 1000; // time in seconds
      lastTime = now;

      // 1. First scroll container (tab view)
      const scrollContainer1 = teleprompterScrollRef.current;
      if (scrollContainer1) {
        const text = activePrompterText || practiceSpeechText || "";
        const wordCount = text.split(/\s+/).filter(Boolean).length || 1;
        const durationSeconds = (wordCount / prompterSettings.scrollSpeedWpm) * 60;
        const scrollHeight = scrollContainer1.scrollHeight;
        const clientHeight = scrollContainer1.clientHeight;
        const scrollableDistance = scrollHeight - clientHeight;
        
        let speedPxPerSec = 40;
        if (scrollableDistance > 0 && durationSeconds > 0) {
          speedPxPerSec = scrollableDistance / durationSeconds;
        } else {
          speedPxPerSec = (prompterSettings.scrollSpeedWpm / 140) * 45;
        }

        scrollAccumulator1 += speedPxPerSec * delta;
        scrollContainer1.scrollTop = Math.floor(scrollAccumulator1);

        if (scrollContainer1.scrollTop >= scrollableDistance) {
          setIsScrolling(false);
          return;
        }
      }

      // 2. Second scroll container (dedicated section at bottom)
      const scrollContainer2 = dedicatedPrompterScrollRef.current;
      if (scrollContainer2) {
        const text = activePrompterText || practiceSpeechText || "";
        const wordCount = text.split(/\s+/).filter(Boolean).length || 1;
        const durationSeconds = (wordCount / prompterSettings.scrollSpeedWpm) * 60;
        const scrollHeight = scrollContainer2.scrollHeight;
        const clientHeight = scrollContainer2.clientHeight;
        const scrollableDistance = scrollHeight - clientHeight;
        
        let speedPxPerSec = 40;
        if (scrollableDistance > 0 && durationSeconds > 0) {
          speedPxPerSec = scrollableDistance / durationSeconds;
        } else {
          speedPxPerSec = (prompterSettings.scrollSpeedWpm / 140) * 45;
        }

        scrollAccumulator2 += speedPxPerSec * delta;
        scrollContainer2.scrollTop = Math.floor(scrollAccumulator2);

        if (scrollContainer2.scrollTop >= scrollableDistance) {
          setIsScrolling(false);
          return;
        }
      }

      animationId = requestAnimationFrame(scrollLoop);
    };

    animationId = requestAnimationFrame(scrollLoop);
    return () => cancelAnimationFrame(animationId);
  }, [isScrolling, prompterSettings.scrollSpeedWpm, activePrompterText, prompterFontSize, teleprompterFontSize, practiceSpeechText]);

  return (
    <div id="ai-generator-workspace-main" className="space-y-8 animate-in fade-in duration-500 relative z-10 select-text w-full max-w-7xl mx-auto">
      
      {/* View Header with mini details */}
      <div id="ai-gen-branding-header" className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 select-none">
        <div>
          <h1 id="ai-generator-suite-title" className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="text-primary animate-pulse" size={28} /> AI Video Architect
          </h1>
          <p className="text-on-surface-variant text-xs mt-1 font-light flex items-center gap-1">
            <Clock size={12} /> Live Multi-Engine Processing Center
          </p>
        </div>

        {/* Engine switcher bar */}
        <div id="ai-gen-engine-tabs-deck" className="bg-white/5 p-1 rounded-xl border border-white/10 flex items-center gap-1.5 text-xs font-bold font-mono">
          {(["gemini", "ollama", "sandbox"] as const).map((engName) => (
            <button
              key={engName}
              id={`engine-btn-${engName}`}
              onClick={() => {
                setEngine(engName);
                playAudioCue(440); // A4
              }}
              className={`px-3 py-1.5 rounded-lg uppercase text-[10px] tracking-wider cursor-pointer font-bold transition-all ${
                engine === engName 
                  ? "bg-primary-gradient text-white shadow-md shadow-primary/20" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {engName}
            </button>
          ))}
        </div>
      </div>

      <div id="ai-generator-top-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-8 select-text">
        
        {/* Left column: Setup controls & prompting workspace */}
        <div className="lg:col-span-5 space-y-6 select-none">
          
          {/* Presets & Speed Blueprints Card */}
          <GlassCard id="ai-generator-presets-card" className="border-white/5 space-y-4">
            <div className="flex flex-col gap-2 pb-2 border-b border-white/5">
              <div className="flex justify-between items-center">
                <span className="text-xs uppercase font-extrabold tracking-widest text-[#9d50bb] flex items-center gap-1"><Flame size={14} /> Creative Presets</span>
                <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider font-mono">Click to Apply</span>
              </div>
              {/* Category Filter Pills */}
              <div className="flex gap-1 overflow-x-auto scrollbar-none py-1">
                {["All", "Tech", "Finance", "Travel", "Food", "Fitness", "Gaming"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      playAudioCue(500);
                    }}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                      selectedCategory === cat
                        ? "bg-[#9d50bb]/20 text-[#a855f7] border border-[#a855f7]/40"
                        : "text-gray-400 hover:text-white bg-white/2 hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2.5 max-h-[280px] overflow-y-auto pr-1">
              {VIDEO_TEMPLATES
                .filter(t => selectedCategory === "All" || t.category === selectedCategory)
                .map((tpl, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleTemplateClick(tpl)}
                    className="p-3 text-left bg-black/40 hover:bg-[#9d50bb]/10 rounded-xl border border-white/5 hover:border-[#6e48aa] cursor-pointer transition-all duration-300 group relative overflow-hidden"
                    title="Click to apply this pre-made template structure to your prompt input"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-xs text-white group-hover:text-primary transition-colors">{tpl.name}</span>
                      <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-[#9d50bb] font-semibold">{tpl.voice}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 line-clamp-1 italic font-light">"{tpl.prompt}"</p>
                  </button>
                ))}
            </div>
          </GlassCard>

          {/* Quick-Inject high CTR trigger word shelf */}
          <GlassCard id="ai-generator-triggers-card" className="border-white/5 space-y-3">
            <div className="flex justify-between items-center pb-1">
              <span className="text-xs uppercase font-extrabold tracking-widest text-[#9d50bb] flex items-center gap-1"><Sliders size={14} /> CTR Trigger Words</span>
              <span className="text-[9px] text-gray-500 font-mono">Insert at cursor click</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {HOOK_TRIGGERS.map((hookStr, idx) => (
                <button
                  key={idx}
                  onClick={() => handleInjectHook(hookStr)}
                  className="px-2 py-1.5 bg-white/3 hover:bg-primary/20 hover:border-primary/40 border border-white/5 text-[10px] font-mono text-gray-300 rounded-lg cursor-pointer transition-colors"
                  title={`Inject "${hookStr}" to prompt input`}
                >
                  {hookStr}
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Prompt parameter fine tuners */}
          <GlassCard id="ai-generator-parameters-card" className="border-white/5 space-y-4">
            <div className="pb-2 border-b border-white/5 flex justify-between items-center">
              <span className="text-xs uppercase font-extrabold tracking-widest text-[#9d50bb] flex items-center gap-1.5"><Sliders size={14} /> Strategic Controls</span>
            </div>
            
            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase font-bold">Brand Voice Identity</label>
                <select
                  value={brandVoice}
                  onChange={(e) => setBrandVoice(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-white text-xs cursor-pointer focus:outline-none focus:border-primary"
                >
                  <option value="Contrarian">Contrarian (Sensational, challenges status-quo)</option>
                  <option value="Educator">Educator (Data-focused, clear tutorial points)</option>
                  <option value="Storyteller">Storyteller (Frictional hook, personal narrative)</option>
                </select>
              </div>

              {/* Hook Tone Presets (chips and dropdown fallback synced) */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1">
                    <span>🎯 Hook Tone Preset</span>
                  </label>
                  <span className="text-[9px] font-mono uppercase bg-purple-500/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/20">
                    {hookTone}
                  </span>
                </div>

                {/* Dropdown Selector */}
                <select
                  value={hookTone}
                  onChange={(e) => {
                    const val = e.target.value as "Exciting" | "Professional" | "Suspenseful" | "Minimalist";
                    setHookTone(val);
                    playAudioCue(523.25);
                    showToast(`Hook Tone Preset configured: ${val}`, "info");
                  }}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-white text-xs cursor-pointer focus:outline-none focus:border-primary"
                >
                  <option value="Exciting">Exciting Preset (⚡ Energy and pace)</option>
                  <option value="Professional">Professional Preset (👔 Absolute authority stance)</option>
                  <option value="Suspenseful">Suspenseful Preset (🤫 Mystical friction loop)</option>
                  <option value="Minimalist">Minimalist Preset (🌿 Clean, direct, high density)</option>
                </select>

                {/* Selectable Chips Row */}
                <div id="hook-tone-preset-chips" className="grid grid-cols-2 gap-1.5 pt-1 select-none">
                  {([
                    { name: "Exciting", icon: "⚡" },
                    { name: "Professional", icon: "👔" },
                    { name: "Suspenseful", icon: "🤫" },
                    { name: "Minimalist", icon: "🌿" }
                  ] as const).map(({ name, icon }) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setHookTone(name);
                        playAudioCue(587.33);
                        showToast(`Hook Preset Toggled: ${name}`, "info");
                      }}
                      className={`px-2.5 py-2 rounded-xl text-[10.5px] font-extrabold font-mono uppercase tracking-wider border cursor-pointer transition-all duration-200 flex items-center justify-center gap-1 ${
                        hookTone === name
                          ? 'bg-purple-600/20 border-purple-500/60 text-purple-200 shadow-md shadow-purple-500/10'
                          : 'bg-black/30 border-white/5 text-gray-400 hover:text-white hover:border-white/15'
                      }`}
                    >
                      <span>{icon}</span>
                      <span>{name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase font-bold">Target Channel Niche</label>
                <input 
                  type="text" 
                  value={targetNiche} 
                  onChange={(e) => setTargetNiche(e.target.value)}
                  placeholder="e.g. passive passive pipeline" 
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div id="ai-generator-parameters-extra-row" className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold">Video Duration</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-white text-[11px] cursor-pointer focus:outline-none focus:border-primary"
                  >
                    <option value="60s Short-form">60s Shorts/Reels</option>
                    <option value="180s Mid-form">3m Explainer</option>
                    <option value="10m Corporate">10m Documentary</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold">Aesthetic Style</label>
                  <select
                    value={visualStyle}
                    onChange={(e) => setVisualStyle(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-white text-[11px] cursor-pointer focus:outline-none focus:border-primary"
                  >
                    <option value="Cyber-glow console zoom-ins">Cyber Console</option>
                    <option value="Cinematic side-angle panning">Cinematic Pan</option>
                    <option value="Structured split screens">Split Screens</option>
                  </select>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Custom Creator Guidelines Card */}
          <GlassCard id="ai-generator-custom-instructions-card" className="border-white/5 space-y-4">
            <div className="pb-2 border-b border-white/5 flex justify-between items-center">
              <span className="text-xs uppercase font-extrabold tracking-widest text-[#9d50bb] flex items-center gap-1.5">
                <Sliders size={14} /> Custom Guidelines
              </span>
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Augmentation Directives</span>
            </div>
            
            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase font-bold">Creator Rules & Brand Constraints</label>
                <textarea
                  id="ai-generator-custom-instructions-textarea"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g., 'Do not use emojis. Focus on technical command-line visual transitions. Maintain a direct, tutorial tone at all times.'"
                  className="w-full bg-black/60 border border-white/10 hover:border-white/20 focus:border-primary rounded-xl p-3 text-white text-xs min-h-[95px] resize-none focus:outline-none transition-all leading-relaxed"
                />
                <span className="text-[9px] text-gray-500 font-mono leading-tight block">These rules are injected system-wide directly into the AI prompt engineering pipeline.</span>
              </div>
              
              <button
                type="button"
                id="ai-generator-save-guidelines-btn"
                onClick={handleSaveCustomInstructions}
                className="w-full py-2.5 bg-white/5 hover:bg-purple-600/20 border border-white/10 hover:border-purple-500/40 text-xs font-bold text-white rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer hover:shadow-[0_0_15px_rgba(157,80,187,0.15)]"
              >
                <span>💾 Save Guidelines</span>
              </button>
            </div>
          </GlassCard>

        </div>

        {/* Right column: Interactive drafting box */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <GlassCard id="ai-generator-textbox-wrapper" className="border-white/10 !p-5 relative overflow-visible flex-1 flex flex-col justify-between">
            <div className="space-y-3 flex-1 flex flex-col">
              <span className="text-xs uppercase font-extrabold tracking-widest text-[#9d50bb] flex items-center gap-1.5"><Lightbulb size={14} /> Topic Prompt Entry</span>
              <textarea
                id="ai-prompt-textbox"
                className="w-full bg-black/35 border border-white/5 hover:border-white/15 focus:border-primary rounded-xl p-4 text-white text-sm leading-relaxed focus:outline-none flex-1 min-h-[140px] resize-none"
                placeholder="List a core topic or custom creator prompt (e.g. '3 steps to automate cloud asset hosting pipelines with Node'). This triggers stateful blueprint structures..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <div id="ai-prompt-char-opt-badge" className="flex justify-between items-center text-[10px] font-mono px-1 select-none text-gray-500 pt-0.5">
                <div className="flex items-center gap-1">
                  <span>Len:</span>
                  <span className="text-purple-300 font-extrabold">{prompt.length}</span>
                  <span className="text-gray-700">|</span>
                  <span className="text-[9px] text-gray-400">Target Hooks Optimal: 40-120 chars</span>
                </div>
                <div className="flex gap-1.5 items-center">
                  <span className="text-gray-600">Platform Fit:</span>
                  {prompt.length === 0 ? (
                    <span className="text-gray-500 bg-white/5 px-1.5 py-0.5 rounded text-[9px]">Empty</span>
                  ) : prompt.length <= 100 ? (
                    <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold">🎯 Shorts/TikTok</span>
                  ) : prompt.length <= 280 ? (
                    <span className="text-sky-400 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold">🐦 X/Twitter</span>
                  ) : (
                    <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold">📖 Long-form Concept</span>
                  )}
                </div>
              </div>
            </div>

            {/* REAL-TIME DRAFT SEED/HOOK VIRAL SCORE ESTIMATOR */}
            <div id="draft-viral-score-panel" className="mt-4 p-4 rounded-xl border border-white/5 bg-[#0e0c15]/60 hover:border-purple-500/10 transition-all duration-300">
              <div className="flex justify-between items-center pb-2.5 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Gauge size={14} className="text-purple-400 animate-pulse" />
                  <span className="text-[11px] uppercase font-bold tracking-widest text-gray-300">Draft Hook Viral score</span>
                </div>
                <div className="flex items-center gap-1.5 select-none">
                  <span className="text-[10px] text-gray-500 font-mono italic">Chars: {prompt.length}</span>
                  <span className="text-gray-700 font-mono text-[9px] select-none">|</span>
                  <span className={`text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded font-mono ${viralScoreDetails.color}`}>
                    {viralScoreDetails.grade} ({viralScoreDetails.title})
                  </span>
                </div>
              </div>

              {/* Progress and core numbers */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 pt-3 items-center">
                {/* Horizontal progress bar */}
                <div className="md:col-span-8 space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-gray-400 italic font-normal text-[10px] truncate max-w-[210px] block">{viralScoreDetails.lengthFeedback}</span>
                    <span className="text-white font-mono">{viralScoreDetails.score}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${viralScoreDetails.meterColor}`}
                      style={{ width: `${viralScoreDetails.score}%` }}
                    />
                  </div>
                </div>

                <div className="md:col-span-4 flex items-center justify-end">
                  <span className="text-[10px] text-gray-400 leading-relaxed font-mono select-none">
                    Viral Index Factor
                  </span>
                </div>
              </div>

              {/* Diagnostic badges and recommendations */}
              {prompt.trim().length > 0 && (
                <div className="pt-2.5 space-y-2 select-text">
                  {/* Recognized Keywords block */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="text-gray-500 font-bold uppercase tracking-wider font-mono">Recognized click anchors:</span>
                    {viralScoreDetails.detectedWords.length > 0 ? (
                      viralScoreDetails.detectedWords.map((word, wIdx) => (
                        <span 
                          key={wIdx} 
                          className="px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded font-mono"
                        >
                          {word}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-600 font-mono italic">None detected</span>
                    )}
                  </div>

                  {/* Recommendations */}
                  {viralScoreDetails.tips.length > 0 && (
                    <div className="p-2.5 bg-black/30 border border-white/5 rounded-lg space-y-1 mt-1">
                      <span className="text-[9.5px] uppercase text-[#9e7bf3]/90 font-black tracking-widest block font-mono">Enhance Draft clickability:</span>
                      <ul className="space-y-1 text-[10.5px] text-gray-300 font-light list-none">
                        {viralScoreDetails.tips.map((tip, tIdx) => (
                          <li key={tIdx} className="flex items-start gap-1.5">
                            <span className="text-purple-400 select-none mt-0.5">&bull;</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI Preset Mixer & Prompt Booster UI */}
            <div id="prompt-mixer-panel" className="mt-4 p-4 bg-purple-950/20 border border-purple-500/20 rounded-xl space-y-3 animate-in fade-in duration-300">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-purple-400 animate-pulse" />
                  <span className="text-xs uppercase font-black tracking-wider text-purple-300">AI Prompt Preset Mixer</span>
                </div>
                <span className="text-[10px] text-purple-400/80 font-mono">Enhance Hook Efficiency</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                <div className="sm:col-span-8">
                  <select
                    id="mix-preset-select"
                    value={selectedMixPresetIndex}
                    onChange={(e) => {
                      setSelectedMixPresetIndex(Number(e.target.value));
                      playAudioCue(440, "sine");
                    }}
                    className="w-full bg-black/60 border border-purple-500/20 rounded-lg p-2 text-white text-xs cursor-pointer focus:outline-none focus:border-purple-400"
                  >
                    {MIX_PRESETS.map((item, idx) => (
                      <option key={idx} value={idx}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="sm:col-span-4">
                  <button
                    id="mix-prompt-boost-btn"
                    onClick={handleMixPrompt}
                    disabled={isMixing || !prompt}
                    className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900/50 disabled:text-gray-400 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isMixing ? (
                      <>
                        <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                        <span>Boosting...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={12} />
                        <span>Mix & Boost</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Show preset details and logs */}
              {isMixing ? (
                <div className="text-[11px] text-purple-400 font-mono animate-pulse flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                  <span>{mixLog || "Blending styles with AI..."}</span>
                </div>
              ) : (
                <div className="flex justify-between items-start gap-2">
                  <p className="text-[10.5px] text-gray-400 italic leading-relaxed">
                    "{MIX_PRESETS[selectedMixPresetIndex].desc}"
                  </p>
                  {prevRawPrompt && (
                    <button
                      id="undo-mix-btn"
                      onClick={() => {
                        setPrompt(prevRawPrompt);
                        setPrevRawPrompt("");
                        showToast("Restored your original raw prompt.");
                        playAudioCue(330, "sine");
                      }}
                      className="shrink-0 text-[10px] text-purple-400 hover:text-purple-300 font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <RotateCcw size={10} /> Undo
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {result ? (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  id="ai-generate-submit-btn"
                  onClick={generateMagic}
                  disabled={isLoading || !prompt}
                  className="w-full py-4 bg-primary-gradient text-white rounded-xl font-bold tracking-widest text-xs uppercase cursor-pointer hover:opacity-95 transition-all flex items-center justify-center gap-2 relative group"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>CONSTRUCTING...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} className="animate-pulse" />
                      <span>GENERATE NEW SCRIPT</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  id="ai-generate-regenerate-btn"
                  onClick={generateMagic}
                  disabled={isLoading || !prompt}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/40 text-white rounded-xl font-bold tracking-wider text-xs uppercase cursor-pointer transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(157,80,187,0.15)]"
                >
                  <RefreshCw size={14} className={isLoading ? "animate-spin" : "hover:rotate-180 transition-transform duration-500"} />
                  <span>REGENERATE SCRIPT</span>
                </button>
              </div>
            ) : (
              <button
                id="ai-generate-submit-btn"
                onClick={generateMagic}
                disabled={isLoading || !prompt}
                className="mt-4 w-full py-4 bg-primary-gradient text-white rounded-xl font-bold tracking-widest text-xs uppercase cursor-pointer hover:opacity-95 transition-opacity flex items-center justify-center gap-2 relative group"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>CONSTRUCTING STRATEGIC CONTENT BLUEPRINT...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className="animate-pulse" />
                    <span>GENERATE VIRAL SCRIPT BLUEPRINT</span>
                  </>
                )}
              </button>
            )}

            {/* Seamless Visual Scroll Indicator Hint to eliminate user friction */}
            <div className="mt-3 text-center flex flex-col items-center justify-center gap-1.5 select-none animate-pulse">
              <div className="flex items-center gap-1.5 text-[11px] text-purple-400 font-bold tracking-wider uppercase">
                <ArrowDown size={12} className="animate-bounce" />
                <span>Scroll down to examine your generated script</span>
              </div>
              <p className="text-[10px] text-gray-500 font-mono italic">
                Active scene components, timeline tools, title analyzer, & thumbnail configurations render below.
              </p>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Structured Result workspace */}
      {(result || isLoading) && (
        <div id="ai-generator-workspace-tabs-group" className="space-y-6 select-text animate-in slide-in-from-bottom-6 duration-700">
          
          {/* Horizontal workspace tabs selectors */}
          <div id="ai-workspace-tabs-row" className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-3 select-none">
            {[
              { id: "blueprint" as const, label: "📝 Script Blueprint", color: "text-primary hover:bg-primary/5" },
              { id: "timeline" as const, label: "⏱️ Interactive Scene Timeline", color: "text-blue-400 hover:bg-blue-400/5" },
              { id: "ctr" as const, label: "🎯 Click-Rate title analyzer", color: "text-emerald-400 hover:bg-emerald-400/5" },
              { id: "thumbnail" as const, label: "🖼️ Thumbnail Composer", color: "text-amber-400 hover:bg-amber-400/5" },
              { id: "coach" as const, label: "🎙️ Teleprompter & Speech Coach", color: "text-purple-400 hover:bg-purple-400/5" }
            ].map(tabItem => (
              <button
                key={tabItem.id}
                onClick={() => {
                  setActiveTab(tabItem.id);
                  playAudioCue(698.46); // F5
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer ${
                  activeTab === tabItem.id
                    ? "bg-white/5 border-primary text-white shadow-lg"
                    : "border-transparent text-gray-400 hover:text-white"
                }`}
              >
                {tabItem.label}
              </button>
            ))}
          </div>

          {/* Active Workspaces cards */}
          <div id="ai-active-workspace-card-wrapper">
            
            {/* WORKSPACE 1: Standard AI script printout output */}
            {activeTab === "blueprint" && (
              <>
                <GlassCard id="workspace-blueprint-card" className="border-white/5 space-y-6 animate-in fade-in duration-300">
                <div id="ai-blueprint-card-header" className="flex justify-between items-center border-b border-white/5 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs uppercase font-extrabold tracking-widest text-primary">Viral Blueprint Manifest</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      id="blueprint-card-regenerate-btn"
                      onClick={generateMagic}
                      disabled={isLoading || !prompt}
                      className="px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/30 text-gray-300 hover:text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all duration-300"
                    >
                      <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
                      {isLoading ? "Generating..." : "Regenerate"}
                    </button>
                    <button
                      onClick={handleCopy}
                      className="px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                    >
                      {isCopied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                      {isCopied ? "Copied!" : "Copy"}
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaved}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition-all relative z-10 ${
                        isSaved ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20'
                      }`}
                    >
                      {isSaved ? "Saved" : "Favorite Idea"}
                    </button>
                  </div>
                </div>

                {/* Dynamic Trend Match Score Indicator Dashboard */}
                {result && (
                  <div id="blueprint-trend-score-panel" className="p-5 rounded-2xl border border-white/5 bg-[#0a0812]/90 space-y-4 hover:border-purple-500/20 transition-all duration-300">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 pb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="flex h-2 w-2 rounded-full bg-purple-500 animate-ping" />
                          <h4 className="text-xs uppercase font-extrabold tracking-widest text-[#9d50bb] flex items-center gap-1.5 font-mono">
                            🎯 Platform Heuristics: Trend Match Score
                          </h4>
                        </div>
                        <p className="text-[10px] text-gray-400">
                          Algorithmic review of compiled script's hook pattern keyword density against known viral formulas.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 justify-start md:justify-end select-none">
                        <span className="text-[10px] text-gray-500 font-mono">Words: {trendScoreDetails.totalWords}</span>
                        <span className="text-gray-700 font-mono text-[9px]">|</span>
                        <span className="text-[10px] text-gray-500 font-mono">Density Ratio: {trendScoreDetails.density}%</span>
                        <span className="text-gray-700 font-mono text-[9px]">|</span>
                        <span className={`text-[11px] font-black font-mono uppercase px-2 py-0.5 rounded border ${trendScoreDetails.color} ${trendScoreDetails.bgColor} ${trendScoreDetails.borderColor}`}>
                          {trendScoreDetails.title}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      <div className="md:col-span-8 space-y-2">
                        <div className="flex justify-between text-xs font-mono font-bold">
                          <span className="text-gray-300">Heuristic Signal Match Progress</span>
                          <span className={`${trendScoreDetails.color}`}>{trendScoreDetails.score} / 100 max</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r from-purple-500 to-indigo-500`}
                            style={{ width: `${trendScoreDetails.score}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed font-light">
                          {trendScoreDetails.description}
                        </p>
                      </div>

                      <div className="md:col-span-4 p-3 bg-black/40 border border-white/5 rounded-xl flex flex-col justify-center items-center text-center">
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Density Index</span>
                        <span className={`text-2xl font-black font-mono tracking-tight ${trendScoreDetails.color}`}>
                          {trendScoreDetails.density}%
                        </span>
                        <span className="text-[9px] text-gray-400 font-mono mt-1">
                          {trendScoreDetails.matchedCount} pattern terms matched
                        </span>
                      </div>
                    </div>

                    {/* Show tags of found matches in generated text */}
                    {trendScoreDetails.patternMatches.length > 0 && (
                      <div className="space-y-1.5 pt-2.5 border-t border-white/5">
                        <span className="text-[9px] uppercase font-bold text-gray-500 tracking-widest block font-mono">Identified Virality Anchors inside Script:</span>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {trendScoreDetails.patternMatches.map((pm, pmIdx) => (
                            <span 
                              key={pmIdx} 
                              className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-200 flex items-center gap-1.5 font-mono"
                              title={`Category: ${pm.category}`}
                            >
                              <span className="text-purple-300 font-extrabold">{pm.keyword}</span>
                              <span className="text-[9px] text-gray-500">({pm.count}x)</span>
                              <span className="text-[8px] uppercase bg-purple-500/10 text-purple-300 px-1 rounded-sm">{pm.category}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 🧠 Multi-Angle Psychological Hook Matrix */}
                {result && (
                  <div id="ai-psychological-hook-matrix" className="space-y-4 p-5 rounded-2xl border border-white/5 bg-[#0a0812]/90 hover:border-purple-500/20 transition-all duration-300">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                      <span className="flex h-2.5 w-2.5 rounded-full bg-violet-400 animate-pulse" />
                      <h4 className="text-xs uppercase font-extrabold tracking-widest text-[#a855f7] flex items-center gap-1.5 font-mono">
                        🧠 Multi-Angle Psychological Hook Matrix
                      </h4>
                    </div>
                    
                    <p className="text-xs text-gray-400 leading-relaxed font-light">
                      We have concurrently synthesized 3 distinct structural angles for this concept. Choose any angle below to test, edit, and send directly to the Calibration Lab metrics engine:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      {/* Angle A Column */}
                      <div className="flex flex-col justify-between p-4 bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/10 rounded-xl transition-all duration-300">
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Angle A
                            </span>
                            <span className="text-[8px] font-mono text-gray-500 uppercase">
                              Curiosity Loop
                            </span>
                          </div>
                          <h5 className="text-xs font-bold text-gray-200">Cognitive Gaps & Anomalies</h5>
                          <p className="text-[11px] text-gray-400 italic bg-black/40 p-3 rounded-lg border border-white/5 line-clamp-4 min-h-[92px]">
                            "{angleAHook}"
                          </p>
                        </div>
                        
                        <div className="space-y-3 mt-4">
                          <button
                            onClick={() => {
                              sendToCalibrationLab(angleAHook, () => {
                                window.dispatchEvent(new CustomEvent("change-active-view", { detail: { view: "script-fetcher" } }));
                              });
                            }}
                            className="w-full py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-white border border-purple-500/30 rounded-lg text-[10px] font-extrabold uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Zap size={11} /> Send to Calibration Lab
                          </button>

                          <button
                            onClick={() => addToComparison("A", "Angle A (Curiosity Loop)", angleAHook)}
                            className="w-full py-2 bg-[#6366f1]/10 hover:bg-[#6366f1]/20 text-[#a5b4fc] hover:text-white border border-[#6366f1]/20 rounded-lg text-[10px] font-extrabold uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Scale size={11} /> Add to Comparison
                          </button>

                          {/* 🚀 DISPATCH CENTER */}
                          <div className="bg-black/40 border border-white/5 rounded-xl p-3 space-y-2.5">
                            <div className="flex items-center justify-between select-none">
                              <span className="text-[9px] uppercase font-bold tracking-widest text-[#9e7bf3] font-mono">
                                🚀 Dispatch Center
                              </span>
                            </div>
                            
                            <div className="space-y-2">
                              {/* Status select dropdown */}
                              <div className="flex items-center justify-between gap-2 bg-[#120f24]/80 border border-white/10 rounded-lg px-2 py-1.5">
                                <span className="text-[9.5px] text-gray-400 uppercase font-bold font-mono">Status</span>
                                <select
                                  value={angleStatuses.A}
                                  onChange={(e) => setAngleStatuses(prev => ({ ...prev, A: e.target.value as any }))}
                                  className="bg-transparent text-white text-[10px] font-bold border-none outline-none cursor-pointer focus:ring-0 text-right pr-1"
                                >
                                  <option value="Draft" className="bg-[#120f24] text-white">Draft</option>
                                  <option value="Ready to Shoot" className="bg-[#120f24] text-white">Ready to Shoot</option>
                                  <option value="Produced" className="bg-[#120f24] text-white">Produced</option>
                                </select>
                              </div>

                              {/* Save & Export buttons */}
                              <div className="grid grid-cols-3 gap-1.5">
                                <button
                                  onClick={() => onDispatchScript("A", "Angle A (Curiosity Loop)", angleAHook)}
                                  className="py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 hover:text-white border border-purple-500/20 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer hover:shadow-[0_0_8px_rgba(157,80,187,0.1)] text-center"
                                >
                                  <Folder size={11} /> Save
                                </button>
                                <button
                                  onClick={() => downloadAngleText("Angle A (Curiosity Loop)", angleAHook)}
                                  className="py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer text-center"
                                >
                                  <Download size={11} /> Export
                                </button>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(angleAHook);
                                    showToast("Copied Angle A script to clipboard! 📋", "success");
                                    playAudio(880);
                                  }}
                                  className="py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer text-center"
                                >
                                  <Copy size={11} /> Copy
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Angle B Column */}
                      <div className="flex flex-col justify-between p-4 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 rounded-xl transition-all duration-300">
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Angle B
                            </span>
                            <span className="text-[8px] font-mono text-gray-500 uppercase">
                              Negative Paradox
                            </span>
                          </div>
                          <h5 className="text-xs font-bold text-gray-200">Systemic Subversion</h5>
                          <p className="text-[11px] text-gray-400 italic bg-black/40 p-3 rounded-lg border border-white/5 line-clamp-4 min-h-[92px]">
                            "{angleBHook}"
                          </p>
                        </div>
                        
                        <div className="space-y-3 mt-4">
                          <button
                            onClick={() => {
                              sendToCalibrationLab(angleBHook, () => {
                                window.dispatchEvent(new CustomEvent("change-active-view", { detail: { view: "script-fetcher" } }));
                              });
                            }}
                            className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-white border border-amber-500/30 rounded-lg text-[10px] font-extrabold uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Zap size={11} /> Send to Calibration Lab
                          </button>

                          <button
                            onClick={() => addToComparison("B", "Angle B (Negative Paradox)", angleBHook)}
                            className="w-full py-2 bg-[#6366f1]/10 hover:bg-[#6366f1]/20 text-[#a5b4fc] hover:text-white border border-[#6366f1]/20 rounded-lg text-[10px] font-extrabold uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Scale size={11} /> Add to Comparison
                          </button>

                          {/* 🚀 DISPATCH CENTER */}
                          <div className="bg-black/40 border border-white/5 rounded-xl p-3 space-y-2.5">
                            <div className="flex items-center justify-between select-none">
                              <span className="text-[9px] uppercase font-bold tracking-widest text-[#d97706] font-mono">
                                🚀 Dispatch Center
                              </span>
                            </div>
                            
                            <div className="space-y-2">
                              {/* Status select dropdown */}
                              <div className="flex items-center justify-between gap-2 bg-[#120f24]/80 border border-white/10 rounded-lg px-2 py-1.5">
                                <span className="text-[9.5px] text-gray-400 uppercase font-bold font-mono">Status</span>
                                <select
                                  value={angleStatuses.B}
                                  onChange={(e) => setAngleStatuses(prev => ({ ...prev, B: e.target.value as any }))}
                                  className="bg-transparent text-white text-[10px] font-bold border-none outline-none cursor-pointer focus:ring-0 text-right pr-1"
                                >
                                  <option value="Draft" className="bg-[#120f24] text-white">Draft</option>
                                  <option value="Ready to Shoot" className="bg-[#120f24] text-white">Ready to Shoot</option>
                                  <option value="Produced" className="bg-[#120f24] text-white">Produced</option>
                                </select>
                              </div>

                              {/* Save & Export buttons */}
                              <div className="grid grid-cols-3 gap-1.5">
                                <button
                                  onClick={() => onDispatchScript("B", "Angle B (Negative Paradox)", angleBHook)}
                                  className="py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-white border border-amber-500/20 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer hover:shadow-[0_0_8px_rgba(217,119,6,0.1)] text-center"
                                >
                                  <Folder size={11} /> Save
                                </button>
                                <button
                                  onClick={() => downloadAngleText("Angle B (Negative Paradox)", angleBHook)}
                                  className="py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer text-center"
                                >
                                  <Download size={11} /> Export
                                </button>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(angleBHook);
                                    showToast("Copied Angle B script to clipboard! 📋", "success");
                                    playAudio(880);
                                  }}
                                  className="py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer text-center"
                                >
                                  <Copy size={11} /> Copy
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Angle C Column */}
                      <div className="flex flex-col justify-between p-4 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 rounded-xl transition-all duration-300">
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Angle C
                            </span>
                            <span className="text-[8px] font-mono text-gray-500 uppercase">
                              Pattern Break
                            </span>
                          </div>
                          <h5 className="text-xs font-bold text-gray-200">Rapid Disruption Metrics</h5>
                          <p className="text-[11px] text-gray-400 italic bg-black/40 p-3 rounded-lg border border-white/5 line-clamp-4 min-h-[92px]">
                            "{angleCHook}"
                          </p>
                        </div>
                        
                        <div className="space-y-3 mt-4">
                          <button
                            onClick={() => {
                              sendToCalibrationLab(angleCHook, () => {
                                window.dispatchEvent(new CustomEvent("change-active-view", { detail: { view: "script-fetcher" } }));
                              });
                            }}
                            className="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-lg text-[10px] font-extrabold uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Zap size={11} /> Send to Calibration Lab
                          </button>

                          <button
                            onClick={() => addToComparison("C", "Angle C (Pattern Break)", angleCHook)}
                            className="w-full py-2 bg-[#6366f1]/10 hover:bg-[#6366f1]/20 text-[#a5b4fc] hover:text-white border border-[#6366f1]/20 rounded-lg text-[10px] font-extrabold uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Scale size={11} /> Add to Comparison
                          </button>

                          {/* 🚀 DISPATCH CENTER */}
                          <div className="bg-black/40 border border-white/5 rounded-xl p-3 space-y-2.5">
                            <div className="flex items-center justify-between select-none">
                              <span className="text-[9px] uppercase font-bold tracking-widest text-[#059669] font-mono">
                                🚀 Dispatch Center
                              </span>
                            </div>
                            
                            <div className="space-y-2">
                              {/* Status select dropdown */}
                              <div className="flex items-center justify-between gap-2 bg-[#120f24]/80 border border-white/10 rounded-lg px-2 py-1.5">
                                <span className="text-[9.5px] text-gray-400 uppercase font-bold font-mono">Status</span>
                                <select
                                  value={angleStatuses.C}
                                  onChange={(e) => setAngleStatuses(prev => ({ ...prev, C: e.target.value as any }))}
                                  className="bg-transparent text-white text-[10px] font-bold border-none outline-none cursor-pointer focus:ring-0 text-right pr-1"
                                >
                                  <option value="Draft" className="bg-[#120f24] text-white">Draft</option>
                                  <option value="Ready to Shoot" className="bg-[#120f24] text-white">Ready to Shoot</option>
                                  <option value="Produced" className="bg-[#120f24] text-white">Produced</option>
                                </select>
                              </div>

                              {/* Save & Export buttons */}
                              <div className="grid grid-cols-3 gap-1.5">
                                <button
                                  onClick={() => onDispatchScript("C", "Angle C (Pattern Break)", angleCHook)}
                                  className="py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-white border border-emerald-500/20 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer hover:shadow-[0_0_8px_rgba(5,150,105,0.1)] text-center"
                                >
                                  <Folder size={11} /> Save
                                </button>
                                <button
                                  onClick={() => downloadAngleText("Angle C (Pattern Break)", angleCHook)}
                                  className="py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer text-center"
                                >
                                  <Download size={11} /> Export
                                </button>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(angleCHook);
                                    showToast("Copied Angle C script to clipboard! 📋", "success");
                                    playAudio(880);
                                  }}
                                  className="py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer text-center"
                                >
                                  <Copy size={11} /> Copy
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <pre id="ai-script-canvas" className="text-xs md:text-sm text-gray-200 font-mono leading-relaxed whitespace-pre-wrap bg-black/40 p-6 rounded-xl border border-white/5 max-h-[500px] overflow-y-auto custom-scrollbar select-text">
                  {result || "Wait a brief second while the machine compiles instructions..."}
                </pre>
              </GlassCard>

              {/* A/B Retention Comparative Playground Panel */}
              {showPlayground && (
                <div id="ab-retention-playground" className="w-full mt-6 p-6 rounded-2xl border border-indigo-500/20 bg-[#090714]/85 shadow-[0_0_25px_rgba(99,102,241,0.15)] space-y-6 transition-all duration-500 hover:border-indigo-500/35">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Scale className="text-indigo-400 animate-pulse" size={18} />
                        <h3 className="text-base font-extrabold text-white uppercase tracking-wider font-mono">
                          ⚖️ A/B Retention comparative playground
                        </h3>
                      </div>
                      <p className="text-[11px] text-gray-400 font-light">
                        Compare script hooks side-by-side using real-time structural analytics and linguistic pacing prediction.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setComparisonLeft(null);
                          setComparisonRight(null);
                          showToast("Comparison playground slots cleared! 🔄", "info");
                        }}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 rounded-lg text-[10.5px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw size={11} /> Clear Slots
                      </button>
                      <button
                        onClick={() => setShowPlayground(false)}
                        className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/15 rounded-lg text-[10.5px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <X size={11} /> Close Playground
                      </button>
                    </div>
                  </div>

                  {/* Content Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* LEFT MODEL COLUMN */}
                    <div className="flex flex-col space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[9.5px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Model A (Left Slot)
                        </span>
                        {comparisonLeft && (
                          <span className="text-xs font-bold text-white truncate max-w-[200px]">
                            {comparisonLeft.type}
                          </span>
                        )}
                      </div>

                      {comparisonLeft ? (
                        <div className="flex-1 p-5 rounded-xl border border-white/5 bg-black/40 space-y-5 hover:border-indigo-500/15 transition-all">
                          {/* Script Text Preview */}
                          <div className="space-y-1.5">
                            <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider font-mono">Script Hook Text Preview:</span>
                            <p className="text-xs text-gray-300 bg-black/40 p-3.5 rounded-lg border border-white/5 font-mono italic leading-relaxed max-h-[140px] overflow-y-auto custom-scrollbar select-text">
                              "{comparisonLeft.text}"
                            </p>
                            <button
                              onClick={() => handlePushToPrompter(comparisonLeft.text)}
                              className="w-full mt-2 py-2 bg-purple-500/10 hover:bg-purple-500/25 text-purple-300 hover:text-white border border-purple-500/20 hover:border-purple-500/40 rounded-lg text-[10.5px] font-extrabold uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Volume2 size={11} /> 🎤 Push to Prompter
                            </button>
                          </div>

                          {/* Metrics Breakdown */}
                          <div className="space-y-4 pt-2 border-t border-white/5">
                            
                            {/* Metric 1: Estimated Hook Pacing */}
                            {(() => {
                              const pacing = getHookPacing(comparisonLeft.text);
                              return (
                                <div className="space-y-1.5">
                                  <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider font-mono flex items-center gap-1">
                                    🗣️ Estimated Hook Pacing
                                  </span>
                                  <div className={`p-3 rounded-lg border ${pacing.colorClass} flex flex-col sm:flex-row sm:items-center justify-between gap-2`}>
                                    <div>
                                      <span className="text-[11px] font-bold block text-white">{pacing.label}</span>
                                      <span className="text-[9.5px] opacity-75 font-light block mt-0.5">Calculated via average syllable & character speaking cadence.</span>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="text-[10px] block opacity-80 uppercase font-mono font-bold">Speech Tempo</span>
                                      <span className="text-xs font-black font-mono">{pacing.duration}s duration ({pacing.wps} w/s)</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Metric 2: Scroll-Stop Score */}
                            {(() => {
                              const stopScore = getScrollStopScore(comparisonLeft.text);
                              return (
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center text-[9px] uppercase font-bold text-gray-500 tracking-wider font-mono">
                                    <span>🛑 Scroll-Stop Score</span>
                                    <span className={stopScore.color}>{stopScore.score}% rating</span>
                                  </div>
                                  <div className={`p-3 rounded-lg border ${stopScore.borderColor} ${stopScore.bgColor} space-y-2.5`}>
                                    <div className="flex justify-between items-center">
                                      <span className={`text-xs font-extrabold ${stopScore.color}`}>{stopScore.label}</span>
                                      <span className="text-[9px] text-gray-400 font-mono italic">First 3s Linguistic Density</span>
                                    </div>
                                    
                                    <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full rounded-full bg-gradient-to-r from-rose-500 via-[#9e7bf3] to-emerald-500 transition-all duration-700"
                                        style={{ width: `${stopScore.score}%` }}
                                      />
                                    </div>

                                    {stopScore.matchedWords.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 pt-1 items-center">
                                        <span className="text-[8.5px] text-gray-400 font-mono">Triggers:</span>
                                        {stopScore.matchedWords.map((word, wIdx) => (
                                          <span key={wIdx} className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-black/35 text-white border border-white/5 capitalize font-bold">
                                            {word}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Metric 3: Loop Fluidity */}
                            {(() => {
                              const loop = getLoopFluidity(comparisonLeft.text);
                              return (
                                <div className="space-y-1.5">
                                  <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider font-mono flex items-center gap-1">
                                    🔄 Loop Fluidity Metric
                                  </span>
                                  <div className={`p-3 rounded-lg border ${loop.borderColor} ${loop.bgColor} flex items-center justify-between gap-4`}>
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className={`text-xs font-black uppercase font-mono ${loop.color}`}>{loop.status}</span>
                                        <span className="text-gray-500 font-mono text-[9px] select-none">|</span>
                                        <span className="text-[11px] font-semibold text-gray-200">{loop.rating}</span>
                                      </div>
                                      <p className="text-[9.5px] text-gray-400 font-light mt-0.5">{loop.label}</p>
                                    </div>
                                    <div className="text-right shrink-0 font-mono">
                                      <span className="text-[8px] block text-gray-500 uppercase font-bold">Suture Score</span>
                                      <span className={`text-sm font-black ${loop.color}`}>{loop.score}/100</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 p-8 rounded-xl border border-dashed border-indigo-500/20 bg-black/20 flex flex-col items-center justify-center text-center space-y-3 min-h-[350px]">
                          <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 animate-pulse">
                            <Scale size={20} />
                          </div>
                          <div className="space-y-1 max-w-sm">
                            <span className="text-xs font-extrabold text-white block uppercase tracking-wide">Model A (Left Side) Empty</span>
                            <p className="text-[10.5px] text-gray-400 font-light leading-relaxed">
                              Click the <strong className="text-indigo-400 font-bold">"⚖️ Add to Comparison"</strong> button on any generated psychological angle above to populate this model slot.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* RIGHT MODEL COLUMN */}
                    <div className="flex flex-col space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[9.5px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Model B (Right Slot)
                        </span>
                        {comparisonRight && (
                          <span className="text-xs font-bold text-white truncate max-w-[200px]">
                            {comparisonRight.type}
                          </span>
                        )}
                      </div>

                      {comparisonRight ? (
                        <div className="flex-1 p-5 rounded-xl border border-white/5 bg-black/40 space-y-5 hover:border-indigo-500/15 transition-all">
                          {/* Script Text Preview */}
                          <div className="space-y-1.5">
                            <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider font-mono">Script Hook Text Preview:</span>
                            <p className="text-xs text-gray-300 bg-black/40 p-3.5 rounded-lg border border-white/5 font-mono italic leading-relaxed max-h-[140px] overflow-y-auto custom-scrollbar select-text">
                              "{comparisonRight.text}"
                            </p>
                            <button
                              onClick={() => handlePushToPrompter(comparisonRight.text)}
                              className="w-full mt-2 py-2 bg-purple-500/10 hover:bg-purple-500/25 text-purple-300 hover:text-white border border-purple-500/20 hover:border-purple-500/40 rounded-lg text-[10.5px] font-extrabold uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Volume2 size={11} /> 🎤 Push to Prompter
                            </button>
                          </div>

                          {/* Metrics Breakdown */}
                          <div className="space-y-4 pt-2 border-t border-white/5">
                            
                            {/* Metric 1: Estimated Hook Pacing */}
                            {(() => {
                              const pacing = getHookPacing(comparisonRight.text);
                              return (
                                <div className="space-y-1.5">
                                  <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider font-mono flex items-center gap-1">
                                    🗣️ Estimated Hook Pacing
                                  </span>
                                  <div className={`p-3 rounded-lg border ${pacing.colorClass} flex flex-col sm:flex-row sm:items-center justify-between gap-2`}>
                                    <div>
                                      <span className="text-[11px] font-bold block text-white">{pacing.label}</span>
                                      <span className="text-[9.5px] opacity-75 font-light block mt-0.5">Calculated via average syllable & character speaking cadence.</span>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="text-[10px] block opacity-80 uppercase font-mono font-bold">Speech Tempo</span>
                                      <span className="text-xs font-black font-mono">{pacing.duration}s duration ({pacing.wps} w/s)</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Metric 2: Scroll-Stop Score */}
                            {(() => {
                              const stopScore = getScrollStopScore(comparisonRight.text);
                              return (
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center text-[9px] uppercase font-bold text-gray-500 tracking-wider font-mono">
                                    <span>🛑 Scroll-Stop Score</span>
                                    <span className={stopScore.color}>{stopScore.score}% rating</span>
                                  </div>
                                  <div className={`p-3 rounded-lg border ${stopScore.borderColor} ${stopScore.bgColor} space-y-2.5`}>
                                    <div className="flex justify-between items-center">
                                      <span className={`text-xs font-extrabold ${stopScore.color}`}>{stopScore.label}</span>
                                      <span className="text-[9px] text-gray-400 font-mono italic">First 3s Linguistic Density</span>
                                    </div>
                                    
                                    <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full rounded-full bg-gradient-to-r from-rose-500 via-[#9e7bf3] to-emerald-500 transition-all duration-700"
                                        style={{ width: `${stopScore.score}%` }}
                                      />
                                    </div>

                                    {stopScore.matchedWords.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 pt-1 items-center">
                                        <span className="text-[8.5px] text-gray-400 font-mono">Triggers:</span>
                                        {stopScore.matchedWords.map((word, wIdx) => (
                                          <span key={wIdx} className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-black/35 text-white border border-white/5 capitalize font-bold">
                                            {word}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Metric 3: Loop Fluidity */}
                            {(() => {
                              const loop = getLoopFluidity(comparisonRight.text);
                              return (
                                <div className="space-y-1.5">
                                  <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider font-mono flex items-center gap-1">
                                    🔄 Loop Fluidity Metric
                                  </span>
                                  <div className={`p-3 rounded-lg border ${loop.borderColor} ${loop.bgColor} flex items-center justify-between gap-4`}>
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className={`text-xs font-black uppercase font-mono ${loop.color}`}>{loop.status}</span>
                                        <span className="text-gray-500 font-mono text-[9px] select-none">|</span>
                                        <span className="text-[11px] font-semibold text-gray-200">{loop.rating}</span>
                                      </div>
                                      <p className="text-[9.5px] text-gray-400 font-light mt-0.5">{loop.label}</p>
                                    </div>
                                    <div className="text-right shrink-0 font-mono">
                                      <span className="text-[8px] block text-gray-500 uppercase font-bold">Suture Score</span>
                                      <span className={`text-sm font-black ${loop.color}`}>{loop.score}/100</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 p-8 rounded-xl border border-dashed border-indigo-500/20 bg-black/20 flex flex-col items-center justify-center text-center space-y-3 min-h-[350px]">
                          <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 animate-pulse">
                            <Scale size={20} />
                          </div>
                          <div className="space-y-1 max-w-sm">
                            <span className="text-xs font-extrabold text-white block uppercase tracking-wide">Model B (Right Side) Empty</span>
                            <p className="text-[10.5px] text-gray-400 font-light leading-relaxed">
                              Click the <strong className="text-indigo-400 font-bold">"⚖️ Add to Comparison"</strong> button on any generated psychological angle above to populate this model slot.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}
              </>
            )}

            {/* WORKSPACE 2: INTERACTIVE TIMECODE TIMELINE BUILDER */}
            {activeTab === "timeline" && (
              <div id="workspace-timeline" className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
                
                {/* Horizontal list of scene blocks */}
                <div className="lg:col-span-4 space-y-3.5">
                  <span className="text-xs uppercase font-extrabold text-blue-400 tracking-wider block border-l-2 border-blue-400 pl-2">Timeline Cards</span>
                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {timelineSegments.map((seg) => (
                      <button
                        key={seg.id}
                        onClick={() => {
                          setActiveSegmentId(seg.id);
                          playAudioCue(523.25); // C5
                        }}
                        className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                          activeSegmentId === seg.id 
                            ? "bg-blue-500/10 border-blue-400 text-white shadow-lg" 
                            : "bg-black/30 border-white/5 text-gray-400 hover:border-white/10 hover:text-white"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1 text-[10px] font-mono font-bold uppercase">
                          <span>{seg.label}</span>
                          <span className="text-blue-400 flex items-center gap-1"><Clock size={10} /> {seg.timecode}</span>
                        </div>
                        <p className="text-xs font-semibold line-clamp-1">"{seg.voiceover}"</p>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      const newId = String(timelineSegments.length + 1);
                      setTimelineSegments([
                        ...timelineSegments,
                        {
                          id: newId,
                          timecode: "0:60 - 1:15",
                          label: "NEW SECTION",
                          visual: "Camera cuts to desktop workstation monitor detailing blueprint payouts.",
                          voiceover: "Add your voiceover directions here.",
                          caption: "NEW EXPLICIT POINT",
                          sfx: "Volume highlight swoop tone",
                          durationSec: 15
                        }
                      ]);
                      setActiveSegmentId(newId);
                      playAudioCue(987.77); // B5
                    }}
                    className="w-full py-3 border border-dashed border-blue-500/20 hover:border-blue-400 text-blue-400 rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer hover:bg-blue-500/5 transition-colors"
                  >
                    <Plus size={14} /> Add Timeline Segment
                  </button>
                </div>

                {/* Main Card workspace editor */}
                <div className="lg:col-span-8">
                  <GlassCard id="active-scene-editor-card" className="border-white/5 space-y-6">
                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                      <div>
                        <span className="text-xs font-mono text-blue-400 font-bold tracking-wider">{activeSegment.timecode} ({activeSegment.durationSec}s CARD)</span>
                        <h3 className="text-base font-extrabold text-white mt-1">Timeline Scene: {activeSegment.label}</h3>
                      </div>
                      
                      {/* Pacing Speed Alert indicator */}
                      <div className="text-right">
                        <span className="text-[9px] uppercase text-gray-400 block font-bold">Estimated Pacing</span>
                        <span className={`text-xs font-mono font-bold flex items-center gap-1.5 mt-1 ${
                          wordsPerMinute > 175 ? "text-amber-400" : "text-green-400"
                        }`}>
                          <Volume2 size={12} /> {wordsPerMinute.toFixed(0)} words/m
                        </span>
                      </div>
                    </div>

                    {/* Word pacing alert bubble */}
                    {wordsPerMinute > 175 && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium leading-relaxed rounded-xl flex items-start gap-2">
                        <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                        <span><strong>Fast Pacing Alert:</strong> Viewer speech density exceeds 175 words per minute. Trim down voiceover wording or extend durations to maintain listener legibility!</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Voiceover text inputs */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-blue-400 uppercase tracking-wider font-bold">Voiceover Speech Copy</label>
                        <textarea
                          rows={3}
                          value={activeSegment.voiceover}
                          onChange={(e) => updateSegment("voiceover", e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-400 leading-relaxed font-mono custom-scrollbar"
                        />
                      </div>

                      {/* On Screen captions */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-blue-400 uppercase tracking-wider font-bold">Caption Text Overlay</label>
                        <textarea
                          rows={3}
                          value={activeSegment.caption}
                          onChange={(e) => updateSegment("caption", e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-400 leading-relaxed font-mono custom-scrollbar"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Visual instructions preset */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1"><Video size={12} /> Shot/Camera Instruction</label>
                        <select
                          value={activeSegment.visual.includes("terminal") ? "console-zoom" : activeSegment.visual.includes("payouts") ? "stats-glow" : "panning"}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "console-zoom") {
                              updateSegment("visual", "Extreme desk zoom overlay showing a detailed terminal console visual log.");
                            } else if (val === "stats-glow") {
                              updateSegment("visual", "Glow-basked workstation screen displaying positive revenue metrics.");
                            } else {
                              updateSegment("visual", "Sleek panning overlay showing creator desks and soft warm lighting.");
                            }
                          }}
                          className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white cursor-pointer focus:outline-none"
                        >
                          <option value="panning">Cinematic panning shots</option>
                          <option value="console-zoom">Extreme Terminal Code zoom-ins</option>
                          <option value="stats-glow">Glowing revenue statistics dashboard</option>
                        </select>
                        <p className="text-[10.5px] text-gray-500 font-light italic mt-1 leading-relaxed">"{activeSegment.visual}"</p>
                      </div>

                      {/* Sound cues tester */}
                      <div className="space-y-1 select-none">
                        <label className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1"><Volume2 size={12} /> Sync sound effect cue</label>
                        <div className="flex gap-2 p-1 bg-black/40 border border-white/10 rounded-xl items-center justify-between">
                          <input 
                            type="text" 
                            value={activeSegment.sfx} 
                            onChange={(e) => updateSegment("sfx", e.target.value)}
                            className="bg-transparent border-none text-xs text-white focus:outline-none px-2 flex-1"
                          />
                          <button
                            onClick={() => {
                              // Synthesis triggers
                              if (activeSegment.label === "HOOK") playAudioCue(180, "sawtooth");
                              else if (activeSegment.label === "CTA") playAudioCue(880, "triangle");
                              else playAudioCue(380, "sine");
                            }}
                            className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg cursor-pointer flex items-center gap-1 text-[9.5px] font-bold"
                            title="Play sound tester"
                          >
                            <Play size={10} /> TEST
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* Timeline compilation action */}
                    <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
                      <span className="text-[10px] text-gray-400 font-light">Interactive timeline compiles on real browser memory. Perfect and stage segments before recording live video scenes.</span>
                      <div className="flex gap-2.5 w-full sm:w-auto">
                        <button
                          onClick={() => {
                            const flatText = timelineSegments.map(s => `[${s.timecode}] [${s.label}]\nSPEECH: "${s.voiceover}"\nSCENE: ${s.visual}\nSFX: ${s.sfx}`).join("\n\n");
                            navigator.clipboard.writeText(flatText);
                            playAudioCue(1046.50); // C6
                            showToast("Pristine script plan has been copied to your clipboard!");
                          }}
                          className="px-4 py-2 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer select-none grow text-center"
                        >
                          Copy Script
                        </button>
                        
                        <button
                          onClick={() => {
                            try {
                              const doc = new jsPDF({
                                orientation: 'portrait',
                                unit: 'mm',
                                  format: 'a4'
                                });

                                // Header block setup
                                doc.setFillColor(15, 12, 28); // Deep cosmic dark purple-grey
                                doc.rect(0, 0, 210, 45, 'F');

                                doc.setTextColor(96, 165, 250); // Light blue accent
                                doc.setFont("helvetica", "bold");
                                doc.setFontSize(22);
                                doc.text("AXE HOURS: PRODUCTION PLAYBOOK", 15, 18);

                                doc.setTextColor(255, 255, 255);
                                doc.setFont("helvetica", "normal");
                                doc.setFontSize(10);
                                doc.text("OFFICIAL VIDEO SCRIPT TIMELINE & SFX LAYOUT SPEC", 15, 26);
                                doc.text(`GENERATED ON: ${new Date().toLocaleDateString()} @ ${new Date().toLocaleTimeString()}`, 15, 33);

                                doc.setTextColor(30, 30, 30);
                                doc.setFont("helvetica", "bold");
                                doc.setFontSize(12);
                                doc.text("PRODUCTION SCENE SEQUENCE", 15, 58);
                                doc.setDrawColor(220, 220, 220);
                                doc.setLineWidth(0.4);
                                doc.line(15, 61, 195, 61);

                                let currentY = 70;
                                timelineSegments.forEach((segment, idx) => {
                                  if (currentY > 260) {
                                    doc.addPage();
                                    currentY = 20;
                                  }

                                  doc.setFont("helvetica", "bold");
                                  doc.setFontSize(10);
                                  doc.setTextColor(37, 99, 235); // Blue
                                  doc.text(`SCENE #${idx + 1} [${segment.timecode}] - ${segment.label}`, 15, currentY);
                                  currentY += 6;

                                  doc.setFont("helvetica", "normal");
                                  doc.setFontSize(9.5);
                                  doc.setTextColor(60, 60, 60);
                                  
                                  const splitVoiceover = doc.splitTextToSize(`VOICEOVER: "${segment.voiceover}"`, 175);
                                  doc.text(splitVoiceover, 18, currentY);
                                  currentY += (splitVoiceover.length * 5) + 1;

                                  const splitVisual = doc.splitTextToSize(`VISUAL SCENE: ${segment.visual}`, 175);
                                  doc.text(splitVisual, 18, currentY);
                                  currentY += (splitVisual.length * 5) + 1;

                                  if (segment.sfx) {
                                    doc.setFont("helvetica", "italic");
                                    doc.setTextColor(109, 40, 217); // Purple
                                    doc.text(`SFX/SOUND CHIME: ${segment.sfx}`, 18, currentY);
                                    currentY += 6;
                                  }
                                  
                                  currentY += 5; // Spacing between scenes
                                });

                                // Footer branding border
                                doc.setFillColor(15, 12, 28);
                                doc.rect(0, 285, 210, 12, 'F');
                                
                                doc.setTextColor(255, 255, 255);
                                doc.setFont("helvetica", "normal");
                                doc.setFontSize(7.5);
                                doc.text("AXE HOURS INC. - HIGH FIDELITY SCRIPT DIRECTIVES ENGINE", 15, 292);
                                doc.text("PAGE 1-OF-1 CREATED IN AUTOMATION BLUEPRINT TOOL", 140, 292);

                                doc.save(`axehours_script_layout_${Date.now()}.pdf`);
                                playAudioCue(1046.50);
                                showToast("Pristine script plan has been exported and downloaded as PDF outline!");
                              } catch (e: any) {
                                showToast("Failed to output PDF structure: " + e.message);
                              }
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold uppercase transition-all cursor-pointer select-none inline-flex items-center gap-1.5 grow justify-center outline-none shadow-md shadow-blue-900/10 active:scale-95"
                          >
                            <FileDown size={13} />
                            <span>Export PDF</span>
                          </button>
                        </div>
                      </div>

                  </GlassCard>
                </div>
              </div>
            )}

            {/* WORKSPACE 3: CLICK RATE TITLE & HOOK ANALYZER */}
            {activeTab === "ctr" && (
              <div id="workspace-ctr-tester" className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
                
                {/* Input Evaluator card */}
                <div className="lg:col-span-4">
                  <GlassCard id="ctr-input-card" className="border-white/5 space-y-5">
                    <span className="text-xs uppercase font-extrabold tracking-widest text-[#10b981] flex items-center gap-2"><Gauge size={14} /> Title click-rate evaluation</span>
                    
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 uppercase font-bold">Write potential video title</label>
                        <input
                          type="text"
                          value={customTitle}
                          onChange={(e) => setCustomTitle(e.target.value)}
                          placeholder="e.g. This simple Node script automated my start-up"
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#10b981]"
                        />
                      </div>

                      <button
                        onClick={evaluateCustomTitle}
                        disabled={!customTitle}
                        className="w-full py-3 bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] border border-[#10b981]/30 rounded-xl text-xs font-bold uppercase cursor-pointer"
                      >
                        RUN CLICK-THROUGH ASSESSMENT
                      </button>
                    </div>

                    {/* Pre-mapped high performers lists */}
                    <div className="space-y-3 pt-2">
                      <span className="text-[9.5px] uppercase text-gray-500 font-extrabold block">Proven title hooks formats:</span>
                      <div className="grid grid-cols-1 gap-2 text-xs">
                        <button
                          onClick={() => {
                            setCustomTitle("Why 99% of developers fail to deploy code in 24 hours?! (Secrets exposed)");
                            playAudioCue(523.25);
                          }}
                          className="p-2.5 text-left bg-black/20 hover:bg-white/5 rounded-lg border border-white/5 font-mono text-[9.5px] cursor-pointer"
                        >
                          "Why 99% of developers fail to deploy..."
                        </button>
                        <button
                          onClick={() => {
                            setCustomTitle("This obscure 10-line prompt trick automated my start-up!");
                            playAudioCue(523.25);
                          }}
                          className="p-2.5 text-left bg-black/20 hover:bg-white/5 rounded-lg border border-white/5 font-mono text-[9.5px] cursor-pointer"
                        >
                          "This obscure 10-line prompt trick automated..."
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                </div>

                {/* Score Diagnostic reporting panel */}
                <div className="lg:col-span-8 space-y-6">
                  {titleAnalysis ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <GlassCard id="ctr-report-card" className="border-[#10b981]/25 flex flex-col justify-between animate-in fade-in duration-500">
                        <div>
                          
                          {/* Scoring Header */}
                          <div id="ctr-report-hd" className="flex justify-between items-start pb-4 border-b border-white/5">
                            <div>
                              <span className="text-[9px] uppercase text-gray-400 font-bold block">Assigned metrics</span>
                              <h3 className="text-sm font-extrabold text-white">Title Engagement Audit</h3>
                            </div>
                            <div className="text-center p-2 rounded-xl bg-white/5 border border-white/10 min-w-[60px]">
                              <span className="text-xs uppercase text-gray-500 block">Grade</span>
                              <span className="text-xl font-extrabold text-emerald-400 font-sans tracking-tighter">{titleAnalysis.grade}</span>
                            </div>
                          </div>

                          {/* Moving Score Gauge */}
                          <div className="my-5 flex flex-col items-center justify-center relative select-none">
                            <svg className="w-24 h-24 transform -rotate-90 select-none" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="7" />
                              <circle cx="50" cy="50" r="38" fill="none" stroke="#10b981" strokeWidth="7" strokeDasharray={2 * Math.PI * 38} strokeDashoffset={2 * Math.PI * 38 - (titleAnalysis.score / 100) * (2 * Math.PI * 38)} className="transition-all duration-1000" />
                            </svg>
                            <div className="absolute flex flex-col items-center">
                              <span className="text-xl font-extrabold text-white font-mono">{titleAnalysis.score}</span>
                              <span className="text-[8px] uppercase text-gray-400 tracking-wider">CTR Factor</span>
                            </div>
                          </div>

                          {/* Editorial Recommendations suggestions list */}
                          <div className="space-y-3 select-text">
                            <span className="text-[10px] text-[#10b981] font-mono uppercase tracking-wider block">Diagnostics:</span>
                            {titleAnalysis.suggestions.length > 0 ? (
                              <ul className="space-y-2">
                                {titleAnalysis.suggestions.map((sug, i) => (
                                  <li key={i} className="text-[11px] text-gray-300 leading-relaxed font-light flex items-start gap-2">
                                    <span className="text-primary mt-0.5 shrink-0">&bull;</span>
                                    <span>{sug}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold">
                                ✓ Phenomenal copy! Title structure holds maximum curiosity contrast and click probability profiles.
                              </div>
                            )}
                          </div>

                        </div>
                      </GlassCard>

                      {/* ADVANCED VIRAL SEO MODULE */}
                      <GlassCard id="ctr-seo-card" className="border-white/5 flex flex-col justify-between animate-in fade-in duration-500">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center pb-2 border-b border-white/5">
                            <span className="text-xs uppercase font-extrabold tracking-widest text-[#10b981] flex items-center gap-1">🚀 SEO & Copy Package</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(seoDescription);
                                setIsDescCopied(true);
                                playAudioCue(600);
                                setTimeout(() => setIsDescCopied(false), 2000);
                              }}
                              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white rounded-lg text-[10px] font-extrabold cursor-pointer transition-colors"
                            >
                              {isDescCopied ? "Copied!" : "Copy Description"}
                            </button>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] text-gray-400 uppercase font-bold">Optimized Video Description</label>
                            <textarea
                              readOnly
                              rows={5}
                              value={seoDescription}
                              className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-[11px] text-gray-300 focus:outline-none font-mono resize-none leading-relaxed"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] text-gray-400 uppercase font-bold block">Viral Hashtags</label>
                            <div className="flex flex-wrap gap-1.5">
                              {seoHashtags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  onClick={() => {
                                    navigator.clipboard.writeText(tag);
                                    playAudioCue(680);
                                  }}
                                  className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] cursor-pointer font-mono"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] text-gray-400 uppercase font-bold block">Search Keywords</label>
                            <div className="flex flex-wrap gap-1.5">
                              {seoKeywords.map((kw, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-white/5 text-gray-400 rounded-md text-[10px] font-mono"
                                >
                                  {kw}
                                </span>
                              ))}
                            </div>
                          </div>

                        </div>
                      </GlassCard>
                    </div>
                  ) : (
                    <GlassCard id="ctr-empty" className="border-dashed border-2 border-white/5 flex items-center justify-center h-full min-h-[300px]">
                      <div className="text-center text-gray-500 max-w-xs select-none">
                        <TrendingUp size={32} className="mx-auto mb-3 opacity-30 animate-pulse text-emerald-400" />
                        <p className="text-sm font-extrabold text-white">Assessment Idle</p>
                        <p className="text-[11px] text-on-surface-variant leading-relaxed mt-1">Write your target title ideas inside the analyzer box and click run for automated clickrate audits.</p>
                      </div>
                    </GlassCard>
                  )}
                </div>

              </div>
            )}

            {/* WORKSPACE 4: THUMBNAIL VISUAL MATRIX COMPOSER */}
            {activeTab === "thumbnail" && (
              <GlassCard id="workspace-thumbnail-card" className="border-white/5 space-y-6 animate-in fade-in duration-300 select-text">
                
                {/* Header row details */}
                <div className="flex justify-between items-center border-b border-white/5 pb-4 select-none">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400">Interactive Studio Thumbnail Composer</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  {/* Live Canvas Preview */}
                  <div className="lg:col-span-6 space-y-4">
                    <span className="text-xs uppercase font-extrabold text-amber-400 font-mono tracking-wider block">Live Composer Preview Canvas</span>
                    
                    <div 
                      id="interactive-canvas-preview" 
                      className={`relative w-full h-[250px] border border-white/10 rounded-xl overflow-hidden flex flex-col justify-between p-5 select-none transition-all duration-300 ${
                        thumbTheme === "magenta" ? "bg-gradient-to-br from-[#0c051a] via-[#1c082e] to-[#0c0c0e]" :
                        thumbTheme === "emerald" ? "bg-gradient-to-br from-[#02130e] via-[#042116] to-[#0c0c0e]" :
                        thumbTheme === "cyan" ? "bg-gradient-to-br from-[#021017] via-[#051f2e] to-[#0c0c0e]" :
                        "bg-gradient-to-br from-[#120e03] via-[#241a05] to-[#0c0c0e]"
                      }`}
                    >
                      {/* Gradient Backdrop Orbs to simulate extreme premium glow */}
                      <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[80px] pointer-events-none transition-all ${
                        thumbTheme === "magenta" ? "bg-[#d946ef]/60" :
                        thumbTheme === "emerald" ? "bg-[#10b981]/60" :
                        thumbTheme === "cyan" ? "bg-[#06b6d4]/60" :
                        "bg-[#f59e0b]/60"
                      }`} />
                      <div className={`absolute -bottom-10 -left-10 w-40 h-40 rounded-full blur-[80px] pointer-events-none transition-all ${
                        thumbTheme === "magenta" ? "bg-[#8b5cf6]/30" :
                        thumbTheme === "emerald" ? "bg-[#047857]/30" :
                        thumbTheme === "cyan" ? "bg-[#0891b2]/30" :
                        "bg-[#b45309]/30"
                      }`} />

                      {/* Rule of Thirds Helper Overlay Grid lines */}
                      {thumbLayout === "thirds" && (
                        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none border border-white/5 divide-x divide-y divide-white/5 opacity-50">
                          <div/><div/><div/>
                          <div/><div/><div/>
                          <div/><div/><div/>
                        </div>
                      )}

                      {/* Top status rail */}
                      <div className="flex justify-between items-center z-10">
                        <span className="px-2 py-0.5 rounded bg-black/60 border border-white/10 text-[9px] text-gray-400 font-mono font-semibold tracking-wider">
                          {thumbLayout.toUpperCase()} FRAME
                        </span>
                        <span className={`text-[10px] font-extrabold tracking-widest font-mono flex items-center gap-1 ${
                          thumbTheme === "magenta" ? "text-fuchsia-400" :
                          thumbTheme === "emerald" ? "text-green-400" :
                          thumbTheme === "cyan" ? "text-cyan-400" :
                          "text-amber-400"
                        }`}>
                          HIGH PRESTIGE RATING
                        </span>
                      </div>

                      {/* Live text overlay */}
                      <div className="text-center z-20 my-auto">
                        <h2 className="text-2xl font-extrabold text-white tracking-tighter uppercase drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] scale-100 hover:scale-105 transition-transform duration-300">
                          {thumbHeadline || "DONE IN 24H?!"}
                        </h2>
                        <div className="w-16 h-1 mx-auto bg-primary-gradient mt-1.5 rounded-full" />
                      </div>

                      {/* Bottom Layout Row containing comparative blocks */}
                      <div className="flex justify-between items-end w-full z-10 gap-3">
                        
                        {/* Red side: Negative representation */}
                        <div className="w-[48%] bg-red-950/40 border border-red-500/30 rounded-xl p-2.5 backdrop-blur-md flex items-center gap-2">
                          <span className="text-xl shrink-0">
                            {thumbFace === "distressed" ? "🤦‍♂️" : thumbFace === "shocked" ? "😲" : "⚡"}
                          </span>
                          <div className="truncate text-left leading-none">
                            <span className="text-[11px] font-sans font-extrabold text-red-500 tracking-tight block uppercase">{thumbLeftMetric || "FAILED!"}</span>
                            <span className="text-[8px] uppercase tracking-wider font-mono text-gray-400 font-bold mt-1 block">{thumbLeftSub || "$0 CONSOLE"}</span>
                          </div>
                        </div>

                        {/* Theme colored side: Positive representation */}
                        <div className={`w-[48%] bg-black/60 border rounded-xl p-2.5 backdrop-blur-md flex items-center justify-between transition-all ${
                          thumbTheme === "magenta" ? "border-fuchsia-500/40 animate-pulse" :
                          thumbTheme === "emerald" ? "border-emerald-500/40" :
                          thumbTheme === "cyan" ? "border-cyan-500/40" :
                          "border-amber-500/40"
                        }`}>
                          <div className="truncate text-left leading-none">
                            <span className={`text-[11px] font-sans font-extrabold tracking-tight block uppercase ${
                              thumbTheme === "magenta" ? "text-fuchsia-400" :
                              thumbTheme === "emerald" ? "text-green-400" :
                              thumbTheme === "cyan" ? "text-cyan-400" :
                              "text-amber-400"
                            }`}>{thumbRightMetric || "99% CTR"}</span>
                            <span className="text-[8px] uppercase tracking-wider font-mono text-gray-400 font-bold mt-1 block">{thumbRightSub || "$12.4K PAYOUT"}</span>
                          </div>
                          <span className="text-sm">🔥</span>
                        </div>

                      </div>

                    </div>
                    
                    <div className="flex justify-between items-center px-1 text-[11px] text-gray-500 font-mono">
                      <span>Preview Ratio 16:9</span>
                      <span className="flex items-center gap-1 text-amber-500 animate-pulse"><Zap size={10} /> Reactive Visualizer Active</span>
                    </div>
                  </div>

                  {/* Interactive Controls Panel */}
                  <div className="lg:col-span-6 space-y-4">
                    <h3 className="text-base font-extrabold text-white flex items-center gap-1.5"><Sliders size={16} className="text-amber-400" /> Adjust Visual Ingredients</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/2 p-4 rounded-xl border border-white/5 text-xs">
                      
                      {/* Theme selection */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 uppercase font-bold">Theme Backing Gradient</label>
                        <select
                          value={thumbTheme}
                          onChange={(e) => {
                            setThumbTheme(e.target.value as any);
                            playAudioCue(440);
                          }}
                          className="w-full bg-black/60 border border-white/10 rounded-xl p-2 text-white text-xs cursor-pointer focus:outline-none"
                        >
                          <option value="magenta">Neon Purple/Magenta Vibe</option>
                          <option value="emerald">Cyber Forest/Mint Vibe</option>
                          <option value="cyan">Deep Slate/Aqua Glow</option>
                          <option value="gold">Solar Ember/Bright Gold Vibe</option>
                        </select>
                      </div>

                      {/* Overlay text */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 uppercase font-bold">Mock Bold Title</label>
                        <input
                          type="text"
                          value={thumbHeadline}
                          onChange={(e) => setThumbHeadline(e.target.value)}
                          placeholder="HE_ADLINE"
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white text-xs focus:outline-none"
                        />
                      </div>

                      {/* Layout Selection */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 uppercase font-bold">Helper Guide Overlay</label>
                        <select
                          value={thumbLayout}
                          onChange={(e) => setThumbLayout(e.target.value as any)}
                          className="w-full bg-black/60 border border-white/10 rounded-xl p-2 text-white text-xs cursor-pointer focus:outline-none"
                        >
                          <option value="thirds">Show Rule of Thirds Guide</option>
                          <option value="split">Clean Borderless Grid</option>
                        </select>
                      </div>

                      {/* Expression Select */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 uppercase font-bold">Left Emotional Emoji</label>
                        <select
                          value={thumbFace}
                          onChange={(e) => setThumbFace(e.target.value as any)}
                          className="w-full bg-black/60 border border-white/10 rounded-xl p-2 text-white text-xs cursor-pointer focus:outline-none"
                        >
                          <option value="distressed">Distressed Face (🤦‍♂️ Pain)</option>
                          <option value="shocked">Shocked Face (😲 Surprise)</option>
                          <option value="confident">Laser Coder (⚡ Optim)</option>
                        </select>
                      </div>

                      {/* Left Metric label */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 uppercase font-bold">Left Pane Title Accent</label>
                        <input
                          type="text"
                          value={thumbLeftMetric}
                          onChange={(e) => setThumbLeftMetric(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white text-xs focus:outline-none"
                        />
                      </div>

                      {/* Left Metric value */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 uppercase font-bold">Left Pane Label Detail</label>
                        <input
                          type="text"
                          value={thumbLeftSub}
                          onChange={(e) => setThumbLeftSub(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white text-xs focus:outline-none"
                        />
                      </div>

                      {/* Right Metric label */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 uppercase font-bold">Right Pane Title Accent</label>
                        <input
                          type="text"
                          value={thumbRightMetric}
                          onChange={(e) => setThumbRightMetric(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white text-xs focus:outline-none"
                        />
                      </div>

                      {/* Right Metric value */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 uppercase font-bold">Right Pane Label Detail</label>
                        <input
                          type="text"
                          value={thumbRightSub}
                          onChange={(e) => setThumbRightSub(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white text-xs focus:outline-none"
                        />
                      </div>

                    </div>

                    <div className="flex gap-2 pt-4 border-t border-white/5">
                      <button
                        onClick={() => {
                          const specText = generateThumbnailSpecs(
                            thumbTheme,
                            thumbLayout,
                            thumbFace,
                            thumbHeadline,
                            thumbLeftMetric,
                            thumbLeftSub,
                            thumbRightMetric,
                            thumbRightSub
                          );
                          navigator.clipboard.writeText(specText);
                          playAudioCue(1046.50);
                          showToast("Elite high-CTR prompt pack and layout specifications successfully compiled and copied! Paste them in Midjourney or send to your designer.");
                        }}
                        className="w-full py-3.5 bg-amber-400/10 hover:bg-amber-400/25 text-amber-400 border border-amber-400/20 hover:border-amber-400/40 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Copy size={14} /> Copy Layout Specifications
                      </button>
                    </div>

                  </div>

                </div>
              </GlassCard>
            )}

            {/* WORKSPACE 5: TELEPROMPTER & PACING COACH */}
            {activeTab === "coach" && (
              <GlassCard id="workspace-coach-card" className="border-indigo-500/10 space-y-6 animate-in fade-in duration-300 shadow-[0_0_50px_rgba(168,85,247,0.05)]">
                
                {/* Header row details */}
                <div className="flex flex-wrap justify-between items-center border-b border-white/5 pb-4 gap-4">
                  <div className="flex items-center gap-2 select-none">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
                    <span className="text-xs uppercase font-extrabold tracking-widest text-purple-400 font-sans">
                      🎤 TELEPROMPTER & SPEECH COACH
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
                    <span className="bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20 font-bold">
                      MICROPHONE STREAM READY
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left Column: Recording Teleprompter view screen block */}
                  <div className="lg:col-span-8 flex flex-col space-y-4 text-left">
                    
                    {/* Control Header Triggers Row */}
                    <div className="bg-black/40 p-4 rounded-2xl border border-white/5 flex flex-wrap items-center justify-between gap-4">
                      {/* Play/Pause control */}
                      <button
                        onClick={() => {
                          setIsScrolling(!isScrolling);
                          playAudioCue(isScrolling ? 440 : 880);
                        }}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md border ${
                          isScrolling 
                            ? "bg-rose-500/20 border-rose-500 hover:bg-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(239,68,68,0.25)]" 
                            : "bg-emerald-600 hover:bg-emerald-500 border-emerald-500/30 text-white shadow-[0_4px_20px_rgba(16,185,129,0.3)]"
                        }`}
                      >
                        {isScrolling ? (
                          <>
                            <Pause size={14} fill="currentColor" /> Pause Scroll
                          </>
                        ) : (
                          <>
                            <Play size={14} fill="currentColor" /> Play Autoscroll
                          </>
                        )}
                      </button>

                      {/* Font Size Selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-gray-400 font-mono">Font Size:</span>
                        <select
                          value={teleprompterFontSize}
                          onChange={(e) => {
                            setTeleprompterFontSize(e.target.value as any);
                            playAudioCue(659.25); // E5
                          }}
                          className="bg-black/60 border border-white/10 rounded-xl px-2.5 py-1.5 text-white text-[10px] font-bold cursor-pointer focus:outline-none"
                        >
                          <option value="sm">Small (14px)</option>
                          <option value="md">Medium (16px)</option>
                          <option value="lg">Large (20px)</option>
                          <option value="xl">XL Headline (30px)</option>
                        </select>
                      </div>

                      {/* WPM Speed Calibration Slider */}
                      <div className="flex flex-col space-y-1">
                        <div className="flex justify-between items-center text-[9px] font-mono font-bold uppercase tracking-wider text-gray-400">
                          <span>Speed Scroll Pace</span>
                          <span className="font-mono text-purple-400 font-black">{prompterSettings.scrollSpeedWpm} WPM</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="80"
                            max="240"
                            step="5"
                            value={prompterSettings.scrollSpeedWpm}
                            onChange={(e) => setPrompterSettings({ scrollSpeedWpm: parseInt(e.target.value) })}
                            className="w-[140px] h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                          />
                          <span className="text-[9px] font-mono text-gray-500">
                            Est: {getEstimatedWpm(activePrompterText || practiceSpeechText || "")} WPM
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* The Main visual display monitor block: PITCH-BLACK background with GLOWING typography */}
                    <div className="relative w-full h-[360px] bg-black border border-indigo-500/30 rounded-2xl overflow-hidden flex flex-col shadow-[inset_0_0_25px_rgba(99,102,241,0.25)]">
                      
                      {/* Central horizontal reading focus line */}
                      <div className="absolute top-1/2 left-0 w-full h-[60px] -translate-y-1/2 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 border-t border-b border-purple-500/20 pointer-events-none z-10 flex items-center justify-between px-6">
                        <span className="text-[9px] uppercase tracking-widest font-mono text-purple-400 font-black">▶ ACTIVE READING LINE</span>
                        <span className="text-[9px] uppercase tracking-widest font-mono text-purple-400 font-black">PACING GUIDE 🎙️</span>
                      </div>

                      {/* Content scrolls inside this relative component container */}
                      <div 
                        ref={teleprompterScrollRef}
                        className="flex-1 overflow-y-auto px-8 py-44 custom-scrollbar scroll-smooth"
                      >
                        <p 
                          className={`font-black tracking-tight leading-relaxed transition-all text-center uppercase whitespace-pre-wrap ${
                            teleprompterFontSize === "sm" ? "text-sm text-green-300 drop-shadow-[0_0_4px_rgba(74,222,128,0.5)]" :
                            teleprompterFontSize === "md" ? "text-base text-green-300 drop-shadow-[0_0_6px_rgba(74,222,128,0.6)]" :
                            teleprompterFontSize === "lg" ? "text-xl md:text-2xl text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]" :
                            "text-2xl md:text-3xl text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.9)]"
                          }`}
                        >
                          {activePrompterText || practiceSpeechText ? (activePrompterText || practiceSpeechText) : (
                            "No generated script blueprint loaded. Go to the Generator workspace, execute a prompt, then access the coach to practice delivery timing."
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Interactive Speech AI voice actor synthesis panel */}
                    <div id="teleprompter-voice-synthesis-console" className="bg-white/2 border border-white/5 rounded-2xl p-4 space-y-4 text-left animate-in fade-in duration-300">
                      <div className="flex justify-between items-center pb-2 border-b border-white/5">
                        <div className="flex items-center gap-2">
                          <Volume2 className="text-purple-400" size={16} />
                          <span className="text-xs font-extrabold uppercase font-mono text-purple-400">AI Script Reading Rehearsal</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase font-black">TTS Engine Connected</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Voice select drop-down */}
                        <div className="space-y-1">
                          <label className="text-[9px] text-gray-400 uppercase font-bold block">AI Voice Actor Profile</label>
                          {synthVoices.length > 0 ? (
                            <select
                              value={synthVoiceName}
                              onChange={(e) => {
                                setSynthVoiceName(e.target.value);
                                playAudioCue(600);
                              }}
                              className="w-full bg-black/60 border border-white/10 rounded-xl px-2.5 py-1.5 text-white text-[11px] font-medium cursor-pointer focus:outline-none"
                            >
                              {synthVoices.map((v) => (
                                <option key={v.name} value={v.name}>
                                  {v.name.replace("Google", "").replace("Microsoft", "").trim()} ({v.lang})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="text-xs text-gray-500 py-2 italic font-mono">No local voice presets found.</div>
                          )}
                        </div>

                        {/* Speech Parameters sliders */}
                        <div className="flex gap-4">
                          <div className="flex-1 space-y-1 text-left">
                            <div className="flex justify-between items-center text-[9px] text-gray-400 font-bold uppercase">
                              <span>Pitch</span>
                              <span className="font-mono text-purple-400 font-medium">{synthPitch.toFixed(1)}x</span>
                            </div>
                            <input
                              type="range"
                              min="0.5"
                              max="1.5"
                              step="0.1"
                              value={synthPitch}
                              onChange={(e) => setSynthPitch(parseFloat(e.target.value))}
                              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                          </div>
                          <div className="flex-1 space-y-1 text-left">
                            <div className="flex justify-between items-center text-[9px] text-gray-400 font-bold uppercase">
                              <span>Speed Pace</span>
                              <span className="font-mono text-purple-400 font-medium">{synthRate.toFixed(2)}x</span>
                            </div>
                            <input
                              type="range"
                              min="0.6"
                              max="1.6"
                              step="0.05"
                              value={synthRate}
                              onChange={(e) => setSynthRate(parseFloat(e.target.value))}
                              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Control Trigger */}
                      <button
                        onClick={() => handlePlayVoiceSynth(practiceSpeechText)}
                        className={`w-full py-3 px-4 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                          isPlayingVoice 
                            ? "bg-rose-500/20 border-rose-500 hover:bg-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(239,68,68,0.25)]" 
                            : "bg-purple-600 hover:bg-purple-500 border-purple-500/30 hover:border-purple-400 text-white shadow-[0_4px_20px_rgba(168,85,247,0.3)]"
                        }`}
                      >
                        {isPlayingVoice ? (
                          <>
                            <X size={14} className="animate-spin" /> Stop Voice Rehearsal
                          </>
                        ) : (
                          <>
                            <Play size={14} fill="currentColor" /> Playback Active Script Loop
                          </>
                        )}
                      </button>
                    </div>

                    {/* Segment Selector Card Row */}
                    {teleprompterMode === "segment" && (
                      <div className="bg-white/2 border border-white/5 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-mono font-bold">
                            SCENE {activeSegment?.id}
                          </span>
                          <span className="text-xs font-bold text-gray-300 max-w-[200px] truncate">
                            "{activeSegment?.label || "Hook"}"
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 font-mono">Target: {activeSegment?.timecode}</span>
                          <select
                            value={activeSegmentId}
                            onChange={(e) => {
                              setActiveSegmentId(e.target.value);
                              playAudioCue(587.33);
                            }}
                            className="bg-black/60 border border-white/10 rounded-xl px-2 py-1 text-white text-[11px] cursor-pointer focus:outline-none"
                          >
                            {timelineSegments.map((seg) => (
                              <option key={seg.id} value={seg.id}>
                                Scene {seg.id}: {seg.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Audio Decibels Spectrum & Pacing feedback block */}
                  <div className="lg:col-span-4 flex flex-col space-y-4">
                    <span className="text-xs uppercase font-extrabold text-purple-400 font-mono tracking-wider block text-left">
                      Pacing Analytics & Feed
                    </span>

                    {/* Score indicators list */}
                    <div className="bg-white/2 border border-white/5 p-4 rounded-2xl space-y-5 text-left">
                      
                      {/* Live Timer indicators */}
                      <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <span className="text-xs text-gray-400 uppercase font-bold text-[10px]">Elapsed Speak Time</span>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isPracticing ? "bg-red-500 animate-ping" : "bg-gray-500"}`} />
                          <span className="font-mono text-sm font-bold text-white tracking-widest">
                            {Math.floor(practiceTime / 60)}:{(practiceTime % 60).toString().padStart(2, '0')}
                          </span>
                        </div>
                      </div>

                      {/* Deliver Rating Gauge */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                          <span className="text-gray-400">Speech Speed Pace</span>
                          <span className={`text-[10px] font-extrabold uppercase ${
                            practiceTime === 0 ? "text-gray-500" :
                            (practiceTime >= totalTargetDuration - 2 && practiceTime <= totalTargetDuration + 3) ? "text-green-400" :
                            practiceTime < totalTargetDuration - 2 ? "text-cyan-400 animate-pulse" : "text-amber-500"
                          }`}>
                            {practiceTime === 0 ? "IDLE SEED" :
                             (practiceTime >= totalTargetDuration - 2 && practiceTime <= totalTargetDuration + 3) ? "HIGH RETENTION ZONE🎯" :
                             practiceTime < totalTargetDuration - 2 ? "AGGRESSIVE PACING ⚡" : "DISSOLVED RETENTION 🐢"}
                          </span>
                        </div>
                        
                        {/* Dynamic percentage outline bar */}
                        <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              practiceTime === 0 ? "w-0" :
                              (practiceTime >= totalTargetDuration - 2 && practiceTime <= totalTargetDuration + 3) ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" :
                              practiceTime < totalTargetDuration - 2 ? "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                            }`}
                            style={{ 
                              width: `${practiceTime === 0 ? 0 : Math.min(100, (practiceTime / Math.max(1, totalTargetDuration)) * 100)}%` 
                            }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-[8px] font-mono text-gray-500 uppercase mt-1">
                          <span>0% ELAPSED</span>
                          <span>TARGET TIME: {totalTargetDuration}s</span>
                          <span>MAX RANGE</span>
                        </div>
                      </div>

                      {/* Microphone decibel spectral layout canvas */}
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">
                          Sound decibel frequency metrics
                        </label>
                        <div className="relative w-full h-[65px] bg-black/60 rounded-xl overflow-hidden border border-white/5 flex items-center justify-center">
                          <canvas 
                            ref={canvasRef} 
                            width={320} 
                            height={65} 
                            className="w-full h-full block"
                          />
                          {!isPracticing && !isPlayingVoice && (
                            <span className="absolute text-[9px] uppercase font-mono font-bold text-gray-500 tracking-wider flex items-center gap-1.5 select-none bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
                              <Zap size={10} className="text-gray-500" /> MIC DETECT IDLE
                            </span>
                          )}
                          {isPlayingVoice && !isPracticing && (
                            <span className="absolute text-[9px] uppercase font-mono font-black text-purple-400 tracking-wider flex items-center gap-1.5 select-none bg-purple-950/40 px-3 py-1.5 rounded-full border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                              <Volume2 size={10} className="text-purple-400 animate-pulse" /> 🎙️ ROBOT SPEECH ACTIVE
                            </span>
                          )}
                          {isPracticing && (
                            <span className="absolute top-2 right-2 text-[8px] uppercase font-mono font-bold text-rose-400 tracking-wider flex items-center gap-1.5 select-none bg-rose-950/60 px-2 py-1 rounded-md border border-rose-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> LIVE PRACTICE REHEARSAL
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center text-[8px] font-mono text-gray-500 uppercase">
                          <span>30Hz BASS ENERGY</span>
                          <span>12KHz PRESENCE</span>
                        </div>
                      </div>

                      {/* Main trigger controller button */}
                      <button
                        onClick={() => {
                          if (!isPracticing) {
                            if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
                              audioCtxRef.current.resume();
                            }
                          }
                          setIsPracticing(!isPracticing);
                          playAudioCue(isPracticing ? 440 : 880);
                        }}
                        className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                          isPracticing 
                            ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/10 border border-red-500/20" 
                            : "bg-purple-500 hover:bg-purple-600 text-white shadow-purple-500/10 border border-purple-500/20"
                        }`}
                      >
                        {isPracticing ? (
                          <>
                            <span className="w-2 h-2 bg-white rounded-sm animate-pulse" /> STOP ACTIVE SPEECH Blueprints
                          </>
                        ) : (
                          <>
                            <Zap size={14} className="fill-white animate-pulse" /> START TIMING PRACTICE COACH
                          </>
                        )}
                      </button>

                    </div>

                    {/* Creative Tips checklist */}
                    <div className="bg-purple-500/5 border border-purple-500/10 p-3.5 rounded-xl space-y-2 select-none text-left">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-purple-400 flex items-center gap-1">
                        💡 RETENTION SPEECH INSTRUCTIONS
                      </span>
                      <ul className="text-[10px] text-gray-400 space-y-1.5 list-disc pl-3">
                        <li>Deliver sentences between <strong className="text-purple-400">135 - 150 WPM</strong> zones to prevent user finger-swipe actions.</li>
                        <li>Spike decibel volume levels sharply on the first <strong className="text-purple-400">3 seconds</strong> raw hook phrase.</li>
                        <li>Take advantage of deliberate millisecond micro-pauses at slide cuts.</li>
                      </ul>
                    </div>

                  </div>

                </div>
              </GlassCard>
            )}

          </div>

        </div>
      )}

      {/* Dedicated Recording Teleprompter & Speech Coach Section */}
      {activePrompterText && (
        <div id="dedicated-teleprompter-coach-section" className="mt-8 space-y-6 animate-in slide-in-from-bottom-8 duration-500">
          <GlassCard className="border-purple-500/30 bg-black/40 space-y-6 shadow-[0_0_50px_rgba(168,85,247,0.1)] relative">
            
            {/* Header / Title block */}
            <div className="flex flex-wrap justify-between items-center border-b border-white/5 pb-4 gap-4">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-purple-500 animate-ping" />
                <h2 className="text-sm uppercase font-black tracking-widest text-purple-400 font-sans flex items-center gap-2">
                  🎤 TELEPROMPTER & SPEECH COACH
                </h2>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setActivePrompterText("");
                    setIsScrolling(false);
                    playAudioCue(300);
                  }}
                  className="px-3 py-1 bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 border border-white/5 hover:border-rose-500/30 rounded-lg text-[10px] font-extrabold uppercase transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <X size={11} /> Clear Prompter
                </button>
              </div>
            </div>

            {/* Controls panel layout row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-black/60 p-5 rounded-2xl border border-white/5 items-center">
              
              {/* Play/Pause control */}
              <div className="flex justify-start">
                <button
                  onClick={() => {
                    setIsScrolling(!isScrolling);
                    playAudioCue(isScrolling ? 440 : 880);
                  }}
                  className={`w-full md:w-auto px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                    isScrolling 
                      ? "bg-rose-500/20 border-rose-500 text-rose-400 hover:bg-rose-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]" 
                      : "bg-emerald-600 hover:bg-emerald-500 border-emerald-500/30 text-white shadow-[0_4px_20px_rgba(16,185,129,0.3)]"
                  }`}
                >
                  {isScrolling ? (
                    <>
                      <Pause size={14} fill="currentColor" /> Pause Scroll
                    </>
                  ) : (
                    <>
                      <Play size={14} fill="currentColor" /> Play Autoscroll
                    </>
                  )}
                </button>
              </div>

              {/* Font Size Selector */}
              <div className="flex items-center justify-start md:justify-center gap-3">
                <span className="text-[10px] uppercase font-bold text-gray-400 font-mono">Font Display:</span>
                <div className="flex gap-1.5">
                  {(["text-xl", "text-3xl", "text-5xl"] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => {
                        setPrompterFontSize(size);
                        playAudioCue(600);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        prompterFontSize === size 
                          ? "bg-purple-500/20 border-purple-500 text-purple-400" 
                          : "bg-white/5 border-white/5 text-gray-400 hover:text-white"
                      }`}
                    >
                      {size === "text-xl" ? "Small" : size === "text-3xl" ? "Medium" : "Large"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pacing Speed configuration calibration slider */}
              <div className="flex flex-col space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
                  <span>Scrolling Velocity</span>
                  <span className="font-mono text-purple-400 font-black">{prompterSettings.scrollSpeedWpm} WPM</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="80"
                    max="240"
                    step="5"
                    value={prompterSettings.scrollSpeedWpm}
                    onChange={(e) => setPrompterSettings({ scrollSpeedWpm: parseInt(e.target.value) })}
                    className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <span className="text-[9px] font-mono text-gray-500">
                    Est: {getEstimatedWpm(activePrompterText)} WPM
                  </span>
                </div>
              </div>

            </div>

            {/* The Pitch-Black Screen Viewport monitor display block */}
            <div id="teleprompter-viewport" className="relative w-full h-[400px] bg-black border border-purple-500/20 rounded-2xl overflow-hidden flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.8)]">
              
              {/* Overlay reading bar visual focus alignment */}
              <div className="absolute top-1/2 left-0 w-full h-[80px] -translate-y-1/2 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 border-t border-b border-purple-500/30 pointer-events-none z-10 flex items-center justify-between px-8">
                <span className="text-[10px] uppercase tracking-widest font-mono text-purple-400 font-extrabold animate-pulse">▶ ACTIVE LINE</span>
                <span className="text-[10px] uppercase tracking-widest font-mono text-purple-400 font-extrabold animate-pulse">SPEECH COACH VIEWPORT 🎙️</span>
              </div>

              {/* Scrollable teleprompter screen text element */}
              <div
                ref={dedicatedPrompterScrollRef}
                className="flex-1 overflow-y-auto px-10 py-56 custom-scrollbar scroll-smooth"
              >
                <p 
                  className={`font-black tracking-tight leading-relaxed transition-all text-center uppercase whitespace-pre-wrap ${prompterFontSize} ${
                    prompterFontSize === "text-xl" ? "text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.5)]" :
                    prompterFontSize === "text-3xl" ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]" :
                    "text-cyan-300 drop-shadow-[0_0_15px_rgba(34,211,238,0.9)]"
                  }`}
                >
                  {activePrompterText}
                </p>
              </div>

            </div>

            {/* Practical instructions panel details footer */}
            <div className="bg-purple-950/20 border border-purple-500/10 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 select-none text-left">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-purple-400 flex items-center gap-1">
                  🎙️ STAGE SPEECH & RETENTION COACH DIRECTIONS
                </span>
                <p className="text-[10px] text-gray-400 leading-relaxed max-w-2xl">
                  Keep your eyes centered on the cyan active reading focus line. Speak loudly, enunciating key brand phrases, and maintain a consistent pace matched to the estimated scrolling velocity.
                </p>
              </div>
              <div className="bg-black/40 px-3.5 py-2 rounded-lg border border-white/5 text-center shrink-0">
                <span className="text-[8px] uppercase tracking-widest font-mono text-gray-500 block">WORDS</span>
                <span className="text-xs font-black text-white">{activePrompterText.split(/\s+/).filter(Boolean).length}</span>
              </div>
            </div>

          </GlassCard>
        </div>
      )}

    </div>
  );
};
