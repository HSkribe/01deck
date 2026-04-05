import React, { useEffect, useState } from 'react';
import { useDrop } from 'react-dnd';
import { Music, X, Play, Square, Settings, Download, Upload } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Agent } from '../data/agents';
import { musicAgents } from '../data/musicAgents';

export function MaestroPanel() {
  const {
    currentTheme: t,
    maestroOpen,
    setMaestroOpen,
    vstAgents,
    removeFromVST,
    maestroEnabled,
    addAgent,
  } = useApp();

  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [timeSignature, setTimeSignature] = useState('4/4');

  // Load music agents when maestro is first enabled
  useEffect(() => {
    if (maestroEnabled && vstAgents.length === 0) {
      // Auto-load music agents into the app
      musicAgents.forEach(agent => addAgent(agent));
    }
  }, [maestroEnabled, vstAgents.length, addAgent]);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'AGENT',
    drop: (item: { agent: Agent }) => {
      // Agent is added via drag and drop from AgentBar
      return { agent: item.agent };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  if (!maestroOpen) return null;

  const maestroAccent = '#ff4da6'; // Pink/magenta accent for maestro

  return (
    <div
      className="fixed bottom-6 right-6 z-40 rounded-lg overflow-hidden shadow-2xl"
      style={{
        background: t.surface1,
        border: `2px solid ${maestroAccent}`,
        boxShadow: `0 0 30px ${maestroAccent}40, 0 20px 60px rgba(0,0,0,0.6)`,
        width: 480,
        maxHeight: '70vh',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          background: `linear-gradient(135deg, ${maestroAccent}20 0%, ${t.surface2} 100%)`,
          borderColor: maestroAccent + '30',
        }}
      >
        <div className="flex items-center gap-2">
          <Music size={18} style={{ color: maestroAccent }} />
          <span className="font-semibold" style={{ color: t.text }}>
            01maestro VST
          </span>
          <div
            className="px-2 py-0.5 rounded text-xs font-mono"
            style={{
              background: maestroAccent + '20',
              color: maestroAccent,
              border: `1px solid ${maestroAccent}40`,
            }}
          >
            v1.0
          </div>
        </div>
        <button
          onClick={() => setMaestroOpen(false)}
          className="p-1 rounded transition-all hover:bg-white/10"
          style={{ color: t.textMuted }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Transport Controls */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: t.border, background: t.surface2 }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 rounded transition-all"
            style={{
              background: isPlaying ? maestroAccent : t.surface3,
              color: isPlaying ? '#000' : t.text,
            }}
          >
            {isPlaying ? <Square size={16} fill="currentColor" /> : <Play size={16} />}
          </button>
          <div className="flex flex-col">
            <span className="text-xs" style={{ color: t.textMuted }}>
              Tempo
            </span>
            <input
              type="number"
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-20 bg-transparent border-b outline-none font-mono text-sm"
              style={{ borderColor: t.border, color: t.text }}
            />
          </div>
          <div className="flex flex-col ml-2">
            <span className="text-xs" style={{ color: t.textMuted }}>
              Time
            </span>
            <select
              value={timeSignature}
              onChange={(e) => setTimeSignature(e.target.value)}
              className="bg-transparent border-b outline-none text-sm"
              style={{ borderColor: t.border, color: t.text }}
            >
              <option value="4/4" style={{ background: t.surface1 }}>4/4</option>
              <option value="3/4" style={{ background: t.surface1 }}>3/4</option>
              <option value="6/8" style={{ background: t.surface1 }}>6/8</option>
              <option value="7/8" style={{ background: t.surface1 }}>7/8</option>
            </select>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            className="p-1.5 rounded transition-all hover:bg-white/10"
            style={{ color: t.textMuted }}
            title="Export MIDI"
          >
            <Download size={14} />
          </button>
          <button
            className="p-1.5 rounded transition-all hover:bg-white/10"
            style={{ color: t.textMuted }}
            title="Import Project"
          >
            <Upload size={14} />
          </button>
          <button
            className="p-1.5 rounded transition-all hover:bg-white/10"
            style={{ color: t.textMuted }}
            title="VST Settings"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Agent Slots / Drop Zone */}
      <div
        ref={drop}
        className="p-4 overflow-y-auto"
        style={{
          minHeight: 200,
          maxHeight: 'calc(70vh - 180px)',
          background: isOver ? maestroAccent + '08' : t.bg,
          transition: 'background 0.2s',
        }}
      >
        {vstAgents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div
              className="w-16 h-16 rounded-full mb-4 flex items-center justify-center"
              style={{
                background: maestroAccent + '10',
                border: `2px dashed ${maestroAccent}40`,
              }}
            >
              <Music size={28} style={{ color: maestroAccent + '60' }} />
            </div>
            <p className="text-sm mb-1" style={{ color: t.text }}>
              No agents loaded
            </p>
            <p className="text-xs" style={{ color: t.textMuted }}>
              Drag & drop music agents here from the agent bar
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {vstAgents.map((agent) => (
              <div
                key={agent.id}
                className="rounded-lg p-3 flex items-center justify-between group transition-all"
                style={{
                  background: t.surface2,
                  border: `1px solid ${t.border}`,
                }}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-10 h-10 rounded bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${agent.portrait})`,
                      border: `2px solid ${maestroAccent}60`,
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate" style={{ color: t.text }}>
                        {agent.name}
                      </span>
                      {agent.maestroEnabled && (
                        <Music size={12} style={{ color: maestroAccent }} />
                      )}
                    </div>
                    <div className="text-xs truncate" style={{ color: t.textMuted }}>
                      {agent.role}
                      {agent.bpm && ` · ${agent.bpm} BPM`}
                      {agent.timeSignature && ` · ${agent.timeSignature}`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeFromVST(agent.id)}
                  className="p-1.5 rounded opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20"
                  style={{ color: '#ef4444' }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div
        className="px-4 py-2 border-t flex items-center justify-between text-xs"
        style={{ borderColor: t.border, background: t.surface2, color: t.textMuted }}
      >
        <span>{vstAgents.length} agent{vstAgents.length !== 1 ? 's' : ''} loaded</span>
        <span className="font-mono">{bpm} BPM · {timeSignature}</span>
      </div>
    </div>
  );
}
