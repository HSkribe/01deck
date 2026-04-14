import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';

function buildPortableAgentMarkdown(agent: ReturnType<typeof useApp>['allAgents'][number]) {
  return `---
name: ${agent.name}
description: ${agent.description}
source: 01Deck universal deployment
---

# ${agent.name}

## Role
${agent.role}

## Category
${agent.category}

## Mission
${agent.description}

## Specialization
${agent.specialization}

## Operating posture
- Follow NEXUS-Micro by default
- Preserve explicit role boundaries
- Use evidence over claims
`;
}

function buildDeckPayload(selectedAgents: ReturnType<typeof useApp>['allAgents']) {
  return {
    mode: 'universal',
    source: '01Deck',
    timestamp: new Date().toISOString(),
    nexus: {
      mode: 'NEXUS-Micro',
      handoff_required: true,
      evidence_required: true,
    },
    selectedAgents: selectedAgents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      category: agent.category,
      description: agent.description,
      protocolId: agent.protocolId,
      protocolVersion: agent.protocolVersion,
      tags: agent.tags,
      content: buildPortableAgentMarkdown(agent),
    })),
  };
}

function buildTerminalCommand(payload: string, target: string) {
  return [
    'SCRIPT_PATH=""',
    'for candidate in ./01AISelect/tools/universal-deploy.mjs ./tools/universal-deploy.mjs ../01AISelect/tools/universal-deploy.mjs; do',
    '  if [ -f "$candidate" ]; then SCRIPT_PATH="$candidate"; break; fi',
    'done',
    'if [ -z "$SCRIPT_PATH" ]; then',
    '  echo "Could not locate 01AISelect/tools/universal-deploy.mjs. Run this from the repo root or set SCRIPT_PATH manually." >&2',
    '  exit 1',
    'fi',
    `node "$SCRIPT_PATH" --target ${target} --stdin <<'JSON'`,
    payload,
    'JSON',
  ].join('\n');
}

