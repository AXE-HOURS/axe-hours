import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase } from '../context/FirebaseContext';
import { GlassCard } from '../components/GlassCard';
import { 
  Zap, 
  ArrowRight, 
  Gauge, 
  Flame, 
  Sparkles, 
  TrendingUp, 
  Copy, 
  Check, 
  Lightbulb, 
  AlertTriangle, 
  Sliders, 
  Volume2,
  FileDown,
  Share2,
  Play,
  Pause
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useToast } from '../context/ToastContext';
import { playAudioCue as playAudio } from '../utils/audio';

interface GenerationItem {
  id: number;
  title: string;
  content: string;
  date: string;
}

interface ViralHooksProps {
  onSelectHook: (item: GenerationItem) => void;
}

export const ViralHooks: React.FC<ViralHooksProps> = ({ onSelectHook }) => {
  const { addToast } = useToast();
  const { logUserActivity } = useFirebase();

  // Sounds wrapper
  const playAudioCue = (freq: number) => {
    playAudio(freq, "sine", 0.25);
  };

  // Preset Template inputs
  const [inputs, setInputs] = useState({
    commonAction: "building SaaS the hard way",
    unconventionalStrategy: "using 10-line prompt modules",
    desiredResult: "deploying profitable projects",
    timeframe: "24 hours",
    negativeState: "$0 MRR console",
    positiveState: "glowing neon dashboard payouts",
    experts: "software engineers",
    topic: "automated prompt scaling",
    process: "creator content pipeline",
    painPoint: "retaining viewers past 3 seconds"
  });

  // Title Analyzer state
  const [analyzedTitle, setAnalyzedTitle] = useState("Why 99% of developers FAIL under launch 🤦‍♂️");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Lab Tab Controller
  const [labTab, setLabTab] = useState<'metrics' | 'audio' | 'tips' | 'share'>('metrics');

  // Text-To-Speech synthesizer configurations
  const [isPlayingSynth, setIsPlayingSynth] = useState(false);
  const [synthVoiceName, setSynthVoiceName] = useState<string>('');
  const [synthVoices, setSynthVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [synthPitch, setSynthPitch] = useState<number>(1.0);
  const [synthRate, setSynthRate] = useState<number>(0.95);

  // Initialize Speech synthesis voice configs client-side
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

  // Clean-up speech synthesize if component unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleInputChange = (key: keyof typeof inputs, value: string) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const fillNichePresets = (nicheName: string) => {
    if (nicheName === "Cooking") {
      setInputs({
        commonAction: "boiling pasta standardly",
        unconventionalStrategy: "using starch-water reduction",
        desiredResult: "restaurant-grade cream textures",
        timeframe: "10 minutes",
        negativeState: "glubby store paste",
        positiveState: "gorgeous Michelin plates",
        experts: "Italian pastry chefs",
        topic: "gluten structural hydration",
        process: "active sauce starch binding",
        painPoint: "flat, watery sauces with no texture"
      });
      setAnalyzedTitle("How 99% of home cooks RUIN their pasta in 10 minutes! 🤦‍♂️");
      addToast("Loaded Foodie & Cooking variables! 🍳", "success");
    } else if (nicheName === "Fitness") {
      setInputs({
        commonAction: "drinking coffee directly on waking",
        unconventionalStrategy: "delaying cortisol by 90 minutes",
        desiredResult: "unbreakable clean morning stamina",
        timeframe: "24 hours",
        negativeState: "crashing afternoon fatigue",
        positiveState: "limitless athletic stamina",
        experts: "clinical biohackers",
        topic: "circadian cortisol alignment",
        process: "cold face-immersion sequence",
        painPoint: "crashing hard before 2 PM"
      });
      setAnalyzedTitle("Why 95% of gym-goers get ZERO actual muscle results! 🚨");
      addToast("Loaded Fitness & Muscle variables! ⚡", "success");
    } else if (nicheName === "Finance") {
      setInputs({
        commonAction: "stowing savings in standard bank accounts",
        unconventionalStrategy: "leveraging obscure digital royalties",
        desiredResult: "earning passive compound interest",
        timeframe: "30 days",
        negativeState: "0.01% standard interest",
        positiveState: "autopilot monthly pay distributions",
        experts: "private wealth solopreneurs",
        topic: "automated digital properties",
        process: "inflation-hedged asset locking",
        painPoint: "losing high purchasing power to inflation"
      });
      setAnalyzedTitle("Stop saving money in high-yield bank accounts! Do this instead 🤫");
      addToast("Loaded Personal Finance variables! 💰", "success");
    } else if (nicheName === "Travel") {
      setInputs({
        commonAction: "lugging massive check-in suitcases",
        unconventionalStrategy: "using a localized 20L backpack layout",
        desiredResult: "effortlessly skipping suitcase lines",
        timeframe: "3 months",
        negativeState: "paying $60 luggage penalties",
        positiveState: "breezing through checkpoints instantly",
        experts: "nomadic lightweight packers",
        topic: "ultra-minimalist packing charts",
        process: "geographic arbitrage travel",
        painPoint: "wasting hours waiting at carousel lanes"
      });
      setAnalyzedTitle("Bali is secretly too crowded: Why travellers are moving HERE instead! 🌴");
      addToast("Loaded Lifestyle & Travel variables! ✈️", "success");
    } else if (nicheName === "Gaming") {
      setInputs({
        commonAction: "deploying standard positional cover angles",
        unconventionalStrategy: "exploiting hidden map pixel slots",
        desiredResult: "absolutely locking down bomb sites solo",
        timeframe: "60 seconds",
        negativeState: "dropping silver ranked matches",
        positiveState: "ranking up to immortal status",
        experts: "pro-level competitive analysts",
        topic: "coordinate leverage pixel gaps",
        process: "spatial situational cover hacks",
        painPoint: "falling back to low tier performance lobbies"
      });
      setAnalyzedTitle("Why 99% of competitive gamers completely FAIL on this map loop! 💀");
      addToast("Loaded Gaming & Esports variables! 🎮", "success");
    } else {
      setInputs({
        commonAction: "building SaaS the hard way",
        unconventionalStrategy: "using 10-line prompt modules",
        desiredResult: "deploying profitable projects",
        timeframe: "24 hours",
        negativeState: "$0 MRR console",
        positiveState: "glowing neon dashboard payouts",
        experts: "software engineers",
        topic: "automated prompt scaling",
        process: "creator content pipeline",
        painPoint: "retaining viewers past 3 seconds"
      });
      setAnalyzedTitle("Why 99% of developers FAIL under launch 🤦‍♂️");
      addToast("Loaded Tech & Indiehacking variables! 💻", "success");
    }
    playAudioCue(587.33);
  };

  // Preset templates
  const hooks = [
    {
      id: 1,
      title: "The Negative Contrast Hook",
      description: "Stop-scroll hook that challenges standard creator beliefs by presenting a contrarian statement.",
      variables: [
        { label: "Common Action", key: "commonAction" as const },
        { label: "Unconventional Strategy", key: "unconventionalStrategy" as const },
        { label: "Desired Result", key: "desiredResult" as const },
        { label: "Timeframe", key: "timeframe" as const }
      ],
      ctr: "+7.4%",
      potential: "96%",
      compile: () => `Stop doing ${inputs.commonAction}. Instead, do ${inputs.unconventionalStrategy} to achieve ${inputs.desiredResult} in just ${inputs.timeframe}.`
    },
    {
      id: 2,
      title: "The Transformation Timeline",
      description: "Sets high-retention expectations by promising a specific change within a definite window.",
      variables: [
        { label: "Negative State", key: "negativeState" as const },
        { label: "Positive State", key: "positiveState" as const },
        { label: "Timeframe", key: "timeframe" as const }
      ],
      ctr: "+6.8%",
      potential: "94%",
      compile: () => `How I went from a ${inputs.negativeState} to ${inputs.positiveState} in just ${inputs.timeframe} using this one simple method.`
    },
    {
      id: 3,
      title: "The Underground Secret",
      description: "Drives maximum click-rate by offering hidden or exclusive insider information.",
      variables: [
        { label: "Target Experts", key: "experts" as const },
        { label: "Hidden Topic", key: "topic" as const }
      ],
      ctr: "+8.2%",
      potential: "98%",
      compile: () => `The underground secret top ${inputs.experts} don't want you to know about ${inputs.topic}.`
    }
  ];

  // --- SCIENTIFIC CTR HEURISTIC HEURISTICS COMPILER ---
  const scores = useMemo(() => {
    const t = analyzedTitle.trim().toLowerCase();
    if (!t) return { total: 0, tension: 0, curiosity: 0, payoff: 0, length: 0 };

    // 1. Tension Score (Contrarian / Loss aversion psychology)
    let tension = 30;
    const tensionWords = ["stop", "fail", "lying", "wrong", "mistake", "never", "ruin", "waste", "avoid", "dead", "killing", "useless", "scam", "scared", "shocking", "fools", "broken", "lies"];
    tensionWords.forEach(w => {
      if (t.includes(w)) tension += 22;
    });
    if (t.includes("!") || t.includes("?")) tension += 10;
    tension = Math.min(100, Math.max(30, tension));

    // 2. Curiosity Loop Score (Obscure mysteries)
    let curiosity = 35;
    const curiosityWords = ["secret", "underground", "hidden", "loophole", "cheat", "trick", "obscure", "unveiled", "behind", "forgotten", "confession", "silently", "hack", "privately", "insider"];
    curiosityWords.forEach(w => {
      if (t.includes(w)) curiosity += 20;
    });
    if (t.includes("why") || t.includes("how") || t.includes("what")) curiosity += 15;
    curiosity = Math.min(100, Math.max(35, curiosity));

    // 3. Concrete Payoff (Precision value details: metrics / numbers / duration)
    let payoff = 25;
    if (/\d+/.test(t)) payoff += 25; // Simple number detector
    if (t.includes("$") || t.includes("mrr") || t.includes("m") || t.includes("k") || t.includes("%") || t.includes("usd")) payoff += 20;
    const payoffWords = ["profitable", "earnings", "dollars", "growth", "results", "launch", "deploy", "optimize", "acquisition", "clients", "leads", "revenue", "saved"];
    payoffWords.forEach(w => {
      if (t.includes(w)) payoff += 15;
    });
    payoff = Math.min(100, Math.max(25, payoff));

    // 4. Structural Length Compliance (Optimal character window: 40-65 chars)
    let lenScore = 100;
    const charLen = analyzedTitle.length;
    if (charLen === 0) {
      lenScore = 0;
    } else if (charLen < 25) {
      lenScore = 55; // Too brief to outline topics
    } else if (charLen > 70) {
      lenScore = Math.max(35, 100 - (charLen - 70) * 2.5); // Mobile ellipsis truncate penalty
    }

    // Weighting for organic CTR prediction representation
    const total = Math.round((tension * 0.32) + (curiosity * 0.28) + (payoff * 0.25) + (lenScore * 0.15));

    return { total, tension, curiosity, payoff, length: lenScore };
  }, [analyzedTitle]);

  // Local optimization recommendations
  const feedbackTips = useMemo(() => {
    const list = [];
    const t = analyzedTitle.trim().toLowerCase();
    
    if (analyzedTitle.length === 0) return [];

    if (analyzedTitle.length < 25) {
      list.push({ type: "warning", text: "Too brief! Headline lacks details to establish viewer hooks. Goal: 40-65 characters." });
    } else if (analyzedTitle.length > 68) {
      list.push({ type: "warning", text: " Ellipsis warning! Title might get cut-off on mobile viewport feeds. Keep under 68 characters." });
    } else {
      list.push({ type: "success", text: "Perfect Title Length! Fits beautifully in social & mobile recommendations feeds." });
    }

    if (scores.tension < 60) {
      list.push({ type: "info", text: "Integrate high loss-aversion or warning-based constraints (e.g. 'Stop doing', 'Why 99% fail') to raise CTR." });
    } else {
      list.push({ type: "success", text: "Excellent psychological friction captures rapid feedback cycles." });
    }

    if (scores.curiosity < 60) {
      list.push({ type: "info", text: "Add curiosity triggers like 'Loophole', 'Hidden', or 'Obscure' to trigger immediate speculation." });
    } else {
      list.push({ type: "success", text: "Compelling interest loop successfully holds viewer intrigue." });
    }

    if (scores.payoff < 60) {
      list.push({ type: "info", text: "Outline concrete numbers, metrics, or durations (e.g. '10-line script', 'in 24 hours') to provide proof." });
    } else {
      list.push({ type: "success", text: "Value proposition has high, believable outcome verification." });
    }

    return list;
  }, [analyzedTitle, scores]);

  // Derive smart automated improvements
  const refinedAlternatives = useMemo(() => {
    const titleLower = analyzedTitle.toLowerCase();
    
    // Stop words to clean extracted topics
    const stopwords = new Set([
      "why", "how", "what", "who", "when", "where", "which", "whose", "whom",
      "people", "person", "someone", "somebody", "anyone", "anybody", "everyone", "everybody",
      "fail", "fails", "failed", "failing", "success", "succeed", "succeeds", "successful",
      "the", "a", "an", "and", "or", "but", "if", "of", "at", "by", "for", "with", "about", "against", "between", "into", "through", "during", "before", "after", "above", "below", "to", "from", "up", "down", "in", "out", "on", "off", "over", "under", "again", "further", "then", "once",
      "here", "there", "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s", "t", "can", "will", "just", "don", "should", "now", "are", "is", "am", "was", "were", "be", "been", "being", "have", "has", "had", "having", "do", "does", "did", "doing",
      "this", "that", "these", "those", "like", "get", "gets", "got", "getting", "make", "makes", "made", "making", "about",
      "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours", "yourself", "yourselves", "he", "him", "his", "himself", "she", "her", "hers", "herself", "it", "its", "itself", "they", "them", "their", "theirs", "themselves"
    ]);

    // Split title, clean punctuation, filter length, and exclude stop words
    const filteredWords = analyzedTitle
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .map(w => w.replace(/[^a-zA-Z]/g, ""))
      .filter(w => w.length > 2 && !stopwords.has(w));

    // Get the most significant words or generic fallback
    const rawNoun1 = filteredWords[0] || "Concept";
    const rawNoun2 = filteredWords[1] || "Strategy";

    // Capitalize beautifully
    const keyword = rawNoun1.charAt(0).toUpperCase() + rawNoun1.slice(1).toLowerCase();
    const subKeyword = rawNoun2.charAt(0).toUpperCase() + rawNoun2.slice(1).toLowerCase();

    // 1. SPORTS & ATHLETICS
    if (
      titleLower.includes("cricket") || 
      titleLower.includes("bowl") || 
      titleLower.includes("run") || 
      titleLower.includes("match") || 
      titleLower.includes("stump") ||
      titleLower.includes("wicket") ||
      titleLower.includes("player") ||
      titleLower.includes("game") ||
      titleLower.includes("sport") ||
      titleLower.includes("football") ||
      titleLower.includes("soccer") ||
      titleLower.includes("nba") ||
      titleLower.includes("hoop") ||
      titleLower.includes("tennis") ||
      titleLower.includes("athlete") ||
      titleLower.includes("tait") ||
      titleLower.includes("batsman") ||
      titleLower.includes("innings") ||
      titleLower.includes("highlights") ||
      titleLower.includes("fast bowler")
    ) {
      const topic = titleLower.includes("cricket") ? "Cricket" : (titleLower.includes("football") ? "Football" : keyword);
      return [
        {
          style: "Contrarian Challenge",
          title: `Stop playing ${topic.toLowerCase()} like standard amateurs: Use this outlier technique instead! 🏆`,
          score: Math.min(98, scores.total + 15)
        },
        {
          style: "Unconventional Timeframe",
          title: `Why 99% fail to master ${topic}: The simple high-velocity play that doubled my performance in 7 days ⚡`,
          score: Math.min(97, scores.total + 12)
        },
        {
          style: "Curiosity Underground Secret",
          title: `The obscure ${topic.toLowerCase()} secret elite coaches keep completely hidden from the league. 🚀`,
          score: Math.min(96, scores.total + 14)
        }
      ];
    }

    // 2. COOKING & FOOD
    if (
      titleLower.includes("recipe") || 
      titleLower.includes("cook") || 
      titleLower.includes("food") || 
      titleLower.includes("chef") || 
      titleLower.includes("kitchen") || 
      titleLower.includes("ramen") || 
      titleLower.includes("bake") || 
      titleLower.includes("taste") || 
      titleLower.includes("eat") || 
      titleLower.includes("restaurant") ||
      titleLower.includes("sauce") ||
      titleLower.includes("dish") ||
      titleLower.includes("recipe") ||
      titleLower.includes("meal")
    ) {
      const topic = titleLower.includes("recipe") ? "recipes" : (titleLower.includes("ramen") ? "ramen" : keyword.toLowerCase());
      return [
        {
          style: "Contrarian Challenge",
          title: `Stop preparing ${topic} like ordinary home cooks: Try this Michelin technique! 🍳`,
          score: Math.min(98, scores.total + 16)
        },
        {
          style: "Unconventional Timeframe",
          title: `Why 99% fail to make the perfect ${topic}: Master this absolute texture or timing loophole ⚡`,
          score: Math.min(97, scores.total + 13)
        },
        {
          style: "Curiosity Underground Secret",
          title: `The obscure five-star cooking secret top masterchefs keep completely hidden. 🤫`,
          score: Math.min(96, scores.total + 15)
        }
      ];
    }

    // 3. GAMING
    if (
      titleLower.includes("game") || 
      titleLower.includes("gaming") || 
      titleLower.includes("gamer") || 
      titleLower.includes("glitch") || 
      titleLower.includes("minecraft") || 
      titleLower.includes("roblox") || 
      titleLower.includes("fortnite") || 
      titleLower.includes("speedrun") || 
      titleLower.includes("twitch") || 
      titleLower.includes("level") ||
      titleLower.includes("xbox") ||
      titleLower.includes("ps5") ||
      titleLower.includes("nintendo") ||
      titleLower.includes("retro")
    ) {
      const topic = titleLower.includes("minecraft") ? "Minecraft" : (titleLower.includes("fortnite") ? "Fortnite" : keyword);
      return [
        {
          style: "Contrarian Challenge",
          title: `Stop playing ${topic} like casual gamers: Activate this advanced trick immediately! 🎮`,
          score: Math.min(98, scores.total + 14)
        },
        {
          style: "Unconventional Timeframe",
          title: `Why 99% fail to complete this ${topic} level: How I reached rank 100 in hours ⚡`,
          score: Math.min(97, scores.total + 11)
        },
        {
          style: "Curiosity Underground Secret",
          title: `The obscure ${topic} engine glitch professional speedrunners keep hidden from developers. 🤫`,
          score: Math.min(96, scores.total + 16)
        }
      ];
    }

    // 4. TRAVEL & LIFESTYLE / VLOGGING
    if (
      titleLower.includes("travel") || 
      titleLower.includes("trip") || 
      titleLower.includes("vlog") || 
      titleLower.includes("hotel") || 
      titleLower.includes("flight") || 
      titleLower.includes("island") || 
      titleLower.includes("city") || 
      titleLower.includes("budget") || 
      titleLower.includes("explore") || 
      titleLower.includes("secret place") ||
      titleLower.includes("backpack") ||
      titleLower.includes("world") ||
      titleLower.includes("sightseeing")
    ) {
      const topic = titleLower.includes("hotel") ? "Hotel" : (titleLower.includes("vlog") ? "Vlog" : keyword);
      return [
        {
          style: "Contrarian Challenge",
          title: `Stop visiting ${topic} like standard tourists: Experience this underground route! ✈️`,
          score: Math.min(98, scores.total + 12)
        },
        {
          style: "Unconventional Timeframe",
          title: `Why 99% spend too much on ${topic} bookings: How I travel five-star for cheaper ⚡`,
          score: Math.min(97, scores.total + 14)
        },
        {
          style: "Curiosity Underground Secret",
          title: `The obscure ${topic} booking loophole airline reservation platforms keep completely hidden. 🤫`,
          score: Math.min(96, scores.total + 16)
        }
      ];
    }

    // 5. BUSINESS & ENTREPRENEURSHIP & STARTUPS & MARKETING
    if (
      titleLower.includes("business") || 
      titleLower.includes("entrepreneur") || 
      titleLower.includes("startup") || 
      titleLower.includes("agency") || 
      titleLower.includes("marketing") || 
      titleLower.includes("sales") || 
      titleLower.includes("company") || 
      titleLower.includes("brand") || 
      titleLower.includes("product") || 
      titleLower.includes("hustle") || 
      titleLower.includes("passive income") || 
      titleLower.includes("scale") || 
      titleLower.includes("career") || 
      titleLower.includes("job") || 
      titleLower.includes("work") || 
      titleLower.includes("money") ||
      titleLower.includes("rich") ||
      titleLower.includes("wealth") ||
      titleLower.includes("success")
    ) {
      const topic = titleLower.includes("entrepreneur") ? "Entrepreneurship" : (titleLower.includes("marketing") ? "Marketing" : keyword);
      return [
        {
          style: "Contrarian Challenge",
          title: `Stop running your ${topic.toLowerCase()} like standard amateurs: Do this outlier strategy! 📈`,
          score: Math.min(98, scores.total + 15)
        },
        {
          style: "Unconventional Timeframe",
          title: `Why 99% fail with ${topic}: How I built an elite workflow in just 30 days ⚡`,
          score: Math.min(97, scores.total + 14)
        },
        {
          style: "Curiosity Underground Secret",
          title: `The obscure ${topic.toLowerCase()} cheat code that self-made founders keep hidden. 🤫`,
          score: Math.min(96, scores.total + 16)
        }
      ];
    }

    // 6. FINANCE & MONEY & INVESTING & CRYPTO
    if (
      titleLower.includes("cash") || 
      titleLower.includes("invest") || 
      titleLower.includes("finance") || 
      titleLower.includes("crypto") || 
      titleLower.includes("bitcoin") || 
      titleLower.includes("stock") || 
      titleLower.includes("shares") || 
      titleLower.includes("mrr") ||
      titleLower.includes("revenue") ||
      titleLower.includes("profit") ||
      titleLower.includes("portfolio") ||
      titleLower.includes("saving") ||
      titleLower.includes("budgeting")
    ) {
      const topic = titleLower.includes("crypto") ? "Crypto" : keyword;
      return [
        {
          style: "Contrarian Challenge",
          title: `Stop investing in ${topic.toLowerCase()} like standard amateurs: Do this loophole instead! 💰`,
          score: Math.min(98, scores.total + 15)
        },
        {
          style: "Unconventional Timeframe",
          title: `Why 99% fail to profit from ${topic}: How I built a $10K passive stream in 12 days 🚀`,
          score: Math.min(97, scores.total + 16)
        },
        {
          style: "Curiosity Underground Secret",
          title: `The obscure ${topic} investment secret top 1% wealth managers hide from you. 🤫`,
          score: Math.min(96, scores.total + 14)
        }
      ];
    }

    // 7. HEALTH, FITNESS & LIFE HABITS
    if (
      titleLower.includes("gym") || 
      titleLower.includes("workout") || 
      titleLower.includes("fitness") || 
      titleLower.includes("weight") || 
      titleLower.includes("muscle") || 
      titleLower.includes("diet") || 
      titleLower.includes("sleep") || 
      titleLower.includes("habit") || 
      titleLower.includes("health") || 
      titleLower.includes("routine") ||
      titleLower.includes("lazy") ||
      titleLower.includes("focus") ||
      titleLower.includes("stretch") ||
      titleLower.includes("cardio")
    ) {
      const topic = titleLower.includes("diet") ? "diet" : (titleLower.includes("workout") ? "workout" : keyword.toLowerCase());
      return [
        {
          style: "Contrarian Challenge",
          title: `Stop approaching your ${topic} like standard beginners: Use this biology trick! 🏃‍♂️`,
          score: Math.min(98, scores.total + 14)
        },
        {
          style: "Unconventional Timeframe",
          title: `Why 99% fail to stay consistent with their ${topic}: The 5-minute hack that works ⚡`,
          score: Math.min(97, scores.total + 13)
        },
        {
          style: "Curiosity Underground Secret",
          title: `The obscure body-science secret elite athletes use that remains completely hidden. 🤫`,
          score: Math.min(96, scores.total + 15)
        }
      ];
    }

    // 8. TECH, CODING, DEVELOPERS & SAAS
    if (
      titleLower.includes("code") || 
      titleLower.includes("dev") || 
      titleLower.includes("react") || 
      titleLower.includes("javascript") || 
      titleLower.includes("python") ||
      titleLower.includes("software") ||
      titleLower.includes("ai") ||
      titleLower.includes("prompt") ||
      titleLower.includes("gemini") ||
      titleLower.includes("copilot") ||
      titleLower.includes("api") ||
      titleLower.includes("saas") ||
      titleLower.includes("server")
    ) {
      const topic = titleLower.includes("saas") ? "SaaS" : keyword;
      const act = titleLower.includes("react") || titleLower.includes("javascript") ? "code" : "build";
      const tool = titleLower.includes("prompt") || titleLower.includes("ai") ? "prompt" : "software";
      return [
        {
          style: "Contrarian Challenge",
          title: `Stop building ${topic.toLowerCase()} like standard developers: Do this ${subKeyword.toLowerCase() || 'frictionless'} loophole instead! 🤫`,
          score: Math.min(98, scores.total + 15)
        },
        {
          style: "Unconventional Timeframe",
          title: `Why 99% fail to ${act} ${topic}: How I automated a ${tool} MVP in just 12 hours ⚡`,
          score: Math.min(97, scores.total + 12)
        },
        {
          style: "Curiosity Underground Secret",
          title: `The obscure ${topic.toLowerCase()} system top engineers keep completely hidden from you. (Deploy in seconds) 🚀`,
          score: Math.min(96, scores.total + 14)
        }
      ];
    }

    // 9. GENERAL / CATCH-ALL
    const displayKeyword = keyword !== "Concept" ? keyword : "Content";
    return [
      {
        style: "Contrarian Challenge",
        title: `Stop approaching ${displayKeyword.toLowerCase()} like standard amateurs: Try this outlier strategy! 💡`,
        score: Math.min(98, scores.total + 15)
      },
      {
        style: "Unconventional Timeframe",
        title: `Why 99% of people fail to master ${displayKeyword}: Do this single mindset loophole instead ⚡`,
        score: Math.min(97, scores.total + 13)
      },
      {
        style: "Curiosity Underground Secret",
        title: `The obscure ${displayKeyword.toLowerCase()} blueprint top-performing creators keep hidden from you. 🤫`,
        score: Math.min(96, scores.total + 14)
      }
    ];
  }, [analyzedTitle, scores]);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    playAudioCue(880);
    addToast("Refined concept title copied successfully! 📋", "success");
    logUserActivity('import_hook', 'Copied Hook text', `Copied a hook line of ${text.length} characters to clipboard: "${text.substring(0, 50)}..."`);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleImportToArchitect = (compiledText: string) => {
    onSelectHook({
      id: Date.now(),
      title: compiledText,
      content: "",
      date: new Date().toLocaleTimeString()
    });
    playAudioCue(523.25);
    logUserActivity('import_hook', 'Imported Hook to Architect', `Transferred viral hook template style to the AI script generation canvas.`);
  };

  // Text-To-Speech audio preview engine for active title or generated concepts
  const handlePlayVoiceSynth = (textToSpeak: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      addToast("Your browser does not support local SpeechSynthesis audio previewing.", "warning");
      return;
    }

    if (isPlayingSynth) {
      window.speechSynthesis.cancel();
      setIsPlayingSynth(false);
      addToast("Audio voice preview terminated.", "info");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    
    // Attempt to locate selected voice object
    if (synthVoiceName) {
      const activeVoiceObj = window.speechSynthesis.getVoices().find(v => v.name === synthVoiceName);
      if (activeVoiceObj) {
        utterance.voice = activeVoiceObj;
      }
    }

    utterance.pitch = synthPitch;
    utterance.rate = synthRate;

    utterance.onend = () => {
      setIsPlayingSynth(false);
    };

    utterance.onerror = (err) => {
      console.warn("Speech synthesis error event:", err);
      setIsPlayingSynth(false);
    };

    setIsPlayingSynth(true);
    window.speechSynthesis.speak(utterance);
    playAudioCue(600); // sound chime
    addToast("Generating real-time voice preview... 🎙️", "success");
  };

  // PDF Export Engine with beautiful metrics layout
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Header block setup
      doc.setFillColor(15, 12, 28); // Deep cosmic dark purple-grey
      doc.rect(0, 0, 210, 50, 'F');

      doc.setTextColor(168, 85, 247); // Light purple accent
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("AXE HOURS: CREATIVE BRIEF", 15, 20);

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("COGNITIVE INSIGHTS REPORT & VIRAL OUTLIER OUTLINE", 15, 28);
      doc.text(`DATE GENERATED: ${new Date().toLocaleDateString()} @ ${new Date().toLocaleTimeString()}`, 15, 36);

      // Section 1: Analyzed Concept
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("1. TESTED VIRAL CONCEPT", 15, 65);

      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.4);
      doc.line(15, 68, 195, 68);

      doc.setFont("italic");
      doc.setFontSize(13);
      doc.setTextColor(124, 58, 237); // Purple text
      const splitTitle = doc.splitTextToSize(`"${analyzedTitle}"`, 175);
      doc.text(splitTitle, 15, 76);

      // Section 2: Cognitive Metrics Scores list
      let nextY = 88 + (splitTitle.length - 1) * 6;
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("2. COGNITIVE HEURISTICS TARGET OUTLINE", 15, nextY);
      doc.line(15, nextY + 3, 195, nextY + 3);

      doc.setFont("normal");
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      
      const metricsList = [
        `• Predicted CTR Quality: ${scores.total}% (Evaluation: ${scores.total >= 85 ? 'Platinum Tier - High Velocity Outlier' : scores.total >= 65 ? 'Gold Tier - Highly Viable' : 'Marginal Tier - Normal scroll risk'})`,
        `• Audience Curiosity Loop Index: ${scores.curiosity}%`,
        `• Emotional & Psychological Tension Level: ${scores.tension}%`,
        `• Direct Value/Payoff Demonstration: ${scores.payoff}%`,
        `• Optimal Character Window Length Score: ${Math.round(scores.length)}% (${analyzedTitle.length} characters)`
      ];

      metricsList.forEach((m, idx) => {
        doc.text(m, 18, nextY + 10 + (idx * 7));
      });

      // Section 3: Diagnostic Feedback
      nextY = nextY + 50;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("3. CLINICAL DIAGNOSTICS & RETENTION FEEDBACK", 15, nextY);
      doc.line(15, nextY + 3, 195, nextY + 3);

      doc.setFont("normal");
      doc.setFontSize(9.5);
      doc.setTextColor(90, 90, 90);
      
      feedbackTips.forEach((tip, idx) => {
        const prefix = tip.type === 'warning' ? "[!) WARNING: " : tip.type === 'info' ? "[(i) TIP: " : "[✓] SUCCESS: ";
        const cleanText = `${idx + 1}. ${prefix}${tip.text}`;
        const splitTip = doc.splitTextToSize(cleanText, 175);
        doc.text(splitTip, 18, nextY + 10 + (idx * 12));
      });

      // Section 4: Improved variations
      nextY = nextY + 65;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("4. SUGGESTED HIGH-CONVERTING ALTERNATIVES", 15, nextY);
      doc.line(15, nextY + 3, 195, nextY + 3);

      refinedAlternatives.forEach((alt, idx) => {
        const altText = `Style: ${alt.style} (Predicted Score: ${alt.score}%)`;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(109, 40, 217);
        doc.text(altText, 18, nextY + 10 + (idx * 15));

        doc.setFont("italic");
        doc.setFontSize(9.5);
        doc.setTextColor(50, 50, 50);
        const splitAltTitle = doc.splitTextToSize(`"${alt.title}"`, 170);
        doc.text(splitAltTitle, 20, nextY + 15 + (idx * 15));
      });

      // Footer branding border
      doc.setFillColor(15, 12, 28);
      doc.rect(0, 285, 210, 12, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text("AXE HOURS INC. - COGNITIVE NARRATIVE ANALYTICS ENGINE", 15, 292);
      doc.text("PAGE 1-OF-1 CREATED IN STUDIO VAULT", 160, 292);

      const fnSafe = analyzedTitle.toLowerCase().slice(0, 20).replace(/[^a-z0-9]+/g, "_");
      doc.save(`axehours_creative_stats_${fnSafe}.pdf`);
      addToast("Primal Creative Brief downloaded to your device as PDF outline securely! 🌌", "success");
      playAudioCue(1046.50);
    } catch (e: any) {
      addToast("Failed to output PDF structure: " + e.message, "error");
    }
  };

  // Quick Share url generator
  const handleQuickShare = (platform: 'twitter' | 'linkedin' | 'whatsapp') => {
    const textToShare = `Optimized hook title with Axe Hours (+82% predicted CTR!): \n"${analyzedTitle}" \nBuild yours free: ${window.location.origin}`;
    const encoded = encodeURIComponent(textToShare);
    let href = '';

    if (platform === 'twitter') {
      href = `https://twitter.com/intent/tweet?text=${encoded}`;
    } else if (platform === 'linkedin') {
      href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin)}`;
    } else if (platform === 'whatsapp') {
      href = `https://api.whatsapp.com/send?text=${encoded}`;
    }

    if (href) {
      window.open(href, '_blank', 'noreferrer,noopener');
      addToast(`Opening ${platform} social composer window! 🚀`, "success");
    }
  };

  return (
    <div id="viral-hooks-view" className="space-y-8 animate-in fade-in duration-500 relative z-10 w-full max-w-7xl mx-auto">
      <div id="viral-hooks-header-block" className="select-none">
        <h1 id="viral-hooks-title" className="text-3xl font-extrabold text-white mb-2 flex items-center gap-2">
          <Zap className="text-yellow-400 fill-current" size={28} /> Interactive Hooks & CTR Lab
        </h1>
        <p id="viral-hooks-subtitle" className="text-on-surface-variant text-sm font-light mt-1">
          Polish structured script blueprints or stress-test custom video titles using our real-time cognitive metrics calculator.
        </p>
      </div>

      <div id="viral-hooks-main-grid" className="grid grid-cols-1 xl:grid-cols-12 gap-8 select-text">
        
        {/* LEFT COLUMN: INTERACTIVE BLUEPRINT TEMPLATES (6 cols) */}
        <div className="xl:col-span-6 space-y-6">
          <div className="flex flex-col gap-3 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="text-purple-400" size={18} />
              <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono">Fill Preset Blueprints</h2>
            </div>
            
            {/* Quick Niche Prefiller Toolbar */}
            <div className="flex flex-col gap-1.5 bg-[#581c87]/5 border border-[#a855f7]/15 p-2 rounded-xl">
              <span className="text-[9.5px] uppercase text-purple-300 font-extrabold font-mono tracking-wider">⚡ First-Time User: Prefill industry variables</span>
              <div className="flex gap-1 overflow-x-auto scrollbar-none py-0.5">
                {[
                  { name: "Tech", label: "Tech 💻" },
                  { name: "Cooking", label: "Cooking 🍳" },
                  { name: "Fitness", label: "Fitness ⚡" },
                  { name: "Finance", label: "Wealth 💰" },
                  { name: "Travel", label: "Travel ✈️" },
                  { name: "Gaming", label: "Gaming 🎮" },
                ].map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => fillNichePresets(item.name)}
                    className="px-2.5 py-1 text-[10px] font-black uppercase text-gray-300 hover:text-white bg-white/5 rounded-lg border border-white/5 hover:border-purple-500/40 cursor-pointer whitespace-nowrap transition-all"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {hooks.map((hook, idx) => {
              const compiledText = hook.compile();
              return (
                <GlassCard 
                  key={hook.id} 
                  id={`hook-card-${hook.id}`} 
                  glowColor={idx % 2 === 0 ? "amber" : "purple"}
                  className="flex flex-col justify-between space-y-6 border-white/5 transition-all hover:scale-[1.005]"
                >
                  <div>
                    <div id="hook-item-header" className="flex justify-between items-start gap-4 mb-3 select-none">
                      <h3 id={`hook-item-title-${hook.id}`} className="text-sm font-black text-white tracking-wider uppercase leading-none">{hook.title}</h3>
                      <span id={`hook-item-badge-${hook.id}`} className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-md text-[9px] font-black font-mono">CTR {hook.ctr}</span>
                    </div>
                    <p id={`hook-item-desc-${hook.id}`} className="text-[11.5px] text-gray-400 mb-5 font-light leading-relaxed select-none">{hook.description}</p>
                    
                    <div id="hook-item-inputs" className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-black/45 p-4 rounded-xl border border-white/5 mb-5 select-none">
                      {hook.variables.map((v) => (
                        <div key={v.key} className="space-y-1">
                          <label className="text-[9px] text-gray-400 font-bold uppercase tracking-wider font-mono">{v.label}</label>
                          <input 
                            type="text" 
                            value={inputs[v.key]} 
                            onChange={(e) => handleInputChange(v.key, e.target.value)} 
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-purple-500" 
                          />
                        </div>
                      ))}
                    </div>
                    <div id={`hook-item-compiled-${hook.id}`} className="bg-black/60 p-3.5 rounded-xl border border-purple-500/20 font-mono text-xs text-purple-200 leading-relaxed shadow-inner">
                      "{compiledText}"
                    </div>
                  </div>
                  <button 
                    id={`hook-item-import-btn-${hook.id}`}
                    onClick={() => {
                      handleImportToArchitect(compiledText);
                      addToast("Blueprint hook loaded into Generation workspace! ⚡", "success");
                    }} 
                    className="w-full py-3 bg-purple-600/10 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/20 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 cursor-pointer transition-all select-none duration-250 hover:shadow-lg hover:shadow-purple-750/20"
                  >
                    <span>Import to AI Architect</span>
                    <ArrowRight size={13} />
                  </button>
                </GlassCard>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: COGNITIVE HEURISTICS & TITLE CTR STRESS TESTER (6 cols) */}
        <div id="viral-hooks-stress-tester-col" className="xl:col-span-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Gauge className="text-yellow-400" size={18} />
            <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono">Cognitive Title Stress-Tester</h2>
          </div>

          <GlassCard id="title-ctr-stress-tester-card" glowColor="gold" className="border-amber-500/15 p-5 space-y-6">
            <p className="text-xs text-gray-400 font-light leading-relaxed select-none">
              Type or refine your conceptual video titles below. Our offline analytical heuristics scorecard will inspect target modifiers to predict search interest patterns and click rates instantly.
            </p>

            {/* Input video title box */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center select-none">
                <label className="text-[10px] text-amber-400 font-bold uppercase tracking-wider font-mono">Video Title to Predict</label>
                <span className={`text-[9px] font-mono font-bold ${analyzedTitle.length > 70 ? 'text-rose-400' : 'text-gray-500'}`}>
                  {analyzedTitle.length} chars
                </span>
              </div>
              <div className="relative flex items-center">
                <input 
                  type="text" 
                  value={analyzedTitle}
                  onChange={(e) => {
                    setAnalyzedTitle(e.target.value);
                    if (e.target.value.length % 5 === 0) playAudioCue(300 + e.target.value.length * 4);
                  }}
                  placeholder="e.g. How to coded saas using AI"
                  className="w-full bg-black/45 border border-white/10 rounded-xl p-3 pr-10 text-xs text-white outline-none focus:border-amber-400 font-semibold"
                />
                {analyzedTitle && (
                  <button 
                    onClick={() => { setAnalyzedTitle(""); playAudioCue(220); }} 
                    className="absolute right-3 text-gray-500 hover:text-white text-xs cursor-pointer select-none font-mono font-black"
                    title="Clear query"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Combined Metrics Dashboard Output */}
            {analyzedTitle.trim() ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* LAB TOOLBAR TABS STRIP */}
                <div className="flex border-b border-white/5 pb-1 gap-1 overflow-x-auto scrollbar-none select-none">
                  <button
                    type="button"
                    onClick={() => { setLabTab("metrics"); playAudioCue(400); }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                      labTab === "metrics"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    📊 Cognitive CTR Score
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLabTab("audio"); playAudioCue(450); }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                      labTab === "audio"
                        ? "bg-purple-500/15 text-purple-300 border border-purple-500/20"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    🎙️ Audio Voice Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLabTab("tips"); playAudioCue(500); }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                      labTab === "tips"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    💡 Retention Tips
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLabTab("share"); playAudioCue(550); }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                      labTab === "share"
                        ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    📥 Export & Share
                  </button>
                </div>

                {/* TAB 1: COGNITIVE SCORE */}
                {labTab === "metrics" && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    {/* Dial Radial Section */}
                    <div className="flex items-center gap-5 bg-black/45 p-4 rounded-2xl border border-white/5">
                      <div className="relative w-18 h-18 shrink-0 flex items-center justify-center select-none">
                        <div className="absolute inset-0 rounded-full border-4 border-white/5" />
                        <div className="absolute inset-0 rounded-full border-4 border-amber-500 transition-all duration-500" style={{ clipPath: `polygon(50% 50%, -50% -50%, ${scores.total >= 50 ? '150%' : '50%'} -50%, ${scores.total >= 75 ? '150%' : '150%'} 150%, 150% 150%, 50% 150%)`, opacity: scores.total / 100 }} />
                        <div className="text-center">
                          <span className="text-xl font-black text-white font-mono">{scores.total}%</span>
                          <span className="text-[7.5px] text-gray-400 uppercase font-bold block leading-none">Predicted</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Flame className="text-amber-400 animate-pulse" size={14} />
                          <h4 className="text-xs font-extrabold text-white">Predicted CTR Quality</h4>
                        </div>
                        <p className="text-[10px] text-gray-400 font-light leading-relaxed select-text">
                          {scores.total >= 85 ? "🔥 Platinum Tier Hook: Sensational mental strain captures viewer scroll instantly. Highly scalable." :
                           scores.total >= 65 ? "⚡ Gold Tier: Solid value components but lacks that extreme contrarian spark to prompt heavy recommendations." :
                           "⚠️ Marginal Tier: Standard wording triggers mental auto-filters. Add curiosity loop loopholes soon."
                          }
                        </p>
                      </div>
                    </div>

                    {/* Sub-metric meters */}
                    <div className="grid grid-cols-2 gap-4 select-none">
                      <div className="p-3 bg-black/30 border border-white/5 rounded-xl space-y-1.5">
                        <div className="flex justify-between items-baseline text-[9.5px]">
                          <span className="text-gray-400 font-semibold uppercase tracking-wider">Psych Tension</span>
                          <span className="text-amber-400 font-bold font-mono">{scores.tension}%</span>
                        </div>
                        <div className="w-full bg-white/5 h-1 rounded overflow-hidden">
                          <div className="bg-amber-400 h-full rounded transition-all duration-300" style={{ width: `${scores.tension}%` }} />
                        </div>
                      </div>

                      <div className="p-3 bg-black/30 border border-white/5 rounded-xl space-y-1.5">
                        <div className="flex justify-between items-baseline text-[9.5px]">
                          <span className="text-gray-400 font-semibold uppercase tracking-wider">Curiosity Gap</span>
                          <span className="text-amber-400 font-bold font-mono">{scores.curiosity}%</span>
                        </div>
                        <div className="w-full bg-white/5 h-1 rounded overflow-hidden">
                          <div className="bg-amber-400 h-full rounded transition-all duration-300" style={{ width: `${scores.curiosity}%` }} />
                        </div>
                      </div>

                      <div className="p-3 bg-black/30 border border-white/5 rounded-xl space-y-1.5">
                        <div className="flex justify-between items-baseline text-[9.5px]">
                          <span className="text-gray-400 font-semibold uppercase tracking-wider">Value Payoff</span>
                          <span className="text-amber-400 font-bold font-mono">{scores.payoff}%</span>
                        </div>
                        <div className="w-full bg-white/5 h-1 rounded overflow-hidden">
                          <div className="bg-amber-400 h-full rounded transition-all duration-300" style={{ width: `${scores.payoff}%` }} />
                        </div>
                      </div>

                      <div className="p-3 bg-black/30 border border-white/5 rounded-xl space-y-1.5">
                        <div className="flex justify-between items-baseline text-[9.5px]">
                          <span className="text-gray-400 font-semibold uppercase tracking-wider">Length Fit</span>
                          <span className="text-amber-400 font-bold font-mono">{Math.round(scores.length)}%</span>
                        </div>
                        <div className="w-full bg-white/5 h-1 rounded overflow-hidden">
                          <div className="bg-amber-400 h-full rounded transition-all duration-300" style={{ width: `${scores.length}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Refined title variations */}
                    <div className="space-y-3.5 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-1.5 select-none">
                        <Lightbulb className="text-amber-400" size={15} />
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono">Suggested Improvements</span>
                      </div>

                      <div className="space-y-2.5">
                        {refinedAlternatives.map((alt, altIdx) => (
                          <div 
                            key={altIdx}
                            className="p-3.5 bg-black/55 border border-white/5 hover:border-amber-500/20 rounded-xl space-y-2.5 transition-all group"
                          >
                            <div className="flex justify-between items-center select-none">
                              <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded font-mono text-[8px] uppercase font-bold">
                                {alt.style}
                              </span>
                              <span className="text-[9.5px] text-emerald-400 font-mono font-bold">
                                Avg. Score: {alt.score}%
                              </span>
                            </div>

                            <p className="text-xs font-semibold text-white/95 leading-relaxed bg-[#050508] p-2.5 border border-white/5 rounded-lg select-text">
                              "{alt.title}"
                            </p>

                            <div className="flex justify-end gap-2 pt-1 select-none">
                              <button
                                onClick={() => handleCopy(alt.title, altIdx)}
                                className="p-1 px-2 text-[9px] text-gray-400 hover:text-white bg-white/2 hover:bg-white/5 border border-white/5 hover:border-white/15 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                {copiedIndex === altIdx ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                                <span>{copiedIndex === altIdx ? "Copied" : "Copy"}</span>
                              </button>

                              <button
                                onClick={() => {
                                  handleImportToArchitect(alt.title);
                                }}
                                className="p-1 px-2 text-[9px] text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500 hover:shadow-md hover:shadow-amber-500/20 border border-amber-500/25 rounded-md flex items-center gap-1 cursor-pointer transition-all uppercase font-mono font-bold"
                              >
                                <span>Import</span>
                                <ArrowRight size={11} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: HOOK AUDIO PREVIEW & VOICE SYNTHESIZER */}
                {labTab === "audio" && (
                  <div className="bg-[#0b0c10] border border-purple-500/10 rounded-2xl p-4 space-y-5 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
                      <Volume2 className="text-purple-400" size={16} />
                      <div className="text-[10px] uppercase font-mono font-bold text-gray-300 tracking-wider">
                        Axe Vocal Auditory Simulator
                      </div>
                    </div>

                    <div className="bg-[#020203] p-3.5 rounded-xl border border-white/5 text-xs text-purple-200 tracking-wide font-medium relative italic max-h-24 overflow-y-auto">
                      "{analyzedTitle}"
                    </div>

                    {/* Dancing wave animation when vocal audio preview is playing */}
                    {isPlayingSynth ? (
                      <div className="flex justify-center items-center gap-1 py-4 bg-purple-500/5 rounded-xl border border-purple-500/10 select-none">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((bar) => {
                          const heights = [ "h-4", "h-10", "h-7", "h-12", "h-8", "h-14", "h-9", "h-5", "h-11", "h-4", "h-13", "h-6", "h-10", "h-8", "h-5" ];
                          const delays = ["animation-delay-[100ms]", "animation-delay-[400ms]", "animation-delay-[200ms]", "animation-delay-[600ms]", "animation-delay-[300ms]", "animation-delay-[700ms]", "animation-delay-[150ms]", "animation-delay-[500ms]", "animation-delay-[250ms]", "animation-delay-[450ms]", "animation-delay-[350ms]", "animation-delay-[650ms]", "animation-delay-[120ms]", "animation-delay-[220ms]", "animation-delay-[410ms]"];
                          return (
                            <div key={bar} className={`w-1 bg-gradient-to-t from-purple-500 to-fuchsia-400 rounded-full animate-bounce ${heights[bar % heights.length]} ${delays[bar % delays.length]}`} />
                          );
                        })}
                        <span className="text-[9px] text-purple-400 font-mono uppercase tracking-widest font-black ml-3 animate-pulse">Voice Simulator Active</span>
                      </div>
                    ) : (
                      <div className="text-center py-3.5 bg-black/20 rounded-xl border border-white/2 border-dashed text-[10px] text-gray-500 font-mono italic">
                        Voice synthesizer idle. Toggle player below to audition tempo & timbre.
                      </div>
                    )}

                    {/* Timbre Synth Parameters block */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-black/30 p-3.5 rounded-xl border border-white/5">
                      {/* Accent selector */}
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-400 font-bold uppercase tracking-wider font-mono">Accent Timbre & Gender</label>
                        <select 
                          value={synthVoiceName}
                          onChange={(e) => setSynthVoiceName(e.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-[11px] text-purple-100 placeholder-purple-500 focus:outline-none focus:border-purple-500 font-semibold"
                        >
                          {synthVoices.length > 0 ? (
                            synthVoices.map((v) => (
                              <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                            ))
                          ) : (
                            <option value="">Default English Voice</option>
                          )}
                        </select>
                      </div>

                      {/* Speed & Pitch Slider settings */}
                      <div className="space-y-3.5">
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[9px] text-gray-400 font-bold font-mono">
                            <span>Vocal Speed (Rate)</span>
                            <span className="text-purple-400">{synthRate}x</span>
                          </div>
                          <input 
                            type="range" 
                            min="0.5" 
                            max="1.5" 
                            step="0.05"
                            value={synthRate}
                            onChange={(e) => setSynthRate(parseFloat(e.target.value))}
                            className="w-full h-1 bg-white/5 accent-purple-500 rounded bg-none cursor-pointer outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[9px] text-gray-400 font-bold font-mono">
                            <span>Pitch register</span>
                            <span className="text-purple-400">{synthPitch}</span>
                          </div>
                          <input 
                            type="range" 
                            min="0.5" 
                            max="1.5" 
                            step="0.05"
                            value={synthPitch}
                            onChange={(e) => setSynthPitch(parseFloat(e.target.value))}
                            className="w-full h-1 bg-white/5 accent-purple-500 rounded bg-none cursor-pointer outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePlayVoiceSynth(analyzedTitle)}
                      className={`w-full py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        isPlayingSynth 
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/10'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/15 active:scale-95'
                      }`}
                    >
                      {isPlayingSynth ? (
                        <>
                          <Pause size={13} className="fill-current" />
                          <span>Stop Vocal Audition</span>
                        </>
                      ) : (
                        <>
                          <Play size={13} className="fill-current animate-pulse" />
                          <span>audition vocal delivery</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* TAB 3: RETENTION PERFORMANCE TIPS */}
                {labTab === "tips" && (
                  <div className="space-y-5 animate-in fade-in duration-200 text-left">
                    <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-mono font-extrabold block select-none">
                      💡 Retention diagnostics summary & micro-audit logs:
                    </span>
                    
                    <div className="space-y-1.5">
                      {feedbackTips.map((tip, idx) => (
                        <div 
                          key={idx}
                          className={`p-2.5 rounded-xl border text-[10.5px] leading-snug flex items-start gap-2 ${
                            tip.type === 'warning' ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' :
                            tip.type === 'info' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' :
                            'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          <span className="text-xs shrink-0 select-none">
                            {tip.type === 'warning' ? '⚠️' : tip.type === 'info' ? 'ℹ️' : '✓'}
                          </span>
                          <p className="font-light">{tip.text}</p>
                        </div>
                      ))}
                    </div>

                    {/* Timeline performance suggestions */}
                    <div className="bg-black/45 p-4 rounded-xl border border-white/5 space-y-3">
                      <div className="text-[10px] font-mono uppercase font-black text-emerald-400 flex items-center gap-1.5">
                        <TrendingUp size={13} /> Hook Delivery Sequence Outline
                      </div>

                      <div className="space-y-3.5 text-[11px] leading-relaxed text-gray-300 font-light font-mono">
                        <div className="flex gap-2.5 items-start">
                          <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-black rounded border border-emerald-500/20">
                            0.0S - 1.5S
                          </span>
                          <div>
                            <span className="text-white font-black block">Absolute Contrast Overlay:</span>
                            Introduce contrasting outline text overlays. Speak with a sudden drop in vocal floor depth to shock scroll loops.
                          </div>
                        </div>

                        <div className="flex gap-2.5 items-start">
                          <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-400 text-[9px] font-black rounded border border-purple-500/20">
                            1.5S - 3.0S
                          </span>
                          <div>
                            <span className="text-white font-black block">Curiosity Loop Injection:</span>
                            Reveal the "Hidden configuration trick" or "Underground loophole". Zoom camera by 15% immediately to hold cognitive focus.
                          </div>
                        </div>

                        <div className="flex gap-2.5 items-start">
                          <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-[9px] font-black rounded border border-amber-500/20">
                            3.0S - 5.0S
                          </span>
                          <div>
                            <span className="text-white font-black block">Expected Proof Validation:</span>
                            Outline proof points (such as dashboard earnings payouts or code output) so the viewer locks in for the educational content payload.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Simulated curve */}
                    <div className="p-3 bg-black/40 rounded-xl border border-white/5 text-center">
                      <div className="flex justify-between text-[9px] text-gray-500 uppercase tracking-widest font-mono font-bold mb-2">
                        <span>Predicted Retention Curve</span>
                        <span className="text-emerald-400">Generic vs Axe Hook</span>
                      </div>
                      <div className="flex items-end justify-between h-14 px-4 pt-1 text-[8px] font-mono text-gray-500 border-b border-l border-white/10 select-none">
                        <div className="w-1.5 bg-purple-600/30 rounded-t h-1/2" title="Generic: 50%" />
                        <div className="w-1.5 bg-emerald-500 rounded-t h-full" title="Optimized: 98%" />
                        <div className="w-1.5 bg-purple-600/30 rounded-t h-[35%]" title="Generic: 35%" />
                        <div className="w-1.5 bg-emerald-500 rounded-t h-[92%]" title="Optimized: 92%" />
                        <div className="w-1.5 bg-purple-600/30 rounded-t h-[25%]" title="Generic: 25%" />
                        <div className="w-1.5 bg-emerald-500 rounded-t h-[87%]" title="Optimized: 87%" />
                        <div className="w-1.5 bg-purple-600/30 rounded-t h-[20%]" title="Generic: 20%" />
                        <div className="w-1.5 bg-emerald-500 rounded-t h-[82%]" title="Optimized: 82%" />
                      </div>
                      <div className="flex justify-between text-[7px] text-gray-600 font-mono mt-1 px-1">
                        <span>0.0s (Hook)</span>
                        <span>1.5s</span>
                        <span>3.0s</span>
                        <span>5.0s (Payoff)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: EXPORT TO PDF & QUICK SHARE BUTTONS */}
                {labTab === "share" && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    {/* Exporter Block */}
                    <div className="bg-[#111827]/30 border border-blue-500/10 p-4 rounded-xl space-y-4">
                      <div>
                        <span className="font-extrabold text-[#93c5fd] block flex items-center gap-1.5 mb-1.5 text-xs select-none">
                          <FileDown size={14} className="text-blue-400 animate-pulse" /> Direct Brief Exporter Workstation
                        </span>
                        <p className="text-[11px] text-gray-400 font-light leading-relaxed">
                          Deploy your computed metrics as a vector-graphics formatted PDF Creative Brief document. This exports CTR scores, cognitive indices, diagnostics metrics, and alternative designs.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleExportPDF}
                        className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-[#1e40af] hover:from-blue-500 hover:to-blue-600 text-white font-mono font-bold text-xs uppercase rounded-xl transition-all inline-flex items-center justify-center gap-1.5 border border-blue-500/20 active:scale-95 cursor-pointer shadow-md"
                      >
                        <FileDown size={14} />
                        <span>Export Outline To PDF</span>
                      </button>
                    </div>

                    {/* Social Quick Share Block */}
                    <div className="space-y-2 text-left">
                      <span className="text-[9px] text-gray-500 uppercase tracking-widest font-mono font-bold block select-none">
                        🔗 Quick Share Elements:
                      </span>
                      
                      <div className="grid grid-cols-3 gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleQuickShare('twitter')}
                          className="px-3 py-2 bg-black/55 hover:bg-white/5 text-[10px] uppercase font-bold text-gray-300 hover:text-white rounded-lg border border-white/5 transition-all text-center cursor-pointer active:scale-95 block"
                        >
                          X / Twitter
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickShare('linkedin')}
                          className="px-3 py-2 bg-black/55 hover:bg-white/5 text-[10px] uppercase font-bold text-gray-300 hover:text-[#0a66c2] rounded-lg border border-white/5 transition-all text-center cursor-pointer active:scale-95 block"
                        >
                          LinkedIn
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickShare('whatsapp')}
                          className="px-3 py-2 bg-black/55 hover:bg-white/5 text-[10px] uppercase font-bold text-gray-300 hover:text-[#25d366] rounded-lg border border-white/5 transition-all text-center cursor-pointer active:scale-95 block"
                        >
                          WhatsApp
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`"${analyzedTitle}"`);
                          playAudioCue(880);
                          addToast("Tested concept copied to browser clipboard!", "success");
                        }}
                        className="w-full py-2 text-[10px] uppercase font-mono font-black text-blue-300 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 hover:border-blue-400/40 rounded-xl cursor-pointer transition-all mt-1"
                      >
                        Copy Raw Context Outline
                      </button>
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="text-center py-10 select-none">
                <AlertTriangle className="text-amber-500/40 mx-auto mb-2" size={24} />
                <p className="text-xs text-gray-500 font-mono italic">Enter a draft title in the input field above to load the cognitive heuristic predictors model.</p>
              </div>
            )}
          </GlassCard>
        </div>

      </div>
    </div>
  );
};
