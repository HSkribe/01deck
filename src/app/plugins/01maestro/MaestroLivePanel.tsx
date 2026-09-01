import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, AlertCircle, Cable, CheckCircle2, ChevronDown, Clock, Mic, MicOff, Music2, RefreshCw, Volume2, Zap } from 'lucide-react';
import {
  AgentRole,
  getResponseNotes,
  midiToFreq,
  useAudioEngine,
} from './useAudioEngine';
import {
  ROLE_INSTRUMENT_SUGGESTION,
  ROLE_MIDI_CHANNEL,
  useMidiOut,
} from './useMidiOut';
import { Agent } from '../../data/agents';
import { ThemeConfig } from '../../context/AppContext';

const ACCENT = '#ff4da6';
const DAW_ACCENT = '#22c55e'; // green for DAW connected state

// Waveform bar heights mapped from RMS
const BAR_COUNT = 24;

interface AgentSynthState {
  active: boolean;
  currentNotes: number[];
}

// Maps a BandRole label to AgentRole for response calculation
function labelToAgentRole(label: string): AgentRole {
  const map: Record<string, AgentRole> = {
    Producer: 'producer', Drums: 'drums', Keys: 'keys',
    Bass: 'bass', Synth: 'synth', Vocals: 'vocals',
  };
  return map[label] ?? 'keys';
}

// Waveform bars visualizer
function WaveBar({ height, active }: { height: number; active: boolean }) {
  return (
    <div
      style={{
        width: 6,
        height: Math.max(4, height * 60),
        borderRadius: 3,
        background: active ? ACCENT : 'rgba(255,77,166,0.25)',
        transition: 'height 0.06s ease, background 0.15s',
        alignSelf: 'center',
      }}
    />
  );
}

interface Props {
  t: ThemeConfig;
  bandAssignments: Record<string, Agent | null>; // roleId → agent
  roleLabels: Array<{ id: string; label: string }>;
}

