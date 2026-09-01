import { useCallback, useEffect, useRef, useState } from 'react';

export type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

export interface DetectedPitch {
  frequency: number;
  note: NoteName;
  octave: number;
  cents: number; // deviation from perfect pitch (-50 to +50)
  midi: number;
}

export interface AudioEngineState {
  listening: boolean;
  amplitude: number;        // 0-1 RMS level
  pitch: DetectedPitch | null;
  detectedBpm: number | null;
  error: string | null;
}

const NOTE_NAMES: NoteName[] = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// Standard MIDI note 69 = A4 = 440 Hz
function freqToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}

function midiToNoteName(midi: number): { note: NoteName; octave: number; cents: number } {
  const rounded = Math.round(midi);
  const cents = Math.round((midi - rounded) * 100);
  const note = NOTE_NAMES[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return { note, octave, cents };
}

// Autocorrelation pitch detection — reliable down to ~80 Hz (low E on guitar)
function detectPitch(buffer: Float32Array, sampleRate: number): number | null {
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);
  let best_offset = -1;
  let best_corr = 0;
  let last_corr = 1;
  let found_good = false;

  // RMS gate — reject silence
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return null;

  for (let offset = 0; offset < MAX_SAMPLES; offset++) {
    let corr = 0;
    for (let i = 0; i < MAX_SAMPLES; i++) {
      corr += buffer[i] * buffer[i + offset];
    }
    corr = corr / MAX_SAMPLES;

    if (found_good && corr < 0.5) {
      break;
    }
    if (corr > 0.9 && corr > last_corr) {
      found_good = true;
      if (corr > best_corr) {
        best_corr = corr;
        best_offset = offset;
      }
    }
    last_corr = corr;
  }

  if (best_offset === -1 || best_corr < 0.01) return null;
  return sampleRate / best_offset;
}

// --- Scale & harmony helpers ---

const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

export function quantizeToScale(midi: number, rootMidi: number, minor = false): number {
  const intervals = minor ? MINOR_INTERVALS : MAJOR_INTERVALS;
  const offset = ((midi - rootMidi) % 12 + 12) % 12;
  let closest = intervals[0];
  let minDist = Math.abs(offset - intervals[0]);
  for (const iv of intervals) {
    const dist = Math.min(Math.abs(offset - iv), 12 - Math.abs(offset - iv));
    if (dist < minDist) { minDist = dist; closest = iv; }
  }
  return rootMidi + Math.floor((midi - rootMidi) / 12) * 12 + closest;
}

// Returns MIDI notes for an agent role responding to a given pitch
export type AgentRole = 'producer' | 'drums' | 'keys' | 'bass' | 'synth' | 'vocals';

export function getResponseNotes(
  detectedMidi: number,
  role: AgentRole,
  rootMidi: number,
  minor: boolean,
): number[] {
  const q = (m: number) => quantizeToScale(m, rootMidi, minor);
  switch (role) {
    case 'bass':
      // Root + 5th, two octaves below
      return [q(detectedMidi - 24), q(detectedMidi - 17)];
    case 'keys':
      // Chord: root, 3rd, 5th in same octave
      return [q(detectedMidi), q(detectedMidi + 4), q(detectedMidi + 7)];
    case 'synth':
      // Pad: root + octave up, sustained
      return [q(detectedMidi - 12), q(detectedMidi)];
    case 'vocals':
      // Harmony a 3rd above
      return [q(detectedMidi + 4)];
    case 'producer':
      // Full chord voicing
      return [q(detectedMidi - 12), q(detectedMidi), q(detectedMidi + 4), q(detectedMidi + 7)];
    default:
      return [q(detectedMidi)];
  }
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// --- Main hook ---

export function useAudioEngine() {
  const [state, setState] = useState<AudioEngineState>({
    listening: false,
    amplitude: 0,
    pitch: null,
    detectedBpm: null,
    error: null,
  });

  const ctxRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const onsetTimesRef = useRef<number[]>([]);
  const lastOnsetRef = useRef<number>(0);

  const tick = useCallback(() => {
    const analyzer = analyzerRef.current;
    const ctx = ctxRef.current;
    if (!analyzer || !ctx) return;

    const bufLen = analyzer.fftSize;
    const timeData = new Float32Array(bufLen);
    analyzer.getFloatTimeDomainData(timeData);

    // RMS amplitude
    let sum = 0;
    for (let i = 0; i < bufLen; i++) sum += timeData[i] * timeData[i];
    const rms = Math.sqrt(sum / bufLen);

    // Onset detection — energy spike above threshold
    const now = ctx.currentTime;
    if (rms > 0.05 && now - lastOnsetRef.current > 0.15) {
      lastOnsetRef.current = now;
      onsetTimesRef.current.push(now);
      // Keep last 8 onsets for BPM calculation
      if (onsetTimesRef.current.length > 8) onsetTimesRef.current.shift();
    }

    // BPM from average inter-onset interval
    let bpm: number | null = null;
    const onsets = onsetTimesRef.current;
    if (onsets.length >= 4) {
      const intervals: number[] = [];
      for (let i = 1; i < onsets.length; i++) intervals.push(onsets[i] - onsets[i - 1]);
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const raw = 60 / avgInterval;
      // Clamp to musical range and round to nearest 0.5
      if (raw > 40 && raw < 240) bpm = Math.round(raw * 2) / 2;
    }

    // Pitch detection
    const freq = detectPitch(timeData, ctx.sampleRate);
    let pitch: DetectedPitch | null = null;
    if (freq && freq > 60 && freq < 2000) {
      const midi = freqToMidi(freq);
      const { note, octave, cents } = midiToNoteName(midi);
      pitch = { frequency: freq, note, octave, cents, midi };
    }

    setState(prev => ({
      ...prev,
      amplitude: Math.min(rms * 3, 1),
      pitch: pitch ?? prev.pitch,
      detectedBpm: bpm ?? prev.detectedBpm,
    }));

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const ctx = new AudioContext();
      ctxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyzer = ctx.createAnalyser();
      analyzer.fftSize = 2048;
      analyzer.smoothingTimeConstant = 0.3;
      analyzerRef.current = analyzer;

      source.connect(analyzer);

      setState(prev => ({ ...prev, listening: true, error: null }));
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Microphone access denied',
      }));
    }
  }, [tick]);

  const stopListening = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    ctxRef.current?.close();
    ctxRef.current = null;
    analyzerRef.current = null;
    streamRef.current = null;
    onsetTimesRef.current = [];
    lastOnsetRef.current = 0;
    setState({ listening: false, amplitude: 0, pitch: null, detectedBpm: null, error: null });
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stopListening(), [stopListening]);

  return { state, startListening, stopListening, audioCtx: ctxRef };
}
