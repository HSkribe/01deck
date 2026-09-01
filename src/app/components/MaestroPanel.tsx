import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Music, Play, Square, X, Plus, Download, Upload, Settings, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Agent } from '../data/agents';
import { musicAgents } from '../data/musicAgents';
import { MaestroLivePanel } from '../plugins/01maestro/MaestroLivePanel';

const MAESTRO_ACCENT = '#ff4da6';

interface BandRole {
  id: string;
  label: string;
  defaultAgentId: string;
}

const BAND_ROLES: BandRole[] = [
  { id: 'producer',  label: 'Producer',      defaultAgentId: 'm001' },
  { id: 'drums',     label: 'Drums',          defaultAgentId: 'm002' },
  { id: 'keys',      label: 'Keys',           defaultAgentId: 'm003' },
  { id: 'bass',      label: 'Bass',           defaultAgentId: 'm004' },
  { id: 'synth',     label: 'Synth',          defaultAgentId: 'm005' },
  { id: 'vocals',    label: 'Vocals',         defaultAgentId: 'm006' },
];

function buildDefaultAssignments(): Record<string, Agent | null> {
  const lookup = new Map(musicAgents.map(a => [a.id, a]));
  const entries = BAND_ROLES.map(r => [r.id, lookup.get(r.defaultAgentId) ?? null] as const);
  return Object.fromEntries(entries);
}

