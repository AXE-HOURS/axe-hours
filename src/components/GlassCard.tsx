import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  glowColor?: 'purple' | 'green' | 'amber' | 'cyan' | 'none';
  interactive?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  id, 
  glowColor = 'none',
  interactive = true 
}) => {
  const glowStyles = {
    purple: 'hover:shadow-[0_0_25px_rgba(157,80,187,0.15)] hover:border-purple-500/30',
    green: 'hover:shadow-[0_0_25px_rgba(16,185,129,0.15)] hover:border-emerald-500/30',
    amber: 'hover:shadow-[0_0_25px_rgba(245,158,11,0.15)] hover:border-amber-500/30',
    cyan: 'hover:shadow-[0_0_25px_rgba(8,145,178,0.15)] hover:border-cyan-500/30',
    none: 'hover:shadow-[0_15px_30px_rgba(0,0,0,0.5)]'
  };

  // Separate layout classes (e.g. flex, grid, gap, space-y) from visual properties (e.g. border, bg)
  const classes = className.split(/\s+/).filter(Boolean);
  const layoutKeywordRegex = /^(space-y-|space-x-|flex|grid|gap-|items-|justify-|divide-|text-center|text-left|h-full|flex-1)/;
  
  const layoutClasses = classes.filter(c => layoutKeywordRegex.test(c)).join(' ');
  const outerClasses = classes.filter(c => !layoutKeywordRegex.test(c)).join(' ');

  return (
    <div 
      id={id || "glass-card"} 
      className={`relative bg-black/40 border border-white/5 rounded-2xl p-6 transition-all duration-300 md:duration-500 backdrop-blur-xl group overflow-hidden ${
        interactive ? 'hover:bg-white/5 hover:translate-y-[-2px] ' + glowStyles[glowColor] : ''
      } ${outerClasses}`}
    >
      {/* Cybernetic Grid Backdrop Decoration */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-20" />
      
      {/* Dynamic Ambient Orbit Glow */}
      {glowColor !== 'none' && (
        <div className={`absolute -top-12 -left-12 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-10 transition-opacity duration-500 group-hover:opacity-25 ${
          glowColor === 'purple' ? 'bg-[#9d50bb]' :
          glowColor === 'green' ? 'bg-[#10b981]' :
          glowColor === 'amber' ? 'bg-[#f59e0b]' :
          glowColor === 'cyan' ? 'bg-[#06b6d4]' : ''
        }`} />
      )}

      {/* Cybernetic Corner Decorators - futuristic brackets */}
      <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-white/20 rounded-tl-sm opacity-40 group-hover:opacity-80 transition-opacity pointer-events-none" />
      <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-white/20 rounded-tr-sm opacity-40 group-hover:opacity-80 transition-opacity pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-white/20 rounded-bl-sm opacity-40 group-hover:opacity-80 transition-opacity pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-white/20 rounded-br-sm opacity-40 group-hover:opacity-80 transition-opacity pointer-events-none" />

      {/* High precision side line highlights */}
      <div className="absolute top-1/2 -translate-y-1/2 left-0 w-[1px] h-0 bg-gradient-to-b from-transparent via-white/25 to-transparent group-hover:h-1/2 transition-all duration-500 pointer-events-none" />

      <div className={`relative z-10 h-full ${layoutClasses}`}>
        {children}
      </div>
    </div>
  );
};

