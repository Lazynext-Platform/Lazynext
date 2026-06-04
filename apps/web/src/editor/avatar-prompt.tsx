import React, { useState } from "react";
// import { useMcpServer } from "@/hooks/use-mcp";

export function AvatarPrompt() {
    const [script, setScript] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    // const { avatarGenerator } = useMcpServer();

    const handleGenerate = async () => {
        setIsGenerating(true);
        console.log("Requesting AI Avatar generation...");
        // MOCK: const videoUrl = await avatarGenerator.generateAvatar(script, "voice-123");
        // add_clip_to_timeline(videoUrl);
        
        setTimeout(() => {
            setIsGenerating(false);
            console.log("Avatar generated and dropped onto timeline!");
        }, 2000);
    };

    return (
        <div className="p-4 bg-gray-900 border border-purple-500 rounded flex flex-col gap-3 w-80 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
            <h3 className="text-white font-bold text-sm">🤖 AI Actor Studio</h3>
            
            <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Type the script for your AI avatar to read..."
                className="w-full h-24 bg-gray-800 text-white p-2 rounded border border-gray-700 focus:border-purple-500 text-sm"
            />
            
            <button 
                onClick={handleGenerate}
                disabled={isGenerating || script.length === 0}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded disabled:opacity-50 transition-colors"
            >
                {isGenerating ? "Synthesizing..." : "Generate & Insert"}
            </button>
        </div>
    );
}
