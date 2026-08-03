import React from 'react';

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({ children, className = '', id, ...props }) => (
  <button 
    id={id || "primary-btn"}
    className={`bg-primary-gradient px-8 py-3 rounded-xl font-bold tracking-widest uppercase text-sm text-white transition-all hover:scale-105 hover:animate-pulse-glow active:scale-95 flex items-center justify-center gap-2 ${className}`}
    {...props}
  >
    {children}
  </button>
);
