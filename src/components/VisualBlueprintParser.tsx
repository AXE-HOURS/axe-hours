import React from 'react';

interface BlueprintProps {
  transcriptText: string;
}

const VisualBlueprintParser: React.FC<BlueprintProps> = ({ transcriptText }) => {
  // Regex to exactly match our new block format
  const blockRegex = /\[VISUAL:\s*(.*?)\]\n\[TEXT OVERLAY:\s*(.*?)\]\n\[AUDIO CUE:\s*(.*?)\]\nVOICEOVER:\s*"(.*?)"/g;
  
  const scenes = [];
  let match;

  // Extract all scenes from the raw text
  while ((match = blockRegex.exec(transcriptText)) !== null) {
    scenes.push({
      visual: match[1],
      textOverlay: match[2],
      audioCue: match[3],
      voiceover: match[4]
    });
  }

  if (scenes.length === 0) {
    return null; // Hide the component if the AI hasn't generated the blueprint yet
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 mt-6">
      {scenes.map((scene, index) => (
        <div key={index} className="flex flex-col md:flex-row bg-gray-900 border border-gray-700 rounded-lg overflow-hidden shadow-sm">
          {/* Visual Canvas (Left) */}
          <div className="md:w-1/2 p-4 border-b md:border-b-0 md:border-r border-gray-700 bg-gray-800">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2 block">Scene {index + 1}</span>
            <p className="text-gray-200 text-sm mb-3">🎥 {scene.visual}</p>
            <div className="inline-block bg-gray-700 px-2 py-1 rounded text-xs text-yellow-300 font-mono">
              TXT: {scene.textOverlay}
            </div>
          </div>
          
          {/* Audio & Script (Right) */}
          <div className="md:w-1/2 p-4 flex flex-col justify-center">
            <div className="mb-3">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block mb-1">Audio Cue</span>
              <p className="text-gray-400 text-xs italic">🎵 {scene.audioCue}</p>
            </div>
            <div>
              <span className="text-xs font-bold text-green-400 uppercase tracking-wider block mb-1">Voiceover</span>
              <p className="text-white text-sm font-medium">"{scene.voiceover}"</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VisualBlueprintParser;