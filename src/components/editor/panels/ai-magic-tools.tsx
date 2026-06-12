import React, { useState } from 'react';
import { Sparkles, Wand2, Video, Mic, RefreshCw, Plus } from 'lucide-react';
import { useEditorState } from '../useEditorState';
import { toast } from 'sonner';

export function AIMagicTools() {
  const { setAssets } = useEditorState();
  const [activeTab, setActiveTab] = useState<'video' | 'audio'>('video');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, type: activeTab })
      });

      if (!response.ok) throw new Error('Generation failed');

      const data = await response.json();

      const newAsset = {
        id: `asset-${Date.now()}`,
        name: data.name,
        type: data.type,
        url: data.url,
      };

      // Add to Media Pool
      setAssets((prev: any) => [...prev, newAsset]);
      toast.success(`${activeTab === 'video' ? 'Video' : 'Voiceover'} generated and added to Media Pool!`);
      setPrompt('');

    } catch (error) {
      toast.error('Failed to generate media.');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-80 h-full bg-neutral-900 border-l border-neutral-800 flex flex-col font-sans">
      <div className="p-4 border-b border-neutral-800 bg-neutral-950/50 backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-4">
          <Wand2 className="w-5 h-5 text-cyan-400" />
          <h2 className="font-semibold text-white">Generative Studio</h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-neutral-900 rounded-lg">
          <button
            onClick={() => setActiveTab('video')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'video' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <Video className="w-3 h-3" /> Video
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'audio' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <Mic className="w-3 h-3" /> Voice
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-2">
            {activeTab === 'video' ? 'Text-to-Video Prompt' : 'Text-to-Speech Script'}
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={activeTab === 'video' ? "A cinematic drone shot of a cyberpunk city..." : "Welcome to the future of editing..."}
            className="w-full h-32 bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 resize-none transition-all"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full relative group overflow-hidden bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-neutral-700 flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span>Generate {activeTab === 'video' ? 'Video' : 'Audio'}</span>
            </>
          )}
          
          {/* Button Hover Glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        </button>

        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 mt-6">
          <p className="text-xs text-cyan-400 leading-relaxed">
            <strong>Pro Tip:</strong> Generated assets are automatically added to your Media Pool. You can instantly drag them onto the timeline.
          </p>
        </div>
      </div>
    </div>
  );
}
