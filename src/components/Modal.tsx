import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidthClass = 'max-w-3xl' }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalElement = (
    <div 
      id="modal-container" 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
    >
      <div 
        ref={modalRef}
        id="modal-card"
        className={`relative w-full ${maxWidthClass} my-auto animate-in zoom-in-95 duration-200 cursor-default`}
      >
        <div id="modal-content" className="bg-[#1e1f20] border border-[#303134] rounded-[28px] p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.95)] relative flex flex-col overflow-hidden text-white">
          
          <button 
            id="modal-close-btn"
            onClick={onClose}
            className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors z-20 cursor-pointer p-1 rounded-full hover:bg-white/10"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
          
          {title && (
            <h2 id="modal-title" className="text-xl md:text-2xl font-bold text-white mb-4 pr-8 relative z-10 shrink-0">
              {title}
            </h2>
          )}
          
          <div id="modal-body" className="relative z-10 text-white leading-relaxed text-sm">
            {children}
          </div>

        </div>
      </div>
    </div>
  );

  return createPortal(modalElement, document.body);
};
