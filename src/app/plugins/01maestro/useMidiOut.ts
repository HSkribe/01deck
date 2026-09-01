import { useCallback, useEffect, useRef, useState } from 'react';

export interface MidiPort {
  id: string;
  name: string;
  manufacturer: string;
}

export interface MidiOutState {
  supported: boolean;       // Web MIDI API available
  access: MIDIAccess | null;
  outputs: MidiPort[];
  selectedOutputId: string | null;
  clockRunning: boolean;
  error: string | null;
}

// MIDI channel assignments per Maestro band role (1-indexed, 1–16)
export const ROLE_MIDI_CHANNEL: Record<string, number> = {
  producer: 1,
  drums:    10, // GM standard drum channel
  keys:     2,
  bass:     3,
  synth:    4,
  vocals:   5,
};

// Preferred Ableton-friendly instrument name per role (shown in setup guide)
export const ROLE_INSTRUMENT_SUGGESTION: Record<string, string> = {
  producer: 'Grand Piano / Chord rack',
  drums:    'Drum Rack',
  keys:     'Electric Piano / Rhodes',
  bass:     'Bass Rack / Analog bass',
  synth:    'Wavetable / Operator pad',
  vocals:   'Voice / Choir sample',
};

function toMidiBytes(status: number, data1: number, data2 = 0): Uint8Array {
  return new Uint8Array([status, data1, data2]);
}

export function useMidiOut() {
  const [state, setState] = useState<MidiOutState>({
    supported: typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator,
    access: null,
    outputs: [],
    selectedOutputId: null,
    clockRunning: false,
    error: null,
  });

  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accessRef = useRef<MIDIAccess | null>(null);

  // Build port list from MIDIAccess
  const refreshOutputs = useCallback((access: MIDIAccess) => {
    const ports: MidiPort[] = [];
    access.outputs.forEach(out => {
      ports.push({ id: out.id, name: out.name ?? out.id, manufacturer: out.manufacturer ?? '' });
    });
    setState(prev => ({ ...prev, outputs: ports }));
  }, []);

  const initialize = useCallback(async () => {
    if (!('requestMIDIAccess' in navigator)) {
      setState(prev => ({ ...prev, error: 'Web MIDI API not supported in this browser.' }));
      return;
    }
    try {
      const access = await navigator.requestMIDIAccess({ sysex: false });
      accessRef.current = access;
      refreshOutputs(access);
      access.onstatechange = () => refreshOutputs(access);

      // Auto-select a port named "01Maestro" or "loopMIDI" if present
      let autoId: string | null = null;
      access.outputs.forEach(out => {
        const name = (out.name ?? '').toLowerCase();
        if (!autoId && (name.includes('01maestro') || name.includes('loopmidi'))) {
          autoId = out.id;
        }
      });

      setState(prev => ({
        ...prev,
        supported: true,
        access,
        error: null,
        selectedOutputId: autoId ?? prev.selectedOutputId,
      }));
    } catch (err) {
      setState(prev => ({ ...prev, error: err instanceof Error ? err.message : 'MIDI access denied' }));
    }
  }, [refreshOutputs]);

  const selectOutput = useCallback((id: string) => {
    setState(prev => ({ ...prev, selectedOutputId: id }));
  }, []);

  // --- MIDI send helpers ---

  const getOutput = useCallback((): MIDIOutput | null => {
    const access = accessRef.current;
    const id = state.selectedOutputId;
    if (!access || !id) return null;
    return access.outputs.get(id) ?? null;
  }, [state.selectedOutputId]);

  const noteOn = useCallback((channel: number, midi: number, velocity = 100) => {
    const out = getOutput();
    if (!out) return;
    out.send(toMidiBytes(0x90 | ((channel - 1) & 0x0f), midi & 0x7f, velocity & 0x7f));
  }, [getOutput]);

  const noteOff = useCallback((channel: number, midi: number) => {
    const out = getOutput();
    if (!out) return;
    out.send(toMidiBytes(0x80 | ((channel - 1) & 0x0f), midi & 0x7f, 0));
  }, [getOutput]);

  const noteOnWithAutoOff = useCallback((channel: number, midi: number, velocity = 100, durationMs = 300) => {
    noteOn(channel, midi, velocity);
    setTimeout(() => noteOff(channel, midi), durationMs);
  }, [noteOn, noteOff]);

  // All notes off on all agent channels (panic)
  const allNotesOff = useCallback(() => {
    const out = getOutput();
    if (!out) return;
    Object.values(ROLE_MIDI_CHANNEL).forEach(ch => {
      out.send(toMidiBytes(0xb0 | ((ch - 1) & 0x0f), 123, 0)); // CC 123 = All Notes Off
    });
  }, [getOutput]);

  // --- MIDI Clock (tempo sync) ---
  // 24 pulses per quarter note = MIDI spec
  const startClock = useCallback((bpm: number) => {
    if (clockRef.current) clearInterval(clockRef.current);
    const out = getOutput();
    if (!out) return;

    // Send MIDI Start (0xFA)
    out.send(new Uint8Array([0xfa]));

    const intervalMs = (60000 / bpm) / 24;
    clockRef.current = setInterval(() => {
      const o = getOutput();
      if (o) o.send(new Uint8Array([0xf8])); // Timing clock
    }, intervalMs);

    setState(prev => ({ ...prev, clockRunning: true }));
  }, [getOutput]);

  const stopClock = useCallback(() => {
    if (clockRef.current) { clearInterval(clockRef.current); clockRef.current = null; }
    const out = getOutput();
    if (out) out.send(new Uint8Array([0xfc])); // MIDI Stop
    setState(prev => ({ ...prev, clockRunning: false }));
  }, [getOutput]);

  const updateClockBpm = useCallback((bpm: number) => {
    if (!state.clockRunning) return;
    startClock(bpm);
  }, [state.clockRunning, startClock]);

  // --- Transport control (matched by MaestroSurface.py CC handler on ch 16) ---
  // CC 119 ch16: value ≥ 64 = play, < 64 = stop
  // CC 118 ch16: value ≥ 64 = toggle record
  const sendPlay = useCallback(() => {
    const out = getOutput();
    if (out) out.send(toMidiBytes(0xBF, 119, 127)); // ch16, CC119, val=127
  }, [getOutput]);

  const sendStop = useCallback(() => {
    const out = getOutput();
    if (out) out.send(toMidiBytes(0xBF, 119, 0));   // ch16, CC119, val=0
  }, [getOutput]);

  const sendRecord = useCallback(() => {
    const out = getOutput();
    if (out) out.send(toMidiBytes(0xBF, 118, 127)); // ch16, CC118, val=127
  }, [getOutput]);

  useEffect(() => () => {
    if (clockRef.current) clearInterval(clockRef.current);
  }, []);

  return {
    state,
    initialize,
    selectOutput,
    noteOn,
    noteOff,
    noteOnWithAutoOff,
    allNotesOff,
    startClock,
    stopClock,
    updateClockBpm,
    sendPlay,
    sendStop,
    sendRecord,
  };
}
