import React from 'react';

interface BlueprintProps {
  transcriptText: string;
}

const VisualBlueprintParser: React.FC<BlueprintProps> = ({ transcriptText }) => {
  const blockRegex = /\[VISUAL:\s*(.*?)\]\n\[TEXT OVERLAY:\s*(.*?)\]\n\[AUDIO CUE:\s*(.*?)\]\nVOICEOVER:\s*"(.*?)"/g;

  const scenes: { visual: string; textOverlay: string; audioCue: string; voiceover: string }[] = [];
  let match: RegExpExecArray | null;

  if (transcriptText) {
    while ((match = blockRegex.exec(transcriptText)) !== null) {
      scenes.push({
        visual: match[1],
        textOverlay: match[2],
        audioCue: match[3],
        voiceover: match[4]
      });
    }
  }

  if (scenes.length === 0) return null;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 mt-6">
      {scenes.map((scene, index) => (
        <div
          key={index}
          className="flex flex-col md:flex-row bg-gradient-to-r from-black/40 via-white/3 to-black/30 border border-white/5 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(157,80,187,0.12)]"
        >
          {/* Visual Canvas (Left) */}
          <div className="md:w-1/2 p-4 bg-[rgba(255,255,255,0.02)] border-r border-white/5">
            <div className="text-[10px] font-mono uppercase tracking-widest text-purple-300 mb-2">SCENE {index + 1}</div>
            <p className="text-gray-200 text-sm mb-3">🎥 {scene.visual}</p>
            <div className="inline-block bg-black/60 px-2 py-1 rounded text-xs text-amber-300 font-mono border border-amber-400/10">
              TXT: {scene.textOverlay}
            </div>
          </div>

          {/* Audio & Script (Right) */}
          <div className="md:w-1/2 p-4 bg-gradient-to-t from-black/20 to-transparent flex flex-col justify-center">
            <div className="mb-3">
              <div className="text-[10px] font-mono uppercase tracking-widest text-blue-300 mb-1">Audio Cue</div>
              <p className="text-gray-400 text-xs italic">🎵 {scene.audioCue}</p>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-green-300 mb-1">Voiceover</div>
              <p className="text-white text-sm font-mono">"{scene.voiceover}"</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VisualBlueprintParser;
