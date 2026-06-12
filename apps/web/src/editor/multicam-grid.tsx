import React, { useEffect, useState } from "react";
// import { useWasm } from "@/hooks/use-wasm";

export function MulticamGrid() {
    const [activeAngle, setActiveAngle] = useState(0);
    // const { time } = useWasm();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (["1", "2", "3", "4"].includes(e.key)) {
                const angle = parseInt(e.key) - 1;
                setActiveAngle(angle);
                
                // MOCK WASM BINDING:
                // time.trigger_live_cut(angle, currentFrameTimestamp);
                console.log(`Live cut triggered to Camera ${angle + 1}!`);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const angles = ["CAM A (Wide)", "CAM B (Close up)", "CAM C (Over shoulder)", "CAM D (Drone)"];

    return (
        <div className="grid grid-cols-2 gap-2 p-4 bg-gray-900 border border-gray-800 rounded">
            {angles.map((label, idx) => (
                <div 
                    key={idx} 
                    className={`relative w-full aspect-video flex items-center justify-center rounded border-2 transition-all ${
                        activeAngle === idx ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]" : "border-gray-700"
                    }`}
                >
                    <span className="text-gray-400 font-mono text-sm">{label}</span>
                    <div className="absolute top-2 left-2 bg-black bg-opacity-70 px-2 py-1 rounded text-xs text-white font-bold">
                        {idx + 1}
                    </div>
                    {activeAngle === idx && (
                        <div className="absolute top-2 right-2 bg-red-600 px-2 py-1 rounded text-xs text-white font-bold animate-pulse">
                            REC
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
