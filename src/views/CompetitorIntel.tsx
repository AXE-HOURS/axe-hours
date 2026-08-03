import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase } from '../context/FirebaseContext';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { GlassCard } from '../components/GlassCard';
import { getSecureGeminiKey } from '../utils/secureStorage';
import { 
  TrendingUp, 
  Users, 
  Flame, 
  Sparkles, 
  ChevronRight, 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  Target, 
  Cpu, 
  Eye, 
  LineChart, 
  CornerDownRight, 
  Clock, 
  ExternalLink,
  RefreshCw,
  Edit,
  Check,
  Bell,
  Play,
  Radio
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { playAudioCue as playAudio } from '../utils/audio';

interface CompetitorVideo {
  title: string;
  views: string;
  duration: string;
  hookIdea: string;
  pacingStyle: string;
  publishedAt?: string;
  thumbnail?: string;
  isViralOutlier?: boolean;
  viralMultiplier?: number;
}

interface Competitor {
  id: string;
  handle: string;
  name: string;
  subs: string;
  niche: string;
  avgViews: string;
  hookRetention: number; // e.g. 78%
  ctr?: number; // e.g. 8.5%
  viralFactor: number; // e.g. 2.4 (Multiplier over baseline views)
  recentViralTitle: string;
  recentVideos?: CompetitorVideo[];
}

export const CompetitorIntel: React.FC = () => {
  const { addToast } = useToast();
  const { logUserActivity, user } = useFirebase();
  const uid = user?.uid || "guest";
  const [activeNicheFilter, setActiveNicheFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [rightPanelTab, setRightPanelTab] = useState<'videos' | 'blueprint'>('videos');
  
  // Custom tracking configurations
  const [newCompetitorHandle, setNewCompetitorHandle] = useState<string>('');
  const [newCompetitorName, setNewCompetitorName] = useState<string>('');
  const [newCompetitorNiche, setNewCompetitorNiche] = useState<string>('SaaS & Development');
  const [customNicheInput, setCustomNicheInput] = useState<string>('');
  const [scanError, setScanError] = useState<string | null>(null);
  
  // Custom stats overrides
  const [useCustomStats, setUseCustomStats] = useState<boolean>(false);
  const [customSubs, setCustomSubs] = useState<string>('');
  const [customAvgViews, setCustomAvgViews] = useState<string>('');
  const [customHookRetention, setCustomHookRetention] = useState<string>('');
  const [customCtr, setCustomCtr] = useState<string>('');
  const [customViralFactor, setCustomViralFactor] = useState<string>('');
  const [customRecentTitle, setCustomRecentTitle] = useState<string>('');

  const [isAddingCompetitor, setIsAddingCompetitor] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string>('c-5'); // Default focus MrBeast!

  // Competitor Stats Inline Editing States
  const [isEditingCompetitor, setIsEditingCompetitor] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editHandle, setEditHandle] = useState<string>('');
  const [editNiche, setEditNiche] = useState<string>('');
  const [editSubs, setEditSubs] = useState<string>('');
  const [editAvgViews, setEditAvgViews] = useState<string>('');
  const [editHookRetention, setEditHookRetention] = useState<number>(85);
  const [editCtr, setEditCtr] = useState<number>(8.5);
  const [editViralFactor, setEditViralFactor] = useState<number>(2.0);
  const [editRecentViralTitle, setEditRecentViralTitle] = useState<string>('');

  // Auto-reset edit state when selected competitor changes
  useEffect(() => {
    setIsEditingCompetitor(false);
  }, [selectedCompetitorId]);

  const startEditingActiveCompetitor = () => {
    if (!activeCompetitor) return;
    setEditName(activeCompetitor.name);
    setEditHandle(activeCompetitor.handle);
    setEditNiche(activeCompetitor.niche);
    setEditSubs(activeCompetitor.subs);
    setEditAvgViews(activeCompetitor.avgViews);
    setEditHookRetention(activeCompetitor.hookRetention);
    setEditCtr(activeCompetitor.ctr || Number(((activeCompetitor.hookRetention * 0.1) + 1.2).toFixed(1)));
    setEditViralFactor(activeCompetitor.viralFactor);
    setEditRecentViralTitle(activeCompetitor.recentViralTitle);
    setIsEditingCompetitor(true);
    playAudio(523);
  };

  const handleSaveCompetitorEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetComp = competitors.find(c => c.id === selectedCompetitorId) || {};
    const updatedComp = {
      ...targetComp,
      id: selectedCompetitorId,
      name: editName.trim(),
      handle: editHandle.trim().startsWith('@') ? editHandle.trim() : `@${editHandle.trim()}`,
      niche: editNiche.trim(),
      subs: editSubs.trim() || 'N/A',
      avgViews: editAvgViews.trim() || 'N/A',
      hookRetention: Math.min(100, Math.max(1, editHookRetention)),
      ctr: Math.min(100, Math.max(0.1, editCtr)),
      viralFactor: editViralFactor,
      recentViralTitle: editRecentViralTitle.trim() || 'New video outlier',
      updatedAt: new Date().toISOString()
    } as Competitor;

    if (uid !== "guest") {
      try {
        const docRef = doc(db, 'competitors', selectedCompetitorId);
        await setDoc(docRef, { ...updatedComp, userId: uid });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `competitors/${selectedCompetitorId}`);
      }
    } else {
      setCompetitors(prev => prev.map(c => c.id === selectedCompetitorId ? updatedComp : c));
    }
    setIsEditingCompetitor(false);
    addToast(`Successfully updated metrics for ${editName}!`, "success");
    playAudio(880);
  };

  // Seed default competitors - Enhanced to support diverse, high-profile multi-category creator assets!
  const DEFAULT_COMPETITORS: Competitor[] = [
    {
      id: 'c-5',
      handle: '@mrbeast',
      name: 'MrBeast',
      subs: '496M',
      niche: 'Entertainment & Challenges',
      avgViews: '148M',
      hookRetention: 94,
      ctr: 12.4,
      viralFactor: 4.8,
      recentViralTitle: 'I Survived 100 Days Inside A Red Circle',
      recentVideos: [
        {
          title: 'I Survived 100 Days Inside A Red Circle',
          views: '148M',
          duration: '22:15',
          hookIdea: 'Starts mid-action on day 1 with instant splitscreen showing day 1 and day 100 simultaneously to build immediate tension.',
          pacingStyle: 'Constant zooms, dramatic sound effect accent markers, and quick narrative setup under 5 seconds.'
        },
        {
          title: 'I Built 100 Wells in Africa',
          views: '195M',
          duration: '14:30',
          hookIdea: 'Visual problem-solution alignment, showing pure flowing water and emotional payoff within the first 4 seconds.',
          pacingStyle: 'Heartfelt ambient background score, sweeping high-definition drone visuals, and clear fast storytelling.'
        },
        {
          title: 'Last To Leave $800,000 Island Keeps It',
          views: '125M',
          duration: '25:40',
          hookIdea: 'Staccato visual cuts of highly energetic contestants introduced over continuous drone flyovers.',
          pacingStyle: 'Continuous high tension, rapid audio loops, physical visual labels on contestants.'
        }
      ]
    },
    {
      id: 'c-ramsay',
      handle: '@gordonramsay',
      name: 'Gordon Ramsay',
      subs: '25.2M',
      niche: 'Food & Culinary Arts',
      avgViews: '3.1M',
      hookRetention: 92,
      ctr: 7.8,
      viralFactor: 2.1,
      recentViralTitle: "Gordon Ramsay's Ultimate 10-Minute Carbonara Recipe Challenge",
      recentVideos: [
        {
          title: "Gordon Ramsay's Ultimate 10-Minute Carbonara Recipe Challenge",
          views: '3.1M',
          duration: '10:12',
          hookIdea: 'High-definition close up of sizzling pancetta with a prominent red digital ticking countdown clock.',
          pacingStyle: 'Hyper energetic verbal chef directions, ticking audio cues, fast hand actions.'
        },
        {
          title: "Gordon Ramsay's Ultimate Steak Masterclass",
          views: '12M',
          duration: '15:40',
          hookIdea: 'Slow motion slicing of perfect rare pan-roasted ribeye, butter steam dancing over the meat.',
          pacingStyle: 'Calm but authoritative tone, high definition culinary closeups, clear step text indicators.'
        },
        {
          title: "Gordon's Rules of kitchen organization (and food safety Secrets!)",
          views: '1.8M',
          duration: '08:15',
          hookIdea: 'Gordon dramatically dumps common unsanitary ingredients directly into a trash can within 3 seconds.',
          pacingStyle: 'High-contrast visual comparisons, rapid camera cuts, intense hand gestures.'
        }
      ]
    },
    {
      id: 'c-leblanc',
      handle: '@lostleblanc',
      name: 'Lost LeBlanc',
      subs: '2.25M',
      niche: 'Travel & Lifestyle',
      avgViews: '520K',
      hookRetention: 86,
      ctr: 6.2,
      viralFactor: 2.3,
      recentViralTitle: 'How to Travel Bali on Under $50 a Day: The Ultimate Blueprint',
      recentVideos: [
        {
          title: 'How to Travel Bali on Under $50 a Day: The Ultimate Blueprint',
          views: '520K',
          duration: '12:15',
          hookIdea: 'Sweeping drone flight over private infinity pool overlooking green rice fields stating: "this costs $12 per night".',
          pacingStyle: 'Deep color-graded travel visuals, tropical chill pop music background, budget calculator popup overlays.'
        },
        {
          title: '10 Travel Essentials You\'re guaranteed to forget on your next flight',
          views: '450K',
          duration: '09:30',
          hookIdea: 'Holds open a compact travel bag, stating "this $9 device saved me from getting stranded in Tokyo".',
          pacingStyle: 'Energetic direct look-at-camera talking, fast-moving list numbering visual callouts, crisp sounds.'
        },
        {
          title: 'Is this the single most underrated paradise on earth?',
          views: '320K',
          duration: '15:10',
          hookIdea: 'Presenter leaps off a 25-foot cliff into beautiful crystal turquoise waters and pops up smiling.',
          pacingStyle: 'Upbeat electronic beat drops on video impact, quick action cam transitions, high enthusiasm.'
        }
      ]
    },
    {
      id: 'c-athlean',
      handle: '@athleanx',
      name: 'Athlean-X',
      subs: '14.3M',
      niche: 'Fitness & Biomechanics',
      avgViews: '1.5M',
      hookRetention: 89,
      ctr: 7.1,
      viralFactor: 1.8,
      recentViralTitle: 'Stop Doing Bench Presses Like This! (Your Rotator Cuff Is Screaming)',
      recentVideos: [
        {
          title: 'Stop Doing Bench Presses Like This! (Your Rotator Cuff Is Screaming)',
          views: '1.5M',
          duration: '11:20',
          hookIdea: 'Detailed anatomical lines drawn with red marker directly on shoulder skin to illustrate joint wear.',
          pacingStyle: 'Expert bio-mechanic diagrams projection, direct in-gym gym demonstrations, intense warning captions.'
        },
        {
          title: 'The Perfect 10-Minute Home Abs Workout (No Equipment)',
          views: '4.2M',
          duration: '10:00',
          hookIdea: 'Starts real-time ab timer immediately saying: "do not close this tab, do the next move together".',
          pacingStyle: 'Live split-screen exercise layout, instructional zoom circles, highly vocal coach encouragement.'
        },
        {
          title: 'Best and Worst Exercises for building broad shoulders',
          views: '1.9M',
          duration: '14:15',
          hookIdea: 'Lifts massive dumbbell overhead explaining the instant shoulder impingement risk of bad overhead exercises.',
          pacingStyle: 'Rating tier list layout, clean academic/clinical voice transitions, static biomechanical arrows.'
        }
      ]
    },
    {
      id: 'c-gaming-guru',
      handle: '@ninja',
      name: 'Ninja',
      subs: '24.1M',
      niche: 'Gaming & Esports',
      avgViews: '1.8M',
      hookRetention: 88,
      ctr: 5.4,
      viralFactor: 1.9,
      recentViralTitle: 'This Unbeatable Map Glitch Broken My Entire Winstreak...',
      recentVideos: [
        {
          title: 'This Unbeatable Map Glitch Broken My Entire Winstreak...',
          views: '1.8M',
          duration: '16:40',
          hookIdea: 'Screams "no way, has this actually broken my win streak" as character clips inside geometry wall.',
          pacingStyle: 'Hyper-paced action cuts, facial cam zoom react overlays, glowing alert boxes.'
        },
        {
          title: 'The 2026 Season update is literally unplayable',
          views: '1.2M',
          duration: '14:15',
          hookIdea: 'Shows an extreme closeup of server latency spikes and registered hit failure during a crucial battle.',
          pacingStyle: 'Direct gameplay capture commentary, sarcasm sound clips, fast screen zoom-ins.'
        },
        {
          title: 'Beating the top ranked pro lobby with a standard handgun challenge',
          views: '2.5M',
          duration: '18:20',
          hookIdea: 'Fires double-taps to eliminate three full-shield elite players in under 3.5 seconds.',
          pacingStyle: 'Intense background music, rapid headset chatter audio sync, action pause keyframes.'
        }
      ]
    },
    {
      id: 'c-6',
      handle: '@fireship',
      name: 'Fireship',
      subs: '3.52M',
      niche: 'SaaS & Development',
      avgViews: '1.1M',
      hookRetention: 95,
      ctr: 11.8,
      viralFactor: 3.4,
      recentViralTitle: 'The New CSS Feature Nobody Is Talking About... in 100 Seconds',
      recentVideos: [
        {
          title: 'The New CSS Feature Nobody Is Talking About... in 100 Seconds',
          views: '1.1M',
          duration: '100s',
          hookIdea: 'Browser showing chaotic responsive layout cured instantly by writing one brand new CSS declaration.',
          pacingStyle: 'Rapid comedy meme popups, mechanical keyboard switches clicks, 4X speed code screencasts.'
        },
        {
          title: 'Why Next.js 15 Is Dying A Slow Painful Death in Production',
          views: '1.4M',
          duration: '03:10',
          hookIdea: 'Displays next.js skeleton tombstone stating "it was the ultimate framework, until today".',
          pacingStyle: 'Developer humor sarcasm, dark high-contrast terminal theme, micro transitions.',
        },
        {
          title: 'Apple Vision Pro just replaced your desk... in 100 Seconds',
          views: '950K',
          duration: '100s',
          hookIdea: 'Visual comparison of physical desk cluttered with triple monitors vs virtual spacious empty floating screen workspace.',
          pacingStyle: 'Instant narration pacing, neon UI zoom ins, sound effects sync.'
        }
      ]
    }
  ];

  const [competitors, setCompetitors] = useState<Competitor[]>(DEFAULT_COMPETITORS);
  const [loading, setLoading] = useState<boolean>(uid !== "guest");

  // Seeding default benchmark competitors to Firestore
  const seedDefaultCompetitorsToFirestore = async () => {
    if (uid === "guest") return;
    try {
      console.log("Seeding default competitors to Firestore...");
      for (const comp of DEFAULT_COMPETITORS) {
        const docRef = doc(db, 'competitors', `${uid}_${comp.id}`);
        await setDoc(docRef, {
          ...comp,
          id: `${uid}_${comp.id}`,
          userId: uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn("Failed seeding default competitors to Firestore:", e);
    }
  };

  // Sync state when UID becomes available or changing account
  useEffect(() => {
    if (uid === "guest") {
      setLoading(false);
      const key = `axehours_competitors_guest`;
      const legacyKey = "axehours_competitors";
      const saved = localStorage.getItem(key) || localStorage.getItem(legacyKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCompetitors(parsed);
            return;
          }
        } catch (e) {
          console.error("Failed parsing competitors local state baseline:", e);
        }
      }
      setCompetitors(DEFAULT_COMPETITORS);
      return;
    }

    setLoading(true);

    // Realtime Firestore synchronization
    const q = query(collection(db, 'competitors'), where('userId', '==', uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Competitor[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as Competitor);
      });
      
      if (items.length > 0) {
        setCompetitors(items);
      } else {
        seedDefaultCompetitorsToFirestore();
      }
      setLoading(false);
    }, (error) => {
      console.error("Competitors Firestore onSnapshot error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid]);

  // Push Notification Dispatcher State
  const [alerts, setAlerts] = useState<{
    id: string;
    timestamp: string;
    creatorName: string;
    handle: string;
    videoTitle: string;
    duration: string;
    views: string;
    isShort: boolean;
  }[]>([]);
  const [isDispatcherActive, setIsDispatcherActive] = useState<boolean>(true);
  const seenVideoTitlesRef = React.useRef<Set<string>>(new Set());
  const isInitialLoadRef = React.useRef<boolean>(true);

  // Simulation Form States
  const [simCreatorId, setSimCreatorId] = useState<string>('');
  const [simTitle, setSimTitle] = useState<string>('');
  const [simType, setSimType] = useState<'video' | 'short'>('video');
  const [simViews, setSimViews] = useState<string>('45K');
  const [simDuration, setSimDuration] = useState<string>('12:15');

  // Set default simulator creator when list updates
  useEffect(() => {
    if (competitors && competitors.length > 0 && !simCreatorId) {
      setSimCreatorId(competitors[0].id);
    }
  }, [competitors, simCreatorId]);

  // Active subscription hook monitoring creator handles for new video publications
  useEffect(() => {
    if (!competitors || competitors.length === 0 || !isDispatcherActive) return;

    // Compile all existing videos in competitors list
    const allCurrentVideos = competitors.flatMap(c => c.recentVideos || []);

    if (isInitialLoadRef.current) {
      // Seed the already seen titles ref with everything currently tracked
      allCurrentVideos.forEach(v => {
        if (v && v.title) {
          seenVideoTitlesRef.current.add(v.title);
        }
      });
      isInitialLoadRef.current = false;
      return;
    }

    // Check if any video is newly published (not in seen set)
    competitors.forEach(c => {
      if (!c || !c.recentVideos) return;
      c.recentVideos.forEach(v => {
        if (v && v.title && !seenVideoTitlesRef.current.has(v.title)) {
          // Add to seen set
          seenVideoTitlesRef.current.add(v.title);

          const isShort = v.duration 
            ? (parseInt(v.duration.split(':')[0]) === 0 && parseInt(v.duration.split(':')[1] || '0') < 60) || v.title.toLowerCase().includes('short') 
            : false;
          
          // Add to alerts history state
          const newAlert = {
            id: `${c.id}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            timestamp: new Date().toLocaleTimeString(),
            creatorName: c.name,
            handle: c.handle,
            videoTitle: v.title,
            duration: v.duration || '10:00',
            views: v.views || '10K',
            isShort: isShort
          };

          setAlerts(prev => [newAlert, ...prev].slice(0, 50));

          // Trigger immediate web notification toast tracking upload metadata
          addToast(
            `🚨 [MONITOR] ${c.name} (${c.handle}) published a new ${isShort ? 'Short' : 'video'}: "${v.title}"! (${v.views} views)`,
            "success"
          );
          playAudio(880);

          // Pipe alert straight into user's Firebase activity stream
          logUserActivity(
            'competitor_intel',
            `Monitored Channel Upload: ${c.name}`,
            `Newly published video/Short detected: "${v.title}" with views estimation: ${v.views}. Pacing style: ${v.pacingStyle || 'N/A'}`
          );
        }
      });
    });
  }, [competitors, isDispatcherActive]);

  // Handler for simulated upload
  const handleSimulateUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simCreatorId) {
      addToast("Please select a tracked creator to simulate an upload.", "warning");
      return;
    }

    const creator = competitors.find(c => c.id === simCreatorId);
    if (!creator) return;

    const titleText = simTitle.trim() || (simType === 'short' ? "A secret CTR hack they don't want you to know #shorts" : "How I Scaled My Development Agency in 48 Hours");
    const durationText = simType === 'short' ? '0:45' : simDuration;

    const newVideo = {
      title: titleText,
      views: simViews || '10K',
      duration: durationText,
      publishedAt: new Date().toISOString(),
      hookIdea: simType === 'short' 
        ? "Fast zoom loop showing visual stats, starting with a loud question." 
        : "Starts mid-action showing a clean developer dashboard or metric proof.",
      pacingStyle: simType === 'short'
        ? "Hyper-paced under 50 seconds, voiceover matched with continuous graphic b-roll."
        : "High conversion storytelling layout pacing style.",
      isViralOutlier: Math.random() > 0.5,
      viralMultiplier: parseFloat((Math.random() * 2 + 1.5).toFixed(1))
    };

    // Update the competitor's recentVideos in Firestore or locally
    const updatedComp = {
      ...creator,
      recentViralTitle: titleText,
      recentVideos: [newVideo, ...(creator.recentVideos || [])].slice(0, 15),
      updatedAt: new Date().toISOString()
    };

    if (uid !== "guest") {
      try {
        const docRef = doc(db, 'competitors', creator.id);
        await setDoc(docRef, { ...updatedComp, userId: uid });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `competitors/${creator.id}`);
      }
    } else {
      setCompetitors(prev => prev.map(c => c.id === creator.id ? updatedComp : c));
    }

    // Reset simulation form
    setSimTitle('');
    addToast(`Dispatched simulated upload trigger for ${creator.name}! 🚀`, "info");
  };

  // Persist guest competitors to localStorage
  useEffect(() => {
    if (uid === "guest") {
      localStorage.setItem(`axehours_competitors_guest`, JSON.stringify(competitors));
    }
  }, [competitors, uid]);

  const activeCompetitor = useMemo(() => {
    if (!competitors || !Array.isArray(competitors) || competitors.length === 0) return null;
    return competitors.find(c => c && c.id === selectedCompetitorId) || competitors.find(c => c !== null) || null;
  }, [competitors, selectedCompetitorId]);

  // Hook Strategies derived dynamically for selected competitor
  const competitorsHookStrategies = useMemo(() => {
    if (!activeCompetitor) return [];
    return [
      {
        part: "Opening Hook (0:00 - 0:03)",
        strategy: activeCompetitor.recentViralTitle,
        type: "Contrarian patterns with high mental tension.",
        framing: "Extreme close-up on the face, high-contrast text overlay, silent background before dynamic bass-drop sync marker."
      },
      {
        part: "Core Drama (0:03 - 0:15)",
        strategy: "Validates the shock statements by revealing a dashboard or clean numeric visual metrics.",
        type: "Instant social proof validating hook drama.",
        framing: "Fast pacing, panning over high conversion dashboards ($2.4K MRR or CTR scores), sound of mechanical keyboard clicks."
      },
      {
        part: "Cognitive Loop (0:15 - 0:40)",
        strategy: "Gives 3 micro mechanical bullet steps instead of broad theories.",
        type: "Actionable execution layout keeping watchtime high.",
        framing: "Split layout: screen-recording on the right, presenter profile tracking on the left."
      },
      {
        part: "The Closing Retention Spike",
        strategy: "Avoids standard greeting wraps. Ends on a continuous loop back to the opening.",
        type: "Continuous loop alignment.",
        framing: "Ends mid-sentence with high-tempo audio that connects directly with the start of the video loop duration."
      }
    ];
  }, [activeCompetitor]);

  // Pre-fill metrics intelligently if user enters a well-known creator
  const checkForKnownCreator = (query: string) => {
    const q = query.toLowerCase();
    if (q.includes("mrbeast") || q.includes("beast")) {
      return {
        name: "MrBeast",
        handle: "@mrbeast",
        niche: "Entertainment & Challenges",
        subs: "496M",
        avgViews: "148M",
        hookRetention: 94,
        viralFactor: 4.8,
        recentTitle: "I Survived 100 Days Inside A Red Circle"
      };
    }
    if (q.includes("fireship")) {
      return {
        name: "Fireship",
        handle: "@fireship",
        niche: "SaaS & Development",
        subs: "3.52M",
        avgViews: "1.1M",
        hookRetention: 95,
        viralFactor: 3.4,
        recentTitle: "The New CSS Feature Nobody Is Talking About... in 100 Seconds"
      };
    }
    if (q.includes("mkbhd") || q.includes("marques")) {
      return {
        name: "MKBHD",
        handle: "@mkbhd",
        niche: "Creative Tech",
        subs: "19.5M",
        avgViews: "4.8M",
        hookRetention: 89,
        viralFactor: 2.1,
        recentTitle: "Apple Vision Pro 1 Year Later: The Honest Truth!"
      };
    }
    if (q.includes("aliabdaal") || q.includes("abdaal")) {
      return {
        name: "Ali Abdaal",
        handle: "@aliabdaal",
        niche: "Lifestyle Content",
        subs: "5.9M",
        avgViews: "1.4M",
        hookRetention: 84,
        viralFactor: 2.3,
        recentTitle: "How I Built a $5M/Year Business Working 4 Hours a Day"
      };
    }
    if (q.includes("gordon") || q.includes("ramsay")) {
      return {
        name: "Gordon Ramsay",
        handle: "@gordonramsay",
        niche: "Food & Culinary Arts",
        subs: "25.2M",
        avgViews: "3.1M",
        hookRetention: 92,
        viralFactor: 2.1,
        recentTitle: "Gordon Ramsay's Ultimate 10-Minute Carbonara Recipe Challenge"
      };
    }
    if (q.includes("lost leblanc") || q.includes("leblanc")) {
      return {
        name: "Lost LeBlanc",
        handle: "@lostleblanc",
        niche: "Travel & Lifestyle",
        subs: "2.25M",
        avgViews: "520K",
        hookRetention: 86,
        viralFactor: 2.3,
        recentTitle: "How to Travel Bali on Under $50 a Day: The Ultimate Blueprint"
      };
    }
    if (q.includes("athlean")) {
      return {
        name: "Athlean-X",
        handle: "@athleanx",
        niche: "Fitness & Biomechanics",
        subs: "14.3M",
        avgViews: "1.5M",
        hookRetention: 89,
        viralFactor: 1.8,
        recentTitle: "Stop Doing Bench Presses Like This! (Your Rotator Cuff Is Screaming)"
      };
    }
    if (q.includes("ninja")) {
      return {
        name: "Ninja",
        handle: "@ninja",
        niche: "Gaming & Esports",
        subs: "24.1M",
        avgViews: "1.8M",
        hookRetention: 88,
        viralFactor: 1.9,
        recentTitle: "This Unbeatable Map Glitch Broken My Entire Winstreak..."
      };
    }
    if (q.includes("hormozi") || q.includes("alex hormozi")) {
      return {
        name: "Alex Hormozi",
        handle: "@alexhormozi",
        niche: "Finance & Investing",
        subs: "2.4M",
        avgViews: "550K",
        hookRetention: 88,
        viralFactor: 2.5,
        recentTitle: "How to Build a $100M Business With Only 3 Simple Secrets"
      };
    }
    if (q.includes("graham") || q.includes("stephan")) {
      return {
        name: "Graham Stephan",
        handle: "@grahamstephan",
        niche: "Finance & Investing",
        subs: "4.65M",
        avgViews: "350K",
        hookRetention: 83,
        viralFactor: 1.7,
        recentTitle: "Why The 2026 Housing Market Is About To Reset"
      };
    }
    if (q.includes("joma") || q.includes("jomatech")) {
      return {
        name: "Joma Tech",
        handle: "@jomatech",
        niche: "SaaS & Development",
        subs: "2.32M",
        avgViews: "850K",
        hookRetention: 91,
        viralFactor: 2.8,
        recentTitle: "A Day in the Life of a Software Engineer in 2026"
      };
    }
    if (q.includes("colin") || q.includes("samir") || q.includes("colin and samir")) {
      return {
        name: "Colin and Samir",
        handle: "@colinandsamir",
        niche: "Education & Tutorials",
        subs: "1.85M",
        avgViews: "750K",
        hookRetention: 90,
        viralFactor: 2.6,
        recentTitle: "How MrBeast Controls the Entire YouTube Algorithm"
      };
    }
    return null;
  };

  const handleHandleChange = (val: string) => {
    setNewCompetitorHandle(val);
    const known = checkForKnownCreator(val);
    if (known) {
      setNewCompetitorName(known.name);
      setNewCompetitorNiche(known.niche);
      setCustomSubs(known.subs);
      setCustomAvgViews(known.avgViews);
      setCustomHookRetention(known.hookRetention.toString());
      setCustomViralFactor(known.viralFactor.toString());
      setCustomRecentTitle(known.recentTitle);
      setUseCustomStats(true);
      addToast(`Detected ${known.name}! Auto-prefilling real world metrics. ⚡`, "success");
    }
  };

  const handleNameChange = (val: string) => {
    setNewCompetitorName(val);
    const known = checkForKnownCreator(val);
    if (known) {
      setNewCompetitorHandle(known.handle);
      setNewCompetitorNiche(known.niche);
      setCustomSubs(known.subs);
      setCustomAvgViews(known.avgViews);
      setCustomHookRetention(known.hookRetention.toString());
      setCustomViralFactor(known.viralFactor.toString());
      setCustomRecentTitle(known.recentTitle);
      setUseCustomStats(true);
      addToast(`Detected ${known.name}! Auto-prefilling real world metrics. ⚡`, "success");
    }
  };

  // Live Google Search grounded analysis call using backend server proxy agent
  const handleLiveGeminiAnalysis = async () => {
    const term = newCompetitorHandle.trim() || newCompetitorName.trim();
    if (!term) {
      addToast("Please enter a Channel Handle or Creator Display Name first so we know who to look up!", "warning");
      return;
    }

    setIsAnalyzing(true);
    setScanError(null);
    addToast("Querying YouTube Data API v3 for live metrics...", "info");
    playAudio(554);

    try {
      let data: any = null;
      try {
        data = await fetchCompetitorMetrics(term);
      } catch (ytErr: any) {
        console.warn("YouTube Data API fetch failed, falling back to Search Grounding Gemini analysis:", ytErr);
        addToast("YouTube direct search failed, launching Gemini Search Grounding agent...", "info");
        
        const uid = user?.uid || "guest";
        const savedKey = getSecureGeminiKey(uid);
        const apiResponse = await fetch("/api/analyze-competitor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            handle: newCompetitorHandle,
            name: newCompetitorName,
            customKey: savedKey,
            uid
          })
        });
        if (apiResponse.ok) {
          data = await apiResponse.json();
        } else {
          const apiErrData = await apiResponse.json().catch(() => ({}));
          const fallbackErrorMsg = apiErrData.error || `Gemini analysis failed with status ${apiResponse.status}`;
          throw new Error(`${fallbackErrorMsg} (Direct search error: ${ytErr.message || ytErr})`);
        }
      }

      if (data) {
        if (data.name) setNewCompetitorName(data.name);
        if (data.handle) setNewCompetitorHandle(data.handle);
        
        const presetNiches = [
          "SaaS & Development",
          "AI & Automation",
          "Creative Tech",
          "Lifestyle Content",
          "Entertainment & Challenges",
          "Gaming & Esports",
          "Finance & Investing",
          "Education & Tutorials",
          "Fitness & Health",
          "Vlogging & Adventure",
          "Tech Reviews & Gadgets",
          "Design & UX/UI"
        ];
        
        if (data.niche) {
          const match = presetNiches.find(
            n => n.toLowerCase() === data.niche.toLowerCase() || data.niche.toLowerCase().includes(n.toLowerCase())
          );
          if (match) {
            setNewCompetitorNiche(match);
          } else {
            setNewCompetitorNiche("Custom...");
            setCustomNicheInput(data.niche);
          }
        }

        // Explicitly log the exact JSON payload in the browser console as requested
        const response = data;
        console.log("Scanned Channel Data:", response);

        // Ensure that we explicitly call the setter states for the form inputs with the fresh data
        const subscriberCount = data.subscriberCount || data.subscribersCount || data.subs || "100K";
        const avgViews = data.avgViews || data.avgViewsPerVideo || "50K";
        const hookRetention = data.hookRetention !== undefined ? data.hookRetention.toString() : "80";
        const ctr = data.ctr !== undefined ? data.ctr.toString() : "6.5";
        const viralFactor = data.viralFactor !== undefined ? data.viralFactor.toString() : "2.0";
        const recentViralTitle = data.recentViralTitle || "Viral Video Title";

        setCustomSubs(subscriberCount.toString());
        setCustomAvgViews(avgViews.toString());
        setCustomHookRetention(hookRetention);
        setCustomCtr(ctr);
        setCustomViralFactor(viralFactor);
        setCustomRecentTitle(recentViralTitle);
        
        setUseCustomStats(true);

        const id = data.id || `c-${Date.now()}`;
        const finalNiche = data.niche || "SaaS & Development";
        
        const newComp: Competitor = {
          id: id,
          handle: data.handle || (term.startsWith('@') ? term : `@${term}`),
          name: data.name || term.replace('@', ''),
          subs: subscriberCount.toString(),
          niche: finalNiche,
          avgViews: avgViews.toString(),
          hookRetention: parseInt(hookRetention),
          ctr: parseFloat(ctr),
          viralFactor: parseFloat(viralFactor),
          recentViralTitle: recentViralTitle,
          recentVideos: data.recentVideos && data.recentVideos.length > 0 ? data.recentVideos : [
            {
              title: recentViralTitle,
              views: avgViews.toString(),
              duration: "10:15",
              publishedAt: new Date().toISOString(),
              thumbnail: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500&auto=format&fit=crop&q=60",
              hookIdea: "Opening retention hook showing dynamic screen overlays.",
              pacingStyle: "High engagement storytelling pacing style."
            }
          ]
        };

        if (uid !== "guest") {
          try {
            await deleteDoc(doc(db, 'competitors', `${uid}_c-1`));
            await deleteDoc(doc(db, 'competitors', `${uid}_c-2`));
            await deleteDoc(doc(db, 'competitors', 'c-1'));
            await deleteDoc(doc(db, 'competitors', 'c-2'));
            
            const docRef = doc(db, 'competitors', newComp.id);
            await setDoc(docRef, {
              ...newComp,
              userId: uid,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          } catch (fireErr) {
            console.error("Firestore sync error: ", fireErr);
          }
        } else {
          setCompetitors(prev => {
            const cleaned = prev.filter(c => c.id !== 'c-1' && c.id !== 'c-2' && c.handle !== '@saasguy' && c.handle !== '@techryse');
            const exists = cleaned.some(c => c.handle.toLowerCase() === newComp.handle.toLowerCase());
            if (exists) {
              return cleaned.map(c => c.handle.toLowerCase() === newComp.handle.toLowerCase() ? newComp : c);
            }
            return [...cleaned, newComp];
          });
        }

        setSelectedCompetitorId(newComp.id);
        addToast(`Successfully scanned and loaded metrics for ${data.name}! ⚡`, "success");
        playAudio(880);
        logUserActivity('competitor_intel', `Researched Creator: ${data.name}`, `Live analysis lookup completed for creator channel handle: "${data.handle}"`);
      }
    } catch (err: any) {
      console.error("Live analysis exception: ", err);
      const errorMsg = err.message || "Failed to fetch live stats. Please enter stats manually or retry.";
      setScanError(errorMsg);
      
      // Cleanly reset old mock/override stats instead of silently leaving old mock variables in place
      setCustomSubs('');
      setCustomAvgViews('');
      setCustomHookRetention('');
      setCustomCtr('');
      setCustomViralFactor('');
      setCustomRecentTitle('');
      setUseCustomStats(false);
      
      addToast(`API Scan Failure: ${errorMsg}`, "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fetchCompetitorMetrics = async (channelIdOrHandle: string) => {
    const currentUid = uid || "guest";
    const userAccessToken = window.localStorage.getItem(`axe_hours_yt_access_token_${currentUid}`) || window.localStorage.getItem("axe_hours_yt_access_token") || "";

    const response = await fetch("/api/competitors/metrics", {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${userAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        handleOrId: channelIdOrHandle,
        accessToken: userAccessToken || undefined
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Failed to fetch competitor metrics: status ${response.status}`);
    }

    return await response.json();
  };

  const handleAddCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompetitorHandle.trim()) {
      addToast("Channel Handle or ID is required.", "error");
      return;
    }

    setIsAnalyzing(true);

    try {
      const formattedHandle = newCompetitorHandle.trim().startsWith('@') 
        ? newCompetitorHandle.trim() 
        : (newCompetitorHandle.trim().startsWith('UC') ? newCompetitorHandle.trim() : `@${newCompetitorHandle.trim()}`);

      const finalNiche = newCompetitorNiche === 'Custom...' 
        ? (customNicheInput.trim() || 'General Specialist')
        : newCompetitorNiche;

      let fetchedComp: any = null;

      // Only attempt to query live YouTube Data API if useCustomStats is NOT toggled
      if (!useCustomStats) {
        try {
          addToast("Querying YouTube Data API for live metrics...", "info");
          fetchedComp = await fetchCompetitorMetrics(newCompetitorHandle.trim());
        } catch (fetchErr: any) {
          console.warn("YouTube live API fetch failed, falling back to simulated generation:", fetchErr);
          addToast("YouTube API key/quota limit reached. Generating defensive simulated metrics instead.", "info");
        }
      }

      let newComp: Competitor;

      if (fetchedComp) {
        newComp = {
          ...fetchedComp,
          id: fetchedComp.id || `c-${Date.now()}`,
          niche: finalNiche || fetchedComp.niche
        };
      } else {
        // Simulated/calculated analytic value fallback defaults
        let subs = `${Math.floor(Math.random() * 900 + 50)}K`;
        let avgViews = `${Math.floor(Math.random() * 400 + 40)}K`;
        let hookRetention = Math.floor(Math.random() * 25) + 68; // 68 - 93%
        let ctr = Number(((hookRetention * 0.1) + 1.2).toFixed(1));
        let viralFactor = Number((Math.random() * 2 + 1.2).toFixed(1)); // 1.2 - 3.2X
        
        let autoTitle = "";
        if (finalNiche.toLowerCase().includes("gaming")) {
          autoTitle = "How I Beating Minecraft's Hardest World Record Live!";
        } else if (finalNiche.toLowerCase().includes("enterta") || finalNiche.toLowerCase().includes("challeng")) {
          autoTitle = "I Survived 100 Hours In The Most Extreme Sensory Deprivation Tank";
        } else if (finalNiche.toLowerCase().includes("finan") || finalNiche.toLowerCase().includes("busine") || finalNiche.toLowerCase().includes("invest")) {
          autoTitle = "The Undercover Dollar Loophole: How I Built a Passive Income Empire";
        } else if (finalNiche.toLowerCase().includes("health") || finalNiche.toLowerCase().includes("fit")) {
          autoTitle = "Why 95% of Gym Goers Get ZERO Results: The Hidden Workout Trick";
        } else {
          autoTitle = `The hidden ${finalNiche.toLowerCase()} loophole experts kept hidden from me for years...`;
        }

        let finalRecentViralTitle = autoTitle;

        // Apply manual overrides if toggled
        if (useCustomStats) {
          if (customSubs.trim()) subs = customSubs.trim();
          if (customAvgViews.trim()) avgViews = customAvgViews.trim();
          if (customHookRetention.trim()) {
            const parsed = parseInt(customHookRetention);
            if (!isNaN(parsed)) hookRetention = Math.min(100, Math.max(1, parsed));
          }
          if (customCtr.trim()) {
            const parsed = parseFloat(customCtr);
            if (!isNaN(parsed)) ctr = Math.min(100, Math.max(0.1, parsed));
          }
          if (customViralFactor.trim()) {
            const parsed = parseFloat(customViralFactor);
            if (!isNaN(parsed)) viralFactor = Number(parsed.toFixed(1));
          }
          if (customRecentTitle.trim()) finalRecentViralTitle = customRecentTitle.trim();
        }

        newComp = {
          id: `c-${Date.now()}`,
          handle: formattedHandle,
          name: newCompetitorName.trim() || formattedHandle.replace("@", ""),
          subs,
          niche: finalNiche,
          avgViews,
          hookRetention,
          ctr,
          viralFactor,
          recentViralTitle: finalRecentViralTitle,
          recentVideos: [
            {
              title: `${finalRecentViralTitle}`,
              views: avgViews,
              duration: "12:15",
              publishedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
              thumbnail: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500&auto=format&fit=crop&q=60",
              hookIdea: "High contrast outline pointing to a blurred background.",
              pacingStyle: "Fast jump-cuts, loud voiceover, zooming graphics every 2.5 seconds.",
              isViralOutlier: true,
              viralMultiplier: 2.8
            },
            {
              title: `Stop making these common mistakes in ${finalNiche}`,
              views: `${Math.round(parseFloat(avgViews) * 0.4 || 40)}K`,
              duration: "08:45",
              publishedAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
              thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60",
              hookIdea: "Split-screen comparing failure vs success setups.",
              pacingStyle: "Smooth slides, software screen-shares, informative commentary.",
              isViralOutlier: false,
              viralMultiplier: 0.9
            }
          ]
        };
      }

      if (uid !== "guest") {
        try {
          await deleteDoc(doc(db, 'competitors', `${uid}_c-1`));
          await deleteDoc(doc(db, 'competitors', `${uid}_c-2`));
          await deleteDoc(doc(db, 'competitors', 'c-1'));
          await deleteDoc(doc(db, 'competitors', 'c-2'));
        } catch (fireErr) {
          console.warn("Error cleaning up firestore mock creators: ", fireErr);
        }

        const docRef = doc(db, 'competitors', newComp.id);
        await setDoc(docRef, {
          ...newComp,
          userId: uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else {
        setCompetitors(prev => {
          const cleaned = prev.filter(c => c.id !== 'c-1' && c.id !== 'c-2' && c.handle !== '@saasguy' && c.handle !== '@techryse');
          return [...cleaned, newComp];
        });
      }

      setSelectedCompetitorId(newComp.id);
      setIsAddingCompetitor(false);
      logUserActivity('competitor_intel', `Registered Creator: ${newComp.name}`, `Added niche channel profile "${newComp.handle}" to system engagement indexes.`);

      // Clear tracking states
      setNewCompetitorHandle('');
      setNewCompetitorName('');
      setCustomNicheInput('');
      setCustomSubs('');
      setCustomAvgViews('');
      setCustomHookRetention('');
      setCustomCtr('');
      setCustomViralFactor('');
      setCustomRecentTitle('');
      setUseCustomStats(false);
      setScanError(null);

      addToast(`Competitor ${formattedHandle} added to Intelligence analysis deck!`, "success");
      playAudio(880);
    } catch (err: any) {
      console.error("Failed to add competitor:", err);
      addToast(err.message || "Failed to add competitor.", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteCompetitor = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (uid !== "guest") {
      try {
        await deleteDoc(doc(db, 'competitors', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `competitors/${id}`);
      }
    } else {
      setCompetitors(prev => prev.filter(c => c.id !== id));
    }
    if (selectedCompetitorId === id) {
      const remaining = competitors.filter(c => c.id !== id);
      if (remaining.length > 0) {
        setSelectedCompetitorId(remaining[0].id);
      }
    }
    addToast("Competitor channel removed from active monitoring.", "info");
    playAudio(330);
  };

  // Filter and Search logic
  const filteredCompetitors = useMemo(() => {
    if (!competitors || !Array.isArray(competitors)) return [];
    return competitors.filter(c => {
      if (!c) return false;
      const matchesNiche = activeNicheFilter === 'All' || c.niche === activeNicheFilter;
      const matchesSearch = (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (c.handle || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesNiche && matchesSearch;
    });
  }, [competitors, activeNicheFilter, searchQuery]);

  // Compute dynamic filter niches list from actual present competitor list so filters don't break on custom niches!
  const uniqueNiches = useMemo(() => {
    if (!competitors || !Array.isArray(competitors)) return ['All'];
    const niches = new Set<string>();
    competitors.forEach(c => {
      if (c && c.niche) niches.add(c.niche);
    });
    return ['All', ...Array.from(niches)];
  }, [competitors]);

  if (loading) {
    return (
      <div id="competitor-intel-workspace" className="space-y-8 animate-in fade-in duration-500 relative z-10 w-full max-w-7xl mx-auto py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 select-none mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <TrendingUp size={28} className="text-purple-400" /> Competitor Intelligence Platform
            </h1>
            <p className="text-on-surface-variant text-sm mt-1">
              Loading creator intelligence feeds and tracking databases...
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 bg-white/5 rounded-3xl border border-white/5 animate-pulse h-[400px]" />
          </div>
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 bg-white/5 rounded-3xl border border-white/5 animate-pulse h-[550px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="competitor-intel-workspace" className="space-y-8 animate-in fade-in duration-500 relative z-10 w-full max-w-7xl mx-auto">
      {/* Header section with competitor intelligence slogan */}
      <div id="competitor-header-block" className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 select-none">
        <div>
          <h1 id="competitor-title" className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <TrendingUp size={28} className="text-purple-400" /> Competitor Intelligence Platform
          </h1>
          <p id="competitor-subtitle" className="text-on-surface-variant text-sm mt-1">
            Analyze viral outliers, clone high-retention structure templates, and outperform the top creator ecosystem.
          </p>
        </div>
        <button
          onClick={() => {
            setIsAddingCompetitor(prev => !prev);
            playAudio(659);
          }}
          className="px-4 py-2.5 bg-primary-gradient hover:opacity-95 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-transform shadow-lg shadow-purple-500/10 hover:scale-[1.02] cursor-pointer"
        >
          <Plus size={16} />
          <span>Track channel</span>
        </button>
      </div>

      {/* Grid containing add form with expanded inputs */}
      {isAddingCompetitor && (
        <form onSubmit={handleAddCompetitor} className="p-5 bg-[#0a0614]/90 border border-purple-500/20 rounded-2xl space-y-4 max-w-2xl animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Configure Competitor Tracker</h3>
            <button 
              type="button" 
              onClick={() => setIsAddingCompetitor(false)}
              className="text-gray-400 hover:text-white text-xs uppercase cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono">Channel Handle</label>
              <input 
                type="text"
                required
                placeholder="e.g. @mrbeast"
                value={newCompetitorHandle}
                onChange={(e) => handleHandleChange(e.target.value)}
                className="w-full bg-[#020203] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-purple-400 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono">Creator Display Name</label>
              <input 
                type="text"
                required
                placeholder="e.g. MrBeast"
                value={newCompetitorName}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full bg-[#020203] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-purple-400 font-medium"
              />
            </div>
          </div>

          {/* Gemini Live Scraping Scanner tool button */}
          <div className="bg-[#581c87]/15 p-3.5 rounded-xl border border-[#a855f7]/25 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="text-[11px] text-gray-300">
              <span className="font-extrabold text-[#d8b4fe] block flex items-center gap-1.5 mb-0.5 select-none">
                <Sparkles size={13} className="text-purple-400 animate-pulse" /> Gemini Live Research Analyst
              </span>
              Use Search Grounding to auto-extract their real subscriber counts, averages, and outlier titles.
            </div>
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={handleLiveGeminiAnalysis}
              className={`w-full sm:w-auto px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all inline-flex items-center justify-center gap-1.5 border border-purple-500/20 active:scale-95 ${
                isAnalyzing
                  ? 'bg-purple-900/40 text-purple-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white cursor-pointer shadow-md'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw size={12} className="animate-spin" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <Sparkles size={12} className="animate-pulse" />
                  <span>Scan Live Creator</span>
                </>
              )}
            </button>
          </div>

          {scanError && (
            <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-3 text-xs text-red-200 space-y-1 animate-in fade-in slide-in-from-top-1 select-text">
              <div className="font-extrabold flex items-center gap-1.5 uppercase font-mono tracking-wider text-red-400">
                <span>⚠️ Scan Error / Limit Exceeded</span>
              </div>
              <p className="font-medium text-[11px] leading-relaxed">
                {scanError}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono">Channel Niche Core</label>
              <select
                value={newCompetitorNiche}
                onChange={(e) => {
                  setNewCompetitorNiche(e.target.value);
                  playAudio(440);
                }}
                className="w-full bg-[#020203] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none cursor-pointer"
              >
                <option value="SaaS & Development">SaaS & Development</option>
                <option value="AI & Automation">AI & Automation</option>
                <option value="Creative Tech">Creative Tech</option>
                <option value="Lifestyle Content">Lifestyle Content</option>
                <option value="Entertainment & Challenges">Entertainment & Challenges</option>
                <option value="Gaming & Esports">Gaming & Esports</option>
                <option value="Finance & Investing">Finance & Investing</option>
                <option value="Education & Tutorials">Education & Tutorials</option>
                <option value="Fitness & Health">Fitness & Health</option>
                <option value="Vlogging & Adventure">Vlogging & Adventure</option>
                <option value="Tech Reviews & Gadgets">Tech Reviews & Gadgets</option>
                <option value="Design & UX/UI">Design & UX/UI</option>
                <option value="Custom...">Custom Niche...</option>
              </select>
            </div>

            {newCompetitorNiche === 'Custom...' ? (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <label className="text-[10px] text-amber-400 font-bold uppercase tracking-wider font-mono">Enter Custom Niche Tag</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Cooking, Fashion, Photography"
                  value={customNicheInput}
                  onChange={(e) => setCustomNicheInput(e.target.value)}
                  className="w-full bg-[#020203] border border-amber-500/30 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-400 font-medium font-sans"
                />
              </div>
            ) : null}
          </div>

          {/* Performance stats toggler */}
          <div className="space-y-4 pt-1">
            <div className="flex justify-between items-center bg-black/35 p-2 rounded-xl border border-white/5 select-none text-[10px]">
              <span className="text-gray-400 font-bold uppercase font-mono tracking-wider pl-1 font-sans">Metrics Evaluation Mode</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setUseCustomStats(false);
                    playAudio(440);
                  }}
                  className={`px-3 py-1 text-[10px] font-mono rounded-lg transition-all ${
                    !useCustomStats 
                      ? 'bg-purple-600 text-white font-bold' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Predictive Core Model
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUseCustomStats(true);
                    playAudio(523);
                  }}
                  className={`px-3 py-1 text-[10px] font-mono rounded-lg transition-all ${
                    useCustomStats 
                      ? 'bg-purple-600 text-white font-bold' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Custom Live Metrics
                </button>
              </div>
            </div>

            {useCustomStats && (
              <div className="p-4 bg-black/45 border border-purple-500/10 rounded-xl space-y-4 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] text-gray-400 uppercase tracking-widest font-mono font-bold">Subscribers count</label>
                    <input
                      type="text"
                      placeholder="e.g. 19.5M, 496M, 850K"
                      value={customSubs}
                      onChange={(e) => setCustomSubs(e.target.value)}
                      className="w-full bg-[#020203] border border-white/10 rounded-xl p-2 text-xs text-white outline-none focus:border-purple-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-gray-400 uppercase tracking-widest font-mono font-bold">Avg views per Video</label>
                    <input
                      type="text"
                      placeholder="e.g. 4.5M, 148M, 220K"
                      value={customAvgViews}
                      onChange={(e) => setCustomAvgViews(e.target.value)}
                      className="w-full bg-[#020203] border border-white/10 rounded-xl p-2 text-xs text-white outline-none focus:border-purple-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] text-gray-400 uppercase tracking-widest font-mono font-bold">First 3-Sec Hook Retention (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      placeholder="e.g. 92"
                      value={customHookRetention}
                      onChange={(e) => setCustomHookRetention(e.target.value)}
                      className="w-full bg-[#020203] border border-white/10 rounded-xl p-2 text-xs text-white outline-none focus:border-purple-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-gray-400 uppercase tracking-widest font-mono font-bold">Viral Outlier Factor Multiplier (X)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 3.8"
                      value={customViralFactor}
                      onChange={(e) => setCustomViralFactor(e.target.value)}
                      className="w-full bg-[#020203] border border-white/10 rounded-xl p-2 text-xs text-white outline-none focus:border-purple-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-gray-400 uppercase tracking-widest font-mono font-bold">Recent Outlier Video Title</label>
                  <input
                    type="text"
                    placeholder="e.g. I Survived 100 Days Inside A Red Circle"
                    value={customRecentTitle}
                    onChange={(e) => setCustomRecentTitle(e.target.value)}
                    className="w-full bg-[#020203] border border-white/10 rounded-xl p-2 text-xs text-white outline-none focus:border-purple-400 font-semibold"
                  />
                </div>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-95 text-white font-bold rounded-xl text-xs uppercase tracking-wider"
          >
            Deploy Analysis Agent
          </button>
        </form>
      )}

      {/* Main interactive split display */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Channel Deck List */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <GlassCard glowColor="purple" className="flex flex-col space-y-4 border-white/5">
            <div className="space-y-3">
              <div className="flex justify-between items-center select-none pb-2 border-b border-white/5">
                <span className="text-xs font-extrabold uppercase text-gray-300 tracking-wider">CREATOR DECK</span>
                <span className="text-[9px] font-mono px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-full animate-pulse">LIVE TRACKING</span>
              </div>

              {/* Filters row */}
              <div className="flex flex-wrap gap-1.5 select-none max-h-[140px] overflow-y-auto custom-scrollbar p-0.5">
                {uniqueNiches?.map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      setActiveNicheFilter(n);
                      playAudio(523);
                    }}
                    className={`px-2 py-1 text-[10px] font-mono font-bold rounded-lg transition-all border uppercase shrink-0 ${
                      activeNicheFilter === n 
                        ? 'bg-purple-500/10 text-purple-300 border-purple-500/25' 
                        : 'bg-white/2 hover:bg-white/5 text-gray-400 border-transparent'
                    }`}
                  >
                    {n === 'All' ? 'ALL NICHES' : (n || '').split(' ')[0]}
                  </button>
                ))}
              </div>

              {/* Search Bar Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 select-none" size={13} />
                <input 
                  type="text"
                  placeholder="Filter competitor channels..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#020203] border border-white/5 hover:border-purple-500/10 focus:border-purple-500/20 rounded-xl p-2 pl-8.5 text-xs text-white outline-none font-medium transition-all"
                />
              </div>
            </div>

            {/* List stack */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto custom-scrollbar pr-1 select-text">
              {!competitors || competitors.length === 0 ? (
                <div className="text-center py-10 select-none space-y-4">
                  <p className="text-xs text-gray-400 italic">No creator channels added to tracking databases yet.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCompetitor(true);
                      playAudio(659);
                    }}
                    className="px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 rounded-xl text-[10px] font-mono uppercase font-bold cursor-pointer transition-colors"
                  >
                    + Track first channel
                  </button>
                </div>
              ) : filteredCompetitors.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-10 italic font-mono select-none">No tracked channels match filters.</p>
              ) : (
                filteredCompetitors?.map((c) => {
                  const isSelected = selectedCompetitorId === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedCompetitorId(c.id);
                        playAudio(659);
                      }}
                      className={`p-3.5 rounded-xl border transition-all duration-300 cursor-pointer flex justify-between items-center gap-3 relative group ${
                        isSelected 
                          ? 'bg-purple-950/20 border-purple-500/30' 
                          : 'bg-black/30 border-white/5 hover:border-purple-500/15'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white tracking-tight">{c.name}</span>
                          <span className="text-[10px] text-gray-400 font-mono italic">({c.handle})</span>
                        </div>
                        <div className="flex items-center gap-2.5 mt-1 select-none">
                          <span className="text-[10px] text-purple-300 font-mono uppercase font-bold text-[9px] bg-purple-500/5 px-1 py-0.5 rounded border border-purple-500/10">{(c?.niche || 'General').split(' ')[0]}</span>
                          <span className="text-[10px] text-gray-500 font-mono">• {c.subs} subs</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 select-none">
                        <div className="text-right">
                          <span className="text-[10.5px] font-black text-gray-400 font-mono block">Hook Ret. {c.hookRetention}%</span>
                          <span className="text-[9.5px] font-medium text-purple-300 font-mono block">CTR {(c.ctr || Number(((c.hookRetention * 0.1) + 1.2).toFixed(1)))}%</span>
                          <div className="flex items-center gap-0.5 text-emerald-400 text-[9px] font-bold font-mono justify-end">
                            <Flame size={9} />
                            <span>{c.viralFactor}X</span>
                          </div>
                        </div>
                        
                        <button
                          onClick={(e) => handleDeleteCompetitor(c.id, e)}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                          title="Untrack channel"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </GlassCard>

          {/* Live Push Notification Dispatcher Monitor */}
          <GlassCard glowColor="purple" className="p-4 border-white/5 space-y-4">
            <div className="flex justify-between items-center select-none pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Bell size={15} className={`text-purple-400 ${isDispatcherActive ? 'animate-bounce' : ''}`} />
                  {isDispatcherActive && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}
                </div>
                <span className="text-xs font-extrabold uppercase text-gray-300 tracking-wider">PUSH DISPATCHER MONITOR</span>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  setIsDispatcherActive(!isDispatcherActive);
                  playAudio(523);
                  addToast(isDispatcherActive ? "YouTube active monitoring subscription paused." : "YouTube active monitoring subscription activated!", isDispatcherActive ? "warning" : "success");
                }}
                className={`px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded-md border transition-all ${
                  isDispatcherActive 
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25' 
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                }`}
              >
                {isDispatcherActive ? "Active" : "Paused"}
              </button>
            </div>

            <p className="text-[10px] text-gray-400 leading-relaxed font-light">
              This panel tracks live upload events from monitored handles. Simulate a new video/Short upload to watch the subscription hook dispatch real-time web notifications and sync alerts directly with Firebase.
            </p>

            {/* Sim Form */}
            <form onSubmit={handleSimulateUpload} className="space-y-3 bg-black/45 p-3 rounded-xl border border-white/5">
              <div className="text-[9px] font-bold text-purple-300 uppercase tracking-wider font-mono flex items-center gap-1">
                <Radio size={10} className="text-purple-400 animate-pulse" /> Trigger Creator Upload Alert
              </div>
              
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] text-gray-400 uppercase font-bold">Select Creator</label>
                    <select
                      value={simCreatorId}
                      onChange={(e) => setSimCreatorId(e.target.value)}
                      className="w-full bg-[#020203] border border-white/10 rounded-lg p-2 text-[11px] text-white outline-none cursor-pointer"
                      disabled={!competitors || competitors.length === 0}
                    >
                      {!competitors || competitors.length === 0 ? (
                        <option>No creators monitored</option>
                      ) : (
                        competitors.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-gray-400 uppercase font-bold">Format Type</label>
                    <div className="flex bg-[#020203] rounded-lg p-0.5 border border-white/10">
                      <button
                        type="button"
                        onClick={() => { setSimType('video'); playAudio(440); }}
                        className={`flex-1 py-1 text-[9px] font-bold uppercase rounded-md transition-all ${
                          simType === 'video' ? 'bg-purple-600/30 text-purple-200' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Video
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSimType('short'); playAudio(440); }}
                        className={`flex-1 py-1 text-[9px] font-bold uppercase rounded-md transition-all ${
                          simType === 'short' ? 'bg-purple-600/30 text-purple-200' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Short
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-gray-400 uppercase font-bold">Upload Video Title</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={simType === 'short' ? "e.g. CTR secret they don't want you to know #shorts" : "e.g. How I Built a SaaS in 24 Hours"}
                      value={simTitle}
                      onChange={(e) => setSimTitle(e.target.value)}
                      className="w-full bg-[#020203] border border-white/10 rounded-lg p-2 text-[11px] text-white outline-none focus:border-purple-400 pr-12 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const ideas = simType === 'short' 
                          ? [
                              "How to double your retention in 5 seconds! #shorts",
                              "The exact hook that got me 12M views #shorts",
                              "Stop editing your videos like this ❌ #shorts",
                              "3 developer tools that feel illegal to know 😱 #shorts"
                            ]
                          : [
                              "I Built a fully functional AI startup in 24 Hours",
                              "The brutal truth about Software Engineering in 2026",
                              "How to clone Gordon Ramsay's entire content pipeline",
                              "How to write code 10x faster using Gemini 3.5"
                            ];
                        setSimTitle(ideas[Math.floor(Math.random() * ideas.length)]);
                        playAudio(523);
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-1 bg-white/5 hover:bg-white/10 text-[9px] font-bold uppercase rounded text-purple-300 cursor-pointer"
                    >
                      Roll
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] text-gray-400 uppercase font-bold">Mock Views</label>
                    <input
                      type="text"
                      value={simViews}
                      onChange={(e) => setSimViews(e.target.value)}
                      className="w-full bg-[#020203] border border-white/10 rounded-lg p-2 text-[11px] text-white outline-none font-mono"
                      placeholder="e.g. 1.2M, 45K"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-gray-400 uppercase font-bold">Mock Duration</label>
                    <input
                      type="text"
                      value={simDuration}
                      onChange={(e) => setSimDuration(e.target.value)}
                      className="w-full bg-[#020203] border border-white/10 rounded-lg p-2 text-[11px] text-white outline-none font-mono text-center"
                      placeholder="e.g. 12:45"
                      disabled={simType === 'short'}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={!competitors || competitors.length === 0}
                className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-95 disabled:opacity-50 text-white font-black rounded-lg text-[10px] uppercase tracking-widest cursor-pointer shadow-lg shadow-purple-500/10 flex items-center justify-center gap-1"
              >
                <Play size={10} fill="white" /> Dispatch Live Upload Alert
              </button>
            </form>

            {/* Alerts Log Feed */}
            <div className="space-y-2 select-text">
              <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 select-none uppercase font-bold tracking-wider">
                <span>Alert dispatcher stream</span>
                <span>{alerts.length} registered</span>
              </div>

              {alerts.length === 0 ? (
                <div className="p-4 bg-white/2 rounded-xl border border-dashed border-white/5 text-center text-gray-500 italic text-[10px] select-none">
                  Monitoring subscription is active. Waiting for upload triggers...
                </div>
              ) : (
                <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                  {alerts.map(a => (
                    <div key={a.id} className="p-2.5 bg-black/40 border border-purple-500/10 rounded-lg space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-white truncate leading-tight">{a.creatorName}</p>
                          <p className="text-[9px] text-gray-400 font-mono italic">{a.handle}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 select-none">
                          <span className={`text-[8px] font-extrabold uppercase px-1 py-0.5 rounded ${
                            a.isShort ? 'bg-pink-500/10 text-pink-300 border border-pink-500/10' : 'bg-purple-500/10 text-purple-300 border border-purple-500/10'
                          }`}>
                            {a.isShort ? 'SHORT' : 'VIDEO'}
                          </span>
                          <span className="text-[9px] text-gray-500 font-mono">{a.timestamp}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-300 leading-snug">{a.videoTitle}</p>
                      <div className="flex items-center justify-between pt-1 select-none border-t border-white/5">
                        <div className="flex items-center gap-1.5 text-[8.5px] text-gray-500 font-mono">
                          <span>Views: <strong className="text-gray-400">{a.views}</strong></span>
                          <span>•</span>
                          <span>Duration: <strong className="text-gray-400">{a.duration}</strong></span>
                        </div>
                        <div className="flex items-center gap-1 text-[8px] text-emerald-400 font-mono font-bold uppercase tracking-wider">
                          <Check size={8} className="text-emerald-400" /> Firebase Synced
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlassCard>

          {/* Quick niche performance index */}
          <GlassCard glowColor="amber" className="p-4 border-white/5 select-none text-[11px] space-y-2 leading-relaxed">
            <span className="font-extrabold uppercase text-[#f59e0b] tracking-wider font-mono flex items-center gap-1.5">
              <Sparkles size={13} /> Niche Intelligence Index
            </span>
            <div className="grid grid-cols-2 gap-3.5 pt-1 text-center font-mono">
              <div className="p-2 border border-white/5 bg-black/40 rounded-lg">
                <span className="text-gray-500 block text-[9px]">SaaS Average CTR</span>
                <span className="text-white mt-0.5 block font-bold text-xs">7.42%</span>
              </div>
              <div className="p-2 border border-white/5 bg-black/40 rounded-lg">
                <span className="text-gray-500 block text-[9px]">SaaS Avg Hook Ret.</span>
                <span className="text-purple-300 mt-0.5 block font-bold text-xs">82.4%</span>
              </div>
              <div className="p-2 border border-white/5 bg-black/40 rounded-lg">
                <span className="text-gray-500 block text-[9px]">AI Average CTR</span>
                <span className="text-white mt-0.5 block font-bold text-xs">8.15%</span>
              </div>
              <div className="p-2 border border-white/5 bg-black/40 rounded-lg">
                <span className="text-gray-500 block text-[9px]">AI Avg Hook Ret.</span>
                <span className="text-purple-300 mt-0.5 block font-bold text-xs">85.8%</span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right Side: Analytical Deep Dive */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          {activeCompetitor ? (
            <>
              {/* Dynamic Strategy metrics Header */}
              {isEditingCompetitor ? (
                <GlassCard glowColor="purple" className="border-purple-500/20 select-text relative overflow-hidden flex flex-col space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <span className="text-[10px] text-purple-300 uppercase font-black tracking-widest font-mono">Edit Competitor Stats</span>
                    <button
                      type="button"
                      onClick={() => setIsEditingCompetitor(false)}
                      className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded bg-white/5 text-gray-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>

                  <form onSubmit={handleSaveCompetitorEdits} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-400 uppercase tracking-widest font-mono font-bold">Display Name</label>
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-[#020203] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-purple-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-400 uppercase tracking-widest font-mono font-bold">Handle</label>
                        <input
                          type="text"
                          required
                          placeholder="@username"
                          value={editHandle}
                          onChange={(e) => setEditHandle(e.target.value)}
                          className="w-full bg-[#020203] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-purple-400 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-400 uppercase tracking-widest font-mono font-bold">Niche Tag</label>
                        <input
                          type="text"
                          required
                          value={editNiche}
                          onChange={(e) => setEditNiche(e.target.value)}
                          className="w-full bg-[#020203] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-purple-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-400 uppercase tracking-widest font-mono font-bold">Subscribers</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 20.6M, 334M"
                          value={editSubs}
                          onChange={(e) => setEditSubs(e.target.value)}
                          className="w-full bg-[#020203] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-purple-400 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="space-y-1 col-span-1">
                        <label className="text-[9px] text-gray-400 uppercase tracking-widest font-mono font-bold">Avg views</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 1.2M, 450K"
                          value={editAvgViews}
                          onChange={(e) => setEditAvgViews(e.target.value)}
                          className="w-full bg-[#020203] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-purple-400"
                        />
                      </div>
                      <div className="space-y-1 col-span-1">
                        <label className="text-[9px] text-gray-400 uppercase tracking-widest font-mono font-bold">Retention (%)</label>
                        <input
                          type="number"
                          required
                          min="1"
                          max="100"
                          value={editHookRetention}
                          onChange={(e) => setEditHookRetention(parseInt(e.target.value) || 0)}
                          className="w-full bg-[#020203] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-purple-400"
                        />
                      </div>
                      <div className="space-y-1 col-span-1">
                        <label className="text-[9px] text-gray-400 uppercase tracking-widest font-mono font-bold">CTR (%)</label>
                        <input
                          type="number"
                          required
                          step="0.1"
                          min="0.1"
                          max="100"
                          value={editCtr}
                          onChange={(e) => setEditCtr(parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#020203] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-purple-400"
                        />
                      </div>
                      <div className="space-y-1 col-span-1">
                        <label className="text-[9px] text-gray-400 uppercase tracking-widest font-mono font-bold">Viral Factor (X)</label>
                        <input
                          type="number"
                          required
                          step="0.1"
                          value={editViralFactor}
                          onChange={(e) => setEditViralFactor(parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#020203] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-purple-400"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-400 uppercase tracking-widest font-mono font-bold">Top Outlier Title Analyzed</label>
                      <input
                        type="text"
                        required
                        value={editRecentViralTitle}
                        onChange={(e) => setEditRecentViralTitle(e.target.value)}
                        className="w-full bg-[#020203] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-purple-400 font-semibold italic"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-black font-black uppercase tracking-wider rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
                    >
                      <Check size={14} />
                      <span>Save Changes</span>
                    </button>
                  </form>
                </GlassCard>
              ) : (
                <GlassCard glowColor="green" className="border-emerald-500/10 select-text relative overflow-hidden flex flex-col justify-between space-y-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div className="space-y-1">
                      <span className="text-[10px] text-purple-300 uppercase font-black tracking-widest font-mono">Outlier Content Deep Analysis</span>
                      <h2 className="text-xl font-extrabold text-white tracking-tight mt-1">
                        {activeCompetitor.name}
                      </h2>
                      <p className="text-xs text-gray-400 italic">
                        Primary distribution platform handles outlier multiplier of <span className="text-emerald-400 font-bold font-mono">{activeCompetitor.viralFactor}X</span> over standard viewership index.
                      </p>
                    </div>

                    <div className="flex flex-row items-center justify-between flex-wrap gap-2 select-none self-start md:self-center shrink-0">
                      <button
                        onClick={startEditingActiveCompetitor}
                        className="p-1 px-2.5 border border-[#a855f7]/30 bg-purple-950/20 text-[#d8b4fe] hover:bg-[#a855f7]/25 text-[10px] uppercase font-mono font-bold rounded flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                        title="Edit competitor statistics"
                      >
                        <Edit size={10} />
                        <span>Edit Stats</span>
                      </button>
                      <div className="p-1 px-2 border border-emerald-500/25 bg-emerald-500/5 text-emerald-300 text-[10px] uppercase font-mono font-bold rounded">
                        Analytical Focus Active
                      </div>
                    </div>
                  </div>

                  {/* Grid analytics dials */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 select-none pt-2">
                    <div className="bg-black/50 border border-white/5 p-4 rounded-xl space-y-1 hover:border-emerald-500/10 transition-colors">
                      <div className="flex justify-between text-[9px] uppercase font-bold text-gray-400 tracking-wider">
                        <span>Avg Audience Pull</span>
                      </div>
                      <p className="text-xl font-bold text-white font-mono">{activeCompetitor.avgViews}</p>
                      <span className="text-[9.5px] text-gray-500">Normal video metric baseline</span>
                    </div>

                    <div className="bg-black/50 border border-white/5 p-4 rounded-xl space-y-1 hover:border-emerald-500/10 transition-colors">
                      <div className="flex justify-between text-[9px] uppercase font-bold text-gray-400 tracking-wider">
                        <span>Ref Retention Factor</span>
                      </div>
                      <p className="text-xl font-bold text-[#10b981] font-mono">{activeCompetitor.hookRetention}%</p>
                      <span className="text-[9.5px] text-emerald-500 font-mono">Core launch outliers</span>
                    </div>

                    <div className="bg-black/50 border border-white/5 p-4 rounded-xl space-y-1 hover:border-emerald-500/10 transition-colors">
                      <div className="flex justify-between text-[9px] uppercase font-bold text-gray-400 tracking-wider">
                        <span>Viral Amplitude</span>
                      </div>
                      <p className="text-xl font-bold text-[#f59e0b] font-mono">{activeCompetitor.viralFactor}X</p>
                      <span className="text-[9.5px] text-gray-500 font-mono">Organic velocity score</span>
                    </div>
                  </div>

                  {/* Viral outlying concept snippet */}
                  <div className="p-3.5 rounded-xl border border-purple-500/15 bg-purple-950/25 space-y-2">
                    <span className="text-[10px] font-bold text-purple-300 uppercase tracking-widest font-mono block">Top Outlier Title Analyzed:</span>
                    <div className="text-xs font-semibold text-white bg-black/40 border border-white/5 p-3 rounded-lg leading-relaxed italic pr-2">
                      "{activeCompetitor.recentViralTitle}"
                    </div>
                  </div>
                </GlassCard>
              )}

              {/* Interactive Deep Dive Tabs & Detail Views */}
              <div className="space-y-4">
                {/* Selector Tabs */}
                <div className="flex border-b border-white/5 pb-2 justify-between items-center select-none gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setRightPanelTab('videos'); playAudio(440); }}
                      className={`px-3.5 py-2 text-[11px] font-mono font-bold rounded-lg border uppercase transition-all ${
                        rightPanelTab === 'videos'
                          ? 'bg-purple-500/15 text-purple-200 border-purple-500/30'
                          : 'bg-transparent text-gray-500 border-transparent hover:text-gray-300'
                      }`}
                    >
                      📽️ {activeCompetitor.name}'s Outlier Videos
                    </button>
                    <button
                      onClick={() => { setRightPanelTab('blueprint'); playAudio(440); }}
                      className={`px-3.5 py-2 text-[11px] font-mono font-bold rounded-lg border uppercase transition-all ${
                        rightPanelTab === 'blueprint'
                          ? 'bg-purple-500/15 text-purple-200 border-purple-500/30'
                          : 'bg-transparent text-gray-500 border-transparent hover:text-gray-300'
                      }`}
                    >
                      🎯 Replication Blueprint
                    </button>
                  </div>
                  {rightPanelTab === 'blueprint' && (
                    <span className="text-[11px] text-[#a855f7] hover:underline cursor-pointer flex items-center pr-1 transition-all" onClick={() => addToast("Framework template imported successfully!", "success")}>
                      Import formula <ChevronRight size={13} />
                    </span>
                  )}
                </div>

                {rightPanelTab === 'videos' ? (
                  <div id="outlier-videos-deck" className="space-y-4 select-text">
                    <div className="text-xs text-purple-200 italic mb-1 flex items-center gap-2 leading-relaxed bg-purple-500/5 p-3.5 rounded-xl border border-purple-500/10 select-none">
                      <Sparkles size={13} className="text-purple-400 shrink-0" />
                      <span>We searched and identified these exact videos from <strong>{activeCompetitor?.name || "Target Creator"}</strong>. Look at their hook and pacing styles to steal their retention hacks!</span>
                    </div>

                    {(activeCompetitor?.recentVideos && activeCompetitor.recentVideos.length > 0 ? activeCompetitor.recentVideos : [
                      {
                        title: `The Ultimate ${activeCompetitor?.niche || "Creator"} strategy that changed everything for ${activeCompetitor?.name || "Creator"}`,
                        views: activeCompetitor?.avgViews || "420K",
                        duration: "12:15",
                        hookIdea: `Puts up a massive high contrast revenue or viewership multiplier overlay, starting mid-story and claiming that everything you know about ${activeCompetitor?.niche || "Creator"} is wrong.`,
                        pacingStyle: "Extremely clean fast-cuts, zoom highlights, and mechanical typewriter audio transitions."
                      },
                      {
                        title: `How ${activeCompetitor?.name || "Creator"} generates over 10M organic views in 2026`,
                        views: "1.2M",
                        duration: "10:30",
                        hookIdea: `Demonstrates a side by side comparison showing a viral outcome versus a boring average outcome in the first 4 seconds.`,
                        pacingStyle: "High frame-rate screen transitions, dynamic progress indicators, and precise subtitles alignment."
                      },
                      {
                        title: `Why 99% of people fail at ${activeCompetitor?.niche || "Creator"} (Masterclass)`,
                        views: "350K",
                        duration: "15:45",
                        hookIdea: `Stares directly at the camera with absolute seriousness, listing three direct warnings and an immediate reward loop schedule.`,
                        pacingStyle: "Inspirational or technical layout overlays, split screen coding/design blocks, clear vocal pacing."
                      }
                    ])?.map((video, idx) => (
                      <div 
                        key={idx}
                        className="p-4 bg-[rgba(2,2,3,0.4)] border border-white/5 hover:border-purple-500/20 rounded-2xl space-y-3.5 transition-all group hover:bg-[#07040e]/40 select-text"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-2 border-b border-white/5 pb-2.5">
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-mono text-purple-400 font-bold uppercase tracking-wider block mb-1">Outlier Video #0{idx+1}</span>
                            <h4 className="text-xs font-black text-white hover:text-purple-300 transition-colors leading-snug">
                              "{video.title}"
                            </h4>
                          </div>
                          <div className="flex gap-1.5 sm:self-start shrink-0 select-none items-center flex-wrap justify-end">
                            {video.isViralOutlier && (
                              <span className="text-[9.5px] font-mono font-black px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.2)]">
                                🔥 VIRAL OUTLIER
                              </span>
                            )}
                            <span className="text-[9.5px] font-mono font-black px-2 py-0.5 bg-purple-500/15 border border-purple-500/20 text-purple-300 rounded-full">
                              {video.views} Views
                            </span>
                            <span className="text-[9.5px] font-mono px-2 py-0.5 bg-white/5 border border-white/10 text-gray-400 rounded-full">
                              {video.duration}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div className="space-y-1 bg-black/35 p-3 rounded-xl border border-white/5 hover:border-purple-500/10 transition-colors">
                            <span className="text-[9.5px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">⚡ Visual Hook Strategy (0:00 - 0:05)</span>
                            <p className="text-gray-200 text-[11px] leading-relaxed font-sans mt-1">
                              {video.hookIdea}
                            </p>
                          </div>

                          <div className="space-y-1 bg-black/35 p-3 rounded-xl border border-white/5 hover:border-purple-500/10 transition-colors">
                            <span className="text-[9.5px] font-mono font-bold text-amber-400 uppercase tracking-wider block">🎞️ Pacing & Editing Blueprint</span>
                            <p className="text-gray-300 text-[11px] leading-relaxed font-sans mt-1">
                              {video.pacingStyle}
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-1 select-none gap-2">
                          <span className="text-[10px] text-gray-400 font-mono italic">
                            Click remix to auto-generate a custom script template using this style
                          </span>
                          <button
                            onClick={() => {
                              playAudio(880);
                              addToast(`Successfully remixed: "${video.title}"! Template copied into script workspace. 🚀`, "success");
                              logUserActivity('script_generator', `Remixed Creator Style: ${activeCompetitor?.name || "Creator"}`, `Loaded structural template of "${video.title}" into pacing engine prompt contexts.`);
                            }}
                            className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:opacity-95 text-white text-[10px] uppercase font-black tracking-wider rounded-lg shadow-md shadow-fuchsia-500/10 cursor-pointer active:scale-95 transition-transform flex items-center gap-1 shrink-0"
                          >
                            <Sparkles size={10} />
                            <span>Remix Hook</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3.5 select-text">
                    {competitorsHookStrategies?.map((item, idx) => (
                      <div 
                        key={idx}
                        className="p-3.5 bg-black/40 border border-white/5 hover:border-purple-500/10 rounded-xl space-y-2 transition-colors relative"
                      >
                        <div className="flex items-center gap-2 justify-between">
                          <div className="flex items-center gap-2">
                            <Cpu size={12} className="text-purple-400 shrink-0" />
                            <span className="text-[10.5px] uppercase font-bold text-gray-300 tracking-wider font-mono">{item.part}</span>
                          </div>
                          <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 bg-white/5 rounded text-gray-400">
                            {item.type}
                          </span>
                        </div>
                        
                        <p className="text-xs font-medium text-white pl-4 border-l border-purple-500/15">
                          {item.strategy}
                        </p>

                        <div className="flex gap-1.5 text-[10px] pl-4 text-gray-500 font-light mt-1.5">
                          <span className="font-bold text-gray-400 font-mono text-[9px] uppercase select-none shrink-0 border-r border-white/10 pr-1.5">Visual Accent</span>
                          <span>{item.framing}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <GlassCard glowColor="purple" className="p-8 text-center space-y-4 border-white/5 min-h-[400px] flex flex-col justify-center items-center select-none">
              <TrendingUp className="text-purple-400 w-12 h-12 animate-pulse" />
              <div className="space-y-2">
                <h3 className="text-base font-bold text-white">No active competitor analysis focus</h3>
                <p className="text-gray-400 text-xs max-w-sm mx-auto leading-relaxed">
                  Track or select a creator channel from the deck list to trigger the Gemini Live Research Analyst and generate content strategies.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddingCompetitor(true);
                  playAudio(659);
                }}
                className="px-5 py-2.5 bg-primary-gradient text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-transform hover:scale-[1.02] shadow-lg cursor-pointer animate-bounce"
              >
                <Plus size={14} />
                <span>Track channel</span>
              </button>
            </GlassCard>
          )}
        </div>

      </div>
    </div>
  );
};
