import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Maximize, 
  Minimize, 
  Type, 
  FlipHorizontal, 
  ArrowLeft, 
  Settings, 
  Video,
  Edit3,
  Clock,
  FileText,
  Eye,
  Check,
  X
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { playAudioCue } from '../utils/audio';

export interface TeleprompterViewProps {
  initialScript?: string;
  initialTitle?: string;
}

const FALLBACK_SCRIPT = "Paste or load a script to start scrolling...";

export const TeleprompterView: React.FC<TeleprompterViewProps> = ({
  initialScript,
  initialTitle
}) => {
  const { addToast } = useToast();

  // Safely check location state if available via router/history
  const getLocationStateScript = (): string | null => {
    try {
      if (typeof window !== 'undefined') {
        const historyState = window.history?.state;
        if (historyState?.usr?.script) return historyState.usr.script;
        if (historyState?.script) return historyState.script;
      }
    } catch {
      // ignore
    }
    return null;
  };

  // --- SCRIPT STATE WITH DEFENSIVE GUARDS ---
  const [scriptText, setScriptText] = useState<string>(() => {
    if (initialScript && initialScript.trim()) return initialScript.trim();
    const locScript = getLocationStateScript();
    if (locScript && locScript.trim()) return locScript.trim();
    const sessionScript = typeof window !== 'undefined' ? sessionStorage.getItem('pending_teleprompter_script') : null;
    if (sessionScript && sessionScript.trim()) return sessionScript.trim();
    const localScript = typeof window !== 'undefined' ? localStorage.getItem('axe_hours_teleprompter_script') : null;
    if (localScript && localScript.trim()) return localScript.trim();
    return FALLBACK_SCRIPT;
  });

  const [scriptTitle, setScriptTitle] = useState<string>(() => {
    if (initialTitle && initialTitle.trim()) return initialTitle.trim();
    const sessionTitle = typeof window !== 'undefined' ? sessionStorage.getItem('pending_teleprompter_title') : null;
    if (sessionTitle && sessionTitle.trim()) return sessionTitle.trim();
    return 'Studio Prompter Script';
  });

  // Safe non-empty script text for rendering
  const safeScriptText = (scriptText && scriptText.trim()) || FALLBACK_SCRIPT;

  // --- PROMPTER CONTROLS STATE ---
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [wpm, setWpm] = useState<number>(() => {
    const sessionWpm = typeof window !== 'undefined' ? sessionStorage.getItem('pending_teleprompter_wpm') : null;
    return sessionWpm ? Number(sessionWpm) || 135 : 135;
  });
  const [fontSize, setFontSize] = useState<number>(38); // 24px - 64px
  const [isMirrored, setIsMirrored] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showReadingGuide, setShowReadingGuide] = useState<boolean>(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [draftScriptText, setDraftScriptText] = useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isControlsVisible, setIsControlsVisible] = useState<boolean>(true);

  // --- REFS ---
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const containerWrapperRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const scrollAccumulatorRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- WORD COUNT & DURATION CALCULATION ---
  const wordCount = React.useMemo(() => {
    return safeScriptText.split(/\s+/).filter(Boolean).length;
  }, [safeScriptText]);

  const estimatedTotalDurationSec = React.useMemo(() => {
    if (wordCount === 0 || wpm === 0) return 0;
    return Math.round((wordCount / wpm) * 60);
  }, [wordCount, wpm]);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- CONSUME HANDED-OFF SCRIPT ON MOUNT & VIA EVENT ---
  useEffect(() => {
    const handleLoadEvent = (e: CustomEvent) => {
      if (e.detail?.script && typeof e.detail.script === 'string') {
        const nextScript = e.detail.script.trim() || FALLBACK_SCRIPT;
        setScriptText(nextScript);
        if (e.detail.title) setScriptTitle(e.detail.title);
        if (e.detail.wpm) setWpm(Number(e.detail.wpm) || 135);
        setIsPlaying(false);
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
          scrollAccumulatorRef.current = 0;
        }
        setElapsedSeconds(0);
      }
    };

    window.addEventListener('load-teleprompter-script', handleLoadEvent as EventListener);
    return () => {
      window.removeEventListener('load-teleprompter-script', handleLoadEvent as EventListener);
    };
  }, []);

  // --- AUTOSCROLL ENGINE (requestAnimationFrame) ---
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    lastTimeRef.current = performance.now();
    if (scrollContainerRef.current) {
      scrollAccumulatorRef.current = scrollContainerRef.current.scrollTop;
    }

    const scrollLoop = (now: number) => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      const totalWords = wordCount || 1;
      const targetDurationSec = (totalWords / wpm) * 60;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const scrollableDistance = scrollHeight - clientHeight;

      let speedPxPerSec = 40;
      if (scrollableDistance > 0 && targetDurationSec > 0) {
        speedPxPerSec = scrollableDistance / targetDurationSec;
      } else {
        speedPxPerSec = (wpm / 135) * 45;
      }

      scrollAccumulatorRef.current += speedPxPerSec * delta;
      container.scrollTop = Math.floor(scrollAccumulatorRef.current);

      // Finished reading to the end
      if (container.scrollTop >= scrollableDistance - 2) {
        setIsPlaying(false);
        playAudioCue(587.33); // D5 chime
        addToast('Teleprompter script completed! Great recording! 🎬', 'success');
        return;
      }

      animationFrameRef.current = requestAnimationFrame(scrollLoop);
    };

    animationFrameRef.current = requestAnimationFrame(scrollLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, wpm, wordCount, addToast]);

  // --- ELAPSED PLAY TIMER ---
  useEffect(() => {
    if (isPlaying) {
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isPlaying]);

  // --- TOGGLE PLAY / PAUSE ---
  const handleTogglePlay = useCallback(() => {
    setIsPlaying(prev => {
      const next = !prev;
      playAudioCue(next ? 880 : 440);
      return next;
    });
  }, []);

  // --- RESET TO TOP ---
  const handleResetToTop = useCallback(() => {
    setIsPlaying(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      scrollAccumulatorRef.current = 0;
    }
    setElapsedSeconds(0);
    playAudioCue(523.25);
    addToast('Prompter reset to top (0:00)', 'info');
  }, [addToast]);

  // --- TOGGLE MIRROR ---
  const handleToggleMirror = useCallback(() => {
    setIsMirrored(prev => {
      const next = !prev;
      playAudioCue(659.25);
      addToast(next ? 'Prompter glass mirror mode enabled (scaleX -1)' : 'Mirror mode disabled', 'info');
      return next;
    });
  }, [addToast]);

  // --- TOGGLE FULLSCREEN ---
  const handleToggleFullscreen = useCallback(() => {
    const elem = containerWrapperRef.current;
    if (!elem) return;

    if (!document.fullscreenElement) {
      elem.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {
        setIsFullscreen(true);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {
        setIsFullscreen(false);
      });
    }
  }, []);

  // Listen to native fullscreen changes (e.g. user pressing Escape)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs/modals
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        handleResetToTop();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        handleToggleMirror();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        handleToggleFullscreen();
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setWpm(prev => Math.min(240, prev + 5));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setWpm(prev => Math.max(80, prev - 5));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleTogglePlay, handleResetToTop, handleToggleMirror, handleToggleFullscreen]);

  // --- CONTROLS AUTOHIDE / DIMMING WHEN SCROLLING ---
  const handleMouseMove = () => {
    setIsControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setIsControlsVisible(false);
      }, 2500);
    }
  };

  useEffect(() => {
    if (!isPlaying) {
      setIsControlsVisible(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    } else {
      controlsTimeoutRef.current = setTimeout(() => {
        setIsControlsVisible(false);
      }, 2500);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  // --- APPLY EDITED SCRIPT ---
  const handleApplyEditedScript = () => {
    const trimmed = draftScriptText.trim();
    if (!trimmed) {
      addToast('Cannot save empty script.', 'warning');
      return;
    }
    setScriptText(trimmed);
    localStorage.setItem('axe_hours_teleprompter_script', trimmed);
    setIsEditModalOpen(false);
    handleResetToTop();
    addToast('Script updated and synced! 📝', 'success');
  };

  // --- OPEN EDIT MODAL ---
  const handleOpenEditModal = () => {
    setIsPlaying(false);
    setDraftScriptText(safeScriptText);
    setIsEditModalOpen(true);
  };

  return (
    <div 
      ref={containerWrapperRef}
      onMouseMove={handleMouseMove}
      className={`relative w-full bg-black text-white select-none flex flex-col font-sans transition-all duration-300 ${
        isFullscreen 
          ? 'fixed inset-0 z-50 h-screen overflow-hidden' 
          : 'rounded-2xl border border-white/10 h-[calc(100vh-140px)] min-h-[640px] shadow-2xl overflow-hidden'
      }`}
    >
      {/* --- TOP AMBIENT STATUS BAR (Hides or dims when scrolling) --- */}
      <div className={`p-4 md:px-8 border-b border-white/5 flex items-center justify-between z-30 bg-black/80 backdrop-blur-md transition-opacity duration-500 ${
        isPlaying && !isControlsVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}>
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('change-active-view', { detail: { view: 'script-fetcher' } }))}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
            title="Return to Script Fetcher"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <h1 className="text-xs md:text-sm font-black uppercase tracking-wider text-white truncate max-w-[200px] md:max-w-md">
              {scriptTitle}
            </h1>
          </div>
        </div>

        {/* Live HUD Readouts */}
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300">
            <FileText size={12} className="text-purple-400" />
            <span>{wordCount} words</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300">
            <Clock size={12} className={isPlaying ? "text-emerald-400 animate-spin-slow" : "text-gray-400"} />
            <span>{formatTime(elapsedSeconds)} / {formatTime(estimatedTotalDurationSec)}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-bold">
            <Settings size={12} />
            <span>{wpm} WPM</span>
          </div>

          {/* Edit Script Button */}
          <button
            type="button"
            onClick={handleOpenEditModal}
            className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
            title="Edit script text"
          >
            <Edit3 size={12} className="text-purple-400" />
            <span className="hidden md:inline">Edit Script</span>
          </button>

          {/* Fullscreen Toggle Button */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen (F)" : "Enter Fullscreen (F)"}
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </div>

      {/* --- MAIN READING VIEWPORT --- */}
      <div className="relative flex-1 w-full bg-black overflow-hidden flex flex-col justify-center">
        {/* Eye-Level Center Reading Guide Bar (fixed in center third of screen) */}
        {showReadingGuide && (
          <div 
            className="pointer-events-none absolute top-[38%] left-0 right-0 h-20 border-y border-emerald-400/25 bg-gradient-to-r from-emerald-500/5 via-emerald-500/10 to-emerald-500/5 z-20 flex items-center justify-between px-4 md:px-12 backdrop-blur-[1px]"
            title="Eye-Level Camera Reading Zone"
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-0.5 bg-emerald-400 rounded-full" />
              <span className="text-[10px] font-mono tracking-widest text-emerald-400/60 uppercase font-black">
                EYE LEVEL CAMERA ZONE
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-widest text-emerald-400/60 uppercase font-black">
                AXE PROMPTER
              </span>
              <span className="w-2.5 h-0.5 bg-emerald-400 rounded-full" />
            </div>
          </div>
        )}

        {/* Top Fade Gradient Mask */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black via-black/80 to-transparent z-10" />

        {/* Bottom Fade Gradient Mask */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-44 bg-gradient-to-t from-black via-black/90 to-transparent z-10" />

        {/* Scrollable Script Text Box */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 w-full h-full overflow-y-auto px-6 md:px-16 lg:px-24 select-text custom-scrollbar scroll-smooth relative"
          style={{
            scrollBehavior: 'auto'
          }}
        >
          {/* Top spacing pad to position the start of the script exactly at eye-level */}
          <div className="h-[38vh]" />

          {/* Script Text Body with High-Contrast Layout & Mirror Support */}
          <div 
            style={{ 
              fontSize: `${fontSize}px`,
              lineHeight: 1.65,
              transform: isMirrored ? 'scaleX(-1)' : 'none'
            }}
            className="max-w-4xl mx-auto font-sans font-semibold text-white tracking-normal text-left transition-transform duration-300 antialiased drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]"
          >
            {safeScriptText.split('\n\n').map((paragraph, pIdx) => (
              <p 
                key={pIdx} 
                className="mb-8 hover:text-emerald-300 transition-colors"
              >
                {paragraph}
              </p>
            ))}
          </div>

          {/* Bottom spacing pad so presenter can read the final words cleanly to the end */}
          <div className="h-[55vh]" />
        </div>
      </div>

      {/* --- FLOATING CONTROLS BAR (Auto-dims while scrolling, reveals on hover) --- */}
      <div 
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-[94%] max-w-4xl bg-[#0d0d12]/95 border border-white/10 rounded-2xl p-3 md:px-6 md:py-3.5 backdrop-blur-xl shadow-2xl transition-all duration-300 ${
          isPlaying && !isControlsVisible 
            ? 'opacity-20 hover:opacity-100 hover:shadow-emerald-500/10' 
            : 'opacity-100 shadow-purple-950/40'
        }`}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 select-none">
          {/* Primary Action Buttons: Play/Pause, Reset, Mirror */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePlay}
              className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 ${
                isPlaying 
                  ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-amber-500/20' 
                  : 'bg-emerald-400 hover:bg-emerald-300 text-black shadow-emerald-500/30'
              }`}
              title="Toggle Play / Pause (Spacebar)"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
              <span>{isPlaying ? 'PAUSE' : 'SCROLL'}</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] bg-black/20 rounded font-mono font-bold">
                SPACE
              </kbd>
            </button>

            <button
              type="button"
              onClick={handleResetToTop}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer active:scale-95"
              title="Reset to Top (R key)"
            >
              <RotateCcw size={16} />
            </button>

            <button
              type="button"
              onClick={handleToggleMirror}
              className={`px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border transition-all cursor-pointer active:scale-95 ${
                isMirrored 
                  ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' 
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
              }`}
              title="Mirror Horizontal (M key) - For Prompter Glass Setups"
            >
              <FlipHorizontal size={15} />
              <span className="hidden sm:inline">MIRROR</span>
            </button>

            <button
              type="button"
              onClick={() => setShowReadingGuide(prev => !prev)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                showReadingGuide 
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' 
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
              }`}
              title="Toggle Eye-Level Reading Guide Line"
            >
              <Eye size={16} />
            </button>
          </div>

          {/* Sliders: WPM Speed & Font Size */}
          <div className="flex flex-wrap items-center gap-4 md:gap-6 w-full md:w-auto justify-end">
            {/* WPM Speed Slider */}
            <div className="flex items-center gap-2.5">
              <Video size={14} className="text-emerald-400 shrink-0" />
              <div className="flex flex-col">
                <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                  <span>WPM SPEED</span>
                  <span className="text-emerald-400 font-bold">{wpm} WPM</span>
                </div>
                <input 
                  type="range"
                  min={80}
                  max={240}
                  step={5}
                  value={wpm}
                  onChange={(e) => setWpm(Number(e.target.value))}
                  className="w-28 sm:w-36 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  title="Speech Pacing Speed (80 - 240 WPM)"
                />
              </div>
            </div>

            {/* Font Size Slider */}
            <div className="flex items-center gap-2.5">
              <Type size={14} className="text-purple-400 shrink-0" />
              <div className="flex flex-col">
                <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                  <span>FONT SIZE</span>
                  <span className="text-purple-300 font-bold">{fontSize}px</span>
                </div>
                <input 
                  type="range"
                  min={24}
                  max={64}
                  step={2}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-24 sm:w-32 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-400"
                  title="Prompter Font Size (24px - 64px)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- EDIT SCRIPT MODAL --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#0d0d12] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 size={18} className="text-purple-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Edit Teleprompter Script
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Paste or modify your verbatim spoken dialogue below. Timestamps and noise cues will be automatically cleaned when importing.
            </p>

            <textarea
              rows={12}
              value={draftScriptText}
              onChange={(e) => setDraftScriptText(e.target.value)}
              placeholder="Paste your verbatim speech script here..."
              className="w-full bg-black/60 border border-white/10 focus:border-purple-500/50 rounded-xl p-4 text-sm text-white placeholder-gray-600 outline-none font-sans leading-relaxed resize-y custom-scrollbar"
            />

            <div className="flex items-center justify-between text-xs text-gray-500 font-mono">
              <span>{draftScriptText.split(/\s+/).filter(Boolean).length} words</span>
              <span>Est. {Math.round((draftScriptText.split(/\s+/).filter(Boolean).length / wpm) * 60)}s @ {wpm} WPM</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyEditedScript}
                className="px-5 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-black text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-purple-500/20"
              >
                <Check size={14} />
                <span>Apply to Prompter</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeleprompterView;
