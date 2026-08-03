import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { 
  Eye, 
  ThumbsUp, 
  Zap, 
  Sliders, 
  Image, 
  Copy, 
  Target, 
  Award, 
  Sparkles, 
  Volume2, 
  Flame, 
  HelpCircle,
  DollarSign,
  Calendar,
  Plus,
  Trash2,
  Video,
  TrendingUp,
  Download,
  Share2,
  Check,
  RefreshCw
} from 'lucide-react';
import { generateThumbnailSpecs } from '../utils/thumbnailPromptGenerator';
import { playAudioCue as playAudio } from '../utils/audio';
import { useToast } from '../context/ToastContext';
import { useFirebase } from '../context/FirebaseContext';

interface GenerationItem {
  id: number;
  title: string;
  content: string;
  date: string;
}

interface DashboardProps {
  recentGenerations: GenerationItem[];
  onSelectHistory: (item: GenerationItem) => void;
  onViewAllGens: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ recentGenerations = [], onSelectHistory, onViewAllGens }) => {
  const totalGens = recentGenerations.length;
  // Initialize dynamic baseline projections instead of flat zeros so the dashboard is immediately vivid and visual,
  // but if totalGens is 0 (first user connection / new account), it should be a clean slate to represent account isolation!
  const viewsValue = totalGens === 0 ? "0" : `${(totalGens * 12.4 + 148.5).toFixed(1)}K`;
  const ctrValue = totalGens === 0 ? "0.0%" : `${Math.min(18.5, 9.2 + totalGens * 1.1).toFixed(1)}%`;
  const engagementValue = totalGens === 0 ? "0.0%" : `${Math.min(24.8, 11.4 + totalGens * 1.5).toFixed(1)}%`;

  const seoStrength = totalGens === 0 ? 0 : Math.min(98, 76 + totalGens * 4);
  const retentionProb = totalGens === 0 ? 0 : Math.min(95, 68 + totalGens * 5);

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const seoOffset = circumference - (seoStrength / 100) * circumference;
  const retentionOffset = circumference - (retentionProb / 100) * circumference;

  const stats = [
    { label: 'Projected Viral Reach', value: viewsValue, icon: Eye, color: 'text-purple-400', bg: 'rgba(157,80,187,0.1)', glow: 'purple' as const },
    { label: 'Estimated Click-Rate', value: ctrValue, icon: Zap, color: 'text-amber-400', bg: 'rgba(245,158,11,0.1)', glow: 'amber' as const },
    { label: 'Interactive Retention', value: engagementValue, icon: ThumbsUp, color: 'text-emerald-400', bg: 'rgba(16,185,129,0.1)', glow: 'green' as const },
  ];

  const { user, googleAccessToken, loginWithGoogle } = useFirebase();
  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false);
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState("");

  // Helper: Calculate next weekday occurrence
  const getNextWeekdayDateTime = (day: string, time: string): string => {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const targetDayIndex = daysOfWeek.indexOf(day);
    if (targetDayIndex === -1) return new Date().toISOString();

    const now = new Date();
    const currentDayIndex = now.getDay();
    let daysUntilTarget = targetDayIndex - currentDayIndex;
    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7; // Next week's occurrence
    }

    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + daysUntilTarget);

    // Parse time "HH:MM"
    const [hours, minutes] = time.split(':').map(Number);
    targetDate.setHours(hours || 12, minutes || 0, 0, 0);

    return targetDate.toISOString();
  };

  // Helper: Create single event on Google Calendar
  const syncPostToGoogleCalendar = async (post: any) => {
    const token = googleAccessToken;
    if (!token) return;

    const eventDateTime = getNextWeekdayDateTime(post.day, post.time);
    const endDateTime = new Date(new Date(eventDateTime).getTime() + 30 * 60 * 1000).toISOString(); // 30 mins later

    const body = {
      summary: `Publish @${post.platform}: ${post.title}`,
      description: `Scheduled publishing via Axe Hours Workspace.\nPlatform: ${post.platform}\nTime: ${post.time}\nStatus: ${post.status}`,
      start: {
        dateTime: eventDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      },
      end: {
        dateTime: endDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      }
    };

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google Calendar sync failed: ${errText}`);
    }
  };

  // Trigger full sync
  const syncToGoogleCalendar = async () => {
    if (scheduledPosts.length === 0) {
      showToast("No scheduled posts to sync! ⚠️", "warning");
      return;
    }

    if (!user) {
      showToast("Please sign in with Google to sync with your calendar.", "info");
      try {
        await loginWithGoogle();
      } catch (err) {
        console.error("Auth failed:", err);
        showToast("Authentication failed.", "error");
        return;
      }
    }

    if (!googleAccessToken) {
      showToast("Authorizing Google Calendar access...", "info");
      try {
        await loginWithGoogle();
      } catch (err) {
        console.error("Re-auth failed:", err);
        showToast("Google Calendar authorization failed.", "error");
        return;
      }
    }

    setIsSyncingGoogle(true);
    let successCount = 0;

    const confirmed = window.confirm(
      `Synchronize ${scheduledPosts.length} scheduled publishing slots directly into your primary Google Calendar? This will write new events.`
    );
    if (!confirmed) {
      setIsSyncingGoogle(false);
      return;
    }

    try {
      for (const post of scheduledPosts) {
        await syncPostToGoogleCalendar(post);
        successCount++;
      }
      playAudioCue(880);
      showToast(`Successfully synced ${successCount} slots to Google Calendar! 📅`);
    } catch (error: any) {
      console.error("Google Calendar Sync error:", error);
      showToast("Some slots failed to sync. Make sure your Google account has permission.", "error");
    } finally {
      setIsSyncingGoogle(false);
    }
  };

  // Trigger Outlook/ICS export
  const exportOutlookICS = () => {
    if (scheduledPosts.length === 0) {
      showToast("No scheduled posts to export! ⚠️", "warning");
      return;
    }

    let icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Axe Hours Workspace//NONSGML Creator Planner//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH"
    ];

    scheduledPosts.forEach(post => {
      const eventDateTime = getNextWeekdayDateTime(post.day, post.time);
      const eventDate = new Date(eventDateTime);
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

      const formatDateLocal = (date: Date) => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const mins = pad(date.getMinutes());
        const secs = pad(date.getSeconds());
        return `${year}${month}${day}T${hours}${mins}${secs}`;
      };

      const dtStart = formatDateLocal(eventDate);
      const dtEnd = formatDateLocal(new Date(eventDate.getTime() + 30 * 60 * 1000));
      const dtStamp = formatDateLocal(new Date());

      icsContent.push(
        "BEGIN:VEVENT",
        `UID:${post.id}@axe-hours.app`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART;TZID=${userTz}:${dtStart}`,
        `DTEND;TZID=${userTz}:${dtEnd}`,
        `SUMMARY:Publish @${post.platform}: ${post.title}`,
        `DESCRIPTION:Scheduled peak publishing slot via Axe Hours Workspace.\\nPlatform: ${post.platform}\\nTime: ${post.time}\\nStatus: ${post.status}`,
        "END:VEVENT"
      );
    });

    icsContent.push("END:VCALENDAR");

    const blob = new Blob([icsContent.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "axe-hours-publishing-schedule.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    playAudioCue(783.99);
    showToast("Outlook/Microsoft Calendar .ics file downloaded! Open it to import your slots.");
  };

  const filteredGenerations = recentGenerations.filter(gen => 
    gen.title.toLowerCase().includes(dashboardSearchQuery.toLowerCase()) ||
    gen.content.toLowerCase().includes(dashboardSearchQuery.toLowerCase())
  );

  const displayGens = dashboardSearchQuery.trim()
    ? filteredGenerations.slice(0, 10)
    : recentGenerations.slice(0, 3);

  // High fidelity wavy data points simulating deep viral compound scaling rather than a flat zero line
  const basePoints = [
    { x: 30, y: 155 },
    { x: 100, y: 130 },
    { x: 170, y: 140 },
    { x: 240, y: 105 },
    { x: 310, y: 115 },
    { x: 380, y: 75 },
    { x: 470, y: 45 }
  ];

  const chartPoints = totalGens === 0
    ? basePoints.map(pt => ({ x: pt.x, y: 175 })) // Flat baseline representing clean slate
    : basePoints.map((pt, i) => {
        if (i === 0) return pt;
        const shift = Math.min(40, totalGens * 8 * (i / 6));
        return { x: pt.x, y: Math.max(20, pt.y - shift) };
      });

  const linePath = chartPoints.reduce((acc, pt, i) => i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`, "");
  const areaPath = `${linePath} L ${chartPoints[chartPoints.length - 1].x} 180 L ${chartPoints[0].x} 180 Z`;

  // Dynamic sound effects synthesizer helper with global preferences check
  const playAudioCue = (frequency: number) => {
    playAudio(frequency, "sine", 0.3);
  };

  // Interactive Thumbnail States
  const [thumbHeadline, setThumbHeadline] = useState("I CODED SAAS IN 24H 🤫");
  const [thumbLeftMetric, setThumbLeftMetric] = useState("OLD WAY");
  const [thumbLeftSub, setThumbLeftSub] = useState("0 NEW VISITORS");
  const [thumbRightMetric, setThumbRightMetric] = useState("AI PROMPT ⚡");
  const [thumbRightSub, setThumbRightSub] = useState("$12.4K RECURRING");
  const [thumbTheme, setThumbTheme] = useState<"magenta" | "emerald" | "cyan" | "gold">("emerald");
  const [thumbLayout, setThumbLayout] = useState<"thirds" | "split">("thirds");
  const [thumbFace, setThumbFace] = useState<"shocked" | "distressed" | "confident">("confident");

  // Dynamic Dashboard SEO Optimizer states
  const [seoTitleInput, setSeoTitleInput] = useState("10x your client acquisition using AI-driven hooks");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoHashtags, setSeoHashtags] = useState<string[]>([]);
  const [seoKeywords, setSeoKeywords] = useState<string[]>([]);
  const [isDescCopied, setIsDescCopied] = useState(false);
  const [copiedGenId, setCopiedGenId] = useState<number | null>(null);
  const { addToast } = useToast();

  const showToast = (msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    addToast(msg, type);
  };

  const handleCopyGenContent = (e: React.MouseEvent, gen: GenerationItem) => {
    e.stopPropagation();
    if (!gen.content) {
      showToast("No content available to copy! ⚠️", "warning");
      return;
    }
    navigator.clipboard.writeText(gen.content);
    setCopiedGenId(gen.id);
    playAudioCue(600);
    showToast("Blueprint content copied to clipboard! 📋");
    setTimeout(() => {
      setCopiedGenId(null);
    }, 2000);
  };

  // Compute SEO outputs in real-time based on title input
  const regenerateSeo = (currentTitle: string) => {
    const formatted = currentTitle.trim();
    const descriptionGlow = `🚀 SYSTEM DISCOVERY: Break down of "${formatted || "Strategic Frameworks"}" optimized for extreme YouTube or Tiktok retention.

We've cracked the CTR ceiling. In this video, we dissect the absolute core execution loop of creator architectures, illustrating exactly how to capture prime impressions without bleed-off. 

🎯 KEY BLOCK TIMECODES:
0:00 - Cognitive Pattern Interruption
0:15 - Deep System Integration Analysis
0:45 - Live Scaling Experiments Showcase
1:12 - Direct Implementation Procedures

Comment 'BLUEPRINT' down below and our server automated suite will send the source files instantly! #growthsecrets #ctrscience #algorithmicgain`;

    setSeoDescription(descriptionGlow);

    const tags = ["#creators", "#growthhacks", "#viralalgorithm", "#saas"];
    if (formatted.toLowerCase().includes("ai") || formatted.toLowerCase().includes("hook") || formatted.toLowerCase().includes("generator")) {
      tags.push("#artificialintelligence", "#promptengineering");
    }
    if (formatted.toLowerCase().includes("money") || formatted.toLowerCase().includes("client") || formatted.toLowerCase().includes("$")) {
      tags.push("#businessscaling", "#solopreneur");
    }
    setSeoHashtags(tags);
    setSeoKeywords([
      "algorithmic CTR acceleration",
      "retention blueprint modeling",
      "cognitive bias optimization",
      "digital brand expansion",
      "high-performance script crafting"
    ]);
  };

  useEffect(() => {
    regenerateSeo(seoTitleInput);
  }, [seoTitleInput]);

  // --- ELITE REVENUE FORECASTER STATES ---
  const [estViews, setEstViews] = useState<number>(350000);
  const [estCtr, setEstCtr] = useState<number>(8.5);
  const [rpmRate, setRpmRate] = useState<number>(4.50);
  const [productConversion, setProductConversion] = useState<number>(1.5);
  const [productPrice, setProductPrice] = useState<number>(39);
  const [sponsorEnabled, setSponsorEnabled] = useState<boolean>(true);

  // --- ELITE SCHEDULER STATES ---
  interface ScheduledPost {
    id: string;
    day: string; // "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"
    title: string;
    platform: 'youtube' | 'instagram' | 'tiktok';
    time: string;
    status: 'Draft' | 'Scheduled' | 'Published';
  }

  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([
    { id: 'sc-1', day: 'Mon', title: 'Why 99% of developers FAIL under launch 🤦‍♂️', platform: 'youtube', time: '12:00', status: 'Scheduled' },
    { id: 'sc-2', day: 'Wed', title: '10-line microscopic prompt-engineered workflows ⚡', platform: 'tiktok', time: '17:30', status: 'Draft' },
    { id: 'sc-3', day: 'Fri', title: 'Stop spending 6 months coding a SaaS that nobody wants! 🤫', platform: 'instagram', time: '10:15', status: 'Published' }
  ]);

  const [newSchDay, setNewSchDay] = useState<string>('Mon');
  const [newSchTitle, setNewSchTitle] = useState<string>('');
  const [newSchPlatform, setNewSchPlatform] = useState<'youtube' | 'instagram' | 'tiktok'>('youtube');
  const [newSchTime, setNewSchTime] = useState<string>('12:00');
  const [isAddingPost, setIsAddingPost] = useState<boolean>(false);

  const handleAddPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchTitle.trim()) return;

    const newPost: ScheduledPost = {
      id: `sc-${Date.now()}`,
      day: newSchDay,
      title: newSchTitle,
      platform: newSchPlatform,
      time: newSchTime,
      status: 'Scheduled'
    };

    setScheduledPosts(prev => [...prev, newPost]);
    setNewSchTitle('');
    setIsAddingPost(false);
    playAudioCue(880);
    showToast(`Video scheduled for ${newSchDay} at ${newSchTime}!`);
  };

  const handleRemovePost = (id: string) => {
    setScheduledPosts(prev => prev.filter(post => post.id !== id));
    playAudioCue(330);
  };

  const handleTogglePostStatus = (id: string) => {
    setScheduledPosts(prev => prev.map(post => {
      if (post.id === id) {
        const nextStatus: 'Draft' | 'Scheduled' | 'Published' = 
          post.status === 'Draft' ? 'Scheduled' : 
          post.status === 'Scheduled' ? 'Published' : 'Draft';
        return { ...post, status: nextStatus };
      }
      return post;
    }));
    playAudioCue(523);
  };

  // Calculations
  const calculatedAdRev = (estViews / 1000) * rpmRate;
  const calculatedClicks = estViews * (estCtr / 100);
  const calculatedSales = Math.floor(calculatedClicks * (productConversion / 100));
  const calculatedProductRev = calculatedSales * productPrice;
  const calculatedSponsorRev = sponsorEnabled ? (estViews >= 1000000 ? 7500 : estViews >= 500000 ? 4000 : estViews >= 100000 ? 1500 : 400) : 0;
  const totalCompoundMonthlyProjected = calculatedAdRev + calculatedProductRev + calculatedSponsorRev;

  // Media Blueprint package exporter files
  const downloadBlueprintPackage = () => {
    const lines = [
      "=================================================================",
      "               AXE HOURS ELITE CREATOR BLUEPRINT PACK            ",
      "=================================================================",
      `Generated on: ${new Date().toLocaleDateString()}`,
      `Aesthetic Style: Cinematic Cyber Console`,
      `Target Analytics Objective: High-CTR Retention Optimization`,
      "",
      "--- TITLE ANALYSIS PARAMETERS ---",
      `Active Title Hook: "${seoTitleInput}"`,
      `Target SEO Keywords:`,
      seoKeywords.map(k => ` - ${k}`).join("\n"),
      `Recommended Hashtags: ${seoHashtags.join(", ")}`,
      "",
      "--- SEO OPTIMIZATION PACKAGE DESCRIPTION ---",
      seoDescription,
      "",
      "--- THUMBNAIL SPECS DESIGN MATRIX ---",
      `Main Headline Copy: "${thumbHeadline}"`,
      `Left Contrast Column: [${thumbLeftMetric}] ${thumbLeftSub}`,
      `Right Payout Column: [${thumbRightMetric}] ${thumbRightSub}`,
      `Aesthetic Theme Accent: ${thumbTheme.toUpperCase()}`,
      `Structural Grid Layout: ${thumbLayout.toUpperCase()}`,
      `Emotional Presenter Facial Portrait Accent: ${thumbFace.toUpperCase()}`,
      "",
      "--- FINANCIAL PROJECTION COMPOUND MODEL ---",
      `Projected Views / Month: ${estViews.toLocaleString()}`,
      `Estimated Video Ad RPM Rate: $${rpmRate.toFixed(2)} / 1K views`,
      `Compound Projected Ad Payout: $${calculatedAdRev.toFixed(2)}`,
      `Creative Digital Sales Volume ($${productPrice} Price @ ${productConversion}% Conversion from CTR): ${calculatedSales} units`,
      `Projected Product Sales Revenue: $${calculatedProductRev.toFixed(1)}`,
      `Premium Strategic Sponsorship Deals Tier: $${calculatedSponsorRev.toFixed(0)}`,
      `-----------------------------------------------------------------`,
      `TOTAL MONTHLY EST. BLUEPRINT VALUATION: $${totalCompoundMonthlyProjected.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
      "================================================================="
    ].join("\n");

    const element = document.createElement("a");
    const file = new Blob([lines], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "axe-hours-creator-blueprint.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    playAudioCue(987.77);
    showToast("Creator Package downloaded! Upload this directly to your editor draft.");
  };

  return (
    <div id="dashboard-view-container" className="space-y-8 animate-in fade-in duration-500 relative z-10 w-full max-w-7xl mx-auto">
      <div id="dashboard-header-block">
        <h1 id="dashboard-title" className="text-3xl font-extrabold text-white tracking-tight">Dashboard Overview</h1>
        <p id="dashboard-subtitle" className="text-on-surface-variant flex items-center gap-1.5 mt-1 text-sm font-light">
          <Zap className="text-primary fill-current" size={14} />
          Statistical compounding charts mapping active AI projections.
        </p>
      </div>

      <div id="dashboard-stats-grid" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <GlassCard 
            key={i} 
            id={`dashboard-stat-${i}`} 
            glowColor={stat.glow}
            className="flex items-center gap-4 transition-all"
          >
            <div className="p-4 rounded-xl flex items-center justify-center relative group-hover:scale-105 transition-transform" style={{ backgroundColor: stat.bg }}>
              <stat.icon size={26} className={stat.color} />
              {/* Pulse effect */}
              <div className="absolute inset-x-0 h-full w-full rounded-xl bg-current opacity-5 animate-ping pointer-events-none" />
            </div>
            <div>
              <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">{stat.label}</p>
              <h3 className="text-3xl font-black text-white mt-1.5 tracking-tight">{stat.value}</h3>
            </div>
          </GlassCard>
        ))}
      </div>

      <div id="dashboard-panels-grid" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GlassCard id="panel-viral-trend" className="border-white/5 h-full flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Viral Expansion Trend</h2>
              <div className="relative w-full h-[200px] min-h-[200px] bg-black/30 rounded-xl border border-white/5 p-2 overflow-hidden mt-4">
                <svg viewBox="0 0 500 180" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#9d50bb" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#9d50bb" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d={areaPath} fill="url(#chartGradient)" />
                  <path d={linePath} fill="none" stroke="#9d50bb" strokeWidth="3.5" />
                  {chartPoints.map((pt, index) => (
                    <circle key={index} cx={pt.x} cy={pt.y} r="5" fill="#fff" stroke="#9d50bb" strokeWidth="2" />
                  ))}
                </svg>
              </div>
            </div>
          </GlassCard>
        </div>

        <GlassCard id="panel-quality-projections" className="border-white/5 flex flex-col justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Quality Projections</h2>
          <div className="grid grid-cols-2 gap-4 flex-1 items-center">
            <div className="flex flex-col items-center">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle cx="50" cy="50" r={radius} fill="none" stroke="#9d50bb" strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={seoOffset} />
              </svg>
              <span className="text-xs text-gray-300 mt-2">SEO Strength</span>
            </div>
            <div className="flex flex-col items-center">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle cx="50" cy="50" r={radius} fill="none" stroke="#6e48aa" strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={retentionOffset} />
              </svg>
              <span className="text-xs text-gray-300 mt-2">Retention Chance</span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* --- ELITE MONETIZATION & PUBLISHING PIPELINE SECTION --- */}
      <div id="elite-creator-intelligence-row" className="grid grid-cols-1 xl:grid-cols-12 gap-8 select-text">
        
        {/* ELITE REVENUE FORECASTER PANEL */}
        <div className="xl:col-span-6">
          <GlassCard id="dashboard-revenue-projector" glowColor="emerald" className="border-emerald-500/10 h-full flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-start border-b border-white/5 pb-3">
                <div>
                  <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                    <DollarSign className="text-emerald-400" size={20} /> Profit & CPM Forecaster
                  </h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">Project organic monetization metrics of your creative blueprints</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[9px] uppercase tracking-wider font-extrabold">
                  Sales Mode Active
                </span>
              </div>

              {/* Sliders Container */}
              <div className="space-y-4.5">
                {/* 1. Monthly Views Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-400">Target Monthly Views</span>
                    <span className="text-emerald-400 font-mono font-bold">{(estViews / 1000).toFixed(0)}K views</span>
                  </div>
                  <input 
                    type="range"
                    min="10000"
                    max="2000000"
                    step="10000"
                    value={estViews}
                    onChange={(e) => {
                      setEstViews(Number(e.target.value));
                      if (Number(e.target.value) % 50000 === 0) playAudioCue(440);
                    }}
                    className="w-full accent-emerald-500 h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* 2. CTR Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-400">Projected Video CTR</span>
                    <span className="text-emerald-400 font-mono font-bold">{estCtr.toFixed(1)}% click-thru</span>
                  </div>
                  <input 
                    type="range"
                    min="2"
                    max="25"
                    step="0.5"
                    value={estCtr}
                    onChange={(e) => {
                      setEstCtr(Number(e.target.value));
                      if (Number(e.target.value) % 2 === 0) playAudioCue(523);
                    }}
                    className="w-full accent-emerald-400 h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* 3. Product Offer conversion rate Slider */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      <span>CTR to Sales Conv.</span>
                      <span className="text-emerald-400 font-mono font-black">{productConversion.toFixed(1)}%</span>
                    </div>
                    <input 
                      type="range"
                      min="0.2"
                      max="5.0"
                      step="0.1"
                      value={productConversion}
                      onChange={(e) => setProductConversion(Number(e.target.value))}
                      className="w-full accent-emerald-500 h-1 bg-white/5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      <span>Digital Product Price</span>
                      <span className="text-emerald-400 font-mono font-black">${productPrice}</span>
                    </div>
                    <input 
                      type="range"
                      min="9"
                      max="149"
                      step="5"
                      value={productPrice}
                      onChange={(e) => setProductPrice(Number(e.target.value))}
                      className="w-full accent-emerald-500 h-1 bg-white/5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* 4. RPM Rates and Sponsorship Switcher */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="sponsor-checkbox"
                      checked={sponsorEnabled}
                      onChange={(e) => {
                        setSponsorEnabled(e.target.checked);
                        playAudioCue(659);
                      }}
                      className="w-4.5 h-4.5 rounded border-white/10 bg-black/40 text-emerald-500 focus:ring-transparent accent-emerald-500 cursor-pointer"
                    />
                    <label htmlFor="sponsor-checkbox" className="text-xs font-semibold text-gray-300 cursor-pointer select-none flex items-center gap-1">
                      Include Sponsorship Deals
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Est. RPM:</span>
                    <select
                      value={rpmRate}
                      onChange={(e) => setRpmRate(Number(e.target.value))}
                      className="bg-black/60 border border-white/10 rounded-lg py-1 px-2 text-white font-mono text-[11px] outline-none cursor-pointer"
                    >
                      <option value="1.50">Low Tier ($1.50)</option>
                      <option value="4.50">Mid Tier ($4.50)</option>
                      <option value="8.00">High Tech ($8.00)</option>
                      <option value="15.00">Finance ($15.00)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Calculations Output blocks */}
            <div className="bg-black/40 border border-white/5 p-4 rounded-2xl space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2.5 bg-white/3 border border-white/5 rounded-xl">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Ad Monetization</p>
                  <p className="text-sm font-black text-white mt-1 font-mono">${calculatedAdRev.toFixed(0)}</p>
                </div>
                <div className="p-2.5 bg-white/3 border border-white/5 rounded-xl">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Product Sales</p>
                  <p className="text-sm font-black text-white mt-1 font-mono">${calculatedProductRev.toLocaleString()}</p>
                </div>
                <div className="p-2.5 bg-white/3 border border-white/5 rounded-xl">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Sponsorships</p>
                  <p className="text-sm font-black text-white mt-1 font-mono">${calculatedSponsorRev}</p>
                </div>
              </div>

              {/* Total payout compound */}
              <div className="flex justify-between items-center pt-2 border-t border-white/5">
                <div>
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">TOTAL MONTHLY REVENUE EXPANSION</p>
                  <p className="text-2xl font-black text-white tracking-tight mt-0.5 font-mono">
                    ${totalCompoundMonthlyProjected.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    <span className="text-xs text-gray-400 font-normal"> / mo</span>
                  </p>
                </div>
                <button
                  onClick={downloadBlueprintPackage}
                  className="px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
                  title="Export this state configuration file to disk"
                >
                  <Download size={13} />
                  <span>Export Pack</span>
                </button>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* STATEFUL CONTENT PUBLISHING PLANNER GRID */}
        <div className="xl:col-span-6">
          <GlassCard id="dashboard-publishing-scheduler" glowColor="purple" className="border-purple-500/10 h-full flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <Calendar className="text-purple-400" size={20} /> Creator Publishing Planner
                  </h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">Map generated concepts on active weekday calendars</p>
                </div>
                <button
                  onClick={() => {
                    setIsAddingPost(prev => !prev);
                    playAudioCue(587);
                  }}
                  className="px-2.5 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus size={14} /> Add Slot
                </button>
              </div>

              {/* Custom Add Form Module inline */}
              {isAddingPost && (
                <form onSubmit={handleAddPost} className="p-4 bg-purple-950/20 border border-purple-500/20 rounded-xl space-y-3.5 animate-in slide-in-from-top-4 duration-300">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-gray-400 font-bold font-mono">Video Concept Title</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Stop coding standard SaaS workflows! 🚨" 
                      value={newSchTitle}
                      onChange={(e) => setNewSchTitle(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 p-2 text-xs rounded-lg text-white outline-none focus:border-purple-400"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] uppercase text-gray-400 font-bold font-mono block mb-1">Weekday</label>
                      <select
                        value={newSchDay}
                        onChange={(e) => setNewSchDay(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 p-1.5 text-xs rounded-lg text-white cursor-pointer"
                      >
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase text-gray-400 font-bold font-mono block mb-1">Distribution</label>
                      <select
                        value={newSchPlatform}
                        onChange={(e) => setNewSchPlatform(e.target.value as any)}
                        className="w-full bg-black/60 border border-white/10 p-1.5 text-xs rounded-lg text-white cursor-pointer"
                      >
                        <option value="youtube">YouTube</option>
                        <option value="instagram">Instagram</option>
                        <option value="tiktok">TikTok</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase text-gray-400 font-bold font-mono block mb-1">Peak Time</label>
                      <input 
                        type="text" 
                        placeholder="12:00"
                        value={newSchTime}
                        onChange={(e) => setNewSchTime(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 p-1.5 text-xs rounded-lg text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1 border-t border-white/5">
                    <button 
                      type="button" 
                      onClick={() => setIsAddingPost(false)}
                      className="px-3 py-1.5 text-[11px] text-gray-400 hover:text-white uppercase font-bold"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[11px] uppercase font-bold"
                    >
                      Schedule Slot
                    </button>
                  </div>
                </form>
              )}

              {/* Scheduled Posts render stack */}
              <div className="space-y-2.5 max-h-[195px] overflow-y-auto custom-scrollbar pr-1">
                {scheduledPosts.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-6 font-mono italic">No publications mapped. Click "Add Slot" to structure.</p>
                ) : (
                  scheduledPosts.map(post => (
                    <div 
                      key={post.id}
                      className="p-3 bg-black/40 border border-white/5 hover:border-purple-500/20 rounded-xl flex justify-between items-center gap-3 transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Day Identifier badge */}
                        <span className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 flex items-center justify-center font-bold font-mono text-xs shrink-0 select-none">
                          {post.day}
                        </span>
                        
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{post.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-gray-400 font-mono capitalize">@{post.platform}</span>
                            <span className="text-[10px] text-gray-500 font-mono">• Peak {post.time}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status controllers and action buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleTogglePostStatus(post.id)}
                          className={`px-2 py-0.5 border rounded-md text-[9px] font-mono font-bold uppercase transition-all tracking-wider ${
                            post.status === 'Published' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            post.status === 'Scheduled' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                          title="Click to cycle publishing statuses"
                        >
                          {post.status}
                        </button>

                        <button
                          onClick={() => handleRemovePost(post.id)}
                          className="p-1.5 rounded-md hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Delete plan"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Calendar Synchronization Panel */}
            <div className="p-3 bg-white/3 border border-white/5 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase text-gray-400 font-bold font-mono">Calendar Connection Hub</span>
                <div className="flex gap-1.5">
                  {googleAccessToken ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Google Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/20">
                      ● Google Offline
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Google Calendar Direct Sync button */}
                <button
                  onClick={syncToGoogleCalendar}
                  disabled={isSyncingGoogle}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/30 text-purple-300 text-xs font-semibold rounded-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSyncingGoogle ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <Calendar size={13} className="text-purple-400" />
                  )}
                  <span>Sync Google Calendar</span>
                </button>

                {/* Microsoft Outlook .ics Export button */}
                <button
                  onClick={exportOutlookICS}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/30 text-indigo-300 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                >
                  <Download size={13} className="text-indigo-400" />
                  <span>Export Outlook / ICS</span>
                </button>
              </div>
            </div>

            {/* Quick action info */}
            <div className="flex items-center gap-2 p-3 bg-purple-950/10 border border-purple-500/5 rounded-xl text-[10.5px] text-purple-300 font-mono select-none">
              <Zap size={12} className="shrink-0 text-purple-400 animate-pulse" />
              <span>Status change updates your local channel queues dynamically.</span>
            </div>
          </GlassCard>
        </div>

      </div>

      {/* DASHBOARD LIVE STUDIO INTERACTIVE COMPOSER WORKSPACE */}
      <div id="dashboard-interactive-workspace" className="space-y-6">
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="text-yellow-400 animate-pulse" size={18} />
            <h2 className="text-lg font-bold text-white tracking-tight">Interactive Studio Composer Workspace</h2>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400 font-mono">
            New Workspace Tools Ready!
          </span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* Interactive Thumbnail Visualizer Grid Box */}
          <div className="xl:col-span-7 space-y-4">
            <GlassCard id="dash-thumb-visualizer-card" className="border-white/5 space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <span className="text-xs font-extrabold uppercase tracking-widest text-amber-500 flex items-center gap-2">
                  <Image size={16} className="text-amber-500" /> Dynamic Thumbnail Prototype
                </span>
                <span className="text-[10px] text-gray-400 font-mono">16:9 Aspect Real-time preview</span>
              </div>

              {/* Real Live Canvas preview box */}
              <div 
                id="dash-canvas-composition-canvas" 
                className={`relative w-full h-[220px] rounded-xl overflow-hidden flex flex-col justify-between p-4 transition-all duration-300 ${
                  thumbTheme === "magenta" ? "bg-gradient-to-br from-[#0c051a] via-[#1c082e] to-[#0c0c0e]" :
                  thumbTheme === "emerald" ? "bg-gradient-to-br from-[#02130e] via-[#042116] to-[#0c0c0e]" :
                  thumbTheme === "cyan" ? "bg-gradient-to-br from-[#021017] via-[#051f2e] to-[#0c0c0e]" :
                  "bg-gradient-to-br from-[#120e03] via-[#241a05] to-[#0c0c0e]"
                }`}
              >
                {/* Glow Spheres */}
                <div className={`absolute -top-10 -right-10 w-36 h-36 rounded-full blur-[70px] pointer-events-none transition-all ${
                  thumbTheme === "magenta" ? "bg-[#d946ef]/50" :
                  thumbTheme === "emerald" ? "bg-[#10b981]/50" :
                  thumbTheme === "cyan" ? "bg-[#06b6d4]/50" :
                  "bg-[#f59e0b]/50"
                }`} />

                {/* Grid Helper Grid layout lines */}
                {thumbLayout === "thirds" && (
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none border border-white/5 divide-x divide-y divide-white/5 opacity-50">
                    <div/><div/><div/>
                    <div/><div/><div/>
                    <div/><div/><div/>
                  </div>
                )}

                <div className="flex justify-between items-center z-10">
                  <span className="px-1.5 py-0.5 rounded bg-black/70 border border-white/10 text-[8px] text-gray-400 font-mono font-bold">
                    {thumbLayout.toUpperCase()} LAYOUT
                  </span>
                  <span className={`text-[10px] font-extrabold tracking-widest font-mono ${
                    thumbTheme === "magenta" ? "text-fuchsia-400" :
                    thumbTheme === "emerald" ? "text-green-400" :
                    thumbTheme === "cyan" ? "text-cyan-400" :
                    "text-amber-400"
                  }`}>
                    VIRAL RATING AA+
                  </span>
                </div>

                <div className="text-center z-12 my-auto">
                  <h3 className="text-xl md:text-2xl font-black text-white tracking-tighter uppercase drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)] hover:scale-102 transition-transform select-none">
                    {thumbHeadline || "BOOST CTR BY 400%?!"}
                  </h3>
                  <div className="w-12 h-1 mx-auto bg-gradient-to-r from-purple-500 to-pink-500 mt-1 rounded-full" />
                </div>

                <div className="flex justify-between items-end w-full z-10 gap-2">
                  
                  {/* Left Negative Pane */}
                  <div className="w-[49%] bg-red-950/40 border border-red-500/30 rounded-xl p-2 select-none flex items-center gap-1.5">
                    <span className="text-lg">
                      {thumbFace === "shocked" ? "😲" : thumbFace === "distressed" ? "🤦‍♂️" : "⚡"}
                    </span>
                    <div className="truncate text-left leading-none">
                      <span className="text-[10px] font-extrabold text-red-500 uppercase block">{thumbLeftMetric || "STAGNANT"}</span>
                      <span className="text-[8px] font-mono text-gray-400 font-bold block mt-0.5">{thumbLeftSub || "0 NEW CLICKS"}</span>
                    </div>
                  </div>

                  {/* Right Theme-colored Positive Pane */}
                  <div className={`w-[49%] bg-black/60 border rounded-xl p-2 select-none flex items-center justify-between ${
                    thumbTheme === "magenta" ? "border-fuchsia-500/40" :
                    thumbTheme === "emerald" ? "border-emerald-500/40" :
                    thumbTheme === "cyan" ? "border-cyan-500/40" :
                    "border-amber-500/40"
                  }`}>
                    <div className="truncate text-left leading-none">
                      <span className={`text-[10px] font-extrabold uppercase block ${
                        thumbTheme === "magenta" ? "text-fuchsia-400" :
                        thumbTheme === "emerald" ? "text-green-400" :
                        thumbTheme === "cyan" ? "text-cyan-400" :
                        "text-amber-400"
                      }`}>{thumbRightMetric || "OPTIMIZED!"}</span>
                      <span className="text-[8px] font-mono text-gray-400 font-bold block mt-0.5">{thumbRightSub || "+412K VIEWERS"}</span>
                    </div>
                    <span className="text-xs">🔥</span>
                  </div>

                </div>
              </div>

              {/* Control Adjusters */}
              <div id="thumbnail-niche-pill-strip" className="col-span-full border border-purple-500/10 bg-[#581c87]/5 p-2 rounded-xl mb-1 flex flex-col gap-1.5">
                <span className="text-[9px] uppercase text-purple-300 font-extrabold font-mono tracking-wider">⚡ Quick preset themes:</span>
                <div className="flex gap-1 overflow-x-auto scrollbar-none py-0.5">
                  {[
                    { label: "Tech 💻", head: "I CODED SAAS IN 24H 🤫", lMet: "OLD WAY", lSub: "0 NEW VISITORS", rMet: "AI PROMPT ⚡", rSub: "$12.4K RECURRING", color: "magenta" },
                    { label: "Food 🍳", head: "RUINED MY PASTA?! 🤦‍♂️", lMet: "BOILED", lSub: "SOGGY & LAND", rMet: "MICHELIN STAR", rSub: "GLOSSY EMULSION", color: "gold" },
                    { label: "Fitness ⚡", head: "STOP COFFEE FIRST! 🚨", lMet: "IMMEDIATE", lSub: "AFTERNOON CRASH", rMet: "DELAY 90 MINS", rSub: "LIMITLESS STAMINA", color: "emerald" },
                    { label: "Wealth 💰", head: "SAVINGS ACCOUNTS=SCAM?! 🤫", lMet: "BANK ACCOUNT", lSub: "0.01% PENNY GAINS", rMet: "ROYALTY STREAM", rSub: "12% AUTOPILOT", color: "gold" },
                    { label: "Travel ✈️", head: "PACK 3 MONTHS IN ONE BAG?! ✈️", lMet: "SUITCASE", lSub: "WAIT CAROUSEL", rMet: "20L BACKPACK", rSub: "BYPASS ALL FEES", color: "cyan" },
                    { label: "Gaming 🎮", head: "THE UNBEATABLE POSITION?! 💀", lMet: "SILVER TIER", lSub: "LOST COVER", rMet: "GLITCH POSITION", rSub: "SECURED SOLO WIN", color: "cyan" }
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setThumbHeadline(preset.head);
                        setThumbLeftMetric(preset.lMet);
                        setThumbLeftSub(preset.lSub);
                        setThumbRightMetric(preset.rMet);
                        setThumbRightSub(preset.rSub);
                        setThumbTheme(preset.color as any);
                        showToast(`Applied ${preset.label} thumbnail composition! 🎨`, "success");
                        playAudioCue(523 + idx * 80);
                      }}
                      className="px-2.5 py-1 text-[10px] font-black uppercase text-gray-300 hover:text-white bg-white/5 rounded-lg border border-white/5 hover:border-purple-500/40 cursor-pointer whitespace-nowrap transition-all"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Control Adjusters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
                
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold">Backdrop Ambient Theme</label>
                  <select
                    value={thumbTheme}
                    onChange={(e) => {
                      setThumbTheme(e.target.value as any);
                      playAudioCue(440);
                    }}
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-2 text-white text-xs cursor-pointer focus:outline-none"
                  >
                    <option value="magenta">Neon Purple/Magenta</option>
                    <option value="emerald">Cyber Green/Mint</option>
                    <option value="cyan">Deep Slate/Aqua Glow</option>
                    <option value="gold">Solar Flame/Bright Gold</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold">Headline Overlap Text</label>
                  <input
                    type="text"
                    value={thumbHeadline}
                    onChange={(e) => setThumbHeadline(e.target.value)}
                    placeholder="BOOST CTR BY 400%?!"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold">Left Pane Title & Sub</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={thumbLeftMetric}
                      onChange={(e) => setThumbLeftMetric(e.target.value)}
                      placeholder="STAGNANT"
                      className="w-1/2 bg-black/40 border border-white/10 rounded-xl p-2 text-white text-xs focus:outline-none"
                    />
                    <input
                      type="text"
                      value={thumbLeftSub}
                      onChange={(e) => setThumbLeftSub(e.target.value)}
                      placeholder="0 NEW CLICKS"
                      className="w-1/2 bg-black/40 border border-white/10 rounded-xl p-2 text-white text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold">Right Pane Title & Sub</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={thumbRightMetric}
                      onChange={(e) => setThumbRightMetric(e.target.value)}
                      placeholder="OPTIMIZED!"
                      className="w-1/2 bg-black/40 border border-white/10 rounded-xl p-2 text-white text-xs focus:outline-none"
                    />
                    <input
                      type="text"
                      value={thumbRightSub}
                      onChange={(e) => setThumbRightSub(e.target.value)}
                      placeholder="+412K VIEWERS"
                      className="w-1/2 bg-black/40 border border-white/10 rounded-xl p-2 text-white text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold">Emotional Face Accent</label>
                  <select
                    value={thumbFace}
                    onChange={(e) => setThumbFace(e.target.value as any)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-2 text-white text-xs cursor-pointer focus:outline-none"
                  >
                    <option value="shocked">Surprised Emoji (😲 Shock)</option>
                    <option value="distressed">Frustrated (🤦‍♂️ Pain)</option>
                    <option value="confident">Laser Core (⚡ Speed)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold">Composition Frame Guidelines</label>
                  <select
                    value={thumbLayout}
                    onChange={(e) => setThumbLayout(e.target.value as any)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-2 text-white text-xs cursor-pointer focus:outline-none"
                  >
                    <option value="thirds">Rule of Thirds Overlay Grid</option>
                    <option value="split">Clean Borderless Presentation</option>
                  </select>
                </div>

              </div>

              <div className="pt-5 border-t border-white/5">
                <button
                  onClick={() => {
                    const dataSpec = generateThumbnailSpecs(
                      thumbTheme,
                      thumbLayout,
                      thumbFace,
                      thumbHeadline,
                      thumbLeftMetric,
                      thumbLeftSub,
                      thumbRightMetric,
                      thumbRightSub
                    );
                    navigator.clipboard.writeText(dataSpec);
                    playAudioCue(880);
                    showToast("Elite high-CTR prompt pack and layout specifications successfully compiled and copied! Paste them in Midjourney or send to your designer.");
                  }}
                  className="w-full py-3.5 bg-amber-500/10 hover:bg-amber-500/25 text-amber-400 hover:text-amber-300 border border-amber-500/20 hover:border-amber-500/40 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sliders size={14} className="animate-pulse" /> Export Dynamic Layout Spec Sheet
                </button>
              </div>

            </GlassCard>
          </div>

          {/* Quick Real-time Title SEO & Copy Package Block */}
          <div className="xl:col-span-5 space-y-4">
            <GlassCard id="dash-seo-optimizer-block" className="border-white/5 space-y-4 flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Target size={15} /> SEO Copy package optimizer
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-[9px] text-emerald-400 font-bold uppercase">
                    Reactive AI
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-400 uppercase font-bold block">Test Draft Video Title</label>
                  <input
                    type="text"
                    value={seoTitleInput}
                    onChange={(e) => setSeoTitleInput(e.target.value)}
                    placeholder="Enter tentative video or post draft title"
                    className="w-full bg-black/40 border border-white/5 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/40 font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-gray-400 uppercase font-bold block">Optimized Description Block</label>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(seoDescription);
                        setIsDescCopied(true);
                        playAudioCue(600);
                        setTimeout(() => setIsDescCopied(false), 2000);
                      }}
                      className="text-gray-400 hover:text-white font-extrabold text-[9px] uppercase tracking-wider hover:underline"
                    >
                      {isDescCopied ? "Copied!" : "Quick Copy"}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    rows={4}
                    value={seoDescription}
                    className="w-full bg-black/60 border border-white/5 rounded-xl p-3 text-[11px] text-gray-300 font-mono resize-none focus:outline-none leading-relaxed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-400 uppercase font-bold block font-sans">Viral Hashtags (Click to copy)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {seoHashtags.map((tag, idx) => (
                      <span
                        key={idx}
                        onClick={() => {
                          navigator.clipboard.writeText(tag);
                          playAudioCue(650);
                        }}
                        className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-md text-[10px] font-mono cursor-pointer transition-colors"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-400 uppercase font-bold block font-sans">Core Algorithmic Target Keywords</label>
                  <div className="flex flex-wrap gap-1.5">
                    {seoKeywords.map((kw, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-white/5 text-gray-400 rounded-md text-[10px] font-mono border border-white/5"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>

              </div>
            </GlassCard>
          </div>

        </div>
      </div>

      {recentGenerations.length > 0 && (
        <div id="dashboard-recent-generations-table" className="space-y-4">
          <div className="flex md:flex-row flex-col md:items-center justify-between gap-3 pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">Recent Blueprints</h2>
              {dashboardSearchQuery.trim() && (
                <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-[#a855f7] rounded-full text-[9px] font-mono animate-pulse uppercase tracking-wider font-extrabold">
                  Filtered Results
                </span>
              )}
            </div>
            
            {/* Realtime Search Bar input */}
            <div className="flex items-center gap-3 w-full md:max-w-md justify-end">
              <div className="relative w-full max-w-xs">
                <input
                  type="text"
                  value={dashboardSearchQuery}
                  onChange={(e) => setDashboardSearchQuery(e.target.value)}
                  placeholder="Find topics, hooks or niches..."
                  className="w-full bg-black/40 border border-white/10 hover:border-white/15 focus:border-primary rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:outline-none transition-all"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                {dashboardSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setDashboardSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors text-xs font-mono"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button 
                id="dashboard-view-all-gens-btn"
                onClick={onViewAllGens}
                className="text-primary text-xs hover:underline cursor-pointer shrink-0"
              >
                View all
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {displayGens.length === 0 ? (
              <GlassCard className="border-white/5 !p-8 text-center flex flex-col items-center justify-center space-y-2">
                <span className="text-2xl">📡</span>
                <h3 className="text-sm font-semibold text-white">No Matching Blueprints</h3>
                <p className="text-xs text-gray-500 font-light max-w-sm">No records in your repository match your search keywords "{dashboardSearchQuery}". Clear the query or try another word.</p>
                <button
                  type="button"
                  onClick={() => setDashboardSearchQuery("")}
                  className="mt-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-white rounded-lg cursor-pointer transition-all"
                >
                  Clear Search
                </button>
              </GlassCard>
            ) : (
              displayGens.map((gen) => (
                <div 
                  key={gen.id} 
                  id={`table-gen-item-${gen.id}`}
                  onClick={() => onSelectHistory(gen)}
                  className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary/40 hover:bg-white/10 hover:-translate-y-0.5 hover:shadow-[0_4px_25px_rgba(157,80,187,0.12)] transition-all duration-300 flex justify-between items-center cursor-pointer group relative overflow-hidden"
                >
                  <div className="min-w-0 pr-4">
                    <h3 className="text-sm font-semibold text-white group-hover:text-primary transition-colors truncate">{gen.title}</h3>
                    <span className="text-[10px] text-gray-500 font-mono mt-1 block">Compiled {gen.date}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleCopyGenContent(e, gen)}
                      title="Copy blueprint content to clipboard"
                      className={`p-1.5 md:p-2 rounded-lg border transition-all duration-200 flex items-center gap-1 cursor-pointer overflow-hidden relative z-20 ${
                        copiedGenId === gen.id 
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                          : "bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20"
                      }`}
                    >
                      {copiedGenId === gen.id ? (
                        <>
                          <Check size={13} className="animate-in zoom-in spin-in-12 duration-300" />
                          <span className="text-[10px] font-bold font-mono tracking-tight pr-0.5 animate-in fade-in slide-in-from-right-1 duration-200">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                          <span className="text-[10.5px] font-semibold font-mono tracking-tight pr-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300 hidden md:inline">Copy Blueprint</span>
                        </>
                      )}
                    </button>

                    <span className="text-xs text-primary font-bold opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 hidden sm:inline">
                      Open Architect &rarr;
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
