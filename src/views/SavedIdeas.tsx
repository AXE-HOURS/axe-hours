import React, { useState } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Bookmark, Copy, Trash2, Check, Wand2, Scissors, Video, Sparkles } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useFirebase } from '../context/FirebaseContext';

interface SavedIdeaItem {
  id: number;
  title: string;
  content: string;
  date: string;
}

interface SavedIdeasProps {
  savedIdeas: SavedIdeaItem[];
  removeIdea: (id: number) => void;
  updateIdea?: (id: number, content: string) => Promise<void>;
  onLoadIntoGenerator?: (idea: { title: string; content: string }) => void;
}

const shortenText = (text: string): string => {
  if (!text) return "";
  const lines = text.split('\n');
  const shortenedLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return "";
    
    // Check if line starts with label (e.g. "Hook:", "1.", "[Intro]")
    const matchLabel = trimmed.match(/^([A-Za-z0-9\s\[\]\.\-#_]+:)/i);
    const label = matchLabel ? matchLabel[1] : "";
    const remainingText = label ? trimmed.slice(label.length).trim() : trimmed;
    
    if (!remainingText) return trimmed;
    
    // Split remaining text into sentences
    const sentences = remainingText.split(/(?<=[.!?])\s+/);
    if (sentences.length === 0) return trimmed;
    
    let coreText = sentences[0];
    const words = coreText.split(/\s+/);
    if (words.length > 15) {
      coreText = words.slice(0, 12).join(" ") + "...";
    }
    
    return label ? `${label} ${coreText}` : coreText;
  }).filter(line => line.length > 0);
  
  return shortenedLines.join('\n');
};

export const SavedIdeas: React.FC<SavedIdeasProps> = ({ savedIdeas = [], removeIdea, updateIdea, onLoadIntoGenerator }) => {
  const { addToast } = useToast();
  const { saveIdeaDB } = useFirebase();

  const triggerToast = (msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    addToast(msg, type);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    triggerToast("Blueprint copied to clipboard!");
  };

  const handleShorten = async (id: number, content: string) => {
    const shortened = shortenText(content);
    if (shortened === content) {
      triggerToast("Blueprint content is already fully optimized and compact!", "info");
      return;
    }
    if (updateIdea) {
      await updateIdea(id, shortened);
    } else {
      triggerToast("Updating ideas is not configured in this database environment.", "error");
    }
  };

  const handleInjectStarterSample = async () => {
    const sampleIdea = {
      title: '5 AI Coding Workflows That Save 20 Hours a Week [High-Conversion Blueprint]',
      content: `[Hook]
[0:00 - 0:08]
If you are still writing boilerplate code manually, you are losing at least 15 hours every single week.

[The Core Problem]
[0:08 - 0:25]
Most developers use AI like a glorified autocomplete tool. But top 1% engineering teams use it as an autonomous execution pipeline.

[The 3-Step System]
[0:25 - 0:55]
Step 1: Context Grounding. Feed structural schemas before writing any prompts.
Step 2: Micro-Agent delegation. Have one model write tests while another executes code.
Step 3: Verification loop. Never deploy without continuous linting and automated preview checks.

[Call to Action]
[0:55 - 1:00]
Save this blueprint and comment "WORKFLOW" to get my free full automation checklist.`
    };
    try {
      await saveIdeaDB(sampleIdea);
      triggerToast('Starter blueprint added to your Vault! 🚀', 'success');
    } catch {
      triggerToast('Could not load sample blueprint.', 'error');
    }
  };

  const exportAllAsJSON = () => {
    if (savedIdeas.length === 0) return;
    const formatted = JSON.stringify(savedIdeas, null, 2);
    navigator.clipboard.writeText(formatted);
    triggerToast("All blueprints exported as JSON!");
  };

  return (
    <div id="saved-ideas-view" className="space-y-8 animate-in fade-in duration-500 relative z-10 w-full max-w-7xl mx-auto">
      

      <div id="saved-ideas-header-row" className="flex justify-between items-end select-none">
        <div>
          <h1 id="saved-ideas-title" className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
            <Bookmark className="text-primary" /> Saved Workspace
          </h1>
        </div>
        {savedIdeas.length > 0 && (
          <button 
            id="saved-ideas-export-btn"
            onClick={exportAllAsJSON} 
            className="px-4 py-2.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
          >
            Export As JSON
          </button>
        )}
      </div>

      {savedIdeas.length === 0 ? (
        <GlassCard id="saved-ideas-empty-card" className="flex flex-col items-center justify-center border-dashed border-2 border-white/10 bg-transparent min-h-[400px] p-8 text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
            <Bookmark size={30} />
          </div>
          <p className="text-lg font-bold text-white">Saved workspace is empty</p>
          <p className="text-xs text-on-surface-variant mt-2 max-w-md leading-relaxed">
            Store high-converting video blueprints, extracted viral scripts, and hook iterations here for instant execution and teleprompter recording.
          </p>
          <div className="flex flex-wrap gap-3 mt-6 justify-center">
            <button
              onClick={handleInjectStarterSample}
              className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg shadow-primary/20 transition-all"
            >
              <Sparkles size={14} />
              <span>Load Starter Blueprint</span>
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('change-active-view', { detail: { view: 'generator' } }))}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all"
            >
              <Wand2 size={14} />
              <span>Launch AI Video Architect</span>
            </button>
          </div>
        </GlassCard>
      ) : (
        <div id="saved-ideas-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 select-text">
          {savedIdeas.map((idea, idx) => (
            <GlassCard 
              key={idea.id} 
              id={`saved-idea-card-${idea.id}`} 
              glowColor={idx % 2 === 0 ? "purple" : "cyan"}
              className="flex flex-col justify-between"
            >
              <div>
                <h3 id={`saved-idea-title-${idea.id}`} className="text-sm font-bold text-white mb-3 border-b border-white/5 pb-2 truncate">{idea.title}</h3>
                <pre id={`saved-idea-pre-${idea.id}`} className="text-xs text-gray-300 leading-relaxed font-mono bg-black/40 p-3 rounded-lg border border-white/5 whitespace-pre-wrap select-text">{idea.content}</pre>
              </div>
              <div id={`saved-idea-footer-${idea.id}`} className="flex items-center justify-between mt-6 pt-4 border-t border-white/5 text-[10px] font-mono text-on-surface-variant">
                <span>{idea.date}</span>
                <div id="saved-idea-actions" className="flex gap-2">
                  {onLoadIntoGenerator && (
                    <button 
                      id={`saved-idea-load-${idea.id}`}
                      onClick={() => onLoadIntoGenerator({ title: idea.title, content: idea.content })} 
                      className="p-2 bg-primary/10 hover:bg-primary/20 rounded-lg text-primary hover:text-white cursor-pointer transition-colors"
                      title="Load/Edit in AI Architect"
                    >
                      <Wand2 size={14} />
                    </button>
                  )}
                  <button 
                    id={`saved-idea-prompter-${idea.id}`}
                    onClick={() => {
                      sessionStorage.setItem('pending_teleprompter_script', idea.content);
                      sessionStorage.setItem('pending_teleprompter_title', idea.title);
                      window.dispatchEvent(new CustomEvent('load-teleprompter-script', {
                        detail: { script: idea.content, title: idea.title, wpm: 135 }
                      }));
                      window.dispatchEvent(new CustomEvent('change-active-view', {
                        detail: { view: 'teleprompter' }
                      }));
                      triggerToast("Loaded into Teleprompter Studio! 🎬", "success");
                    }}
                    className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg text-emerald-400 hover:text-white cursor-pointer transition-colors"
                    title="Open in Teleprompter Studio"
                  >
                    <Video size={14} />
                  </button>
                  <button 
                    id={`saved-idea-shorten-${idea.id}`}
                    onClick={() => handleShorten(idea.id, idea.content)} 
                    className="p-2 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg text-purple-300 hover:text-white cursor-pointer transition-colors"
                    title="Shorten Idea Blueprint"
                  >
                    <Scissors size={14} />
                  </button>
                  <button 
                    id={`saved-idea-copy-${idea.id}`}
                    onClick={() => copyToClipboard(idea.content)} 
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white cursor-pointer transition-colors"
                    title="Copy blueprint"
                  >
                    <Copy size={14} />
                  </button>
                  <button 
                    id={`saved-idea-delete-${idea.id}`}
                    onClick={() => removeIdea(idea.id)} 
                    className="p-2 bg-white/5 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 cursor-pointer transition-colors"
                    title="Remove blueprint"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};
