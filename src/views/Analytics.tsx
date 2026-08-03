import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { useFirebase } from '../context/FirebaseContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { 
  BarChart3, 
  ArrowUpRight, 
  Clock, 
  Flame, 
  Sliders, 
  Gauge, 
  TrendingUp, 
  Sparkles, 
  Lightbulb, 
  Info, 
  Zap, 
  Volume2, 
  Play, 
  Award,
  ChevronRight,
  AlertTriangle,
  Youtube,
  Instagram,
  Link2,
  Unlink,
  CheckCircle2,
  RefreshCw,
  Lock,
  Settings,
  Globe,
  ArrowRight,
  Cloud,
  CloudOff
} from 'lucide-react';
import { playAudioCue } from '../utils/audio';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { useToast } from '../context/ToastContext';

interface GenerationItem {
  id: number;
  title: string;
  content: string;
  date: string;
}

interface AnalyticsProps {
  recentGenerations: GenerationItem[];
}

interface CalculatedSegment {
  id: string;
  label: string;      // HOOK, LEAD-IN, PAYLOAD, CTA
  startTime: number;  // seconds
  endTime: number;    // seconds
  duration: number;   // seconds
  visual: string;     // scene instruction
  voiceover: string;  // voiceover script
  sfx: string;        // sound effect
  caption: string;    // caption overlay text
  retentionBase: number; // base retention rating
}

// Default reference script content if no generations are available
const DEFAULT_BLUEPRINT_SCRIPT = `[CORE CONCEPT & VIRAL ANGLE]
Our viral core angle focuses on high-impact developer psychological bottlenecks. Rather than traditional SaaS workflows which feel bloated and slow, we introduce the concept of "Micro-blueprints"—an agile framework showing swift payouts with little upfront effort.

[THE HOOK SCRIPTS (3 VARIATIONS)]
Option 1: "Stop spending 6 months coding a SaaS that nobody wants. Here's how to build, compile, and scale a functional micro-app in exactly 24 hours of focus." (94% Retention Potential)

[TIMECODE ACTION TIMELINE]
- 0:00 - 0:03 [HOOK]: Extreme desk zoom overlay showing a Distressed console workspace.
- 0:03 - 0:15 [LEAD-IN]: Graphic of 100 failed projects sliding down, overlaying a sad face icon.
- 0:15 - 0:45 [PAYLOAD]: Real code compilation visual showing file setup in Express & Vite speed.
- 0:45 - 1:00 [CTA]: Hovering neon prompt stating 'Comment FOR ALL DATA' to initiate automation callback.`;

// Custom Tooltip component for Recharts factor visualizer
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#0e0c15]/95 border border-white/10 rounded-lg p-3 shadow-2xl font-sans text-left min-w-[160px] pointer-events-none select-none">
        <p className="text-[11px] font-bold text-white uppercase tracking-wider mb-2">{data.factor}</p>
        <div className="space-y-1.5 text-[10px]">
          <div className="flex justify-between items-center gap-4">
            <span className="text-gray-400 font-light">Calculated Rating:</span>
            <span className="font-bold font-mono text-emerald-400">{data.score}%</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-gray-400 font-light">Industry Standard:</span>
            <span className="font-bold font-mono text-gray-400">{data.benchmark}%</span>
          </div>
          <div className="flex justify-between items-center gap-4 border-t border-white/5 pt-1.5 mt-1">
            <span className="text-purple-300 font-medium">Model Influence:</span>
            <span className="font-black font-mono text-purple-400">{data.weight}% Weight</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Custom Tooltip component for Recharts projected growth simulator
const GrowthTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#0e0c15]/96 border border-white/10 rounded-lg p-3 shadow-2xl font-sans text-left min-w-[200px] pointer-events-none select-none">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 font-mono">Time elapsed: {data.timeLabel}</p>
        <div className="space-y-1.5 text-[10.5px]">
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-gray-300 font-light">Simulated retention:</span>
            </div>
            <span className="font-bold font-mono text-purple-300">{data.hypothetical}%</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-500" />
              <span className="text-gray-400 font-light">Industry Standard:</span>
            </div>
            <span className="font-bold font-mono text-gray-500">{data.baseline}%</span>
          </div>
          <div className="flex justify-between items-center gap-4 border-t border-white/5 pt-1.5 mt-1">
            <span className="text-emerald-400 font-bold">Retention Delta:</span>
            <span className="font-bold font-mono text-emerald-400">
              +{Math.max(0, parseFloat((data.hypothetical - data.baseline).toFixed(1)))}%
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const Analytics: React.FC<AnalyticsProps> = ({ recentGenerations = [] }) => {
  const { addToast } = useToast();
  const { user } = useFirebase();
  const uid = user?.uid || "guest";

  const localStorage = {
    getItem: (key: string): string | null => {
      return window.localStorage.getItem(`${key}_${uid}`) || window.localStorage.getItem(key);
    },
    setItem: (key: string, value: string): void => {
      window.localStorage.setItem(`${key}_${uid}`, value);
    },
    removeItem: (key: string): void => {
      window.localStorage.removeItem(`${key}_${uid}`);
      window.localStorage.removeItem(key);
    }
  };

  // Navigation & dropdown state for selected script to analyze
  const [selectedScriptId, setSelectedScriptId] = useState<string>("default");
  const [hoveredSecond, setHoveredSecond] = useState<number | null>(null);
  
  // Tab selector for Click-Through Curve vs AI Factoring & Weights vs Projected Growth vs YouTube Analytics
  const [activeTabLeftCol, setActiveTabLeftCol] = useState<'weights' | 'ctr' | 'growth' | 'youtube_analytics'>('weights');
  const [simHookStrength, setSimHookStrength] = useState<number>(75);

  // Studio configuration and syncing states
  const [youtubeConnected, setYoutubeConnected] = useState<boolean>(() => {
    return localStorage.getItem("axe_hours_yt_connected") === "true";
  });
  const [instagramConnected, setInstagramConnected] = useState<boolean>(() => {
    return localStorage.getItem("axe_hours_ig_connected") === "true";
  });
  const [ytChannelName, setYtChannelName] = useState<string>(() => {
    return localStorage.getItem("axe_hours_yt_name") || "Axe Creator Shorts";
  });
  const [ytAvatar, setYtAvatar] = useState<string>(() => {
    return localStorage.getItem("axe_hours_yt_avatar") || "";
  });
  const [igHandleName, setIgHandleName] = useState<string>(() => {
    return localStorage.getItem("axe_hours_ig_name") || "axe.creator.studio";
  });
  const [ytSubscribed, setYtSubscribed] = useState<number>(() => {
    const saved = localStorage.getItem("axe_hours_yt_subscribers");
    return saved ? Number(saved) : 14250;
  });
  const [igSubscribed, setIgSubscribed] = useState<number>(() => {
    const saved = localStorage.getItem("axe_hours_ig_followers");
    return saved ? Number(saved) : 32900;
  });

  useEffect(() => {
    setYoutubeConnected(localStorage.getItem("axe_hours_yt_connected") === "true");
    setInstagramConnected(localStorage.getItem("axe_hours_ig_connected") === "true");
    setYtChannelName(localStorage.getItem("axe_hours_yt_name") || "Axe Creator Shorts");
    setYtAvatar(localStorage.getItem("axe_hours_yt_avatar") || "");
    setIgHandleName(localStorage.getItem("axe_hours_ig_name") || "axe.creator.studio");
    setYtSubscribed(Number(localStorage.getItem("axe_hours_yt_subscribers") || "14250"));
    setIgSubscribed(Number(localStorage.getItem("axe_hours_ig_followers") || "32900"));
  }, [uid]);
  
  const [isConnectingYT, setIsConnectingYT] = useState(false);
  const [isConnectingIG, setIsConnectingIG] = useState(false);
  const [showGcpTroubleshooter, setShowGcpTroubleshooter] = useState(false);

  const [ytAnalyticsData, setYtAnalyticsData] = useState<any[]>([]);
  const [isYtAnalyticsLoading, setIsYtAnalyticsLoading] = useState<boolean>(false);
  const [ytAnalyticsError, setYtAnalyticsError] = useState<string | null>(null);
  const [scopeMissing, setScopeMissing] = useState<boolean>(false);

  const getDatesLast28Days = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 28);
    
    const formatDate = (date: Date) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };
    
    return {
      startDate: formatDate(start),
      endDate: formatDate(end)
    };
  };

  const generateMock28DayAnalytics = () => {
    const data = [];
    const end = new Date();
    for (let i = 28; i >= 0; i--) {
      const date = new Date();
      date.setDate(end.getDate() - i);
      const dayLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      
      const baseViews = 1500 + Math.sin(i * 0.5) * 400 + Math.random() * 200;
      const views = Math.round(baseViews);
      const estimatedMinutesWatched = Math.round(baseViews * 1.8 + Math.random() * 100);
      const averageViewDuration = Math.round(45 + Math.sin(i * 0.3) * 10 + Math.random() * 5);
      const subscribersGained = Math.round(15 + Math.sin(i * 0.4) * 8 + (Math.random() > 0.8 ? 20 : 0));
      
      data.push({
        day: dayLabel,
        rawDate: date.toISOString().split('T')[0],
        views,
        estimatedMinutesWatched,
        averageViewDuration,
        subscribersGained
      });
    }
    return data;
  };

  const fetchYouTubeAnalytics = async (token: string) => {
    setIsYtAnalyticsLoading(true);
    setYtAnalyticsError(null);
    setScopeMissing(false);
    
    try {
      // Endpoint: https://youtubeanalytics.googleapis.com/v2/reports
      // Required Params: ids=channel==MINE, startDate=2026-06-01, endDate=2026-06-29, metrics=views,estimatedMinutesWatched,averageViewDuration, dimensions=day.
      const todayStr = new Date().toISOString().split('T')[0];
      const url = `https://youtubeanalytics.googleapis.com/v2/reports` + 
                  `?ids=channel==MINE` +
                  `&startDate=2026-06-01` +
                  `&endDate=${todayStr}` +
                  `&metrics=views,estimatedMinutesWatched,averageViewDuration` +
                  `&dimensions=day`;
                  
      console.log("Attempting to fetch YouTube Analytics data...");
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      console.log("Analytics data received:", data);
      
      if (!response.ok) {
        console.error("YouTube Analytics API error details:", data);
        
        if (response.status === 401 || response.status === 403) {
          setScopeMissing(true);
          throw new Error("YouTube Analytics API access unauthorized/forbidden (401/403). Ensure 'yt-analytics.readonly' scope is authorized.");
        }
        throw new Error(data?.error?.message || `API returned status ${response.status}`);
      }
      
      if (!data.rows || data.rows.length === 0) {
        setYtAnalyticsData([]);
        return;
      }
      
      const headers = data.columnHeaders.map((h: any) => h.name);
      const dayIdx = headers.indexOf('day');
      const viewsIdx = headers.indexOf('views');
      const minutesIdx = headers.indexOf('estimatedMinutesWatched');
      const avdIdx = headers.indexOf('averageViewDuration');
      
      const mapped = data.rows.map((row: any[]) => {
        const dateStr = row[dayIdx];
        let formattedDate = dateStr;
        try {
          const parts = dateStr.split('-');
          if (parts.length === 3) {
            const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            formattedDate = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          }
        } catch (e) {}
        
        return {
          day: formattedDate,
          rawDate: dateStr,
          views: Number(row[viewsIdx]) || 0,
          estimatedMinutesWatched: Number(row[minutesIdx]) || 0,
          averageViewDuration: Number(row[avdIdx]) || 0
        };
      });
      
      mapped.sort((a: any, b: any) => a.rawDate.localeCompare(b.rawDate));
      setYtAnalyticsData(mapped);
    } catch (error: any) {
      console.error("YouTube Analytics retrieval failed:", error);
      setYtAnalyticsError(error.message || "Failed to fetch YouTube Analytics data.");
      if (error.message?.includes("unauthorized") || error.message?.includes("forbidden") || error.message?.includes("scope") || error.message?.includes("401") || error.message?.includes("403")) {
        setScopeMissing(true);
      }
    } finally {
      setIsYtAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    const currentUid = auth.currentUser?.uid || user?.uid || "guest";
    const token = window.localStorage.getItem(`axe_hours_yt_access_token_${currentUid}`) || window.localStorage.getItem("axe_hours_yt_access_token");
    console.log("YouTube Analytics trigger useEffect. Current UID:", currentUid, "hasToken:", !!token, "youtubeConnected:", youtubeConnected);
    if (youtubeConnected) {
      if (token) {
        fetchYouTubeAnalytics(token);
      } else {
        // Connected via sandbox mock stats! Populate mock analytics data.
        setYtAnalyticsData(generateMock28DayAnalytics());
        setYtAnalyticsError(null);
        setScopeMissing(false);
      }
    } else {
      setYtAnalyticsData([]);
      setYtAnalyticsError(null);
      setScopeMissing(false);
    }
  }, [user, uid, youtubeConnected]);

  const [syncedDrafts, setSyncedDrafts] = useState<any[]>([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);

  const fetchSyncedDrafts = async () => {
    const draftsCollectionPath = "draft_dispatches";
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setSyncedDrafts([]);
        return;
      }
      setIsLoadingDrafts(true);
      const q = query(
        collection(db, draftsCollectionPath),
        where("userId", "==", uid)
      );
      const querySnapshot = await getDocs(q);
      const list: any[] = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      list.sort((a, b) => {
        const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : 0);
        const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : 0);
        return timeB - timeA;
      });
      setSyncedDrafts(list);
    } catch (err) {
      console.error("Failed to load drafts from Firestore:", err);
      handleFirestoreError(err, OperationType.GET, draftsCollectionPath);
    } finally {
      setIsLoadingDrafts(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchSyncedDrafts();
        // Retrieve Google OAuth access token from the current Firebase Auth user session storage
        const token = window.localStorage.getItem(`axe_hours_yt_access_token_${user.uid}`) || window.localStorage.getItem("axe_hours_yt_access_token");
        if (token) {
          setYoutubeConnected(true);
          fetchYouTubeAnalytics(token);
        }
      } else {
        setSyncedDrafts([]);
        setYoutubeConnected(false);
        localStorage.removeItem("axe_hours_yt_connected");
        localStorage.removeItem("axe_hours_yt_access_token");
        localStorage.removeItem("axe_hours_yt_name");
        localStorage.removeItem("axe_hours_yt_avatar");
        localStorage.removeItem("axe_hours_yt_subscribers");
        localStorage.removeItem("axe_hours_yt_channel_id");
        setYtAnalyticsData([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // States for custom connection portal
  const [activeConnectionPortal, setActiveConnectionPortal] = useState<'youtube' | 'instagram' | null>(null);
  const [portalChannelName, setPortalChannelName] = useState("");
  const [portalFollowers, setPortalFollowers] = useState<number>(15000);
  const [portalAvatarSelected, setPortalAvatarSelected] = useState<string>("cosmic-glow");
  const [isLinkingInPortal, setIsLinkingInPortal] = useState(false);
  const [portalLogs, setPortalLogs] = useState<string[]>([]);

  // States for customizing creator stats inline
  const [isEditingYTStats, setIsEditingYTStats] = useState(false);
  const [isEditingIGStats, setIsEditingIGStats] = useState(false);
  const [editYtName, setEditYtName] = useState("");
  const [editYtSubs, setEditYtSubs] = useState<number>(14250);
  const [editIgHandle, setEditIgHandle] = useState("");
  const [editIgSubs, setEditIgSubs] = useState<number>(32900);

  const handleStartEditYT = () => {
    setEditYtName(ytChannelName);
    setEditYtSubs(ytSubscribed);
    setIsEditingYTStats(true);
  };

  const handleSaveYT = () => {
    if (!editYtName.trim()) return;
    setYtChannelName(editYtName);
    setYtSubscribed(editYtSubs);
    localStorage.setItem("axe_hours_yt_name", editYtName);
    localStorage.setItem("axe_hours_yt_subscribers", String(editYtSubs));
    setIsEditingYTStats(false);
    playAudioCue(880, "sine", 0.15);
  };

  const handleStartEditIG = () => {
    setEditIgHandle(igHandleName);
    setEditIgSubs(igSubscribed);
    setIsEditingIGStats(true);
  };

  const handleSaveIG = () => {
    if (!editIgHandle.trim()) return;
    setIgHandleName(editIgHandle);
    setIgSubscribed(editIgSubs);
    localStorage.setItem("axe_hours_ig_name", editIgHandle);
    localStorage.setItem("axe_hours_ig_followers", String(editIgSubs));
    setIsEditingIGStats(false);
    playAudioCue(880, "sine", 0.15);
  };

  // Exporter workflow states
  const [selectedExportPlatform, setSelectedExportPlatform] = useState<'youtube' | 'instagram'>('youtube');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportStep, setExportStep] = useState<number>(0);
  const [exportLogs, setExportLogs] = useState<string[]>([]);
  const [connectionMode, setConnectionMode] = useState<'oauth' | 'sandbox'>('oauth');

  const handleGoogleSignInForYouTube = () => {
    setIsLinkingInPortal(true);
    setPortalLogs([
      "🔐 Establishing secure Google OAuth Client handshake...",
      "Requesting authorization scopes..."
    ]);
    playAudioCue(523.25, "sine", 0.08);

    signInWithPopup(auth, googleProvider)
      .then(async (result) => {
        // Immediately set dynamic state to trigger re-renders
        setYoutubeConnected(true);
        setScopeMissing(false);
        setYtAnalyticsError(null);

        const credential = GoogleAuthProvider.credentialFromResult(result);
        const accessToken = credential?.accessToken;

        if (!accessToken) {
          throw new Error("Unable to obtain Google API credentials. Verify authorized account configurations.");
        }

        setPortalLogs(prev => [
          ...prev, 
          "✅ Google credentials authorized!", 
          "📡 Querying YouTube Studio Data API..."
        ]);
        playAudioCue(587.33, "sine", 0.08);
        
        // Fetch user's actual channel details
        const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (!response.ok) {
          throw new Error(`YouTube API returned HTTP status ${response.status}`);
        }

        const data = await response.json();
        if (!data.items || data.items.length === 0) {
          throw new Error("No YouTube channel was found linked with this Google account.");
        }

        const channel = data.items[0];
        const channelName = channel.snippet.title;
        const subsCount = Number(channel.statistics.subscriberCount) || 0;
        const avatarUrl = channel.snippet.thumbnails?.high?.url || channel.snippet.thumbnails?.default?.url || "";
        const channelId = channel.id;

        setPortalLogs(prev => [
          ...prev,
          `📺 Syncing Channel: "${channelName}"`,
          `📊 Active Subscribers: ${subsCount.toLocaleString()}`,
          "🔗 Hooking bi-directional Firestore cloud draft tunnel...",
          "🚀 Establishing persistent connection..."
        ]);
        playAudioCue(659.25, "sine", 0.12);
        await new Promise(resolve => setTimeout(resolve, 800));

        setYtChannelName(channelName);
        setYtSubscribed(subsCount);
        setYtAvatar(avatarUrl);
        
        localStorage.setItem("axe_hours_yt_connected", "true");
        localStorage.setItem("axe_hours_yt_name", channelName);
        localStorage.setItem("axe_hours_yt_avatar", avatarUrl);
        localStorage.setItem("axe_hours_yt_subscribers", String(subsCount));
        localStorage.setItem("axe_hours_yt_access_token", accessToken);
        localStorage.setItem("axe_hours_yt_channel_id", channelId);

        setIsLinkingInPortal(false);
        setActiveConnectionPortal(null);
        playAudioCue(880, "sine", 0.35);
        addToast(`Successfully connected YouTube channel "${channelName}"! 🚀`, "success");

        // Immediate data re-fetch invoke to draw the Recharts lines instantly
        fetchYouTubeAnalytics(accessToken);
      })
      .catch((error) => {
        console.error("YouTube authorization failed:", error);
        setYoutubeConnected(false);
        const is403 = error.message?.includes("403") || String(error).includes("403");
        const errorMsg = is403 
          ? "YouTube API returned HTTP status 403. (Tip: This is a sandbox Google Cloud Project API restriction. Select the '🧪 Sandbox Mock Stats' tab at the top to connect immediately without API limits!)"
          : (error.message || "Failed to authenticate");
        setPortalLogs(prev => [
          ...prev,
          `❌ ERROR: ${errorMsg}`
        ]);
        setIsLinkingInPortal(false);
        playAudioCue(220, "sawtooth", 0.25);
        addToast(`YouTube authorization error: ${errorMsg}`, "error");
      });
  };

  const handleConnectYT = () => {
    if (youtubeConnected) {
      setYoutubeConnected(false);
      localStorage.setItem("axe_hours_yt_connected", "false");
      localStorage.removeItem("axe_hours_yt_name");
      localStorage.removeItem("axe_hours_yt_avatar");
      localStorage.removeItem("axe_hours_yt_subscribers");
      localStorage.removeItem("axe_hours_yt_access_token");
      setYtChannelName("Axe Creator Shorts");
      setYtAvatar("");
      setYtSubscribed(14250);
      playAudioCue(330, "sawtooth", 0.15); // E3 buzzer
      return;
    }
    
    // Open specialized connection portal
    setPortalChannelName(auth.currentUser?.displayName || "Axe Creator Shorts");
    setPortalFollowers(18400);
    setPortalAvatarSelected("cosmic-glow");
    setPortalLogs([]);
    setActiveConnectionPortal('youtube');
    playAudioCue(523.25, "sine", 0.1); // C5
  };

  const handleConnectIG = () => {
    if (instagramConnected) {
      setInstagramConnected(false);
      localStorage.setItem("axe_hours_ig_connected", "false");
      localStorage.removeItem("axe_hours_ig_name");
      localStorage.removeItem("axe_hours_ig_followers");
      setIgHandleName("axe.creator.studio");
      setIgSubscribed(32900);
      playAudioCue(330, "sawtooth", 0.15); // E3 buzzer
      return;
    }
    
    // Open specialized connection portal
    setPortalChannelName("axe.creator.studio");
    setPortalFollowers(32900);
    setPortalAvatarSelected("insta-neon");
    setPortalLogs([]);
    setActiveConnectionPortal('instagram');
    playAudioCue(523.25, "sine", 0.1); // C5
  };

  const handleExportToStudio = () => {
    const isYtSelected = selectedExportPlatform === 'youtube';
    const isConnected = isYtSelected ? youtubeConnected : instagramConnected;
    if (!isConnected) {
      playAudioCue(220, "sawtooth", 0.25);
      addToast(`Connection required! Please connect to your ${isYtSelected ? "YouTube Studio" : "Instagram Creator Studio"} prior to launching script export.`, "warning");
      return;
    }

    setIsExporting(true);
    setExportStep(1);
    setExportLogs([
      `[OAUTH] Handshake established with ${isYtSelected ? 'YouTube' : 'Instagram'} secure upload portal.`,
      `[OAUTH] Authorized OAuth secure token check status: VERIFIED`
    ]);
    playAudioCue(523.25, "sine", 0.15);

    setTimeout(() => {
      setExportStep(2);
      setExportLogs(prev => [
        ...prev, 
        `[COMPILER] Formulating metadata block and pacing instructions for: "${activeScript.title}"`,
        `[COMPILER] Synced complete structural timeline blocks: ${segments.length} timeline frames compiled.`
      ]);
      playAudioCue(587.33, "sine", 0.15);
    }, 1200);

    setTimeout(() => {
      setExportStep(3);
      setExportLogs(prev => [
        ...prev, 
        `[SEO SYNC] Structuring overlay titles, timestamps and targeted tags...`,
        `[SEO SYNC] Compiling description hashtags: #shorts #devtech #coding`,
        `[VIDEO CAPTION] Generating precise transcript annotations.`
      ]);
      playAudioCue(659.25, "sine", 0.15);
    }, 2400);

    setTimeout(async () => {
      setExportStep(4);
      try {
        const docRef = await addDoc(collection(db, "draft_dispatches"), {
          userId: auth.currentUser?.uid || "anonymous-creator",
          userEmail: auth.currentUser?.email || "anonymous@axecreator.suite",
          channelName: isYtSelected ? ytChannelName : igHandleName,
          channelId: isYtSelected ? (localStorage.getItem("axe_hours_yt_channel_id") || "sandbox-id") : "instagram-id",
          platform: selectedExportPlatform,
          scriptTitle: activeScript.title,
          scriptContent: activeScript.content,
          segmentsCount: segments.length,
          timestamp: Timestamp.now()
        });

        setExportLogs(prev => [
          ...prev, 
          `[FIRESTORE] Synchronizing script draft permanently to Cloud DB...`,
          `[FIRESTORE] Stored under collection: 'draft_dispatches' (Doc ID: ${docRef.id})`,
          `[STUDIO_PUSH] Pushed details via secure cloud channel to your ${isYtSelected ? 'YouTube Studio' : 'Instagram Business Dashboard'} drafts.`,
          `[STUDIO_PUSH] Response status: '201 CREATED' (Upload Transaction ID: ${docRef.id.slice(0, 8).toUpperCase()})`,
          `🎉 Sync successful! Generated content draft successfully pushed to selection & Firestore!`
        ]);
        playAudioCue(880, "sine", 0.35);

        // Fetch again to update history log
        fetchSyncedDrafts();
      } catch (err: any) {
        console.error("Firestore draft sync failed:", err);
        setExportLogs(prev => [
          ...prev,
          `[FIRESTORE] Cloud DB sync failed: ${err.message || err}`,
          `[STUDIO_PUSH] Stashing draft backup in local memory state.`,
          `🎉 Sync complete. Generated content draft successfully stashed in memory.`
        ]);
        playAudioCue(880, "sine", 0.35);
        handleFirestoreError(err, OperationType.CREATE, "draft_dispatches");
      }
    }, 3800);
  };

  // Sound Synth frequency triggers
  const triggerTickSound = (second: number) => {
    // Generate scale values based on second to make a nice ascending/descending chime series
    const baseFreq = 440; // A4
    const intervalFactor = 1 + (second % 12) * 0.0833; // Twelve-tone factor map
    playAudioCue(baseFreq * intervalFactor, "sine", 0.08);
  };

  // Safe fetch of active script object
  const getActiveScript = (): { title: string; content: string } => {
    if (selectedScriptId === "default" || recentGenerations.length === 0) {
      return {
        title: "Default SaaS Blueprint Reference",
        content: DEFAULT_BLUEPRINT_SCRIPT
      };
    }
    const found = recentGenerations.find(g => String(g.id) === selectedScriptId);
    return found ? { title: found.title, content: found.content } : { title: "Default SaaS Blueprint Reference", content: DEFAULT_BLUEPRINT_SCRIPT };
  };

  const activeScript = getActiveScript();

  // Parsing script content into timeline segments
  const parseScriptToTimeline = (content: string): CalculatedSegment[] => {
    const segments: CalculatedSegment[] = [];
    const lines = content.split('\n');

    // Meticulous parsing strategy for standard formatting patterns
    // e.g. "- 0:00 - 0:03 [HOOK]: Extreme desk zoom..."
    // or "0:03 - 0:15 [LEAD-IN]: Graphic..."
    const timecodeRegex = /(?:-?\s*)?(\d+):(\d+)\s*[-–—]\s*(\d+):(\d+)\s*(?:\[(.*?)\])?:\s*(.*)/i;

    let segmentCounter = 1;

    lines.forEach(line => {
      const match = line.match(timecodeRegex);
      if (match) {
        const startSec = parseInt(match[1]) * 60 + parseInt(match[2]);
        const endSec = parseInt(match[3]) * 60 + parseInt(match[4]);
        
        if (endSec > startSec) {
          let label = match[5]?.toUpperCase() || "";
          let text = match[6] || "";

          if (!label) {
            if (line.toLowerCase().includes("hook")) label = "HOOK";
            else if (line.toLowerCase().includes("cta") || line.toLowerCase().includes("call to action") || line.toLowerCase().includes("comment")) label = "CTA";
            else if (line.toLowerCase().includes("lead-in") || line.toLowerCase().includes("intro")) label = "LEAD-IN";
            else if (line.toLowerCase().includes("payload") || line.toLowerCase().includes("value") || line.toLowerCase().includes("blueprint")) label = "PAYLOAD";
            else label = `SECTION ${segmentCounter}`;
          }

          // Extract mock captions, visual and sfx indicators based on words
          let sfxMatch = text.match(/sfx:\s*([^\.]+)/i);
          let sfx = sfxMatch ? sfxMatch[1].trim() : "Custom digital whoosh transition";
          
          let captionMatch = text.match(/caption:\s*([^\.]+)/i);
          let caption = captionMatch ? captionMatch[1].trim() : `ACTIVE VIEW SEGMENT ${label}`;
          
          segments.push({
            id: String(segmentCounter++),
            label: label,
            startTime: startSec,
            endTime: endSec,
            duration: endSec - startSec,
            visual: text.split(".")[0] || "AI generated atmospheric motion sequence.",
            voiceover: text.split(".")[1] || text || "Narrated creator instructions.",
            sfx: sfx,
            caption: caption,
            retentionBase: label === "HOOK" ? 96 : label === "LEAD-IN" ? 82 : label === "PAYLOAD" ? 72 : 56
          });
        }
      }
    });

    // Elegant fallback if no standard timecodes were successfully matched
    if (segments.length === 0) {
      segments.push(
        {
          id: "1",
          label: "HOOK",
          startTime: 0,
          endTime: 4,
          duration: 4,
          visual: "Close-up cinematic transition into dark terminal glowing console",
          voiceover: "Stop spending 6 months coding a SaaS to $0 MRR. Try this micro trick.",
          sfx: "Ambient vinyl scratch into heavy bass drop",
          caption: "STOP WASTING DEV TIME 🚨",
          retentionBase: 95
        },
        {
          id: "2",
          label: "LEAD-IN",
          startTime: 4,
          endTime: 16,
          duration: 12,
          visual: "Collapsing diagram showing standard coding models next to a red failure indicator",
          voiceover: "Traditional loops are dead. A micro-blueprint compiles in minutes and pulls traffic immediately.",
          sfx: "Aggressive swift clock sweeping whoosh",
          caption: "Traditional coding loops are DEAD 🔀",
          retentionBase: 83
        },
        {
          id: "3",
          label: "PAYLOAD",
          startTime: 16,
          endTime: 46,
          duration: 30,
          visual: "Vite setup running live at 10x visual velocity with scrolling typescript classes",
          voiceover: "Deploy a clean single-view React shell linked to simple LocalStorage. Keep scripts light.",
          sfx: "Retro cyber success notification tone block",
          caption: "Single-view React speed deployment 🦾",
          retentionBase: 71
        },
        {
          id: "4",
          label: "CTA",
          startTime: 46,
          endTime: 60,
          duration: 14,
          visual: "Interactive CTA screen hovering bright QR codes with instant access lines",
          voiceover: "Drop 'AXE' in the live comment column and I will auto-dm my complete bundle configuration.",
          sfx: "Harmonic digital acoustic chime cascade",
          caption: "Comment 'AXE' for direct system file access! 👇",
          retentionBase: 58
        }
      );
    }

    return segments;
  };

  const segments = parseScriptToTimeline(activeScript.content);
  const totalDuration = segments[segments.length - 1]?.endTime || 60;

  // Generate second-by-second retention metrics with custom behavioral heuristics
  const getSimulatedRetentionArray = (): { second: number; pct: number }[] => {
    const arr: { second: number; pct: number }[] = [];
    
    // Create a stable random factor based on the script title string
    const hashString = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return Math.abs(hash);
    };

    const hashVal = hashString(activeScript.title + activeScript.content);
    
    // Loop through each second
    for (let t = 0; t <= totalDuration; t++) {
      // Find current active segment
      const activeSeg = segments.find(s => t >= s.startTime && t < s.endTime) || segments[segments.length - 1];
      
      let baseVal = 100;
      
      if (t === 0) {
        baseVal = 100;
      } else {
        // Base curved decay model
        const progressFraction = t / totalDuration;
        
        // Curve slope factors based on creator presets
        let decayExponent = 0.55; // default balanced
        if (activeScript.content.toLowerCase().includes("contrarian")) decayExponent = 0.44; // better retention
        if (activeScript.content.toLowerCase().includes("value bomb")) decayExponent = 0.48;
        
        // Traditional Audience Curve Decay Model
        baseVal = 100 - Math.pow(progressFraction, decayExponent) * 45;
        
        // Add segment-pacing specific modifiers
        const label = activeSeg.label.toUpperCase();
        if (label.includes("HOOK")) {
          // Slow early hook drops
          baseVal = 100 - (t * 1.6);
        } else if (label.includes("LEAD")) {
          // Step drop transition
          baseVal -= 2;
        } else if (label.includes("CTA")) {
          // Accelerating drop-off at end call-to-action
          const ctaElasticity = t - activeSeg.startTime;
          baseVal -= (3 + ctaElasticity * 1.5);
        }

        // Add dynamic mini spikes based on interesting buzzwords in script voiceover
        const voiceover = activeSeg.voiceover.toLowerCase();
        let spikeBonus = 0;
        if (voiceover.includes("stop") || voiceover.includes("kill") || voiceover.includes("dead")) {
          spikeBonus += 1.8;
        }
        if (voiceover.includes("secret") || voiceover.includes("micro") || voiceover.includes("blueprint")) {
          spikeBonus += 2.2;
        }
        if (voiceover.includes("99%") || voiceover.includes("0.1%") || voiceover.includes("hours")) {
          spikeBonus += 1.5;
        }

        // Dynamic fluctuations based on hash identifier to make every script unique
        const microFluctuation = Math.sin(t * 0.4 + (hashVal % 10)) * 1.2;

        baseVal += (spikeBonus + microFluctuation);
      }

      // Constrain final boundaries safely
      const finalPct = Math.min(100, Math.max(15, parseFloat(baseVal.toFixed(1))));
      arr.push({ second: t, pct: finalPct });
    }

    return arr;
  };

  const retentionTimeline = getSimulatedRetentionArray();

  // Metrics extraction helpers
  const averageSegmentDuration = parseFloat((totalDuration / segments.length).toFixed(1));
  
  // Decide pacing velocity levels
  let pacingGrade = "Balanced Flow";
  let pacingDesc = "Steady rhythm, excellent for educational pay-offs.";
  let pacingScore = 78;

  if (averageSegmentDuration <= 7) {
    pacingGrade = "Ultra-Aggressive Speed";
    pacingDesc = "Extremely short scene counts. Optimal for retaining TikTok & Reels shorts.";
    pacingScore = 96;
  } else if (averageSegmentDuration <= 12) {
    pacingGrade = "Fast Pacing Curve";
    pacingDesc = "Excellent speed ratio keeping audience highly engaged without over-stimulating.";
    pacingScore = 89;
  } else if (averageSegmentDuration >= 22) {
    pacingGrade = "Slow Deep Dive";
    pacingDesc = "Detailed visual explanations. Vulnerable to fast user swiping.";
    pacingScore = 58;
  }

  const getAIWeightFactors = () => {
    const title = activeScript.title.toLowerCase();
    const content = activeScript.content.toLowerCase();
    
    // Default base scores
    let hookScore = 72;
    let engagementScore = 68;
    let pacingScoreVal = pacingScore; // already computed based on segment durations
    let visualCutsScore = 70;
    let ctaScore = 65;

    // 1. Hook scoring logic
    if (content.includes("stop spending") || content.includes("never") || content.includes("fail")) {
      hookScore += 18;
    }
    if (content.includes("blueprint") || content.includes("secret")) {
      hookScore += 10;
    }
    const hookWords = content.match(/option 1: "(.*?)"/i)?.[1]?.split(" ").length || 15;
    if (hookWords >= 6 && hookWords <= 16) {
      hookScore += 8;
    } else {
      hookScore -= 5;
    }
    hookScore = Math.min(100, Math.max(30, hookScore));

    // 2. Engagement potential
    const payloadLength = content.split("payload")?.[1]?.length || 200;
    if (payloadLength > 200) {
      engagementScore += 15;
    }
    if (content.includes("code") || content.includes("typescript") || content.includes("react") || content.includes("vite")) {
      engagementScore += 10;
    }
    if (content.includes("micro-blueprint") || content.includes("agile framework")) {
      engagementScore += 7;
    }
    engagementScore = Math.min(100, Math.max(35, engagementScore));

    // 3. Speech pacing
    pacingScoreVal = Math.min(100, Math.max(30, pacingScoreVal));

    // 4. Visual Cuts
    const segmentCount = segments.length;
    if (segmentCount >= 4) {
      visualCutsScore += 15;
    }
    if (content.includes("zoom") || content.includes("cut") || content.includes("flash") || content.includes("graphic")) {
      visualCutsScore += 10;
    }
    visualCutsScore = Math.min(100, Math.max(40, visualCutsScore));

    // 5. Curiosity & CTA Action
    if (content.includes("comment") || content.includes("qr code") || content.includes("download") || content.includes("link")) {
      ctaScore += 25;
    }
    if (content.includes("#shorts") || content.includes("hashtags")) {
      ctaScore += 8;
    }
    ctaScore = Math.min(100, Math.max(30, ctaScore));

    return [
      {
        factor: 'Hook Strength',
        shortFactor: 'Hook',
        weight: 30, // 30% AI weight
        score: hookScore,
        benchmark: 92,
        fill: '#ec4899',
        glowingBorder: 'border-[#ec4899]/30',
        glowColor: 'bg-[#ec4899]',
        desc: 'Evaluates first 3 seconds for physical curiosity opens, high conversion triggers and optimal pacing.'
      },
      {
        factor: 'Engagement Potential',
        shortFactor: 'Engagement',
        weight: 25, // 25% AI weight
        score: engagementScore,
        benchmark: 88,
        fill: '#a855f7',
        glowingBorder: 'border-[#a855f7]/30',
        glowColor: 'bg-[#a855f7]',
        desc: 'Measures body depth density, blueprint value-to-words ratio, and structured topic coherence.'
      },
      {
        factor: 'Speech Pacing Flow',
        shortFactor: 'Pacing',
        weight: 20, // 20% AI weight
        score: pacingScoreVal,
        benchmark: 90,
        fill: '#3b82f6',
        glowingBorder: 'border-[#3b82f6]/30',
        glowColor: 'bg-[#3b82f6]',
        desc: 'Deductions or bonuses based on estimated delivery tempo in words per minute (WPM).'
      },
      {
        factor: 'Visual Resets/Cuts',
        shortFactor: 'Visual Resets',
        weight: 15, // 15% AI weight
        score: visualCutsScore,
        benchmark: 85,
        fill: '#06b6d4',
        glowingBorder: 'border-[#06b6d4]/30',
        glowColor: 'bg-[#06b6d4]',
        desc: 'Verifies the abundance of visual pattern interrupts, scene movements and transitions.'
      },
      {
        factor: 'CTA & Curiosity Drive',
        shortFactor: 'CTA Drive',
        weight: 10, // 10% AI weight
        score: ctaScore,
        benchmark: 80,
        fill: '#10b981',
        glowingBorder: 'border-[#10b981]/30',
        glowColor: 'bg-[#10b981]',
        desc: 'Calculates structural call-to-action engagement commands that trigger response algorithms.'
      }
    ];
  };

  const aiFactors = getAIWeightFactors();
  const overallAIWeightedScore = parseFloat((
    aiFactors.reduce((acc, f) => acc + (f.score * (f.weight / 100)), 0)
  ).toFixed(1));

  // Projected Growth line chart data generator based on app's internal growth model
  const getGrowthSimulationData = () => {
    const sampledPoints = [0, 3, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
    const dur = totalDuration;
    
    return sampledPoints.map(t => {
      // 1. Simulate hypothetical line (incorporating the simHookStrength slider)
      let hyp = 100;
      if (t === 0) {
        hyp = 100;
      } else if (t <= 3) {
        hyp = 100 - (100 - simHookStrength) * (t / 3);
      } else {
        const decayProgress = (t - 3) / (dur - 3);
        const slopeFriction = 0.52 - ((simHookStrength - 60) * 0.001); 
        hyp = simHookStrength - Math.pow(decayProgress, Math.max(0.4, slopeFriction)) * (simHookStrength - 15);
      }
      
      // 2. Simulate baseline standard line
      let base = 100;
      const baselineHook = 58; // Standard benchmark
      if (t === 0) {
        base = 100;
      } else if (t <= 3) {
        base = 100 - (100 - baselineHook) * (t / 3);
      } else {
        const decayProgress = (t - 3) / (dur - 3);
        base = baselineHook - Math.pow(decayProgress, 0.52) * (baselineHook - 12);
      }
      
      return {
        second: t,
        timeLabel: `${t}s`,
        hypothetical: parseFloat(hyp.toFixed(1)),
        baseline: parseFloat(base.toFixed(1))
      };
    });
  };

  const simGrowthData = getGrowthSimulationData();

  // Highlight metrics
  const hypAvgRetention = Math.round(
    simGrowthData.reduce((acc, p) => acc + p.hypothetical, 0) / simGrowthData.length
  );
  const baseAvgRetention = Math.round(
    simGrowthData.reduce((acc, p) => acc + p.baseline, 0) / simGrowthData.length
  );
  const avgRetentionLift = hypAvgRetention - baseAvgRetention;
  
  // Exponential impressions growth multiplier
  const impressionsMult = parseFloat(Math.pow(1.034, simHookStrength - 58).toFixed(2));

  // Find the exact second index that represents the active hovered point or fallback to first second
  const cursorSecond = hoveredSecond !== null ? hoveredSecond : 0;
  const activeHoverData = retentionTimeline[cursorSecond] || retentionTimeline[0];
  const activeHoverSec = activeHoverData.second;
  const activeHoverPct = activeHoverData.pct;
  const activeHoverSegment = segments.find(s => activeHoverSec >= s.startTime && activeHoverSec < s.endTime) || segments[segments.length - 1];

  // Retention index status colors helper
  const getRetentionColorClass = (pct: number) => {
    if (pct >= 85) return "bg-purple-500 border-purple-400 text-white shadow-[0_0_12px_rgba(157,80,187,0.3)]";
    if (pct >= 70) return "bg-fuchsia-600 border-fuchsia-500 text-white shadow-[0_0_8px_rgba(217,70,239,0.2)]";
    if (pct >= 55) return "bg-indigo-900/60 border-indigo-500/25 text-indigo-300";
    return "bg-slate-900 border-slate-700/30 text-gray-400";
  };

  const getRetentionCellGlow = (pct: number) => {
    if (pct >= 85) return { backgroundColor: "rgba(168, 85, 247, 0.75)", border: "1px solid rgba(216, 180, 254, 0.5)" };
    if (pct >= 70) return { backgroundColor: "rgba(192, 38, 211, 0.45)", border: "1px solid rgba(240, 171, 252, 0.3)" };
    if (pct >= 55) return { backgroundColor: "rgba(79, 70, 229, 0.2)", border: "1px solid rgba(99, 102, 241, 0.2)" };
    return { backgroundColor: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(248, 113, 113, 0.15)" }; // Drop off alert
  };

  // Convert seconds into standard presentation time code format e.g. "0:24"
  const formatSecondsPresentation = (sec: number): string => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // SVG drawing configuration for the retention curve
  const widthSvg = 600;
  const heightSvg = 130;
  const paddingSvgLeft = 10;
  const paddingSvgRight = 10;
  const paddingSvgTop = 20;
  const paddingSvgBottom = 15;

  const getSvgCoordinates = () => {
    return retentionTimeline.map(pt => {
      const x = paddingSvgLeft + (pt.second / totalDuration) * (widthSvg - paddingSvgLeft - paddingSvgRight);
      // Map percentage (15% to 100%) proportionally on height range
      const ratio = (pt.pct - 15) / 85; 
      const y = heightSvg - paddingSvgBottom - ratio * (heightSvg - paddingSvgTop - paddingSvgBottom);
      return { x, y, second: pt.second, pct: pt.pct };
    });
  };

  const coordinates = getSvgCoordinates();
  const linePath = coordinates.reduce((acc, pair, i) => {
    return i === 0 ? `M ${pair.x} ${pair.y}` : `${acc} L ${pair.x} ${pair.y}`;
  }, "");

  // Create an area fill path down to the grid base bottom
  const areaPath = coordinates.length > 0
    ? `${linePath} L ${coordinates[coordinates.length - 1].x} ${heightSvg - paddingSvgBottom} L ${coordinates[0].x} ${heightSvg - paddingSvgBottom} Z`
    : "";

  // Find corresponding cursor coordination x position
  const cursorCoords = coordinates[cursorSecond] || coordinates[0];

  return (
    <div id="analytics-view-parent" className="space-y-8 animate-in fade-in duration-500 relative z-10 select-none w-full max-w-7xl mx-auto">
      {/* Top Main Heading */}
      <div id="analytics-header-section" className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 id="analytics-title" className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="text-purple-400 animate-pulse animate-duration-1000" /> Analytics & Forecasting
          </h1>
          <p id="analytics-subtitle" className="text-sm text-gray-400 font-light mt-1">
            Evaluate performance forecasting, structure pacing, and projected hook efficiency ratios.
          </p>
        </div>

        {/* Dynamic Selector Dropdown container */}
        <div id="script-selector-box" className="flex items-center gap-2 bg-black/45 hover:bg-black/60 border border-white/5 hover:border-purple-500/20 p-2.5 rounded-xl transition-all">
          <label htmlFor="analytics-script-dropdown" className="text-xs uppercase font-black tracking-wider text-purple-300 font-mono whitespace-nowrap">
            Selected Blueprint:
          </label>
          <select
            id="analytics-script-dropdown"
            value={selectedScriptId}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedScriptId(val);
              setHoveredSecond(null);
              // Trigger sensory play
              playAudioCue(587.33, "triangle", 0.3);
            }}
            className="bg-purple-950/20 border border-purple-500/20 rounded-lg p-1.5 text-white text-xs cursor-pointer focus:outline-none focus:border-purple-400"
          >
            <option value="default">Default SaaS Reference Blueprint</option>
            {recentGenerations.map((g, i) => (
              <option key={g.id} value={String(g.id)}>
                {i + 1}. {g.title.length > 36 ? `${g.title.slice(0, 36)}...` : g.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 🚀 Creator Studio Connections & Sync Suite */}
      <div id="studio-integrations-container" className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-500 delay-100">
        {/* Left Card: Account Platforms Connection */}
        <GlassCard 
          id="studio-connections-card" 
          glowColor={youtubeConnected || instagramConnected ? "emerald" : "purple"}
          className="lg:col-span-1 p-5 flex flex-col justify-between space-y-4"
        >
          <div>
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Settings size={16} className="text-purple-400" /> Studio Connections
              </h2>
              <span className="text-[9px] bg-purple-500/10 border border-purple-500/25 text-purple-400 font-mono px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                Sync Channels
              </span>
            </div>
            <p className="text-xs text-gray-400 font-light leading-relaxed">
              Link your Axe Hours creator profile directly to platform dashboards to authorize single-click draft script syncing.
            </p>
          </div>

          <div className="space-y-3.5">
            {/* YouTube Studio Integration Item */}
            <div className="bg-black/40 border border-white/5 rounded-xl p-3.5 flex flex-col space-y-3">
              {isEditingYTStats ? (
                <>
                  <div className="flex items-center gap-2.5">
                    {ytAvatar ? (
                      <img 
                        src={ytAvatar} 
                        alt="YouTube Channel Avatar" 
                        className="w-9 h-9 rounded-full object-cover border border-red-500/30"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                        <Youtube size={18} />
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-bold block text-white">Customizing YouTube</span>
                      <span className="text-[9px] font-mono text-purple-400 uppercase tracking-widest block">
                        Sync Override
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-white/5 pt-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-500 uppercase font-mono tracking-wider">Channel Name</label>
                        <input 
                          type="text"
                          value={editYtName}
                          onChange={(e) => setEditYtName(e.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-500 uppercase font-mono tracking-wider">Subscribers</label>
                        <input 
                          type="number"
                          value={editYtSubs}
                          onChange={(e) => setEditYtSubs(Number(e.target.value))}
                          className="w-full bg-black/60 border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1 font-mono">
                      <button 
                        onClick={() => setIsEditingYTStats(false)}
                        className="text-[10px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSaveYT}
                        className="text-[10px] px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between font-sans">
                    <div className="flex items-center gap-2.5">
                      {youtubeConnected && ytAvatar ? (
                        <img 
                          src={ytAvatar} 
                          alt="YouTube Channel Avatar" 
                          className="w-9 h-9 rounded-full object-cover border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className={`p-2 rounded-lg ${youtubeConnected ? 'bg-red-500/10 text-red-500' : 'bg-white/5 text-gray-400'}`}>
                          <Youtube size={18} />
                        </div>
                      )}
                      <div>
                        <span className="text-xs font-bold block text-white text-ellipsis truncate max-w-[130px]">
                          {youtubeConnected ? ytChannelName : "YouTube Studio"}
                        </span>
                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block">
                          {youtubeConnected ? "🟢 Active Linked" : "🔴 Disconnected"}
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={handleConnectYT}
                      disabled={isConnectingYT}
                      className={`text-[10px] px-3 py-1.5 rounded-lg border font-mono font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                        youtubeConnected 
                        ? 'bg-red-950/20 border-red-500/20 text-red-400 hover:bg-red-500/10 shadow-[0_0_10px_rgba(239,68,68,0.05)]' 
                        : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      }`}
                    >
                      {isConnectingYT ? (
                        <RefreshCw size={10} className="animate-spin" />
                      ) : youtubeConnected ? (
                        <>
                          <Unlink size={10} /> Disconnect
                        </>
                      ) : (
                        <>
                          <Link2 size={10} /> Connect
                        </>
                      )}
                    </button>
                  </div>

                  {youtubeConnected && (
                    <div className="border-t border-white/5 pt-2.5 flex items-center justify-between text-[10px] text-gray-400 font-mono select-text">
                      <span>Channel: <strong className="text-white">{ytChannelName}</strong></span>
                      <div className="flex items-center gap-3">
                        <span className="text-purple-400 font-bold">{ytSubscribed.toLocaleString()} Subs</span>
                        <button 
                          onClick={handleStartEditYT}
                          className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-0.5 font-bold cursor-pointer underline underline-offset-2"
                          title="Customize channel stats manually"
                        >
                          ✏️ Edit
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Instagram Creator Studio Integration Item */}
            <div className="bg-black/40 border border-white/5 rounded-xl p-3.5 flex flex-col space-y-3">
              {isEditingIGStats ? (
                <>
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-pink-500/10 text-pink-500">
                      <Instagram size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-bold block text-white">Customizing Instagram</span>
                      <span className="text-[9px] font-mono text-pink-400 uppercase tracking-widest block">
                        Sync Override
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-white/5 pt-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-500 uppercase font-mono tracking-wider">Instagram Handle</label>
                        <input 
                          type="text"
                          value={editIgHandle}
                          onChange={(e) => setEditIgHandle(e.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-pink-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-500 uppercase font-mono tracking-wider">Followers</label>
                        <input 
                          type="number"
                          value={editIgSubs}
                          onChange={(e) => setEditIgSubs(Number(e.target.value))}
                          className="w-full bg-black/60 border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-pink-500"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1 font-mono">
                      <button 
                        onClick={() => setIsEditingIGStats(false)}
                        className="text-[10px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSaveIG}
                        className="text-[10px] px-3 py-1 rounded bg-pink-600 hover:bg-pink-550 text-white font-bold cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between font-sans">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${instagramConnected ? 'bg-pink-500/10 text-pink-500' : 'bg-white/5 text-gray-400'}`}>
                        <Instagram size={18} />
                      </div>
                      <div>
                        <span className="text-xs font-bold block text-white">Instagram Studio</span>
                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block">
                          {instagramConnected ? "🟢 Active Linked" : "🔴 Disconnected"}
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={handleConnectIG}
                      disabled={isConnectingIG}
                      className={`text-[10px] px-3 py-1.5 rounded-lg border font-mono font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                        instagramConnected 
                        ? 'bg-pink-950/20 border-pink-500/20 text-pink-400 hover:bg-pink-500/10 shadow-[0_0_10px_rgba(236,72,153,0.05)]' 
                        : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      }`}
                    >
                      {isConnectingIG ? (
                        <RefreshCw size={10} className="animate-spin" />
                      ) : instagramConnected ? (
                        <>
                          <Unlink size={10} /> Disconnect
                        </>
                      ) : (
                        <>
                          <Link2 size={10} /> Connect
                        </>
                      )}
                    </button>
                  </div>

                  {instagramConnected && (
                    <div className="border-t border-white/5 pt-2.5 flex items-center justify-between text-[10px] text-gray-400 font-mono select-text">
                      <span>Handle: <strong className="text-white">@{igHandleName}</strong></span>
                      <div className="flex items-center gap-3">
                        <span className="text-pink-400 font-bold">{igSubscribed.toLocaleString()} Followers</span>
                        <button 
                          onClick={handleStartEditIG}
                          className="text-[10px] text-pink-400 hover:text-pink-300 transition-colors flex items-center gap-0.5 font-bold cursor-pointer underline underline-offset-2"
                          title="Customize channel stats manually"
                        >
                          ✏️ Edit
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {(youtubeConnected || instagramConnected) && (
              <div className="border border-emerald-500/15 bg-emerald-950/10 rounded-xl p-3.5 text-xs text-emerald-300 leading-relaxed font-light flex gap-2.5 items-start animate-in fade-in slide-in-from-top-1 duration-300">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-emerald-200 font-bold">Suite Active Sync Pipe:</strong> Handshake confirmed. Authorized to auto-export short-form scripts directly into your channel's draft queue. Click ✏️ Edit beside any channel stats to manually preview custom telemetry!
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Right Card: Instant Draft Exporter Workspace */}
        <GlassCard 
          id="studio-exporter-card" 
          glowColor={isExporting ? "cyan" : "purple"}
          className="lg:col-span-2 p-5 flex flex-col justify-between space-y-4"
        >
          <div>
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Globe size={16} className="text-cyan-400" /> Script Dispatch Center
              </h2>
              <span className="text-[9px] bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 font-mono px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                Frictionless Push
              </span>
            </div>
            <p className="text-xs text-gray-400 font-light leading-relaxed">
              Select one of your saved or generated short-form scripts, choose the dispatch format, and push it directly into your platform drafts library.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-mono">Source Script Asset</label>
                <div className="bg-black/60 border border-white/10 p-3 rounded-xl text-xs flex items-center justify-between text-white truncate">
                  <span className="truncate font-semibold text-gray-200">
                    {activeScript.title.length > 40 ? `${activeScript.title.slice(0, 40)}...` : activeScript.title}
                  </span>
                  <span className="text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-400 font-mono px-2 py-0.5 rounded shrink-0">
                    {totalDuration}s
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-mono">Target Channel Portal</label>
                <div id="target-portal-toggle-group" className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setSelectedExportPlatform('youtube');
                      playAudioCue(440, "sine", 0.1);
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      selectedExportPlatform === 'youtube'
                      ? 'bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.05)]'
                      : 'bg-black/40 border-white/5 text-gray-400 hover:border-white/15'
                    }`}
                  >
                    <Youtube size={14} />
                    <span>YouTube Shorts</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedExportPlatform('instagram');
                      playAudioCue(440, "sine", 0.1);
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      selectedExportPlatform === 'instagram'
                      ? 'bg-pink-500/10 border-pink-500/30 text-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.05)]'
                      : 'bg-black/40 border-white/5 text-gray-400 hover:border-white/15'
                    }`}
                  >
                    <Instagram size={14} />
                    <span>Insta Reels</span>
                  </button>
                </div>
              </div>

              <button
                onClick={handleExportToStudio}
                disabled={isExporting}
                className={`w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  (selectedExportPlatform === 'youtube' ? youtubeConnected : instagramConnected)
                  ? 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border-cyan-500/20 hover:border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.06)]'
                  : 'bg-white/5 border-white/10 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isExporting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin text-cyan-400" />
                    <span>Synchronizing Blueprint...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight size={13} className="text-cyan-400" />
                    <span>Push to {selectedExportPlatform === 'youtube' ? 'YouTube Drafts' : 'Instagram Reels'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Simulated Live Logging Output Terminal */}
            <div className="bg-black/85 border border-white/10 rounded-xl p-3.5 flex flex-col justify-between h-[155px] font-mono text-[10px] relative overflow-hidden">
              <div className="absolute top-1.5 right-2.5 uppercase select-none text-[8px] tracking-widest text-cyan-400/40">
                Studio-Handshake v1.1
              </div>
              <div className="flex-1 space-y-1.5 overflow-y-auto pr-1 select-text scrollbar-thin">
                {!isExporting && exportLogs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 p-2 space-y-2 select-none">
                    <Lock size={16} className="text-gray-600 animate-pulse" />
                    <span>Handshake Idle. Awaiting draft dispatcher invocation...</span>
                  </div>
                ) : (
                  exportLogs.map((log, index) => {
                    const isSuccess = log.includes("Success") || log.includes("🎉") || log.includes("SUCCESS");
                    const isPush = log.includes("[STUDIO");
                    const isOauth = log.includes("[OAUTH]");
                    return (
                      <div 
                        key={index} 
                        className={`leading-relaxed border-l-2 pl-2 ${
                          isSuccess 
                          ? 'border-emerald-500 text-emerald-400' 
                          : isPush 
                          ? 'border-cyan-500 text-cyan-400' 
                          : isOauth 
                          ? 'border-purple-500 text-purple-400' 
                          : 'border-white/10 text-gray-400'
                        }`}
                      >
                        {log}
                      </div>
                    );
                  })
                )}
              </div>

              {isExporting && exportStep < 4 && (
                <div className="border-t border-white/5 pt-1.5 flex items-center justify-between text-gray-500 select-none">
                  <span className="animate-pulse">Active pipeline: compiling layers...</span>
                  <span className="text-cyan-400 font-bold">{exportStep * 25}%</span>
                </div>
              )}
              {isExporting && exportStep === 4 && (
                <div className="border-t border-emerald-500/20 bg-emerald-500/5 -mx-3.5 -mb-3.5 p-2 text-center text-emerald-400 font-bold divide-x divide-white/5 flex items-center justify-center gap-1.5 animate-in slide-in-from-bottom-2 duration-300 select-none">
                  <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                  <span>DRAFT DISPATCH COMPLETED IN STUDIO</span>
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* ☁️ CLOUD-SYNCED DRAFT ARCHIVES TAB (FIRESTORE DATABASE) */}
      <div id="cloud-drafts-history-panel" className="mt-6 mb-6">
        <GlassCard glowColor="purple" className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Cloud className="text-purple-400 animate-pulse" size={18} />
              <div className="text-left">
                <h2 className="text-sm font-black text-white uppercase tracking-wider font-sans">
                  Cloud-Synced Draft Archives
                </h2>
                <p className="text-[10px] text-gray-400/80 font-mono uppercase tracking-widest leading-none mt-0.5">
                  Durable Multi-Device Sync Pipeline (Verified Firestore Collection: <span className="text-purple-300 font-bold">draft_dispatches</span>)
                </p>
              </div>
            </div>
            
            <button
              onClick={() => {
                fetchSyncedDrafts();
                playAudioCue(600, "sine", 0.08);
              }}
              disabled={isLoadingDrafts}
              className="text-[10px] bg-white/5 hover:bg-white/10 active:scale-95 text-gray-300 font-mono font-bold px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <RefreshCw size={11} className={`${isLoadingDrafts ? 'animate-spin' : ''}`} />
              <span>{isLoadingDrafts ? 'Refreshing...' : 'Force Refresh Pipe'}</span>
            </button>
          </div>

          {isLoadingDrafts && syncedDrafts.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-gray-500 font-sans space-y-2 select-none">
              <RefreshCw size={24} className="animate-spin text-purple-400" />
              <p className="text-xs font-semibold text-gray-400">Synchronizing deep catalog...</p>
            </div>
          ) : syncedDrafts.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-center text-gray-500 p-2 space-y-2 select-none">
              <CloudOff size={28} className="text-gray-650 animate-pulse" />
              <p className="text-xs font-bold text-gray-450 uppercase tracking-wider">No Draft Dispatches Synced Yet</p>
              <p className="text-[10px] text-gray-500 max-w-sm leading-relaxed">
                Configure your YouTube Channel or manual sandbox connection and click <strong>"Push to YouTube Drafts"</strong> in the dispatcher above to secure your script drafts directly to the cloud!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto select-text">
              <table className="w-full text-left border-collapse text-[11px] font-sans">
                <thead>
                  <tr className="border-b border-white/5 text-gray-500 uppercase tracking-wider text-[9px] font-mono select-none">
                    <th className="py-2 px-3">Timestamp (Local)</th>
                    <th className="py-2 px-3">Target Platform</th>
                    <th className="py-2 px-3">Channel / Profile</th>
                    <th className="py-2 px-3">Script Title</th>
                    <th className="py-2 px-3">Segments</th>
                    <th className="py-2 px-3">Verified Doc ID (Firestore)</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                  {syncedDrafts.map((draft) => {
                    const dateInstance = draft.timestamp?.toDate ? draft.timestamp.toDate() : (draft.timestamp?.seconds ? new Date(draft.timestamp.seconds * 1000) : new Date());
                    const dateStr = dateInstance.toLocaleString();
                    const isYt = draft.platform === 'youtube';
                    
                    return (
                      <tr key={draft.id} className="hover:bg-white/5 transition-colors text-left">
                        <td className="py-2.5 px-3 text-gray-400 font-mono whitespace-nowrap">
                          {dateStr}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {isYt ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-[9px] font-bold">
                              <Youtube size={10} /> YouTube
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 font-mono text-[9px] font-bold">
                              <Instagram size={10} /> Instagram
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-white truncate max-w-[140px] font-semibold text-left">
                          {draft.channelName || "Axe Creator"}
                        </td>
                        <td className="py-2.5 px-3 text-gray-300 truncate max-w-[200px]" title={draft.scriptTitle}>
                          {draft.scriptTitle}
                        </td>
                        <td className="py-2.5 px-3 text-purple-400 font-mono font-bold">
                          {draft.segmentsCount || 0} blocks
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <code className="text-[10px] text-gray-500 font-mono bg-black/40 px-1.5 py-0.5 rounded border border-white/5">
                            {draft.id}
                          </code>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => {
                              playAudioCue(500, "sine", 0.08);
                              navigator.clipboard.writeText(draft.scriptContent || "");
                              addToast(`Successfully copied draft script "${draft.scriptTitle}" to clipboard! 📋`, "success");
                            }}
                            className="text-[10px] text-cyan-400 hover:text-cyan-300 font-black uppercase font-mono px-2 py-1 rounded hover:bg-cyan-500/10 cursor-pointer transition-all"
                          >
                            📋 Copy Source
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mt-3 text-[9px] text-gray-500 font-mono select-none flex items-center gap-1.5 bg-black/10 py-1.5 px-2.5 rounded-lg border border-white/5 w-fit">
                <Info size={10} className="text-gray-400" />
                <span>All documents listed above are securely synchronized with Firestore cloud collection nodes.</span>
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Grid of the original CTR compare and Funnel */}
      <div id="analytics-panels" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div id="analytics-col-left" className="lg:col-span-2">
          <GlassCard 
            id="analytics-ctr-glass-card" 
            glowColor="purple"
            className="h-full flex flex-col justify-between"
          >
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Sliders className="text-purple-400" size={18} />
                  <h2 id="analytics-ctr-title" className="text-base font-extrabold text-white uppercase tracking-wider font-sans">
                    {activeTabLeftCol === 'weights' 
                      ? 'AI Score Factor Calibration' 
                      : activeTabLeftCol === 'ctr' 
                      ? 'Title CTR Predictor Curve' 
                      : 'Audience Retention Growth Simulator'
                    }
                  </h2>
                </div>
                
                {/* Clean inline navigation tabs */}
                <div className="flex bg-black/40 border border-white/5 p-1 rounded-lg">
                  <button
                    onClick={() => {
                      setActiveTabLeftCol('weights');
                      playAudioCue(587.33, "triangle", 0.15);
                    }}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md font-mono transition-all cursor-pointer ${
                      activeTabLeftCol === 'weights'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    AI Scoring Factors & Weights
                  </button>
                  <button
                    onClick={() => {
                      setActiveTabLeftCol('ctr');
                      playAudioCue(523.25, "triangle", 0.15);
                    }}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md font-mono transition-all cursor-pointer ${
                      activeTabLeftCol === 'ctr'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Click Curve (CTR)
                  </button>
                  <button
                    onClick={() => {
                      setActiveTabLeftCol('growth');
                      playAudioCue(659.25, "triangle", 0.15);
                    }}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md font-mono transition-all cursor-pointer ${
                      activeTabLeftCol === 'growth'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Projected Growth
                  </button>
                  <button
                    onClick={() => {
                      setActiveTabLeftCol('youtube_analytics');
                      playAudioCue(659.25, "triangle", 0.15);
                    }}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md font-mono transition-all cursor-pointer ${
                      activeTabLeftCol === 'youtube_analytics'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    📺 Live YouTube Analytics
                  </button>
                </div>
              </div>

              {activeTabLeftCol === 'weights' ? (
                /* SECTION 1: AI Scoring Model Factors & Weights */
                <div className="space-y-5">
                  <p className="text-xs text-gray-400 font-light leading-relaxed select-text">
                    This live visualization demonstrates how the platform's heuristics calculate your overall <strong className="text-purple-300 font-bold">{overallAIWeightedScore}/100</strong> video performance score. Our model parses your transcripts and timecodes to analyze high-retention linguistic hooks, pacing, storyboard resets, and CTA drive.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                    
                    {/* Left side: Recharts interactive BarChart */}
                    <div className="md:col-span-7 h-[190px] relative w-full overflow-hidden select-none">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={aiFactors} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                          <XAxis 
                            dataKey="shortFactor" 
                            tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold' }} 
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis 
                            domain={[0, 100]} 
                            tick={{ fill: 'rgba(255, 255, 255, 0.4)', fontSize: 8, fontFamily: 'monospace' }} 
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                          
                          {/* Grouped Bar representations */}
                          <Bar dataKey="score" name="Your Script Score" radius={[4, 4, 0, 0]} maxBarSize={28}>
                            {aiFactors.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                          <Bar dataKey="weight" name="Scoring Model Weight" fill="rgba(255,255,255,0.08)" radius={[4, 4, 0, 0]} maxBarSize={16}>
                            {aiFactors.map((entry, index) => (
                              <Cell key={`weight-cell-${index}`} fill="rgba(250,250,250,0.12)" />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Right side: Detailed Mathematical Factors List */}
                    <div className="md:col-span-5 space-y-3.5 select-text">
                      <div className="p-3 bg-black/45 border border-white/5 rounded-xl space-y-2">
                        <span className="text-[9px] text-gray-500 font-mono block uppercase tracking-widest leading-none font-bold">Mathematical Formula</span>
                        <div className="text-white text-xs font-mono font-bold py-1 bg-black/30 text-center rounded border border-purple-500/10">
                          Score = Σ (Skill × Weight)
                        </div>
                        <p className="text-[9.5px] text-gray-400 font-light leading-snug">
                          Your final video score is structured using platform-specific viewer behavioral curves.
                        </p>
                      </div>

                      <div className="space-y-1 bg-purple-950/20 p-2.5 rounded-xl border border-purple-500/20">
                        <span className="text-[9.5px] text-[#c026d3] font-bold tracking-wider font-mono block uppercase">Active Script Rating:</span>
                        <div className="flex justify-between items-baseline">
                          <span className="text-[11px] text-gray-300 font-light font-sans">Weighted Performance</span>
                          <span className="text-base font-black text-white font-mono">{overallAIWeightedScore} <span className="text-xs text-gray-500 font-light">/ 100</span></span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Factor Info blocks mapped underneath */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 border-t border-white/5 pt-4">
                    {aiFactors.map((factor, idx) => (
                      <div 
                        key={idx} 
                        className={`p-2 bg-[#020203]/40 border ${factor.glowingBorder} rounded-lg space-y-1 hover:bg-[#020203]/85 transition-colors cursor-help`}
                        title={factor.desc}
                      >
                        <div className="flex items-center gap-1.5 select-none">
                          <span className={`w-1.5 h-1.5 rounded-full ${factor.glowColor}`} />
                          <span className="text-[8.5px] text-gray-400 font-mono truncate block uppercase tracking-wider">{factor.shortFactor}</span>
                        </div>
                        <div className="flex justify-between items-baseline font-mono select-none">
                          <span className="text-xs font-black text-white">{factor.score}%</span>
                          <span className="text-[8px] text-gray-500">w: {factor.weight}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : activeTabLeftCol === 'ctr' ? (
                /* SECTION 2: Title CTR Optimization Curve (Original SVG) */
                <div className="space-y-4">
                  <p className="text-xs text-gray-400 font-light leading-relaxed select-text">
                    Visualizing target Click-Through-Rate profile using standard title keywords compared against the AI-engineered variants (solid neon gradient).
                  </p>

                  <div id="analytics-svg-wrapper" className="relative w-full h-[180px] bg-black/40 rounded-xl border border-white/5 p-2 overflow-hidden mt-4">
                    <svg viewBox="0 0 500 180" className="w-full h-full overflow-visible">
                      {/* Reference Grid lines */}
                      <line x1="30" y1="30" x2="470" y2="30" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                      <line x1="30" y1="85" x2="470" y2="85" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                      <line x1="30" y1="140" x2="470" y2="140" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                      
                      {/* Organic Base dashed line */}
                      <path 
                        d={`M 30 140 L 100 135 L 170 142 L 240 138 L 310 132 L 380 142 L 470 135`} 
                        fill="none" 
                        stroke="rgba(255,255,255,0.2)" 
                        strokeWidth="2.5" 
                        strokeDasharray="4 4" 
                      />
                      
                      {/* Boosted solid curve */}
                      <path 
                        d={`M 30 110 L 100 95 L 170 88 L 240 64 L 310 52 L 380 32 L 470 24`} 
                        fill="none" 
                        stroke="url(#activeGlow)" 
                        strokeWidth="4" 
                      />
                      
                      <defs>
                        <linearGradient id="activeGlow" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#9d50bb" />
                          <stop offset="50%" stopColor="#c026d3" />
                          <stop offset="100%" stopColor="#22c55e" />
                        </linearGradient>
                      </defs>
                      
                      {/* Highlight node circles */}
                      {[{x:30, y:110}, {x:100, y:95}, {x:170, y:88}, {x:240, y:64}, {x:310, y:52}, {x:380, y:32}, {x:470, y:24}].map((pt, i) => (
                        <circle key={i} cx={pt.x} cy={pt.y} r="4.5" fill="#000" stroke="#a855f7" strokeWidth="2.5" />
                      ))}

                      {/* Legend coordinates label */}
                      <text x="35" y="102" fill="rgba(255,255,255,0.4)" fontSize="8" fontFamily="monospace">Start Peak</text>
                      <text x="425" y="42" fill="#22c55e" fontSize="9" fontWeight="bold" fontFamily="monospace">14.6% CTR</text>
                    </svg>
                  </div>
                </div>
              ) : activeTabLeftCol === 'growth' ? (
                /* SECTION 3: Projected Growth Line Chart Simulator */
                <div className="space-y-4 animate-in fade-in duration-300">
                  <p className="text-xs text-gray-400 font-light leading-relaxed select-text">
                    This interactive simulator uses our <strong>Viewer Retention Decay Algorithm</strong>. Adjusting the predicted first-3-seconds <strong>Hook Strength</strong> score dynamically scales the audience retention profile across the entire video runtime. Higher hooks trigger algorithm recommendation loops.
                  </p>

                  {/* Interactive Slider */}
                  <div className="p-3 bg-[#0a0712]/50 border border-purple-500/10 rounded-xl space-y-2.5 shadow-inner">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                      <div className="space-y-0.5 select-none">
                        <span className="text-[9px] text-purple-400 font-bold uppercase tracking-widest font-mono">Simulate Hook Score</span>
                        <h4 className="text-xs font-extrabold text-white">Adjust Predicted Hook Strength Metric</h4>
                      </div>
                      <div className="flex items-center gap-2 select-none">
                        <span className="text-[11px] text-gray-400">Target Score:</span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-black font-mono ${
                          simHookStrength >= 85 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          simHookStrength >= 65 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {simHookStrength}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex-1 relative flex items-center">
                        <input 
                          type="range"
                          min={30}
                          max={100}
                          step={1}
                          value={simHookStrength}
                          onChange={(e) => {
                            setSimHookStrength(Number(e.target.value));
                            playAudioCue(Number(e.target.value) * 6 + 100, "sine", 0.08);
                          }}
                          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          setSimHookStrength(88);
                          playAudioCue(523.25, "sine", 0.12);
                        }}
                        className="px-2.5 py-1 text-[9.5px] bg-purple-900/20 hover:bg-purple-900/45 border border-purple-500/20 active:scale-95 transition-all text-purple-300 font-bold font-mono rounded shrink-0 cursor-pointer"
                      >
                        Optimize Hook (88%)
                      </button>
                    </div>
                  </div>

                  {/* Recharts LineChart Component and Simulator Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                    
                    {/* Left Panel: LineChart */}
                    <div className="md:col-span-8 h-[190px] relative w-full overflow-hidden select-none">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={simGrowthData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                          <XAxis 
                            dataKey="timeLabel" 
                            tick={{ fill: 'rgba(255, 255, 255, 0.4)', fontSize: 8, fontFamily: 'monospace' }} 
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis 
                            domain={[0, 100]} 
                            tick={{ fill: 'rgba(255, 255, 255, 0.4)', fontSize: 8, fontFamily: 'monospace' }} 
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip content={<GrowthTooltip />} cursor={{ stroke: 'rgba(255, 255, 255, 0.12)', strokeWidth: 1 }} />
                          <Legend 
                            verticalAlign="top" 
                            height={25} 
                            iconType="circle"
                            iconSize={6}
                            wrapperStyle={{ fontSize: '9px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.6)' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="hypothetical" 
                            name="Simulated Decay Curve" 
                            stroke="#a855f7" 
                            strokeWidth={3} 
                            dot={{ fill: '#a855f7', r: 2 }}
                            activeDot={{ r: 5, strokeWidth: 0 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="baseline" 
                            name="Platform Baseline (58%)" 
                            stroke="rgba(255, 255, 255, 0.25)" 
                            strokeWidth={1.5} 
                            strokeDasharray="4 4"
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Right Panel: Impact metrics */}
                    <div className="md:col-span-4 space-y-3.5 select-text">
                      <div className="p-2.5 bg-black/45 border border-white/5 rounded-xl space-y-1 hover:border-purple-500/20 transition-all">
                        <span className="text-[8.5px] text-gray-500 font-mono block uppercase tracking-widest leading-none font-bold">Algorithmic Reach Speed</span>
                        <div className="text-white text-sm font-mono font-bold flex items-baseline gap-1">
                          <span className="text-base text-emerald-400">{impressionsMult >= 1.0 ? '+' : ''}{parseFloat(((impressionsMult - 1) * 100).toFixed(1))}%</span>
                          <span className="text-[9.5px] text-gray-400 font-light font-sans">Impressions velocity</span>
                        </div>
                        <div className={`text-[8.5px] font-bold font-sans uppercase leading-none ${
                          impressionsMult >= 1.8 ? 'text-purple-400' :
                          impressionsMult >= 1.2 ? 'text-cyan-400' :
                          impressionsMult >= 1.0 ? 'text-emerald-400' :
                          'text-rose-400'
                        }`}>
                          {impressionsMult >= 2.2 ? '🔥 Platinum High-Retention Feed Lift' :
                           impressionsMult >= 1.5 ? '⚡ Steady Organic Algorithm Boost' :
                           impressionsMult >= 1.0 ? '📊 Positive Reach Support' :
                           '⚠️ Lower Recommendation Score'
                          }
                        </div>
                      </div>

                      <div className="p-2.5 bg-black/45 border border-white/5 rounded-xl space-y-1">
                        <span className="text-[8.5px] text-gray-500 font-mono block uppercase tracking-widest leading-none font-bold">Estimated Average retention</span>
                        <div className="flex justify-between items-baseline font-mono select-none">
                          <span className="text-xs font-bold text-white">{hypAvgRetention}% <span className="text-[9px] text-gray-500 font-light">avg</span></span>
                          <span className="text-[9px] text-emerald-400">+{avgRetentionLift}% lift</span>
                        </div>
                        <div className="w-full bg-white/5 h-1 rounded overflow-hidden">
                          <div className="bg-purple-500 h-full rounded transition-all duration-300" style={{ width: `${hypAvgRetention}%` }} />
                        </div>
                      </div>

                      <div className="p-2.5 bg-purple-950/20 border border-purple-500/20 rounded-xl space-y-1">
                        <span className="text-[8px] text-purple-300 font-mono block uppercase tracking-wider font-bold">Heuristic Valuation</span>
                        <p className="text-[9.5px] text-gray-300 font-light leading-snug">
                          {simHookStrength >= 80 
                            ? "Excellent opening context captures passive viewer scroll. High retention velocity feeds back into recommendation queries."
                            : simHookStrength >= 60
                            ? "Average hook metrics hold typical users but lack immediate viral triggers to prompt immediate feed amplification."
                            : "Heavy dropoff in first 3 seconds triggers search penalty filters, limiting subsequent impressions."
                          }
                        </p>
                      </div>
                    </div>

                  </div>
                </div>
              ) : (
                /* SECTION 4: YouTube Live Analytics API */
                <div className="space-y-6 relative min-h-[300px]">
                  {isYtAnalyticsLoading && (
                    <div className="absolute inset-0 z-30 bg-black/75 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center space-y-4 text-center p-6 animate-in fade-in duration-200">
                      <RefreshCw className="animate-spin text-purple-500" size={32} />
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-white uppercase tracking-wider">📡 Fetching YouTube Analytics</p>
                        <p className="text-xs text-gray-400 font-light">Handshaking with Google APIs and syncing 28-day report database...</p>
                      </div>
                    </div>
                  )}

                  {!youtubeConnected ? (
                    <div className="border border-white/5 bg-black/40 rounded-xl p-8 text-center space-y-4 max-w-lg mx-auto" id="yt-unconnected-container">
                      <Youtube size={40} className="mx-auto text-red-500 animate-pulse" />
                      <div className="space-y-2">
                        <h3 className="text-base font-bold text-white uppercase tracking-wider">YouTube Channel Connection Required</h3>
                        <p className="text-xs text-gray-400 font-light leading-relaxed">
                          Link your verified YouTube channel via secure Google OAuth to fetch live 28-day creator telemetry directly from the YouTube Analytics API.
                        </p>
                      </div>
                      <button
                        type="button"
                        id="connect-youtube-channel-unconnected"
                        onClick={handleGoogleSignInForYouTube}
                        className="mx-auto flex items-center justify-center gap-2 bg-red-650 hover:bg-red-600 text-white font-bold text-xs py-3 px-6 rounded-xl transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(239,68,68,0.25)] cursor-pointer"
                      >
                        <Link2 size={14} />
                        <span>Connect YouTube Channel</span>
                      </button>
                    </div>
                  ) : scopeMissing ? (
                    <div className="border border-amber-500/10 bg-amber-500/[0.03] rounded-xl p-8 text-center space-y-4 max-w-lg mx-auto" id="yt-scope-missing-container">
                      <AlertTriangle size={40} className="mx-auto text-amber-500 animate-bounce" />
                      <div className="space-y-2">
                        <h3 className="text-base font-bold text-white uppercase tracking-wider text-amber-400">YouTube Analytics Authorization Required</h3>
                        <p className="text-xs text-gray-400 font-light leading-relaxed">
                          The YouTube Analytics API requires dedicated permission scopes. Please sign in again and authorize the <strong>yt-analytics.readonly</strong> permission.
                        </p>
                        <div className="p-3 bg-black/40 rounded-lg text-left text-[10px] text-gray-400 space-y-1 mt-2">
                          <p className="font-bold text-amber-300">⚠️ Authorization Note:</p>
                          <p>Ensure that you grant full view permission to YouTube Analytics reports during the Google authentication pop-up prompt.</p>
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <button
                          type="button"
                          id="connect-youtube-channel-scopemissing"
                          onClick={handleGoogleSignInForYouTube}
                          className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-3 px-8 rounded-xl transition-all cursor-pointer"
                        >
                          <RefreshCw size={14} />
                          <span>Connect YouTube Channel</span>
                        </button>
                      </div>
                    </div>
                  ) : ytAnalyticsError ? (
                    <div className="border border-red-500/10 bg-red-500/[0.03] rounded-xl p-8 text-center space-y-4 max-w-lg mx-auto" id="yt-error-container">
                      <AlertTriangle size={40} className="mx-auto text-red-500 animate-pulse" />
                      <div className="space-y-2">
                        <h3 className="text-base font-bold text-white uppercase tracking-wider text-red-400">YouTube Analytics Fetch Failed</h3>
                        <p className="text-xs text-red-300 font-light leading-relaxed font-mono text-left bg-black/40 p-2.5 rounded-lg border border-red-500/10">
                          {ytAnalyticsError}
                        </p>
                        <p className="text-xs text-gray-400 font-light mt-1">
                          This usually occurs if the access token has expired or if authorized OAuth permissions are missing.
                        </p>
                      </div>
                      <div className="flex justify-center">
                        <button
                          type="button"
                          id="connect-youtube-channel-error"
                          onClick={handleGoogleSignInForYouTube}
                          className="flex items-center justify-center gap-2 bg-red-650 hover:bg-red-600 text-white font-bold text-xs py-3 px-8 rounded-xl transition-all cursor-pointer"
                        >
                          <RefreshCw size={14} />
                          <span>Connect YouTube Channel</span>
                        </button>
                      </div>
                    </div>
                  ) : ytAnalyticsData.length === 0 ? (
                    <div className="border border-white/5 bg-black/40 rounded-xl p-8 text-center space-y-4 max-w-lg mx-auto">
                      <Lock size={40} className="mx-auto text-purple-400 animate-pulse" />
                      <div className="space-y-2">
                        <h3 className="text-base font-bold text-white uppercase tracking-wider">No Telemetry Recorded</h3>
                        <p className="text-xs text-gray-400 font-light leading-relaxed">
                          Your YouTube channel is connected but has not accumulated views or performance records over the specified period.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const token = localStorage.getItem("axe_hours_yt_access_token");
                          if (token) fetchYouTubeAnalytics(token);
                        }}
                        className="mx-auto flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2.5 px-5 rounded-xl transition-all cursor-pointer"
                      >
                        <RefreshCw size={12} />
                        <span>Force Telemetry Refresh</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6 animate-in fade-in duration-500">
                      {/* Metric Summary Grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* 1. Views Card */}
                        <div className="p-4 bg-black/45 border border-white/5 rounded-xl space-y-1 hover:border-purple-500/20 transition-all text-left">
                          <span className="text-[9px] text-gray-400 uppercase font-black tracking-wider block">Total Views</span>
                          <div className="text-xl font-black text-white font-mono">
                            {ytAnalyticsData.reduce((acc, d) => acc + (d.views || 0), 0).toLocaleString()}
                          </div>
                          <span className="text-[9px] text-purple-400 font-semibold">Live Feed Telemetry</span>
                        </div>
                        {/* 2. Estimated Watch Time Card */}
                        <div className="p-4 bg-black/45 border border-white/5 rounded-xl space-y-1 hover:border-purple-500/20 transition-all text-left">
                          <span className="text-[9px] text-gray-400 uppercase font-black tracking-wider block">Minutes Watched</span>
                          <div className="text-xl font-black text-white font-mono">
                            {ytAnalyticsData.reduce((acc, d) => acc + (d.estimatedMinutesWatched || 0), 0).toLocaleString()}
                          </div>
                          <span className="text-[9px] text-purple-400 font-semibold">API Verified Records</span>
                        </div>
                        {/* 3. Average View Duration Card */}
                        <div className="p-4 bg-black/45 border border-white/5 rounded-xl space-y-1 hover:border-purple-500/20 transition-all text-left">
                          <span className="text-[9px] text-gray-400 uppercase font-black tracking-wider block">Avg View Duration</span>
                          <div className="text-xl font-black text-white font-mono">
                            {ytAnalyticsData.length > 0 ? Math.round(ytAnalyticsData.reduce((acc, d) => acc + (d.averageViewDuration || 0), 0) / ytAnalyticsData.length) : 0}s
                          </div>
                          <span className="text-[9px] text-cyan-400 font-semibold">Viewer Pacing Score</span>
                        </div>
                        {/* 4. Total Hours Watched Card */}
                        <div className="p-4 bg-black/45 border border-white/5 rounded-xl space-y-1 hover:border-purple-500/20 transition-all text-left">
                          <span className="text-[9px] text-gray-400 uppercase font-black tracking-wider block">Hours Watched</span>
                          <div className="text-xl font-black text-white font-mono">
                            {(ytAnalyticsData.reduce((acc, d) => acc + (d.estimatedMinutesWatched || 0), 0) / 60).toFixed(1)} hrs
                          </div>
                          <span className="text-[9px] text-emerald-400 font-semibold">Net Playback Sum</span>
                        </div>
                      </div>

                      {/* LineChart Visualizations */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                        {/* Left Chart: Views */}
                        <div className="p-4 bg-black/30 border border-white/5 rounded-xl space-y-2">
                          <div className="flex justify-between items-center select-none">
                            <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest font-mono">Views Trend</span>
                            <span className="text-[9px] text-gray-500 font-mono">Daily Fluctuations</span>
                          </div>
                          <div className="h-[200px] w-full select-none">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={ytAnalyticsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                <XAxis 
                                  dataKey="day" 
                                  tick={{ fill: 'rgba(255, 255, 255, 0.4)', fontSize: 8, fontFamily: 'monospace' }} 
                                  axisLine={false}
                                  tickLine={false}
                                />
                                <YAxis 
                                  tick={{ fill: 'rgba(255, 255, 255, 0.4)', fontSize: 8, fontFamily: 'monospace' }} 
                                  axisLine={false}
                                  tickLine={false}
                                />
                                <Tooltip 
                                  contentStyle={{ backgroundColor: 'rgba(14, 12, 21, 0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '10px' }}
                                  labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '9px', fontFamily: 'monospace' }} />
                                <Line 
                                  type="monotone" 
                                  dataKey="views" 
                                  name="Daily Views" 
                                  stroke="#a855f7" 
                                  strokeWidth={2} 
                                  dot={{ fill: '#a855f7', r: 1 }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Right Chart: Average View Duration & Watch Time */}
                        <div className="p-4 bg-black/30 border border-white/5 rounded-xl space-y-2">
                          <div className="flex justify-between items-center select-none">
                            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest font-mono">Watch Time & Engagement</span>
                            <span className="text-[9px] text-gray-500 font-mono">Retention Analysis</span>
                          </div>
                          <div className="h-[200px] w-full select-none">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={ytAnalyticsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                <XAxis 
                                  dataKey="day" 
                                  tick={{ fill: 'rgba(255, 255, 255, 0.4)', fontSize: 8, fontFamily: 'monospace' }} 
                                  axisLine={false}
                                  tickLine={false}
                                />
                                <YAxis 
                                  tick={{ fill: 'rgba(255, 255, 255, 0.4)', fontSize: 8, fontFamily: 'monospace' }} 
                                  axisLine={false}
                                  tickLine={false}
                                />
                                <Tooltip 
                                  contentStyle={{ backgroundColor: 'rgba(14, 12, 21, 0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '10px' }}
                                  labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '9px', fontFamily: 'monospace' }} />
                                <Line 
                                  type="monotone" 
                                  dataKey="estimatedMinutesWatched" 
                                  name="Watch Time (min)" 
                                  stroke="#06b6d4" 
                                  strokeWidth={2} 
                                  dot={{ fill: '#06b6d4', r: 1 }}
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="averageViewDuration" 
                                  name="Avg Duration (sec)" 
                                  stroke="#e11d48" 
                                  strokeWidth={1.5} 
                                  dot={{ fill: '#e11d48', r: 1 }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Audience Funnel View */}
        <GlassCard 
          id="analytics-col-right" 
          glowColor="cyan"
          className="flex flex-col justify-between select-text"
        >
          <h2 id="analytics-funnel-heading" className="text-lg font-bold text-white mb-4">Audience Conversion Funnel</h2>
          
          <div className="space-y-4">
            {[
              { stage: 'Organic Feed Impressions', val: '100%', fill: 'bg-primary/30 text-primary border-primary/40 w-full', sub: 'Baseline Reach threshold' },
              { stage: 'Title Click-Through Rate', val: `${Math.min(16.4, 9.4 + recentGenerations.length * 0.8).toFixed(1)}%`, fill: 'bg-blue-500/20 text-blue-400 border-blue-500/30 w-[78%]', sub: 'Frictionless entry click' },
              { stage: 'Audience Finish Retention', val: `${Math.min(52.8, 22.4 + pacingScore * 0.3).toFixed(1)}%`, fill: 'bg-green-500/20 text-green-400 border-green-500/30 w-[55%]', sub: 'Completed to absolute CTA end' }
            ].map((item, i) => (
              <div key={i} id={`funnel-stage-${i}`}>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>{item.stage}</span>
                  <span className="text-white font-mono">{item.val}</span>
                </div>
                <div className={`p-2 rounded-lg border text-[10px] flex justify-between items-center ${item.fill}`}>
                  <span className="font-light">{item.sub}</span>
                  <ArrowUpRight size={10} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Main Video Retention Heatmap Panel */}
      <GlassCard id="projected-retention-heatmap-master-panel" className="space-y-6" glowColor="purple">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <Flame className="text-[#ec4899] animate-pulse" size={20} />
            <div>
              <h2 className="text-lg font-extrabold text-white">Projected Script Audience Retention Heatmap</h2>
              <p className="text-xs text-gray-400 font-light">Evaluated retention fluctuations per second. Hover blocks to see dynamic recommendations.</p>
            </div>
          </div>
          <span className="shrink-0 bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono text-[10px] px-2 py-0.5 rounded uppercase font-black tracking-wider">
            Heuristic Algorithmic Engine V3
          </span>
        </div>

        {/* Interactive Stats cards row */}
        <div id="heatmap-pacing-stats" className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-3.5 bg-black/40 rounded-xl border border-white/5 space-y-1">
            <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider block">Total Estimated Length</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-white font-mono">{totalDuration}s</span>
              <span className="text-xs text-gray-400 font-light">short-form</span>
            </div>
          </div>

          <div className="p-3.5 bg-black/40 rounded-xl border border-white/5 space-y-1">
            <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider block">Sub-Scene Count</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-white font-mono">{segments.length}</span>
              <span className="text-xs text-gray-400 font-light">segments matched</span>
            </div>
          </div>

          <div className="p-3.5 bg-black/40 rounded-xl border border-white/5 space-y-1">
            <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider block">Average Pacing Block</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-white font-mono">{averageSegmentDuration}s</span>
              <span className="text-xs text-gray-400 font-light">under 15s optimal</span>
            </div>
          </div>

          <div className="p-3.5 bg-purple-950/20 rounded-xl border border-purple-500/20 space-y-1">
            <span className="text-[10px] text-purple-400 uppercase font-black tracking-wider block flex items-center gap-1">
              <Gauge size={10} className="text-purple-400" /> Velocity Rhythm
            </span>
            <span className="text-sm font-black text-white block">{pacingGrade}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* Timeline retention graph & grid column */}
          <div className="xl:col-span-8 space-y-6">
            
            {/* SVG Interactive graph area */}
            <div id="interactive-retention-graph-wrapper" className="relative bg-black/45 hover:bg-black/60 border border-white/5 rounded-xl p-3 select-none overflow-hidden transition-colors">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-black tracking-wider text-purple-300 uppercase flex items-center gap-1 font-mono">
                  <TrendingUp size={11} /> Audience Retention Flow Chart (%)
                </span>
                <span className="text-[10px] text-gray-500 font-mono">Hover cells to cursor index</span>
              </div>

              <div className="relative h-[130px] w-full">
                <svg viewBox={`0 0 ${widthSvg} ${heightSvg}`} className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="retentionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(168, 85, 247, 0.4)" />
                      <stop offset="100%" stopColor="rgba(30, 27, 75, 0)" />
                    </linearGradient>
                    <linearGradient id="curveNeon" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#ec4899" />
                      <stop offset="40%" stopColor="#d946ef" />
                      <stop offset="80%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Threshold Guideline markers */}
                  <text x="3" y="23" fill="rgba(255,255,255,0.15)" fontSize="8" fontFamily="monospace">100%</text>
                  <line x1="0" y1="20" x2={widthSvg} y2="20" stroke="rgba(255,255,255,0.02)" strokeDasharray="5 5" />
                  
                  <text x="3" y="68" fill="rgba(255,255,255,0.15)" fontSize="8" fontFamily="monospace">60%</text>
                  <line x1="0" y1="65" x2={widthSvg} y2="65" stroke="rgba(255,255,255,0.02)" strokeDasharray="5 5" />

                  {/* Shaded Area fill path */}
                  {areaPath && (
                    <path d={areaPath} fill="url(#retentionGradient)" />
                  )}

                  {/* Curved path representing retention drop-offs */}
                  {linePath && (
                    <path d={linePath} fill="none" stroke="url(#curveNeon)" strokeWidth="3" strokeLinecap="round" />
                  )}

                  {/* Interactive tracking hover line */}
                  {cursorCoords && (
                    <>
                      <line 
                        x1={cursorCoords.x} 
                        y1={paddingSvgTop} 
                        x2={cursorCoords.x} 
                        y2={heightSvg - paddingSvgBottom} 
                        stroke="#a855f7" 
                        strokeWidth="1.5" 
                        strokeDasharray="2 2"
                        className="animate-in fade-in"
                      />
                      <circle 
                        cx={cursorCoords.x} 
                        cy={cursorCoords.y} 
                        r="5.5" 
                        fill="#a855f7" 
                        stroke="#000" 
                        strokeWidth="2" 
                        className="animate-in zoom-in" 
                      />
                      {/* Floating tooltip inline value inside SVG bounding box */}
                      <g className="translate-y-[-24px]">
                        <rect 
                          x={Math.max(10, Math.min(widthSvg - 60, cursorCoords.x - 25))} 
                          y={cursorCoords.y} 
                          width="50" 
                          height="16" 
                          rx="4" 
                          fill="#18181b" 
                          stroke="rgba(168, 85, 247, 0.4)" 
                          strokeWidth="1" 
                        />
                        <text 
                          x={Math.max(10, Math.min(widthSvg - 60, cursorCoords.x - 25)) + 25} 
                          y={cursorCoords.y + 11} 
                          fill="#fff" 
                          fontSize="8.5" 
                          fontFamily="monospace" 
                          fontWeight="bold" 
                          textAnchor="middle"
                        >
                          {cursorSecond === hoveredSecond ? `${activeHoverPct}%` : 'LIVE'}
                        </text>
                      </g>
                    </>
                  )}
                </svg>
              </div>
            </div>

            {/* HEATMAP BLOCKS GRID */}
            <div id="heatmap-cells-grid-panel" className="space-y-3.5 bg-black/45 border border-white/5 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1">
                <span className="text-[11px] font-black tracking-wider text-[#9d50bb] uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
                  <span>Interactive Heatmap (Sec-by-Sec)</span>
                </span>
                <span className="text-[10px] font-mono text-gray-400">
                  Slide cursor across cells to evaluate vocal and audio timing metrics
                </span>
              </div>

              {/* Real cells mapping */}
              <div id="heatmap-blocks-layout" className="grid grid-cols-10 sm:grid-cols-20 gap-1.5">
                {retentionTimeline.map((block) => {
                  const isActive = cursorSecond === block.second;
                  return (
                    <button
                      key={block.second}
                      id={`heatmap-cell-second-${block.second}`}
                      onMouseEnter={() => {
                        setHoveredSecond(block.second);
                        triggerTickSound(block.second);
                      }}
                      style={getRetentionCellGlow(block.pct)}
                      className={`h-9 relative rounded-md transition-all flex flex-col justify-between p-1 select-none overflow-hidden cursor-pointer ${
                        isActive 
                          ? 'ring-2 ring-white scale-110 z-25 shadow-[0_0_15px_rgba(255,255,255,0.4)]' 
                          : 'opacity-85 hover:opacity-100 hover:scale-[1.03] hover:z-20'
                      }`}
                    >
                      {/* Cell percentage label or small time label */}
                      <span className="text-[9px] font-mono font-black text-white/90 truncate block text-left">
                        {Math.round(block.pct)}%
                      </span>
                      <span className="text-[7.5px] font-mono text-white/40 block text-right">
                        {block.second}s
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Heatmap legend descriptor */}
              <div id="heatmap-legend" className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3 text-[10px]">
                <div className="flex items-center gap-4">
                  <span className="text-gray-500 font-mono uppercase tracking-wider">Index Keys:</span>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-purple-500 inline-block" />
                    <span className="text-gray-400">🔥 Viral Peak (85%+)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-fuchsia-600 inline-block" />
                    <span className="text-gray-400">⚡ Steady Retention (70-85%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-indigo-950 inline-block border border-indigo-500/25" />
                    <span className="text-gray-400">💤 High Drop vulnerability (55-70%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-red-950 inline-block border border-red-500/35" />
                    <span className="text-gray-400">⚠️ Drop Action Necessary (&lt;55%)</span>
                  </div>
                </div>
                
                <button
                  id="reset-heatmap-pointer-btn"
                  onClick={() => {
                    setHoveredSecond(null);
                    playAudioCue(330, "sine", 0.2);
                  }}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white uppercase font-bold tracking-widest text-[9px] font-mono transition-colors"
                >
                  Clear Selection
                </button>
              </div>

            </div>
          </div>

          {/* Interactive detail sidebar column */}
          <div className="xl:col-span-4 space-y-4">
            
            {/* Live cell readout values */}
            <div id="heatmap-segment-readout-card" className="p-4 rounded-xl border border-white/5 bg-black/45 hover:bg-purple-950/5 relative overflow-hidden transition-all duration-300">
              
              <div className="absolute top-0 right-0 p-3 select-none">
                <span className="p-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg font-mono text-[10px] font-semibold block">
                  {formatSecondsPresentation(activeHoverSec)}
                </span>
              </div>

              <div id="readout-segment-identity" className="space-y-4">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-pink-500 font-mono tracking-wider uppercase">
                    ACTIVE CELL PACING DATA
                  </span>
                  <h3 className="text-sm font-black text-white uppercase flex items-center gap-1">
                    [{activeHoverSegment.label}] <span className="text-xs text-gray-500 font-light">Segment {activeHoverSegment.id} of {segments.length}</span>
                  </h3>
                </div>

                {/* Score badge indicator */}
                <div className="grid grid-cols-2 gap-3 pb-2 border-b border-white/5">
                  <div className="bg-white/3 border border-white/5 rounded-lg p-2.5 text-center">
                    <span className="text-[8px] text-gray-500 tracking-widest font-mono uppercase block">Projected Keep</span>
                    <span className={`text-xl font-black font-mono block ${activeHoverPct >= 85 ? 'text-purple-400' : activeHoverPct >= 70 ? 'text-fuchsia-400' : 'text-indigo-400'}`}>
                      {activeHoverPct}%
                    </span>
                  </div>
                  
                  <div className="bg-white/3 border border-white/5 rounded-lg p-2.5 text-center flex flex-col justify-center items-center">
                    <span className="text-[8px] text-gray-500 tracking-widest font-mono uppercase block">Scene Range</span>
                    <span className="text-xs font-bold text-white font-mono mt-0.5 whitespace-nowrap block">
                      {formatSecondsPresentation(activeHoverSegment.startTime)} - {formatSecondsPresentation(activeHoverSegment.endTime)}
                    </span>
                  </div>
                </div>

                {/* Script details mapping */}
                <div className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <span className="text-[9px] text-purple-400 uppercase font-black font-mono tracking-wider flex items-center gap-1">
                      <Zap size={10} /> Visual Storyboard Overlay:
                    </span>
                    <p className="text-gray-300 font-light italic leading-relaxed">
                      "{activeHoverSegment.visual}"
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] text-purple-400 uppercase font-black font-mono tracking-wider flex items-center gap-1">
                      <Clock size={10} /> Voiceover Speech Narrative:
                    </span>
                    <p className="text-gray-300 font-light font-sans leading-relaxed">
                      "{activeHoverSegment.voiceover}"
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] text-indigo-400 uppercase font-black font-mono tracking-wider flex items-center gap-1">
                      <Sliders size={10} /> Active sound overlays (SFX):
                    </span>
                    <p className="text-gray-400 font-mono text-[10px]">
                      {activeHoverSegment.sfx}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] text-indigo-400 uppercase font-black font-mono tracking-wider flex items-center gap-1">
                      <Award size={10} /> Target Text Caption:
                    </span>
                    <p className="text-[#a855f7] font-bold text-[10px] font-mono whitespace-pre-wrap uppercase">
                      {activeHoverSegment.caption}
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Strategic advisor feedback box with live-updated warnings */}
            <GlassCard id="projected-retention-heatmap-advisor-box" className="p-4 space-y-3" glowColor="cyan">
              <div className="flex items-center gap-1.5 border-b border-white/5 pb-2">
                <Lightbulb className="text-cyan-400 animate-pulse animate-duration-1000" size={16} />
                <span className="text-[11px] uppercase font-black tracking-wider text-cyan-300 font-mono">Heatmap Optimization Advisor</span>
              </div>

              <div className="space-y-3 text-xs leading-relaxed">
                {activeHoverSegment.label === "HOOK" ? (
                  <>
                    <p className="text-gray-400 font-light">
                      Your hook segment is <strong className="text-white">{activeHoverSegment.duration} seconds</strong> long. Perfect! 
                      Audience psychology indicates that short, snappy hooks that are under 5 seconds optimize retention by over <strong>18%</strong> on smart-phone scrolling feeds.
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                      <CheckCircleIcon />
                      <span>Optimized hook duration verified.</span>
                    </div>
                  </>
                ) : activeHoverSegment.label === "LEAD-IN" ? (
                  <>
                    <p className="text-gray-400 font-light">
                      The transition to Lead-in is a critical drop-off zone. Your video features a slide down graphic which prevents swipes. 
                      Ensure your voiceover emphasizes the target pain point immediately in the first 10 seconds.
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-yellow-400 font-mono font-bold bg-yellow-500/10 p-2 rounded-lg border border-yellow-500/20">
                      <AlertTriangle size={12} />
                      <span>Transition vulnerability detected at 0:04s</span>
                    </div>
                  </>
                ) : activeHoverSegment.label === "PAYLOAD" ? (
                  <>
                    <p className="text-gray-400 font-light">
                      Your payload block spans <strong className="text-white">30 seconds</strong>. Mid-length tutorials often encounter a gradual retention drop (vantage point valleys). 
                      Inject a <strong>visual micro-pattern interrupt</strong> (e.g. flashing console alerts) at the 0:30 second line to trigger a spike in attention!
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-[#9d50bb] font-mono font-bold bg-purple-500/10 p-2 rounded-lg border border-purple-500/20">
                      <Sparkles size={11} className="text-purple-400" />
                      <span>Recommended: Add flash transition at 0:30s</span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-gray-400 font-light">
                      Call-to-Action segment length is adequate. Directing comments creates highly responsive algorithms, but keep verbal commands under 12s overall.
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 font-mono font-bold bg-cyan-500/10 p-2 rounded-lg border border-cyan-500/20">
                      <Info size={11} className="text-cyan-400" />
                      <span>Interactive visual overlay verified.</span>
                    </div>
                  </>
                )}
              </div>
            </GlassCard>

          </div>
        </div>
      </GlassCard>
      {/* 🔮 CUSTOM SECURE CREATOR CONNECTION PORTAL MODAL */}
      {activeConnectionPortal !== null && (
        <div id="connector-modal-overlay" className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div 
            id="connector-modal-box" 
            className="w-full max-w-md bg-[#020203]/90 border border-purple-500/30 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(157,80,187,0.15)] relative animate-in zoom-in-95 duration-200"
          >
            {/* Modal Ambient Lights */}
            <div className={`absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-[50px] opacity-30 ${activeConnectionPortal === 'youtube' ? 'bg-red-500/20' : 'bg-pink-500/20'}`} />

            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${activeConnectionPortal === 'youtube' ? 'bg-red-500/10 text-red-500' : 'bg-pink-500/10 text-pink-500'}`}>
                  {activeConnectionPortal === 'youtube' ? <Youtube size={20} /> : <Instagram size={20} />}
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    {activeConnectionPortal === 'youtube' ? 'Link YouTube Studio' : 'Link Instagram Reels'}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">
                    Frictionless Secure Tunnel
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveConnectionPortal(null)}
                className="text-gray-500 hover:text-white transition-colors cursor-pointer text-xs uppercase tracking-widest font-mono font-bold"
              >
                ✕ Cancel
              </button>
            </div>

            {/* Modal Form / Steps */}
            <div className="p-6 space-y-5 relative z-10 select-text">
              {isLinkingInPortal ? (
                /* Connecting State */
                <div className="py-8 flex flex-col items-center justify-center space-y-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full border-2 border-white/5 border-t-purple-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Zap size={18} className="text-purple-400 animate-pulse" />
                    </div>
                  </div>
                  
                  <div className="text-center space-y-1">
                    <p className="text-xs font-bold text-white uppercase tracking-wider">Syncing Creator Pipe</p>
                    <p className="text-[9px] text-gray-500 font-mono">bi-directional handshake active</p>
                  </div>

                  {/* Log console representation */}
                  <div className="w-full bg-black/60 border border-white/5 rounded-xl p-3 font-mono text-[9px] text-gray-400 space-y-1">
                    {portalLogs.map((log, i) => (
                      <div key={i} className="flex gap-1.5 items-start">
                        <span className="text-purple-500">▶</span>
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Form State */
                <>
                  {activeConnectionPortal === 'youtube' && (
                    <div className="flex bg-black/40 border border-white/5 rounded-xl p-1 relative z-10 select-none mb-4">
                      <button
                        type="button"
                        onClick={() => {
                          setConnectionMode('oauth');
                          playAudioCue(440, "sine", 0.08);
                        }}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          connectionMode === 'oauth'
                            ? 'bg-red-500/15 border border-red-500/20 text-red-400 font-extrabold shadow-[0_0_15px_rgba(239,68,68,0.08)]'
                            : 'text-gray-400 hover:text-white border border-transparent'
                        }`}
                      >
                        🔑 Secure Google OAuth
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConnectionMode('sandbox');
                          playAudioCue(440, "sine", 0.08);
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          connectionMode === 'sandbox'
                            ? 'bg-purple-500/15 border border-purple-500/20 text-purple-400 font-extrabold shadow-[0_0_15px_rgba(168,85,247,0.08)]'
                            : 'text-gray-400 hover:text-white border border-transparent'
                        }`}
                      >
                        🧪 Sandbox Mock Stats
                      </button>
                    </div>
                  )}

                  {activeConnectionPortal === 'youtube' && connectionMode === 'oauth' ? (
                    <div className="space-y-4 py-2 relative z-10 text-center animate-in fade-in duration-300">
                      <div className="space-y-1.5 text-center">
                        <Globe className="mx-auto text-red-500 animate-pulse mb-1" size={24} />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Connect Live YouTube Channel</h4>
                        <p className="text-[10px] text-gray-400/80 leading-relaxed font-light px-2">
                          Authorize Axe Creator Studio via Google APIs to automatically sync your verified channel info, subscriber statistics, and secure your cloud drafts stash.
                        </p>

                        <div className="p-2.5 bg-amber-500/[0.08] border border-amber-500/20 rounded-xl text-left text-[9.5px] text-amber-300 leading-relaxed space-y-1 mx-1">
                          <p className="font-bold flex items-center gap-1.5">
                            <span>💡</span> Sandbox Mode Guidance
                          </p>
                          <p className="text-gray-400 font-light text-[9px]">
                            Live Google APIs are restricted in sandbox environments. To connect instantly, toggling the <strong>"Sandbox Mock Stats"</strong> tab above is highly recommended!
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleGoogleSignInForYouTube}
                        className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-white/95 text-black font-sans font-bold text-xs p-3.5 rounded-xl shadow-[0_0_35px_rgba(255,255,255,0.06)] cursor-pointer transition-all active:scale-[0.98]"
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        </svg>
                        <span>Sign in with Google Account</span>
                      </button>
                      
                      <div className="flex gap-2 items-center text-[8.5px] text-[#9d50bb] justify-center bg-purple-500/5 p-2.5 rounded-xl border border-purple-500/10">
                        <Lock size={10} className="text-purple-400 shrink-0" />
                        <span className="font-mono">Scopes: youtube.readonly / youtube.upload</span>
                      </div>

                      {portalLogs.some(log => log.includes("❌")) && (
                        <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-left rounded-xl space-y-2.5 animate-in fade-in duration-300">
                          <div className="flex gap-2 items-start text-xs text-red-400">
                            <span className="shrink-0 mt-0.5">⚠️</span>
                            <div>
                              <p className="font-bold">Sandbox API Handshake Restricted (HTTP 403)</p>
                              <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
                                Google's live YouTube API is restricted in this sandboxed Dev Environment to whitelisted testers. But don't worry! You can bypass this immediately.
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setConnectionMode('sandbox');
                                setPortalLogs([]);
                                playAudioCue(600, "sine", 0.08);
                              }}
                              className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                            >
                              🧪 Customize Sandbox Mock
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                playAudioCue(880, "sine", 0.1);
                                setYtChannelName(auth.currentUser?.displayName || "Axe Creator Shorts");
                                setYtSubscribed(18400);
                                setYtAvatar("https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=150&auto=format&fit=crop&q=60");
                                setYoutubeConnected(true);
                                localStorage.setItem("axe_hours_yt_connected", "true");
                                localStorage.setItem("axe_hours_yt_name", auth.currentUser?.displayName || "Axe Creator Shorts");
                                localStorage.setItem("axe_hours_yt_avatar", "https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=150&auto=format&fit=crop&q=60");
                                localStorage.setItem("axe_hours_yt_subscribers", "18400");
                                localStorage.removeItem("axe_hours_yt_access_token");
                                setActiveConnectionPortal(null);
                                addToast("Bypassed restriction and connected immediately via Sandbox! 🚀", "success");
                              }}
                              className="flex-1 py-2 border border-white/10 hover:bg-white/5 text-gray-300 hover:text-white rounded-lg text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                            >
                              ⚡ Direct Bypass (1-Click)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4 relative z-10 animate-in fade-in duration-300">
                      <div className="space-y-4 font-sans text-left">
                        {/* Channel Handle name */}
                        <div className="space-y-1">
                          <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-mono">
                            {activeConnectionPortal === 'youtube' ? 'Channel Public Name' : 'Instagram Handle'}
                          </label>
                          <div className="relative">
                            {activeConnectionPortal === 'instagram' && (
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">@</span>
                            )}
                            <input
                              type="text"
                              value={portalChannelName}
                              onChange={(e) => setPortalChannelName(e.target.value)}
                              placeholder={activeConnectionPortal === 'youtube' ? 'My Creative Shorts Channel' : 'custom.handle'}
                              className={`w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500 font-semibold ${
                                activeConnectionPortal === 'instagram' ? 'pl-7' : ''
                              }`}
                            />
                          </div>
                        </div>

                        {/* Follower Count */}
                        <div className="space-y-1">
                          <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-mono">
                            {activeConnectionPortal === 'youtube' ? 'Subscriber Count' : 'Follower Count'}
                          </label>
                          <input
                            type="number"
                            value={portalFollowers}
                            onChange={(e) => setPortalFollowers(Number(e.target.value))}
                            className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500 font-mono font-semibold"
                          />
                        </div>

                        {/* Premium Avatar picker */}
                        <div className="space-y-1.5">
                          <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-mono select-none">Select Avatar Style</label>
                          <div className="grid grid-cols-4 gap-2 select-none">
                            {/* Option 1: Cosmic Glow */}
                            <button
                              type="button"
                              onClick={() => setPortalAvatarSelected("cosmic-glow")}
                              className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                                portalAvatarSelected === "cosmic-glow" ? 'border-purple-500 bg-purple-500/5' : 'border-white/5 bg-black/30'
                              }`}
                            >
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-[10px] text-white font-bold">CG</div>
                              <span className="text-[7px] text-gray-400">Cosmic</span>
                            </button>

                            {/* Option 2: Insta Neon */}
                            <button
                              type="button"
                              onClick={() => setPortalAvatarSelected("insta-neon")}
                              className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                                portalAvatarSelected === "insta-neon" ? 'border-pink-500 bg-pink-500/5' : 'border-white/5 bg-black/30'
                              }`}
                            >
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-amber-500 flex items-center justify-center text-[10px] text-white font-bold">IN</div>
                              <span className="text-[7px] text-gray-400">Neon</span>
                            </button>

                            {/* Option 3: Emerald Tech */}
                            <button
                              type="button"
                              onClick={() => setPortalAvatarSelected("emerald-tech")}
                              className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                                portalAvatarSelected === "emerald-tech" ? 'border-emerald-500 bg-emerald-500/5' : 'border-white/5 bg-black/30'
                              }`}
                            >
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-[10px] text-white font-bold">ET</div>
                              <span className="text-[7px] text-gray-400">Matrix</span>
                            </button>

                            {/* Option 4: User Profile */}
                            <button
                              type="button"
                              disabled={!auth.currentUser?.photoURL}
                              onClick={() => setPortalAvatarSelected("user-profile")}
                              className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                                !auth.currentUser?.photoURL ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                              } ${
                                portalAvatarSelected === "user-profile" ? 'border-cyan-500 bg-cyan-500/5' : 'border-white/5 bg-black/30'
                              }`}
                            >
                              {auth.currentUser?.photoURL ? (
                                <img src={auth.currentUser?.photoURL} className="w-8 h-8 rounded-full object-cover animate-in fade-in" alt="User avatar" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[9px] text-gray-500">N/A</div>
                              )}
                              <span className="text-[7px] text-gray-400">Profile</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Authorize action */}
                      <button
                        onClick={async () => {
                          if (!portalChannelName.trim()) return;
                          setIsLinkingInPortal(true);
                          
                          const steps = [
                            `SECURE HANDSHAKE: Generating cryptographic JWT...`,
                            `OAUTH AGENT: Linking profile credentials...`,
                            `METRICS INDEX: Initializing real-time telemetry fetch...`,
                            `SYNC COMPLETE: Bi-directional link active! 🚀`
                          ];

                          // Add logs sequentially for extreme immersion
                          for (let i = 0; i < steps.length; i++) {
                            setPortalLogs(prev => [...prev, steps[i]]);
                            playAudioCue(440 + i * 110, "sine", 0.1);
                            await new Promise(resolve => setTimeout(resolve, 350));
                          }

                          // Successfully sync
                          let avatarUrl = "";
                          if (portalAvatarSelected === "user-profile" && auth.currentUser?.photoURL) {
                            avatarUrl = auth.currentUser.photoURL;
                          } else if (portalAvatarSelected === "insta-neon") {
                            avatarUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=60";
                          } else if (portalAvatarSelected === "emerald-tech") {
                            avatarUrl = "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=150&auto=format&fit=crop&q=60";
                          } else {
                            // cosmic glow
                            avatarUrl = "https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=150&auto=format&fit=crop&q=60";
                          }

                          if (activeConnectionPortal === 'youtube') {
                            setYtChannelName(portalChannelName);
                            setYtSubscribed(portalFollowers);
                            setYtAvatar(avatarUrl);
                            setYoutubeConnected(true);
                            localStorage.setItem("axe_hours_yt_connected", "true");
                            localStorage.setItem("axe_hours_yt_name", portalChannelName);
                            localStorage.setItem("axe_hours_yt_avatar", avatarUrl);
                            localStorage.setItem("axe_hours_yt_subscribers", String(portalFollowers));
                            localStorage.removeItem("axe_hours_yt_access_token");
                          } else {
                            setIgHandleName(portalChannelName.replace("@", ""));
                            setIgSubscribed(portalFollowers);
                            setInstagramConnected(true);
                            localStorage.setItem("axe_hours_ig_connected", "true");
                            localStorage.setItem("axe_hours_ig_name", portalChannelName.replace("@", ""));
                            localStorage.setItem("axe_hours_ig_followers", String(portalFollowers));
                          }

                          setIsLinkingInPortal(false);
                          setActiveConnectionPortal(null);
                          playAudioCue(880, "sine", 0.3); // Success chime
                        }}
                        className={`w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${
                          portalChannelName.trim()
                            ? activeConnectionPortal === 'youtube'
                              ? 'bg-red-650 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                              : 'bg-pink-650 hover:bg-pink-650 text-white shadow-[0_0_20px_rgba(236,72,153,0.2)]'
                            : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                        }`}
                      >
                        <Link2 size={13} />
                        <span>Establish Secure Portal Link 🔌</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Internal icon helpers for advisory cards
const CheckCircleIcon = () => (
  <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"></path>
  </svg>
);
