"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ScriptingView() {
    const [script, setScript] = useState("console.log('Hello from Lazynext Plugin!');");
    const [output, setOutput] = useState("");

    const handleExecute = async () => {
        try {
            // Dynamically import wasm to execute the script using the PluginRuntime
            const wasm = await import("lazynext-wasm");
            const plugin = new wasm.WasmPluginRuntime();
            const result = plugin.execute_script(script);
            setOutput(result);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            setOutput(e.toString());
        }
    };

    return (
        <div className="flex h-full flex-col p-4 gap-4">
            <div className="text-sm font-medium">Scripting (Phase 2)</div>
            <Textarea 
                value={script} 
                onChange={(e) => setScript(e.target.value)} 
                className="flex-1 font-mono text-xs resize-none" 
                placeholder="Write your plugin script here..." 
            />
            <Button onClick={handleExecute}>Execute Script</Button>
            <div className="h-32 rounded-md border p-2 bg-muted/50 overflow-y-auto font-mono text-xs whitespace-pre-wrap">
                {output || "Output will appear here..."}
            </div>
        </div>
    );
}
