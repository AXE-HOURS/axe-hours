import React from 'react';
import { Shield, FileText, X, Check, Lock, Globe, Server, UserCheck } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'privacy' | 'terms';
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, type }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-hidden animate-in fade-in duration-200">
      <GlassCard className="w-full max-w-3xl h-[85vh] p-0 flex flex-col overflow-hidden border-white/15 shadow-[0_25px_65px_-12px_rgba(168,85,247,0.3)] relative font-sans">
        
        {/* Modal Header */}
        <div className="flex border-b border-white/10 p-5 justify-between items-center bg-[#0d0e12]/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300">
              {type === 'privacy' ? <Shield size={20} /> : <FileText size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {type === 'privacy' ? 'AXE Hours AI Privacy Policy' : 'AXE Hours AI Terms of Service'}
                <span className="text-[10px] font-mono uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
                  Official Legal Document
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Effective Date: January 1, 2026 | Version 2.4 | AXE Hours AI Suite
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

        {/* Legal Document Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 pr-4 space-y-6 text-gray-300 text-xs leading-relaxed custom-scrollbar bg-[#08080a]">
          
          {type === 'privacy' ? (
            /* PRIVACY POLICY CONTENT */
            <div className="space-y-6">
              
              <div className="bg-purple-950/20 border border-purple-500/20 rounded-xl p-4 flex items-start gap-3">
                <Lock className="text-purple-400 shrink-0 mt-0.5" size={18} />
                <div>
                  <h3 className="font-bold text-white text-sm">Privacy Commitment at AXE Hours AI</h3>
                  <p className="text-gray-300 mt-1">
                    At <strong>AXE Hours AI</strong> ("we", "our", or "us"), we prioritize your data privacy, video idea confidentiality, and YouTube integration security above all else. This Privacy Policy details how we collect, process, safeguard, and retain your data when utilizing the AXE Hours AI creator platform.
                  </p>
                </div>
              </div>

              {/* Section 1 */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-1.5">
                  <UserCheck size={14} className="text-purple-400" /> 1. Information We Collect
                </h3>
                <p>We collect only the minimum required information necessary to provide ultra-retention AI scripting and channel analytics tools:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
                  <li><strong className="text-gray-200">Account Credentials:</strong> Email address, display name, and authentication tokens provided when signing in via Google SSO or Email.</li>
                  <li><strong className="text-gray-200">Creator Prompts & Script Blueprints:</strong> Prompts, topic keywords, custom brand rules, generated short-form scripts, and saved idea cards created inside AXE Hours AI.</li>
                  <li><strong className="text-gray-200">YouTube Channel & Analytics Metadata:</strong> When you connect YouTube Data API integrations, we access public video metrics, title performance, view counts, and engagement velocity to compute retention scores.</li>
                  <li><strong className="text-gray-200">Technical Diagnostic Logs:</strong> Anonymized browser state, error metrics, and response latency to optimize real-time generation speed.</li>
                </ul>
              </section>

              {/* Section 2 */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-1.5">
                  <Server size={14} className="text-purple-400" /> 2. How We Use Your Data
                </h3>
                <p>Your data is processed strictly for the following operational workflows:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
                  <li>To synthesize personalized short-form scripts, viral hook variations, and audio voiceover transcripts using the Gemini API.</li>
                  <li>To store and synchronize your saved scripts, competitor benchmarks, and creator guidelines across devices via Firebase Cloud Storage and local cache.</li>
                  <li>To perform predictive retention scoring and provide custom pacing recommendations.</li>
                  <li>We <strong>NEVER</strong> sell, rent, or trade your personal information, prompt histories, or unreleased video concepts to third parties or advertisers.</li>
                </ul>
              </section>

              {/* Section 3 */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-1.5">
                  <Globe size={14} className="text-purple-400" /> 3. Third-Party API Services & Security
                </h3>
                <p>
                  AXE Hours AI integrates with industry-standard cloud providers:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
                  <li><strong className="text-gray-200">Google Cloud / Firebase Authentication:</strong> User session management and identity verification adhere strictly to Google Security Standards.</li>
                  <li><strong className="text-gray-200">Google Gemini API:</strong> All prompt parameters sent to Gemini API are processed via secure server-side proxies, preventing API key exposure and ensuring strict payload encryption in transit (TLS 1.3).</li>
                </ul>
              </section>

              {/* Section 4 */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-1.5">
                  <Check size={14} className="text-purple-400" /> 4. Data Control & Deletion Rights
                </h3>
                <p>
                  You hold full rights to export or permanently purge your account data at any time from your <strong>Profile Settings</strong> or by triggering the activity purge tools. Upon requesting account deletion, all cloud-synced saved ideas, activity logs, and brand preferences are irreversibly purged within 24 hours.
                </p>
              </section>

              {/* Section 5 */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white border-b border-white/10 pb-1.5">
                  5. Contact & Privacy Inquiries
                </h3>
                <p className="text-gray-400">
                  For privacy questions, data export requests, or security disclosures, reach out to the AXE Hours AI Data Protection Team at <a href="mailto:privacy@axe-hours.ai" className="text-purple-400 hover:underline">privacy@axe-hours.ai</a>.
                </p>
              </section>

            </div>
          ) : (
            /* TERMS OF SERVICE CONTENT */
            <div className="space-y-6">
              
              <div className="bg-purple-950/20 border border-purple-500/20 rounded-xl p-4 flex items-start gap-3">
                <FileText className="text-purple-400 shrink-0 mt-0.5" size={18} />
                <div>
                  <h3 className="font-bold text-white text-sm">Welcome to AXE Hours AI Terms of Service</h3>
                  <p className="text-gray-300 mt-1">
                    By accessing or using the <strong>AXE Hours AI</strong> creator platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). Please read them carefully before creating scripts, generating voiceovers, or analyzing short-form content.
                  </p>
                </div>
              </div>

              {/* Section 1 */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-1.5">
                  1. Scope of Service & Platform Ownership
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  AXE Hours AI provides AI-assisted content architecture, short-form video scripting tools, hook generation algorithms, transcript analysis, and predictive retention modeling. All platform software, UI assets, viral scoring models, and brand assets remain the exclusive intellectual property of AXE Hours AI.
                </p>
              </section>

              {/* Section 2 */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-1.5">
                  2. Intellectual Property Rights Over Generated Content
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
                  <li><strong className="text-gray-200">Ownership:</strong> You retain 100% full intellectual property ownership over all original video scripts, customized hook variations, title concepts, and audio voiceovers created using your account on AXE Hours AI.</li>
                  <li><strong className="text-gray-200">Commercial License:</strong> Scripts and assets generated via AXE Hours AI can be used freely for commercial YouTube, Shorts, TikTok, and Instagram Reels monetization without royalty obligations.</li>
                </ul>
              </section>

              {/* Section 3 */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-1.5">
                  3. Acceptable Use Policy
                </h3>
                <p className="text-gray-400">When using AXE Hours AI, you agree NOT to:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
                  <li>Generate harmful, illegal, defamatory, hate speech, or explicit non-consensual content.</li>
                  <li>Attempt to reverse-engineer, exploit, or bypass system rate limits or server API endpoints.</li>
                  <li>Use automated bots or scrapers to overwhelm the AI generation queue or extract system prompts.</li>
                </ul>
              </section>

              {/* Section 4 */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-1.5">
                  4. AI Output Disclaimer
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  AXE Hours AI utilizes advanced generative AI models (including Gemini API) to assist video creators. While our retention scoring models are built on proven short-form viral pacing principles, AXE Hours AI does not guarantee specific subscriber counts, view velocity, or algorithm placement on third-party platforms like YouTube or TikTok.
                </p>
              </section>

              {/* Section 5 */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-1.5">
                  5. Termination & Service Modifications
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  We reserve the right to suspend or terminate accounts that violate our Acceptable Use Policy. We continuously update and refine our platform capabilities, preset cards, and predictive analytics tools to offer maximum retention performance.
                </p>
              </section>

              {/* Section 6 */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white border-b border-white/10 pb-1.5">
                  6. Contact & Legal Inquiries
                </h3>
                <p className="text-gray-400">
                  For legal inquiries or terms clarification, contact <a href="mailto:legal@axe-hours.ai" className="text-purple-400 hover:underline">legal@axe-hours.ai</a>.
                </p>
              </section>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="border-t border-white/10 p-4 bg-[#0d0e12]/90 flex justify-between items-center text-xs text-gray-400 shrink-0">
          <span className="flex items-center gap-1.5">
            <Check size={14} className="text-emerald-400" />
            <span>AXE Hours AI Legal Compliance Verified</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-purple-600/20"
          >
            I Understand & Agree
          </button>
        </div>

      </GlassCard>
    </div>
  );
};
