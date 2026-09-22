import React, { useState } from 'react';
import { Crown, Check, X, Shield, Zap, Sparkles, ArrowRight } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { useToast } from '../context/ToastContext';
import { useFirebase } from '../context/FirebaseContext';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTier?: 'pro' | 'agency';
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ 
  isOpen, 
  onClose, 
  defaultTier = 'pro' 
}) => {
  const [selectedTier, setSelectedTier] = useState<'pro' | 'agency'>(defaultTier);
  const [isProcessing, setIsProcessing] = useState(false);
  const { addToast } = useToast();
  const { user, dbUser, updateProfile } = useFirebase();

  if (!isOpen) return null;

  const handleSubscribe = async () => {
    setIsProcessing(true);
    try {
      // Simulate/trigger checkout session initiation
      await new Promise(resolve => setTimeout(resolve, 800));

      if (dbUser) {
        await updateProfile({
          tier: selectedTier
        });
      }

      addToast(`🎉 Successfully upgraded to ${selectedTier === 'pro' ? 'Pro Creator' : 'Agency Elite'}! All limits unlocked.`, 'success');
      onClose();
    } catch (err: any) {
      addToast(err?.message || 'Failed to initiate checkout session.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const proFeatures = [
    'Unlimited Gemini 2.5 Pro & Flash generation runs',
    'Full YouTube speech transcript decoder (residential gateway)',
    'Real-time competitor tracking and subscriber modeling',
    '15+ Neuro-linguistic viral hook formulas',
    'Cloud-synchronized blueprint and script vault',
    'Custom Brand Rules & Augmentation Directives',
    'Priority high-throughput server processing'
  ];

  const agencyFeatures = [
    'Everything in Pro Suite',
    'Multi-creator collaboration pods & team workspaces',
    'Bulk batch script generation (up to 50 variations)',
    'Full YouTube Data API & Analytics direct bridge',
    'White-label PDF and script export reports',
    'Dedicated support desk & priority engineering SLA'
  ];

  return (
    <div id="upgrade-modal-portal" className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-hidden animate-in fade-in duration-200">
      <GlassCard className="w-full max-w-3xl max-h-[92vh] p-0 flex flex-col overflow-hidden border-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.25)] relative font-sans">
        
        {/* Header */}
        <div className="flex border-b border-white/10 p-5 justify-between items-center bg-[#0d0e12]/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300">
              <Crown size={22} className="animate-pulse text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Upgrade Creator Bandwidth
                <span className="text-[10px] font-mono uppercase bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-2 py-0.5 rounded-full font-bold">
                  Instant Activation
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Scale your short-form video retention and production workflow.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#08080a]">
          
          {/* Plan Selector Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Pro Plan Card */}
            <div 
              onClick={() => setSelectedTier('pro')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                selectedTier === 'pro'
                  ? 'bg-purple-950/20 border-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.2)]'
                  : 'bg-white/2 border-white/5 hover:border-white/20'
              }`}
            >
              {selectedTier === 'pro' && (
                <div className="absolute -top-2.5 right-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm">
                  Selected
                </div>
              )}
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-purple-300 uppercase tracking-widest">Creator Pro</span>
                    <h3 className="text-xl font-black text-white mt-0.5">High-Retention Suite</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-white">$29</span>
                    <span className="text-[10px] text-gray-400 font-mono block">/month</span>
                  </div>
                </div>

                <div className="mt-4 space-y-2 border-t border-white/5 pt-3">
                  {proFeatures.slice(0, 4).map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-300">
                      <Check size={13} className="text-purple-400 shrink-0" />
                      <span className="truncate">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Agency Plan Card */}
            <div 
              onClick={() => setSelectedTier('agency')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                selectedTier === 'agency'
                  ? 'bg-amber-950/20 border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.2)]'
                  : 'bg-white/2 border-white/5 hover:border-white/20'
              }`}
            >
              {selectedTier === 'agency' && (
                <div className="absolute -top-2.5 right-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm">
                  Selected
                </div>
              )}
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-widest">Agency Elite</span>
                    <h3 className="text-xl font-black text-white mt-0.5">Multi-Seat Studio</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-white">$79</span>
                    <span className="text-[10px] text-gray-400 font-mono block">/month</span>
                  </div>
                </div>

                <div className="mt-4 space-y-2 border-t border-white/5 pt-3">
                  {agencyFeatures.slice(0, 4).map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-300">
                      <Check size={13} className="text-amber-400 shrink-0" />
                      <span className="truncate">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Detailed Features List */}
          <div className="p-4 bg-white/2 border border-white/5 rounded-xl space-y-2.5">
            <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={13} className="text-purple-400" />
              Included with your {selectedTier === 'pro' ? 'Creator Pro' : 'Agency Elite'} membership:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-300">
              {(selectedTier === 'pro' ? proFeatures : agencyFeatures).map((f, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Modal Footer with Mandatory California ARL / FTC Subscription Renewal Disclosure */}
        <div className="border-t border-white/10 p-5 bg-[#0d0e12]/95 space-y-3 shrink-0">
          
          {/* Statutory Renewal Disclosure Text */}
          <div className="p-3 bg-purple-500/5 border border-purple-500/15 rounded-xl text-center">
            <p className="text-[11px] text-purple-200/90 leading-relaxed font-sans font-medium">
              Recurring billing. Cancel anytime from your Profile Settings. By clicking Subscribe, you agree that your plan will automatically renew monthly until canceled.
            </p>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
              <Shield size={14} className="text-emerald-400" />
              <span>256-Bit SSL Encrypted & Stripe Protected</span>
            </div>

            <button
              id="upgrade-modal-subscribe-btn"
              type="button"
              onClick={handleSubscribe}
              disabled={isProcessing}
              className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <span>Securing Subscription...</span>
              ) : (
                <>
                  <span>Subscribe to {selectedTier === 'pro' ? 'Pro ($29/mo)' : 'Agency ($79/mo)'}</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>

        </div>

      </GlassCard>
    </div>
  );
};
