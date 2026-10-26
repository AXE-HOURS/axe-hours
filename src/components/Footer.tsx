import React, { useState, useEffect } from 'react';
import { BookOpen, Cpu, Shield } from 'lucide-react';
import { LegalModal } from './LegalModal';
import { PlaybookModal } from './PlaybookModal';
import { useFirebase } from '../context/FirebaseContext';

export const Footer: React.FC = () => {
  const { dbUser, user } = useFirebase();
  const [isOpen, setIsOpen] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | 'dmca' | null>(null);
  const [activeTab, setActiveTab] = useState<string>('getting-started');

  // Support global triggers for opening playbook tabs (never auto-open on launch)
  useEffect(() => {
    const handleOpenPlaybook = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsOpen(true);
      if (customEvent.detail && customEvent.detail.tab) {
        setActiveTab(customEvent.detail.tab);
      }
    };
    window.addEventListener('open-playbook', handleOpenPlaybook);
    return () => window.removeEventListener('open-playbook', handleOpenPlaybook);
  }, []);

  return (
    <>
      {/* GLOBAL SCREEN FOOTER */}
      <footer id="axe-hours-global-footer" className="border-t border-white/5 bg-[#030304]/90 backdrop-blur-md py-6 px-4 md:px-8 mt-12 relative z-20 shrink-0 select-none">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          
          {/* Logo Brand Meta */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary-gradient flex items-center justify-center text-white shadow-md shadow-primary/20">
              <Cpu size={15} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[#fff] tracking-wider text-xs uppercase">AXE HOURS</span>
                
              </div>
              <p className="text-[10px] text-on-surface-variant font-light mt-0.5">High-retention creative synthesis and predictive orchestration suite.</p>
            </div>
          </div>

          {/* Quick links & Documentation Center Button */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-[11px]">
            <button 
              id="footer-playbook-trigger"
              onClick={() => { setIsOpen(true); setActiveTab('getting-started'); }}
              className="flex items-center gap-2 font-black text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 transition-all cursor-pointer active:scale-95"
            >
              <BookOpen size={13} className="text-primary" />
              📖 Interactive Creator Playbook
            </button>

            <span className="h-4 w-[1px] bg-white/10 hidden sm:block" />

            <div className="flex items-center gap-1.5 text-gray-400 font-mono text-[10px] bg-white/5 border border-white/10 py-1 px-2.5 rounded-full">
              <span>Creator Intelligence Suite</span>
            </div>
          </div>
        </div>

        {/* Copy Indicator bar */}
        <div className="max-w-7xl mx-auto border-t border-white/5 mt-5 pt-4 flex flex-col xs:flex-row justify-between items-center gap-3 text-[10px] text-gray-500 font-mono">
          <p>© {new Date().getFullYear()} AXE HOURS.</p>
          <div className="flex items-center gap-4">
            <button 
              type="button"
              onClick={() => setLegalModalType('privacy')} 
              className="hover:text-gray-300 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button 
              type="button"
              onClick={() => setLegalModalType('terms')} 
              className="hover:text-gray-300 transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <button 
              type="button"
              onClick={() => setLegalModalType('dmca')} 
              className="hover:text-gray-300 transition-colors cursor-pointer text-purple-400/90 hover:text-purple-300"
            >
              DMCA Takedown
            </button>
            <span className="h-3 w-[1px] bg-white/10" />
            <p className="flex items-center gap-1">
              <Shield size={10} className="text-primary/70" />
              
            </p>
          </div>
        </div>
      </footer>

      {/* AXE Hours AI Legal Documents Modal */}
      <LegalModal 
        isOpen={!!legalModalType} 
        type={legalModalType || 'privacy'} 
        onClose={() => setLegalModalType(null)} 
      />

      {/* DETAILED INTERACTIVE CREATOR PLAYBOOK MODAL */}
      <PlaybookModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    </>
  );
};

export default Footer;