export function MaestroPanel() {
  const {
    currentTheme: t,
    maestroOpen,
    setMaestroOpen,
    allAgents,
    addAgent,
    isPluginEnabled,
  } = useApp();

  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [timeSignature, setTimeSignature] = useState('4/4');
  const [assignments, setAssignments] = useState<Record<string, Agent | null>>(buildDefaultAssignments);
  const [pickerOpen, setPickerOpen] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const maestroEnabled = isPluginEnabled('01maestro');

  // Seed music agents into the app roster so they appear in the picker
  useEffect(() => {
    musicAgents.forEach(ma => {
      if (!allAgents.some(a => a.id === ma.id)) addAgent(ma);
    });
  }, []);  // run once on mount

  // Close picker on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(null);
      }
    }
    if (pickerOpen) document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [pickerOpen]);

  if (!maestroOpen || !maestroEnabled) return null;

  // Agents eligible for any role: music-flagged or maestro-capable
  const eligibleAgents = allAgents.filter(a => a.maestroEnabled || a.tags?.includes('music'));

  const assignAgent = (roleId: string, agent: Agent) => {
    setAssignments(prev => ({ ...prev, [roleId]: agent }));
    setPickerOpen(null);
  };

  const clearSlot = (roleId: string) => {
    setAssignments(prev => ({ ...prev, [roleId]: null }));
  };

  const resetDefaults = () => setAssignments(buildDefaultAssignments());

  const activeCount = Object.values(assignments).filter(Boolean).length;

  return (
    <div
      className="fixed bottom-6 right-6 z-40 rounded-xl overflow-hidden shadow-2xl"
      style={{
        background: t.surface1,
        border: `2px solid ${MAESTRO_ACCENT}`,
        boxShadow: `0 0 30px ${MAESTRO_ACCENT}40, 0 20px 60px rgba(0,0,0,0.6)`,
        width: 480,
        maxHeight: '82vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{
          background: `linear-gradient(135deg, ${MAESTRO_ACCENT}20 0%, ${t.surface2} 100%)`,
          borderColor: MAESTRO_ACCENT + '30',
        }}
      >
        <div className="flex items-center gap-2">
          <Music size={16} style={{ color: MAESTRO_ACCENT }} />
          <span className="font-semibold text-sm" style={{ color: t.text }}>01Maestro</span>
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-mono"
            style={{ background: MAESTRO_ACCENT + '20', color: MAESTRO_ACCENT, border: `1px solid ${MAESTRO_ACCENT}40` }}
          >
            PLUGIN
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={resetDefaults}
            className="p-1.5 rounded hover:bg-white/10 transition-all"
            style={{ color: t.textMuted }}
            title="Reset to defaults"
          >
            <RefreshCw size={13} />
          </button>
          <button
            onClick={() => setMaestroOpen(false)}
            className="p-1.5 rounded hover:bg-white/10 transition-all"
            style={{ color: t.textMuted }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── Transport ───────────────────────────────────────────── */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between shrink-0"
        style={{ borderColor: t.border, background: t.surface2 }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlaying(p => !p)}
            className="p-2 rounded transition-all"
            style={{ background: isPlaying ? MAESTRO_ACCENT : t.surface3, color: isPlaying ? '#000' : t.text }}
          >
            {isPlaying ? <Square size={14} fill="currentColor" /> : <Play size={14} />}
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: t.textMuted }}>Tempo</span>
            <input
              type="number"
              value={bpm}
              min={40} max={240}
              onChange={e => setBpm(Number(e.target.value))}
              className="w-16 bg-transparent border-b outline-none font-mono text-sm"
              style={{ borderColor: t.border, color: t.text }}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: t.textMuted }}>Sig</span>
            <select
              value={timeSignature}
              onChange={e => setTimeSignature(e.target.value)}
              className="bg-transparent border-b outline-none text-sm"
              style={{ borderColor: t.border, color: t.text }}
            >
              {['4/4', '3/4', '6/8', '7/8', '5/4'].map(sig => (
                <option key={sig} value={sig} style={{ background: t.surface1 }}>{sig}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-1">
          <button className="p-1.5 rounded hover:bg-white/10 transition-all" style={{ color: t.textMuted }} title="Export MIDI"><Download size={13} /></button>
          <button className="p-1.5 rounded hover:bg-white/10 transition-all" style={{ color: t.textMuted }} title="Import Project"><Upload size={13} /></button>
          <button className="p-1.5 rounded hover:bg-white/10 transition-all" style={{ color: t.textMuted }} title="Settings"><Settings size={13} /></button>
        </div>
      </div>

      {/* ── Band Roles ──────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-2"
        style={{ background: t.bg }}
        ref={pickerRef}
      >
        <div className="text-[10px] uppercase tracking-widest mb-3" style={{ color: t.textMuted }}>
          Band Roster — {activeCount}/{BAND_ROLES.length} agents assigned
        </div>

        {BAND_ROLES.map(role => {
          const assigned = assignments[role.id] ?? null;
          const isPickerOpen = pickerOpen === role.id;

          return (
            <div key={role.id} className="relative">
              {/* Role slot row */}
              <div
                className="rounded-lg flex items-center gap-3 px-3 py-2.5 transition-all"
                style={{
                  background: t.surface2,
                  border: `1px solid ${assigned ? MAESTRO_ACCENT + '40' : t.border}`,
                }}
              >
                {/* Role label */}
                <div
                  className="text-[10px] font-mono uppercase tracking-wider w-14 shrink-0"
                  style={{ color: assigned ? MAESTRO_ACCENT : t.textMuted }}
                >
                  {role.label}
                </div>

                {assigned ? (
                  <>
                    {/* Portrait */}
                    <div
                      className="w-8 h-8 rounded bg-cover bg-center shrink-0"
                      style={{
                        backgroundImage: `url(${assigned.portrait})`,
                        border: `1.5px solid ${MAESTRO_ACCENT}60`,
                      }}
                    />
                    {/* Agent info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate" style={{ color: t.text }}>{assigned.name}</div>
                      <div className="text-[10px] truncate" style={{ color: t.textMuted }}>
                        {assigned.role}{assigned.bpm ? ` · ${assigned.bpm} BPM` : ''}
                      </div>
                    </div>
                    {/* Swap button */}
                    <button
                      onClick={() => setPickerOpen(isPickerOpen ? null : role.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] shrink-0 transition-all hover:bg-white/10"
                      style={{ color: t.textMuted, border: `1px solid ${t.border}` }}
                    >
                      Swap <ChevronDown size={10} style={{ transform: isPickerOpen ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }} />
                    </button>
                    {/* Clear button */}
                    <button
                      onClick={() => clearSlot(role.id)}
                      className="p-1 rounded hover:bg-red-500/20 transition-all shrink-0"
                      style={{ color: '#ef4444' }}
                    >
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 text-xs" style={{ color: t.textMuted }}>No agent assigned</div>
                    <button
                      onClick={() => setPickerOpen(isPickerOpen ? null : role.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-all"
                      style={{
                        background: MAESTRO_ACCENT + '15',
                        border: `1px solid ${MAESTRO_ACCENT}40`,
                        color: MAESTRO_ACCENT,
                      }}
                    >
                      <Plus size={10} /> Add
                    </button>
                  </>
                )}
              </div>

              {/* Inline agent picker dropdown */}
              {isPickerOpen && (
                <div
                  className="absolute left-0 right-0 z-50 mt-1 rounded-lg overflow-hidden shadow-xl"
                  style={{
                    background: t.surface1,
                    border: `1px solid ${MAESTRO_ACCENT}50`,
                    boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${MAESTRO_ACCENT}20`,
                  }}
                >
                  <div className="px-3 py-2 border-b text-[10px] uppercase tracking-widest" style={{ borderColor: t.border, color: t.textMuted }}>
                    Choose agent for {role.label}
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {eligibleAgents.map(agent => {
                      const isCurrent = assigned?.id === agent.id;
                      return (
                        <button
                          key={agent.id}
                          onClick={() => assignAgent(role.id, agent)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all hover:bg-white/5"
                          style={{
                            background: isCurrent ? MAESTRO_ACCENT + '12' : undefined,
                            borderLeft: isCurrent ? `2px solid ${MAESTRO_ACCENT}` : '2px solid transparent',
                          }}
                        >
                          <div
                            className="w-8 h-8 rounded bg-cover bg-center shrink-0"
                            style={{ backgroundImage: `url(${agent.portrait})` }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold truncate" style={{ color: isCurrent ? MAESTRO_ACCENT : t.text }}>
                              {agent.name}
                            </div>
                            <div className="text-[10px] truncate" style={{ color: t.textMuted }}>
                              {agent.role}{agent.musicGenres?.length ? ` · ${agent.musicGenres[0]}` : ''}
                            </div>
                          </div>
                          {isCurrent && (
                            <span className="text-[9px] font-mono shrink-0" style={{ color: MAESTRO_ACCENT }}>ACTIVE</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Live Listen ─────────────────────────────────────────── */}
      <MaestroLivePanel
        t={t}
        bandAssignments={assignments}
        roleLabels={BAND_ROLES.map(r => ({ id: r.id, label: r.label }))}
      />

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div
        className="px-4 py-2 border-t flex items-center justify-between text-[10px] shrink-0"
        style={{ borderColor: t.border, background: t.surface2, color: t.textMuted }}
      >
        <span>{activeCount} agent{activeCount !== 1 ? 's' : ''} in band</span>
        <span className="font-mono">{bpm} BPM · {timeSignature}</span>
      </div>
    </div>
  );
}
