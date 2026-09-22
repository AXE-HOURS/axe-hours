import React, { useState, useEffect } from 'react';
import { Shield, FileText, X, Check, Lock, Globe, Server, UserCheck, Scale, AlertOctagon, Mail } from 'lucide-react';
import { GlassCard } from './GlassCard';

export type LegalDocType = 'privacy' | 'terms' | 'dmca';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: LegalDocType;
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, type: initialType }) => {
  const [activeType, setActiveType] = useState<LegalDocType>(initialType);

  useEffect(() => {
    setActiveType(initialType);
  }, [initialType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-hidden animate-in fade-in duration-200">
      <GlassCard className="w-full max-w-3xl h-[85vh] p-0 flex flex-col overflow-hidden border-white/15 shadow-[0_25px_65px_-12px_rgba(168,85,247,0.3)] relative font-sans">
        
        {/* Modal Header */}
        <div className="flex border-b border-white/10 p-5 justify-between items-center bg-[#0d0e12]/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300">
              {activeType === 'privacy' ? <Shield size={20} /> : activeType === 'terms' ? <FileText size={20} /> : <Scale size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {activeType === 'privacy' ? 'AXE Hours AI Privacy Policy' : activeType === 'terms' ? 'AXE Hours AI Terms of Service' : 'AXE Hours AI DMCA Copyright & Takedown Policy'}
                <span className="text-[10px] font-mono uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
                  Official Legal Document
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Effective Date: January 1, 2026 | Version 2.5 | AXE Hours AI Legal Suite
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-[#090a0d] border-b border-white/5 text-xs font-semibold shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveType('privacy')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeType === 'privacy'
                ? 'bg-purple-600/25 border border-purple-500/40 text-purple-200'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <Shield size={13} />
            Privacy Policy
          </button>
          <button
            type="button"
            onClick={() => setActiveType('terms')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeType === 'terms'
                ? 'bg-purple-600/25 border border-purple-500/40 text-purple-200'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <FileText size={13} />
            Terms of Service
          </button>
          <button
            type="button"
            onClick={() => setActiveType('dmca')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeType === 'dmca'
                ? 'bg-purple-600/25 border border-purple-500/40 text-purple-200'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <Scale size={13} />
            DMCA Takedown
          </button>
        </div>

        {/* Legal Document Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 pr-4 space-y-6 text-gray-300 text-xs leading-relaxed custom-scrollbar bg-[#08080a]">
          
          {activeType === 'privacy' ? (
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
                  For privacy questions, data export requests, or security disclosures, reach out to the AXE Hours AI Data Protection Team at <a href="mailto:legal@axe-hours.com" className="text-purple-400 hover:underline">legal@axe-hours.com</a> (or <a href="mailto:support@axe-hours.com" className="text-purple-400 hover:underline">support@axe-hours.com</a>).
                </p>
              </section>

            </div>
          ) : activeType === 'terms' ? (
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
                  For legal inquiries or terms clarification, contact <a href="mailto:legal@axe-hours.com" className="text-purple-400 hover:underline">legal@axe-hours.com</a>.
                </p>
              </section>

            </div>
          ) : (
            /* DMCA TAKEDOWN POLICY CONTENT */
            <div className="space-y-6">
              
              <div className="bg-purple-950/20 border border-purple-500/20 rounded-xl p-4 flex items-start gap-3">
                <Scale className="text-purple-400 shrink-0 mt-0.5" size={18} />
                <div>
                  <h3 className="font-bold text-white text-sm">DMCA Copyright & Takedown Policy</h3>
                  <p className="text-gray-300 mt-1">
                    AXE Hours AI respects intellectual property rights and complies with the Digital Millennium Copyright Act of 1998 (17 U.S.C. § 512). This page outlines the procedures for submitting a formal Notice of Claimed Infringement and submitting Counter-Notices.
                  </p>
                </div>
              </div>

              {/* DMCA Designated Agent */}
              <section className="p-4 bg-white/5 border border-purple-500/30 rounded-xl space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Mail size={15} className="text-purple-400" /> Designated Copyright Agent
                </h3>
                <p className="text-gray-300">
                  All copyright infringement notices must be submitted in writing to our designated DMCA Agent:
                </p>
                <div className="bg-black/60 p-3 rounded-lg font-mono text-xs text-purple-300 space-y-1 border border-white/5">
                  <p><strong className="text-gray-300">Designated Agent:</strong> Copyright Legal Department</p>
                  <p><strong className="text-gray-300">Organization:</strong> AXE Hours AI</p>
                  <p><strong className="text-gray-300">Primary DMCA Email:</strong> <a href="mailto:legal@axe-hours.com" className="underline text-purple-400">legal@axe-hours.com</a></p>
                  <p><strong className="text-gray-300">Support Desk:</strong> <a href="mailto:support@axe-hours.com" className="underline text-purple-400">support@axe-hours.com</a></p>
                </div>
              </section>

              {/* Section 1: Notice Requirements */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-1.5">
                  1. Requirements for a Valid DMCA Notice (17 U.S.C. § 512(c)(3))
                </h3>
                <p className="text-gray-400">
                  To be effective under the DMCA, your written notification must include substantially the following:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
                  <li><strong className="text-gray-200">Signature:</strong> A physical or electronic signature of a person authorized to act on behalf of the copyright owner.</li>
                  <li><strong className="text-gray-200">Identification of Work:</strong> Identification of the copyrighted work claimed to have been infringed (or a representative list).</li>
                  <li><strong className="text-gray-200">Identification of Material:</strong> Identification of the material claimed to be infringing or to be the subject of infringing activity, including specific URLs or location indicators.</li>
                  <li><strong className="text-gray-200">Contact Information:</strong> Your name, physical mailing address, telephone number, and active email address.</li>
                  <li><strong className="text-gray-200">Good Faith Statement:</strong> A statement that you have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</li>
                  <li><strong className="text-gray-200">Perjury Statement:</strong> A statement that the information in the notification is accurate, and under penalty of perjury, that you are authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.</li>
                </ul>
              </section>

              {/* Section 2: Counter-Notification */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-1.5">
                  2. Counter-Notification Procedure (17 U.S.C. § 512(g)(3))
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  If material that you posted or stored on AXE Hours AI has been removed or disabled as a result of a DMCA notice, and you believe the removal was a mistake or misidentification, you may send a written Counter-Notification to our Designated Agent at <a href="mailto:legal@axe-hours.com" className="text-purple-400 hover:underline">legal@axe-hours.com</a>.
                </p>
                <p className="text-gray-400 leading-relaxed">
                  Upon receipt of a valid Counter-Notification, we will forward a copy to the original complaining party. If the copyright owner does not file a court action within 10-14 business days, we may restore the removed material pursuant to the DMCA safe harbor rules.
                </p>
              </section>

              {/* Section 3: Repeat Infringer Policy */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-1.5">
                  3. Repeat Infringer Policy (17 U.S.C. § 512(i)(1)(A))
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  AXE Hours AI maintains a strict repeat infringer policy. In accordance with applicable law, accounts determined to be repeat infringers will have their access, account privileges, and cloud synchronizations permanently revoked and terminated.
                </p>
              </section>

              {/* Section 4: Misrepresentation Warning */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-1.5">
                  4. Warning Regarding False Claims (17 U.S.C. § 512(f))
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  Please be aware that under 17 U.S.C. § 512(f), any person who knowingly materially misrepresents that material or activity is infringing, or that material or activity was removed or disabled by mistake or misidentification, may be liable for statutory damages and attorneys' fees.
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
