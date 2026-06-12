"use client";

import { Button } from "@/components/ui/button";

const TRANSITIONS = [
    { id: "crossfade", name: "Crossfade", description: "Smoothly fade between two clips" },
    { id: "wipe_left", name: "Wipe Left", description: "Wipe from right to left" },
    { id: "wipe_right", name: "Wipe Right", description: "Wipe from left to right" },
    { id: "dissolve", name: "Dissolve", description: "Dissolve one clip into another" },
];

export function TransitionsView() {
    return (
        <div className="flex h-full flex-col gap-4 p-4 overflow-y-auto">
            <div className="text-sm font-medium">Transitions</div>
            <div className="text-xs text-muted-foreground">
                Drag a transition between two clips on the timeline to apply it.
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-4">
                {TRANSITIONS.map((transition) => (
                    <Button 
                        key={transition.id} 
                        variant="outline" 
                        className="flex flex-col items-start gap-1 p-3 h-auto"
                        title={transition.description}
                    >
                        <span className="text-xs font-semibold">{transition.name}</span>
                        <span className="text-[10px] text-muted-foreground line-clamp-2 text-left">
                            {transition.description}
                        </span>
                    </Button>
                ))}
            </div>
        </div>
    );
}
