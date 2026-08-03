import React, { useState, useEffect } from 'react';
import { 
  X, ChevronRight, ChevronLeft, Sparkles, Wand2, Compass, 
  Bookmark, Zap, BarChart3, Radio, HelpCircle, Trophy, Play, CheckCircle2 
} from 'lucide-react';
import { playAudioCue as playAudio } from '../utils/audio';
import { useToast } from '../context/ToastContext';

interface OnboardingTourProps {
  onClose?: () => void;
  isOpen?: boolean;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen: propIsOpen, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const { addToast } = useToast();

  // Check if tour should auto-trigger on first load
  useEffect(() => {
    if (propIsOpen !== undefined) {
      setIsOpen(propIsOpen);
      return;
    }
    const hasCompletedTour = localStorage.getItem('axe_hours_completed_tour') || localStorage.getItem('completed_onboarding_v1');
    if (!hasCompletedTour) {
      // Small timeout to allow the site layout to fully settle
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [propIsOpen]);

  const soundEffect = (freq: number) => {
    try {
      playAudio(freq, "sine", 0.15);
    } catch (_) {}
  };

  const steps = [
    {
      title: "🌉 Step A: The Data Bridge",
      subtitle: "Seamlessly extract and pipe transcripts",
      icon: TerminalIcon,
      accent: "text-purple-400 border-purple-500/30 bg-purple-500/10",
      selector: "#script-fetcher-transfer-btn",
      view: "script-fetcher",
      content: (
        <div className="space-y-4 text-xs font-sans text-gray-300 leading-relaxed">
          <p>
            Welcome, Creator! Let's align your production pipeline with high-retention mechanics.
          </p>
          <p>
            The <span className="font-bold text-purple-400">Data Bridge button</span> allows you to extract and decode short-form speech transcripts from raw reference videos, map hook density, and seamlessly transfer the raw text script data straight across your workspace.
          </p>
          <div className="p-3.5 bg-purple-500/5 border border-purple-500/20 text-purple-300 rounded-xl flex items-center gap-3">
            <Sparkles size={16} className="shrink-0 text-purple-400 animate-pulse" />
            <div>
              <p className="font-bold text-[11px]">Dynamic Local State Buffer</p>
              <p className="text-[9px] text-gray-400 mt-0.5">Bypass manual copying entirely by linking your transcript sources to the AI generator.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "⚖️ Step B: The Evaluation Matrix",
      subtitle: "Execute comparative A/B retention testing",
      icon: CreatorIcon,
      accent: "text-blue-400 border-blue-500/30 bg-blue-500/10",
      selector: "#ab-retention-playground",
      view: "generator",
      content: (
        <div className="space-y-4 text-xs font-sans text-gray-300 leading-relaxed">
          <p>
            The <span className="font-bold text-blue-400">Retention Playground panel</span> drives your A/B linguistic comparative assessments.
          </p>
          <p>
            Evaluate Model A and Model B scripts side-by-side. Track real-time metric score variances, syllable pacing distributions, and visual hooks to ensure your copy is mathematically optimized for extreme attention retention.
          </p>
          <div className="p-3.5 bg-blue-500/5 border border-blue-500/20 text-blue-300 rounded-xl flex items-center gap-3">
            <Sparkles size={16} className="shrink-0 text-blue-400 animate-pulse" />
            <div>
              <p className="font-bold text-[11px]">Compare Multiple Writing Angles</p>
              <p className="text-[9px] text-gray-400 mt-0.5">A/B test different phrasing lengths or hook presets before deploying live.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "🎙️ Step C: The Speech Coach Viewport",
      subtitle: "requestAnimationFrame Autoscroll Teleprompter",
      icon: BrandIcon,
      accent: "text-amber-400 border-amber-500/30 bg-amber-500/10",
      selector: "#teleprompter-viewport",
      view: "generator",
      content: (
        <div className="space-y-4 text-xs font-sans text-gray-300 leading-relaxed">
          <p>
            The <span className="font-bold text-amber-400">Teleprompter module</span> is your live performance monitor.
          </p>
          <p>
            Practice speech delivery utilizing our smooth, requestAnimationFrame-powered scrolling teleprompter. Speak clearly, lock your eyes onto the active cyan reading line, and calibrate scrolling speeds (WPM) to master auditory rhythm.
          </p>
          <div className="p-3.5 bg-amber-500/5 border border-amber-500/20 text-amber-300 rounded-xl flex items-center gap-3">
            <CheckCircle2 size={16} className="shrink-0 text-amber-400 animate-pulse" />
            <div>
              <p className="font-bold text-[11px]">Master Your Pacing</p>
              <p className="text-[9px] text-gray-400 mt-0.5">Keep speech pacing in harmony with retention metrics. Visual indicators keep you on target.</p>
            </div>
          </div>
        </div>
      )
    }
  ];

  // Synchronize dashboard view and scroll to targeted element when tour step changes
  useEffect(() => {
    if (!isOpen) return;
    
    const step = steps[currentStep];
    if (step) {
      // 1. Switch active view if needed
      if (step.view) {
        window.dispatchEvent(new CustomEvent("change-active-view", { detail: { view: step.view } }));
      }
      
      // 2. Wait a little bit for view to render, then scroll to the element
      const timer = setTimeout(() => {
        if (step.selector) {
          const el = document.querySelector(step.selector);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add a subtle purple glow/highlight animation or effect to draw attention
            el.classList.add('ring-2', 'ring-purple-500', 'ring-offset-2', 'ring-offset-black', 'transition-all', 'duration-500');
            setTimeout(() => {
              el.classList.remove('ring-2', 'ring-purple-500', 'ring-offset-2', 'ring-offset-black');
            }, 3000);
          }
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [currentStep, isOpen]);

  const handleNext = () => {
    soundEffect(720 + currentStep * 50);
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    soundEffect(600 - currentStep * 30);
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    soundEffect(1200);
    localStorage.setItem('axe_hours_completed_tour', 'true');
    localStorage.setItem('completed_onboarding_v1', 'true');
    addToast("Welcome to the Axe Hours Production Suite! Your onboard setup is complete. 🚀", "success");
    setIsOpen(false);
    if (onClose) onClose();
  };

  const handleCloseTrigger = () => {
    soundEffect(400);
    setIsOpen(false);
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  const ActiveIcon = steps[currentStep].icon;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300"
      id="onboarding-tour-modal-overlay"
    >
      <div 
        className="w-full max-w-2xl bg-[#08080c] border border-white/10 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_50px_rgba(168,85,247,0.15)] flex flex-col max-h-[90vh] overflow-hidden"
        id="onboarding-tour-card-container"
      >
        {/* Header bar */}
        <div className="p-5 border-b border-white/5 flex justify-between items-center bg-black/40">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border flex items-center justify-center ${steps[currentStep].accent}`}>
              <ActiveIcon size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">{steps[currentStep].title}</h2>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5">{steps[currentStep].subtitle}</p>
            </div>
          </div>
          <button 
            onClick={handleCloseTrigger}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            id="onboarding-close-button"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-gradient-to-b from-[#08080c] to-[#040406]" id="onboarding-step-body">
          {steps[currentStep].content}
        </div>

        {/* Action Controls Footer */}
        <div className="p-5 border-t border-white/5 bg-black/40 flex flex-col sm:flex-row gap-4 items-center justify-between">
          {/* Progress Indicators */}
          <div className="flex items-center gap-1.5 order-2 sm:order-1" id="onboarding-progress-bullets">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  soundEffect(500 + i * 40);
                  setCurrentStep(i);
                }}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  i === currentStep 
                    ? 'w-6 bg-purple-500' 
                    : completedSteps.includes(i) 
                      ? 'w-2 bg-purple-500/50' 
                      : 'w-1.5 bg-white/10 hover:bg-white/20'
                }`}
                aria-label={`Go to tutorial step ${i + 1}`}
              />
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-3 w-full sm:w-auto order-1 sm:order-2">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="flex-1 sm:flex-initial px-4 py-2 border border-white/10 hover:bg-white/5 text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                id="onboarding-back-btn"
              >
                <ChevronLeft size={14} />
                <span>Back</span>
              </button>
            )}
            
            <button
              onClick={handleNext}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]"
              id="onboarding-next-btn"
            >
              <span>{currentStep === steps.length - 1 ? "Start Creating" : "Next Module"}</span>
              <ChevronRight size={14} className="mt-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Micro Visual Custom Inline Icons
function TerminalIcon(props: any) {
  return (
    <Compass className={props.className || ""} size={props.size || 16} />
  );
}

function CreatorIcon(props: any) {
  return (
    <Wand2 className={props.className || ""} size={props.size || 16} />
  );
}

function BrandIcon(props: any) {
  return (
    <Zap className={props.className || ""} size={props.size || 16} />
  );
}

function TrophyIcon(props: any) {
  return (
    <Trophy className={props.className || ""} size={props.size || 16} />
  );
}

function IntelligenceIcon(props: any) {
  return (
    <BarChart3 className={props.className || ""} size={props.size || 16} />
  );
}
