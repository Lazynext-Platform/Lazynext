// @ts-nocheck
// import { useWasm } from "@/hooks/use-wasm";

export class HardwareConsoleManager {
    private midiAccess: WebMidi.MIDIAccess | null = null;
    
    public async initialize() {
        try {
            console.log("Requesting WebMIDI API access for Hardware Console...");
            this.midiAccess = await navigator.requestMIDIAccess();
            
            for (const input of this.midiAccess.inputs.values()) {
                console.log(`Connected physical control panel: ${input.name}`);
                input.onmidimessage = this.handleMidiMessage.bind(this);
            }
        } catch (error) {
            console.warn("MIDI access denied or not supported by browser.", error);
        }
    }

    private handleMidiMessage(event: WebMidi.MIDIMessageEvent) {
        if (!event.data) return;

        const [command, note, velocity] = event.data;
        // const { gpu, time } = useWasm();

        // MOCK: Parsing physical DaVinci Resolve Mini Panel or Loupedeck events
        if (command === 176) { // Control Change (Jog Wheels / Trackballs)
            if (note === 10) {
                // Example: Jog Wheel Timeline scrubbing
                const direction = velocity > 64 ? 1 : -1;
                // time.scrub_timeline(direction);
                console.log(`Scrubbing timeline physically! Direction: ${direction}`);
            } else if (note === 11) {
                // Example: Lift/Gamma/Gain color wheel adjustment
                const value = (velocity - 64) / 64.0; 
                // gpu.adjust_color_lift(value);
                console.log(`Physical Color Wheel adjusted Lift by ${value}`);
            }
        }
    }
}