export function UniversalDeploySection() {
  const { allAgents, currentTheme: t } = useApp();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [target, setTarget] = useState('claude-code');
  const [copied, setCopied] = useState(false);
  const [dropActive, setDropActive] = useState(false);

  const filteredAgents = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return allAgents;
    return allAgents.filter(agent =>
      `${agent.name} ${agent.role} ${agent.category} ${agent.description} ${agent.tags.join(' ')}`.toLowerCase().includes(needle),
    );
  }, [allAgents, search]);

  const selectedAgents = useMemo(() => allAgents.filter(agent => selectedIds.includes(agent.id)), [allAgents, selectedIds]);
  const payload = useMemo(() => JSON.stringify(buildDeckPayload(selectedAgents), null, 2), [selectedAgents]);
  const terminalCommand = useMemo(() => buildTerminalCommand(payload, target), [payload, target]);

  const prompt = useMemo(() => {
    if (!selectedAgents.length) return 'Select agents to stage a deployment.';
    return [
      'Activate this 01Deck deployment in UNIVERSAL mode.',
      '',
      'Selected team:',
      ...selectedAgents.map((agent, index) => `${index + 1}. ${agent.name} | ${agent.role} | ${agent.description}`),
      '',
      'Deployment rules:',
      '- Preserve explicit role boundaries',
      '- Use evidence over claims',
      '- Start in NEXUS-Micro unless escalation is needed',
    ].join('\n');
  }, [selectedAgents]);

  const toggleAgent = (agentId: string) => {
    setSelectedIds(current => current.includes(agentId) ? current.filter(id => id !== agentId) : [...current, agentId]);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(terminalCommand);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const downloadManifest = () => {
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `01deck-${target}-manifest.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    if (!selectedAgents.length) return;
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/json', payload);
    event.dataTransfer.setData('text/plain', terminalCommand);
  };

  return (
    <div className="px-6 pb-8">
      <div
        className="rounded-[28px] p-6 mb-6 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, rgba(34,197,94,0.14) 0%, ${t.surface1} 35%, ${t.surface2} 100%)`,
          border: `1px solid ${t.border}`,
          boxShadow: `0 18px 48px ${t.glow}`,
        }}
      >
        <div className="max-w-3xl">
          <div className="text-[11px] uppercase tracking-[0.24em]" style={{ color: t.textMuted }}>Universal Deploy</div>
          <h1 className="text-3xl mt-3" style={{ color: t.text }}>Deploy agent teams beyond chat</h1>
          <p className="text-sm mt-3 max-w-2xl" style={{ color: t.textMuted, lineHeight: 1.7 }}>
            This workspace stages selected agents as a portable universal payload so `01Deck` can hand teams off to terminals,
            CLIs, and future app connectors without rebuilding the roster each time.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div
          className="rounded-3xl p-5"
          style={{ background: t.surface1, border: `1px solid ${t.border}` }}
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em]" style={{ color: t.textMuted }}>Select Team</div>
              <div className="text-lg mt-1" style={{ color: t.text }}>{selectedAgents.length} selected</div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={target}
                onChange={event => setTarget(event.target.value)}
                className="px-3 py-2 rounded-xl text-xs outline-none"
                style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.text }}
              >
                <option value="claude-code">Claude Code</option>
                <option value="opencode">OpenCode</option>
              </select>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-3 py-2 rounded-xl text-xs"
                style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.text }}
              >
                Clear
              </button>
            </div>
          </div>

          <input
            type="text"
            placeholder="Search deck agents..."
            value={search}
            onChange={event => setSearch(event.target.value)}
            className="w-full rounded-2xl px-4 py-3 outline-none text-sm"
            style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.text }}
          />

          <div className="grid gap-3 md:grid-cols-2 mt-4">
            {filteredAgents.map(agent => {
              const active = selectedIds.includes(agent.id);
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => toggleAgent(agent.id)}
                  className="text-left rounded-2xl p-4 transition-all"
                  style={{
                    background: active ? `${t.accent}12` : t.surface2,
                    border: `1px solid ${active ? t.accent : t.border}`,
                    boxShadow: active ? `0 12px 28px ${t.glow}` : 'none',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm" style={{ color: t.text }}>{agent.name}</div>
                      <div className="text-[11px] mt-1 uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>
                        {agent.category}
                      </div>
                    </div>
                    <div className="text-[10px] px-2 py-1 rounded-full" style={{ background: `${t.surface1}`, color: t.textMuted }}>
                      {active ? 'Selected' : 'Ready'}
                    </div>
                  </div>
                  <p className="text-xs mt-3" style={{ color: t.textMuted, lineHeight: 1.6 }}>{agent.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div
            draggable={selectedAgents.length > 0}
            onDragStart={handleDragStart}
            onDragOver={event => {
              event.preventDefault();
              setDropActive(true);
            }}
            onDragLeave={() => setDropActive(false)}
            onDrop={event => {
              event.preventDefault();
              setDropActive(false);
            }}
            className="rounded-3xl p-5"
            style={{
              background: dropActive ? `${t.accent}14` : t.surface1,
              border: `1px dashed ${dropActive ? t.accent : t.border}`,
            }}
          >
            <div className="text-xs uppercase tracking-[0.2em]" style={{ color: t.textMuted }}>Deploy Tray</div>
            <div className="text-lg mt-2" style={{ color: t.text }}>Drag selected agents into the next target</div>
            <p className="text-sm mt-3" style={{ color: t.textMuted, lineHeight: 1.7 }}>
              This tray now exports a terminal-ready command block for `{target}` together with the universal JSON payload.
            </p>
          </div>

          <div className="rounded-3xl p-5" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.2em]" style={{ color: t.textMuted }}>Terminal Command</div>
                <div className="text-sm mt-1" style={{ color: t.text }}>{selectedAgents.length ? `Ready for ${target}` : 'No team selected'}</div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={downloadManifest}
                  disabled={!selectedAgents.length}
                  className="px-3 py-2 rounded-xl text-xs"
                  style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.text }}
                >
                  Download Manifest
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!selectedAgents.length}
                  className="px-3 py-2 rounded-xl text-xs"
                  style={{ background: `${t.accent}18`, border: `1px solid ${t.border}`, color: t.text }}
                >
                  {copied ? 'Copied' : 'Copy Command'}
                </button>
              </div>
            </div>
            <pre className="mt-4 overflow-auto rounded-2xl p-4 text-[11px] whitespace-pre-wrap" style={{ background: t.surface2, color: t.textMuted }}>
              {selectedAgents.length ? terminalCommand : 'Select agents to stage a deployment.'}
            </pre>
          </div>

          <div className="rounded-3xl p-5" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
            <div className="text-xs uppercase tracking-[0.2em]" style={{ color: t.textMuted }}>Payload Preview</div>
            <pre className="mt-4 overflow-auto rounded-2xl p-4 text-[11px] whitespace-pre-wrap max-h-[280px]" style={{ background: t.surface2, color: t.textMuted }}>
              {selectedAgents.length ? payload : '{\n  "mode": "universal"\n}'}
            </pre>
          </div>

          <div className="rounded-3xl p-5" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
            <div className="text-xs uppercase tracking-[0.2em]" style={{ color: t.textMuted }}>Prompt</div>
            <pre className="mt-4 overflow-auto rounded-2xl p-4 text-[11px] whitespace-pre-wrap max-h-[200px]" style={{ background: t.surface2, color: t.textMuted }}>
              {prompt}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
