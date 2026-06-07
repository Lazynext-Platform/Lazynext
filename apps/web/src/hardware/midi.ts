/**
 * Hardware console manager for physical control surfaces.
 *
 * Supports MIDI-enabled hardware like DaVinci Resolve panels, Loupedeck,
 * and MIDI controllers for timeline scrubbing, color grading, and mixing.
 *
 * Uses the Web MIDI API (navigator.requestMIDIAccess).
 * Falls back gracefully if MIDI is not available.
 */

interface MidiMessage {
  data: Uint8Array;
}

export class HardwareConsoleManager {
  private midiAccess: MIDIAccess | null = null;
  private cleanupFns: Array<() => void> = [];

  /** Initialize MIDI and start listening for hardware events. */
  async initialize(): Promise<void> {
    try {
      if (!("requestMIDIAccess" in navigator)) {
        console.log("[MIDI] Web MIDI API not available in this browser.");
        return;
      }

      console.log("[MIDI] Requesting hardware console access...");
      this.midiAccess = await navigator.requestMIDIAccess();

      for (const input of this.midiAccess.inputs.values()) {
        console.log(`[MIDI] Connected: ${input.name ?? "unnamed"}`);
        const handler = this.handleMidiMessage.bind(this);
        input.addEventListener("midimessage", handler as EventListener);
        this.cleanupFns.push(() =>
          input.removeEventListener("midimessage", handler as EventListener),
        );
      }
    } catch (error) {
      console.warn("[MIDI] Access denied or not supported:", error);
    }
  }

  private handleMidiMessage(event: MidiMessage): void {
    const data = event.data;
    if (!data || data.length < 3) return;

    const [command, note, velocity] = data;

    // Control Change (Jog Wheels / Trackballs / Faders)
    if (command === 0xb0) {
      switch (note) {
        case 10: {
          // Jog Wheel — timeline scrubbing
          const direction = velocity! > 64 ? 1 : -1;
          console.log(`[MIDI] Timeline scrub: ${direction > 0 ? "→" : "←"}`);
          break;
        }
        case 11: {
          // Color wheel — Lift/Gamma/Gain
          const value = ((velocity ?? 64) - 64) / 64;
          console.log(`[MIDI] Color wheel adjustment: ${value.toFixed(2)}`);
          break;
        }
      }
    }
  }

  /** Disconnect and release MIDI access. */
  disconnect(): void {
    for (const fn of this.cleanupFns) {
      fn();
    }
    this.cleanupFns = [];
    this.midiAccess = null;
  }
}