export function MaestroLivePanel({ t, bandAssignments, roleLabels }: Props) {
  const { state, startListening, stopListening, audioCtx } = useAudioEngine();
  const { listening, amplitude, pitch, detectedBpm, error } = state;

  const midi = useMidiOut();
  const [dawConnected, setDawConnected] = useState(false);
  const [showDawSetup, setShowDawSetup] = useState(false);
  const [dawMode, setDawMode] = useState<'midi-only' | 'both'>('both');

  // Per-role active synth agents
  const [synthStates, setSynthStates] = useState<Record<string, AgentSynthState>>({});

  // Oscillator pool — keyed by "roleId:midi"
  const oscPool = useRef<Map<string, { osc: OscillatorNode; gain: GainNode }>>(new Map());

  // Track last played time per role to avoid re-triggering too fast
  const lastTriggerRef = useRef<Record<string, number>>({});

  // Root key tracking (simple: follow the most common detected pitch)
  const rootMidiRef = useRef<number>(60); // default C4
  const recentMidisRef = useRef<number[]>([]);

  // Waveform bars history
  const barsRef = useRef<number[]>(Array(BAR_COUNT).fill(0));
  const [bars, setBars] = useState<number[]>(Array(BAR_COUNT).fill(0));

  // Update root key estimate from recent pitches
  useEffect(() => {
    if (!pitch) return;
    const midi = Math.round(pitch.midi);
    recentMidisRef.current.push(midi % 12);
    if (recentMidisRef.current.length > 20) recentMidisRef.current.shift();

    // Most common pitch class = likely root
    const counts = new Array(12).fill(0);
    for (const m of recentMidisRef.current) counts[m]++;
    const root = counts.indexOf(Math.max(...counts));
    // Anchor root to octave 3 (midi 36 = C3)
    rootMidiRef.current = 36 + root;
  }, [pitch]);

  // Animate waveform bars
  useEffect(() => {
    const shifted = [...barsRef.current.slice(1), amplitude];
    barsRef.current = shifted;
    setBars([...shifted]);
  }, [amplitude]);

  // Waveform type per role
  const waveformFor = (role: AgentRole): OscillatorType => {
    const map: Record<AgentRole, OscillatorType> = {
      bass: 'sawtooth', keys: 'triangle', synth: 'sine',
      vocals: 'sine', producer: 'triangle', drums: 'square',
    };
    return map[role];
  };

  const attackFor = (role: AgentRole): number => {
    if (role === 'bass') return 0.02;
    if (role === 'synth') return 0.08;
    return 0.04;
  };

  const releaseFor = (role: AgentRole): number => {
    if (role === 'bass') return 0.4;
    if (role === 'synth') return 0.8;
    return 0.3;
  };

  const playNotes = useCallback((roleId: string, roleLabel: string, midiNotes: number[]) => {
    const ctx = audioCtx.current;
    const role = labelToAgentRole(roleLabel);
    const midiChannel = ROLE_MIDI_CHANNEL[role] ?? 1;

    // --- MIDI output to DAW ---
    if (dawConnected && midi.state.selectedOutputId) {
      midiNotes.forEach(note => midi.noteOnWithAutoOff(midiChannel, note, 100, 600));
    }

    // --- Web Audio preview (skip in midi-only mode when DAW connected) ---
    if (!dawConnected || dawMode === 'both') {
      if (!ctx) return;
      const wave = waveformFor(role);
      const attack = attackFor(role);
      const release = releaseFor(role);
      const now = ctx.currentTime;

      for (const [key, { osc, gain }] of oscPool.current.entries()) {
        if (key.startsWith(roleId + ':')) {
          gain.gain.setTargetAtTime(0, now, 0.05);
          osc.stop(now + 0.2);
          oscPool.current.delete(key);
        }
      }

      for (const midiNote of midiNotes) {
        const freq = midiToFreq(midiNote);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = wave;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.18, now + attack);
        gain.gain.setTargetAtTime(0.12, now + attack + 0.05, 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        gain.gain.setTargetAtTime(0, now + 1.2, release / 3);
        osc.stop(now + 1.5);
        oscPool.current.set(`${roleId}:${midiNote}`, { osc, gain });
      }
    }

    setSynthStates(prev => ({ ...prev, [roleId]: { active: true, currentNotes: midiNotes } }));
    setTimeout(() => setSynthStates(prev => ({ ...prev, [roleId]: { ...prev[roleId], active: false } })), 600);
  }, [audioCtx, dawConnected, dawMode, midi]);

  // Sync MIDI clock when BPM changes
  useEffect(() => {
    if (dawConnected && detectedBpm) midi.updateClockBpm(detectedBpm);
  }, [detectedBpm, dawConnected, midi]);

  // Stop MIDI clock when listener stops
  useEffect(() => {
    if (!listening && midi.state.clockRunning) midi.stopClock();
  }, [listening, midi]);


  // Trigger agent responses when a new pitch is detected
  useEffect(() => {
    if (!listening || !pitch || !audioCtx.current) return;
    const now = performance.now();

    for (const { id: roleId, label } of roleLabels) {
      const agent = bandAssignments[roleId];
      if (!agent) continue;

      const lastTrigger = lastTriggerRef.current[roleId] ?? 0;
      // Debounce per role — don't re-trigger within 250ms
      if (now - lastTrigger < 250) continue;
      lastTriggerRef.current[roleId] = now;

      const notes = getResponseNotes(Math.round(pitch.midi), labelToAgentRole(label), rootMidiRef.current, false);
      playNotes(roleId, label, notes);
    }
  }, [pitch, listening, bandAssignments, roleLabels, playNotes]);

  // Stop all oscillators when listener stops
  useEffect(() => {
    if (!listening) {
      for (const { osc } of oscPool.current.values()) {
        try { osc.stop(); } catch { /* already stopped */ }
      }
      oscPool.current.clear();
    }
  }, [listening]);

  return (
    <div
      className="border-t"
      style={{ borderColor: ACCENT + '30', background: t.surface2 }}
    >
      {/* ── DAW Connect ─────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-2">
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${dawConnected ? DAW_ACCENT + '50' : t.border}` }}>
          {/* DAW header row */}
          <button
            onClick={() => setShowDawSetup(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2.5 transition-all hover:bg-white/5"
            style={{ background: dawConnected ? DAW_ACCENT + '08' : t.surface3 }}
          >
            <div className="flex items-center gap-2">
              <Cable size={13} style={{ color: dawConnected ? DAW_ACCENT : t.textMuted }} />
              <span className="text-xs font-semibold" style={{ color: dawConnected ? t.text : t.textMuted }}>
                Ableton Live
              </span>
              {dawConnected ? (
                <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: DAW_ACCENT + '20', color: DAW_ACCENT }}>
                  <CheckCircle2 size={9} /> Connected
                </span>
              ) : (
                <span className="text-[10px]" style={{ color: t.textMuted }}>via Web MIDI</span>
              )}
              {midi.state.clockRunning && (
                <span className="flex items-center gap-1 text-[10px] px-1 rounded" style={{ color: DAW_ACCENT, background: DAW_ACCENT + '15' }}>
                  <Clock size={9} /> Sync
                </span>
              )}
            </div>
            <ChevronDown size={13} style={{ color: t.textMuted, transform: showDawSetup ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }} />
          </button>

          {showDawSetup && (
            <div className="px-3 pb-3 pt-2 space-y-3" style={{ background: t.surface1 }}>
              {/* MIDI not supported warning */}
              {!midi.state.supported && (
                <div className="flex items-start gap-2 px-2 py-2 rounded-lg text-[10px]" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
                  <AlertCircle size={11} className="shrink-0 mt-0.5" />
                  Web MIDI API not supported. Use Chrome or Edge.
                </div>
              )}

              {midi.state.error && (
                <div className="flex items-start gap-2 px-2 py-2 rounded-lg text-[10px]" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
                  <AlertCircle size={11} className="shrink-0 mt-0.5" />
                  {midi.state.error}
                </div>
              )}

              {/* Output port picker */}
              <div>
                <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: t.textMuted }}>MIDI Output Port</div>
                <div className="flex gap-2">
                  <select
                    value={midi.state.selectedOutputId ?? ''}
                    onChange={e => midi.selectOutput(e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded-lg text-xs outline-none"
                    style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.text }}
                  >
                    <option value="" style={{ background: t.surface1 }}>— Select port —</option>
                    {midi.state.outputs.map(p => (
                      <option key={p.id} value={p.id} style={{ background: t.surface1 }}>
                        {p.name}{p.manufacturer ? ` (${p.manufacturer})` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => midi.state.access ? undefined : midi.initialize()}
                    className="px-2 py-1.5 rounded-lg text-xs transition-all hover:bg-white/10"
                    style={{ border: `1px solid ${t.border}`, color: t.textMuted }}
                    title="Refresh ports"
                  >
                    <RefreshCw size={12} />
                  </button>
                </div>
                {midi.state.outputs.length === 0 && midi.state.supported && (
                  <p className="text-[10px] mt-1.5" style={{ color: t.textMuted }}>
                    No MIDI ports found. Install <span className="font-semibold" style={{ color: t.text }}>loopMIDI</span> (Windows) and create a port named <span className="font-mono" style={{ color: ACCENT }}>01Maestro</span>.
                  </p>
                )}
              </div>

              {/* Audio mode toggle */}
              <div>
                <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: t.textMuted }}>Audio Output</div>
                <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${t.border}` }}>
                  {(['both', 'midi-only'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setDawMode(mode)}
                      className="flex-1 py-1.5 text-[10px] font-medium transition-all"
                      style={{
                        background: dawMode === mode ? ACCENT + '20' : t.surface2,
                        color: dawMode === mode ? ACCENT : t.textMuted,
                        borderRight: mode === 'both' ? `1px solid ${t.border}` : undefined,
                      }}
                    >
                      {mode === 'both' ? 'Preview + DAW' : 'DAW Only'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Connect / Disconnect */}
              <button
                onClick={async () => {
                  if (!dawConnected) {
                    if (!midi.state.access) await midi.initialize();
                    if (midi.state.selectedOutputId || midi.state.outputs.length > 0) {
                      if (!midi.state.selectedOutputId && midi.state.outputs.length > 0) {
                        midi.selectOutput(midi.state.outputs[0].id);
                      }
                      setDawConnected(true);
                      if (listening && detectedBpm) midi.startClock(detectedBpm);
                    }
                  } else {
                    midi.stopClock();
                    midi.allNotesOff();
                    setDawConnected(false);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: dawConnected ? 'rgba(239,68,68,0.12)' : DAW_ACCENT + '18',
                  border: `1px solid ${dawConnected ? 'rgba(239,68,68,0.35)' : DAW_ACCENT + '50'}`,
                  color: dawConnected ? '#ef4444' : DAW_ACCENT,
                }}
              >
                <Zap size={12} />
                {dawConnected ? 'Disconnect' : 'Connect to Ableton'}
              </button>

              {/* Channel map */}
              <div>
                <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: t.textMuted }}>Ableton Track Setup</div>
                <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${t.border}` }}>
                  <div className="grid grid-cols-3 px-2 py-1 text-[9px] uppercase tracking-wider" style={{ background: t.surface3, color: t.textMuted }}>
                    <span>Role</span><span>Ch</span><span>Instrument</span>
                  </div>
                  {roleLabels.map(({ id, label }) => {
                    const role = labelToAgentRole(label);
                    const ch = ROLE_MIDI_CHANNEL[role] ?? '—';
                    const inst = ROLE_INSTRUMENT_SUGGESTION[role] ?? '';
                    const agent = bandAssignments[id];
                    return (
                      <div key={id} className="grid grid-cols-3 px-2 py-1.5 text-[10px]" style={{ borderTop: `1px solid ${t.border}` }}>
                        <span className="font-mono" style={{ color: agent ? ACCENT : t.textMuted }}>{label}</span>
                        <span className="font-mono font-bold" style={{ color: t.text }}>{ch}</span>
                        <span className="truncate" style={{ color: t.textMuted }}>{inst}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Control surface install steps */}
                <div className="space-y-1 text-[10px] leading-relaxed" style={{ color: t.textMuted }}>
                  <p className="font-semibold" style={{ color: t.text }}>First-time setup:</p>
                  <p>1. Install <span className="font-mono" style={{ color: t.text }}>loopMIDI</span> → create port <span className="font-mono" style={{ color: ACCENT }}>01Maestro</span></p>
                  <p>2. Run <span className="font-mono" style={{ color: t.text }}>Install-01Maestro.ps1</span> from the <span className="font-mono">01maestro/AbletonRemoteScript/</span> folder</p>
                  <p>3. Restart Ableton → <span className="italic">Preferences → MIDI → Control Surfaces</span></p>
                  <p>4. Choose <span className="font-mono font-bold" style={{ color: DAW_ACCENT }}>01Maestro</span> · Input + Output = <span className="font-mono" style={{ color: ACCENT }}>01Maestro</span></p>
                  <p>5. Add 6 MIDI tracks — the script names + arms them automatically</p>
                </div>

                {/* Ableton transport buttons (only when connected) */}
                {dawConnected && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: t.textMuted }}>Ableton Transport</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => midi.sendPlay()}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-medium transition-all hover:bg-white/10"
                        style={{ background: DAW_ACCENT + '15', border: `1px solid ${DAW_ACCENT}40`, color: DAW_ACCENT }}
                      >
                        ▶ Play
                      </button>
                      <button
                        onClick={() => midi.sendStop()}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-medium transition-all hover:bg-white/10"
                        style={{ background: t.surface3, border: `1px solid ${t.border}`, color: t.textMuted }}
                      >
                        ■ Stop
                      </button>
                      <button
                        onClick={() => midi.sendRecord()}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-medium transition-all hover:bg-white/10"
                        style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#ef4444' }}
                      >
                        ● Rec
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Live Listen header ───────────────────────────────────── */}
      <div className="px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: listening ? ACCENT : t.textMuted,
              boxShadow: listening ? `0 0 6px ${ACCENT}` : 'none',
              animation: listening ? 'pulse 1.2s ease-in-out infinite' : 'none',
            }}
          />
          <span className="text-xs font-semibold" style={{ color: listening ? t.text : t.textMuted }}>
            {listening ? 'Listening…' : 'Live Mode'}
          </span>
          {detectedBpm && listening && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: ACCENT + '20', color: ACCENT }}>
              {detectedBpm} BPM
            </span>
          )}
        </div>

        <button
          onClick={listening ? stopListening : startListening}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{
            background: listening ? 'rgba(239,68,68,0.15)' : ACCENT + '20',
            border: `1px solid ${listening ? 'rgba(239,68,68,0.4)' : ACCENT + '50'}`,
            color: listening ? '#ef4444' : ACCENT,
          }}
        >
          {listening ? <MicOff size={12} /> : <Mic size={12} />}
          {listening ? 'Stop' : 'Start Listening'}
        </button>
      </div>

      {error && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
          {error}
        </div>
      )}

      {/* Waveform visualizer */}
      <div className="px-4 pb-2">
        <div className="flex items-end gap-[3px] h-12 px-1 rounded-lg" style={{ background: t.surface3 }}>
          {bars.map((h, i) => (
            <WaveBar key={i} height={h} active={listening && h > 0.08} />
          ))}
        </div>
      </div>

      {/* Detected pitch display */}
      {listening && (
        <div className="px-4 pb-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg p-2 flex items-center gap-2" style={{ background: t.surface3, border: `1px solid ${t.border}` }}>
            <Music2 size={12} style={{ color: ACCENT }} />
            <div>
              <div className="text-[9px] uppercase tracking-wider" style={{ color: t.textMuted }}>Detected</div>
              <div className="text-sm font-mono font-bold" style={{ color: t.text }}>
                {pitch ? `${pitch.note}${pitch.octave}` : '—'}
                {pitch && Math.abs(pitch.cents) > 5 && (
                  <span className="text-[10px] font-normal ml-1" style={{ color: pitch.cents > 0 ? '#f59e0b' : '#60a5fa' }}>
                    {pitch.cents > 0 ? `+${pitch.cents}¢` : `${pitch.cents}¢`}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg p-2 flex items-center gap-2" style={{ background: t.surface3, border: `1px solid ${t.border}` }}>
            <Volume2 size={12} style={{ color: ACCENT }} />
            <div className="flex-1">
              <div className="text-[9px] uppercase tracking-wider" style={{ color: t.textMuted }}>Level</div>
              <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: t.border }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${amplitude * 100}%`, background: amplitude > 0.7 ? '#ef4444' : ACCENT }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Per-role response indicators */}
      {listening && (
        <div className="px-4 pb-3 grid grid-cols-3 gap-1.5">
          {roleLabels.map(({ id, label }) => {
            const agent = bandAssignments[id];
            const synth = synthStates[id];
            if (!agent) return null;
            return (
              <div
                key={id}
                className="rounded px-2 py-1.5 flex items-center gap-1.5 transition-all"
                style={{
                  background: synth?.active ? ACCENT + '18' : t.surface3,
                  border: `1px solid ${synth?.active ? ACCENT + '60' : t.border}`,
                  transition: 'all 0.1s',
                }}
              >
                <Activity
                  size={10}
                  style={{ color: synth?.active ? ACCENT : t.textMuted, transition: 'color 0.1s' }}
                />
                <div className="min-w-0">
                  <div className="text-[9px] truncate font-mono" style={{ color: t.textMuted }}>{label}</div>
                  <div className="text-[10px] truncate font-semibold" style={{ color: synth?.active ? ACCENT : t.text }}>
                    {agent.name}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
