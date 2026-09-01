import { useMemo, useState } from 'react';
import { Brain, KeyRound, Lock, RotateCcw, Send, ShieldCheck, ShieldX, Trash2, UserCheck } from 'lucide-react';
import { TOOL_LABELS } from '../lib/tools';
import { useDeckStore } from '../store/useDeckStore';
import type { ToolName } from '../types';

const TOOL_NAMES = Object.keys(TOOL_LABELS) as ToolName[];

export function AgentPanel() {
  const selectedAgentId = useDeckStore(state => state.selectedAgentId);
  const agents = useDeckStore(state => state.agents);
  const edges = useDeckStore(state => state.edges);
  const streaming = useDeckStore(state => (selectedAgentId ? state.streamingByAgent[selectedAgentId] : false));
  const streamingText = useDeckStore(state => (selectedAgentId ? state.streamingTextByAgent[selectedAgentId] : ''));
  const error = useDeckStore(state => (selectedAgentId ? state.errorByAgent[selectedAgentId] : null));
  const updateAgentConfig = useDeckStore(state => state.updateAgentConfig);
  const sendMessage = useDeckStore(state => state.sendMessage);
  const regenerateAgentIdentity = useDeckStore(state => state.regenerateAgentIdentity);
  const toggleTrustedAgent = useDeckStore(state => state.toggleTrustedAgent);
  const toggleToolPermission = useDeckStore(state => state.toggleToolPermission);
  const toggleMemory = useDeckStore(state => state.toggleMemory);
  const clearPersistentMemory = useDeckStore(state => state.clearPersistentMemory);
  const setEncryptionEnabled = useDeckStore(state => state.setEncryptionEnabled);
  const unlockEncryption = useDeckStore(state => state.unlockEncryption);
  const clearEncryptedData = useDeckStore(state => state.clearEncryptedData);
  const relayToAgent = useDeckStore(state => state.relayToAgent);
  const deleteAgent = useDeckStore(state => state.deleteAgent);

  const agent = selectedAgentId ? agents[selectedAgentId] : null;
  const [draft, setDraft] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [relayTargetId, setRelayTargetId] = useState('');

  const connectedAgents = useMemo(() => {
    if (!agent) return [];
    const neighborIds = new Set<string>();
    edges.forEach(edge => {
      if (edge.source === agent.id) neighborIds.add(edge.target);
      if (edge.target === agent.id) neighborIds.add(edge.source);
    });
    return Array.from(neighborIds)
      .map(id => agents[id])
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [agent, agents, edges]);

  if (!agent) {
    return (
      <aside className="ondeck-panel-column">
        <div className="ondeck-panel">
          <div className="ondeck-panel__header">Agent Panel</div>
          <p className="ondeck-muted">Select an agent on the canvas to chat, configure trust, and manage memory.</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="ondeck-panel-column">
      <div className="ondeck-panel">
        <div className="ondeck-panel__header">Identity (01Protocol)</div>
        <div className="ondeck-identity-row">
          <strong>{agent.name}</strong>
          <span className={`ondeck-mini-tag ${agent.signature_verified ? 'ondeck-mini-tag--green' : 'ondeck-mini-tag--red'}`}>
            {agent.signature_verified ? <ShieldCheck size={12} /> : <ShieldX size={12} />}
            {agent.signature_verified ? 'identity + owner binding verified' : 'identity or owner binding invalid'}
          </span>
        </div>
        <div className="ondeck-code-block">instance: {agent.identity.instanceId}</div>
        <div className="ondeck-code-block">{agent.public_key}</div>
        <div className="ondeck-code-block">checksum: {agent.identity.integrityChecksum}</div>
        <div className="ondeck-identity-row">
          <span className="ondeck-mini-tag">
            <UserCheck size={12} />
            owner: {agent.owner_delegation.delegatorInstanceId.slice(0, 12)}...
          </span>
        </div>
        <div className="ondeck-button-row">
          <button className="ondeck-button" onClick={() => regenerateAgentIdentity(agent.id)} disabled={agent.needs_private_key}>
            <RotateCcw size={14} />
            Re-sign Identity
          </button>
          <button className="ondeck-button ondeck-button--danger" onClick={() => deleteAgent(agent.id)}>
            <Trash2 size={14} />
            Delete Agent
          </button>
        </div>
        {agent.needs_private_key && (
          <p className="ondeck-muted">
            This is an imported agent with no private key on this device. It can be viewed and trusted, but it can't be
            resigned or used to sign relays here.
          </p>
        )}
      </div>

      <div className="ondeck-panel">
        <div className="ondeck-panel__header">Chat</div>
        <div className="ondeck-chat-log">
          {agent.memory.map(message => (
            <div key={message.id} className={`ondeck-chat-message ondeck-chat-message--${message.kind}`}>
              <div className="ondeck-chat-message__meta">
                <span>{message.sender_agent_id}</span>
                <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
              </div>
              <div>{message.content ?? '[encrypted content hidden until unlocked]'}</div>
            </div>
          ))}
          {streamingText && (
            <div className="ondeck-chat-message ondeck-chat-message--assistant">
              <div className="ondeck-chat-message__meta">
                <span>{agent.name}</span>
                <span>streaming</span>
              </div>
              <div>{streamingText}</div>
            </div>
          )}
        </div>
        <div className="ondeck-summary">
          <strong>Summary</strong>
          <p>{agent.summary}</p>
        </div>
        <div className="ondeck-composer">
          <textarea
            value={draft}
            onChange={event => setDraft(event.target.value)}
            className="ondeck-textarea"
            placeholder="Type a message or /tool calculator 2+2"
          />
          <button
            className="ondeck-button"
            disabled={streaming}
            onClick={async () => {
              await sendMessage(agent.id, draft);
              setDraft('');
            }}
          >
            <Send size={14} />
            {streaming ? 'Streaming...' : 'Send'}
          </button>
        </div>
        {error && <p className="ondeck-error">{error}</p>}
      </div>

      <div className="ondeck-panel">
        <div className="ondeck-panel__header">Config</div>
        <label className="ondeck-label">
          Name
          <input
            value={agent.name}
            onChange={event => updateAgentConfig(agent.id, { name: event.target.value })}
            className="ondeck-input"
          />
        </label>
        <label className="ondeck-label">
          Model
          <input
            value={agent.model}
            onChange={event => updateAgentConfig(agent.id, { model: event.target.value })}
            className="ondeck-input"
          />
        </label>
        <label className="ondeck-label">
          Temperature
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={agent.temperature}
            onChange={event => updateAgentConfig(agent.id, { temperature: Number(event.target.value) })}
          />
          <span className="ondeck-muted">{agent.temperature.toFixed(1)}</span>
        </label>
        <label className="ondeck-label">
          System Prompt
          <textarea
            value={agent.system_prompt}
            onChange={event => updateAgentConfig(agent.id, { system_prompt: event.target.value })}
            className="ondeck-textarea"
          />
        </label>
      </div>

      <div className="ondeck-panel">
        <div className="ondeck-panel__header">Trust & Relays</div>
        {connectedAgents.length === 0 ? (
          <p className="ondeck-muted">Connect this agent to another node on the canvas to enable relays and trust controls.</p>
        ) : (
          <>
            {connectedAgents.map(connected => (
              <label key={connected.id} className="ondeck-checkbox-row">
                <input
                  type="checkbox"
                  checked={agent.trusted_agents.includes(connected.public_key)}
                  onChange={() => toggleTrustedAgent(agent.id, connected.public_key)}
                />
                <span>
                  Trust {connected.name}
                  <small className="ondeck-muted"> ({connected.public_key.slice(0, 12)}...)</small>
                </span>
              </label>
            ))}
            <div className="ondeck-inline-group">
              <select
                value={relayTargetId}
                onChange={event => setRelayTargetId(event.target.value)}
                className="ondeck-input"
              >
                <option value="">Relay to trusted agent...</option>
                {connectedAgents.map(connected => (
                  <option key={connected.id} value={connected.id}>
                    {connected.name}
                  </option>
                ))}
              </select>
              <button className="ondeck-button" disabled={!relayTargetId} onClick={() => relayToAgent(agent.id, relayTargetId)}>
                Send Signed Relay
              </button>
            </div>
          </>
        )}
      </div>

      <div className="ondeck-panel">
        <div className="ondeck-panel__header">Tools</div>
        {Object.keys(TOOL_LABELS).map(tool => {
          const toolName = tool as ToolName;
          return (
            <label key={toolName} className="ondeck-checkbox-row">
              <input
                type="checkbox"
                checked={agent.allowed_tools.includes(toolName)}
                onChange={() => toggleToolPermission(agent.id, toolName)}
              />
              <span>{TOOL_LABELS[toolName]}</span>
            </label>
          );
        })}
      </div>

      <div className="ondeck-panel">
        <div className="ondeck-panel__header">
          <Brain size={16} />
          Memory
        </div>
        <label className="ondeck-checkbox-row">
          <input type="checkbox" checked={agent.memory_enabled} onChange={() => toggleMemory(agent.id)} />
          <span>Persistent memory enabled</span>
        </label>
        <div className="ondeck-memory-list">
          {agent.persistent_memory.map(entry => (
            <div key={entry.id} className="ondeck-memory-entry">
              <div>{entry.content ?? '[encrypted entry locked]'}</div>
              <small className="ondeck-muted">{entry.hash.slice(0, 20)}...</small>
            </div>
          ))}
        </div>
        <button className="ondeck-button ondeck-button--danger" onClick={() => clearPersistentMemory(agent.id)}>
          Clear Memory
        </button>
      </div>

      <div className="ondeck-panel">
        <div className="ondeck-panel__header">
          <Lock size={16} />
          Encryption
        </div>
        <label className="ondeck-checkbox-row">
          <input
            type="checkbox"
            checked={agent.encryption_enabled}
            onChange={event => setEncryptionEnabled(agent.id, event.target.checked, passphrase || undefined)}
          />
          <span>Encrypt persistent memory and future transcripts</span>
        </label>
        <label className="ondeck-label">
          Passphrase
          <input
            type="password"
            value={passphrase}
            onChange={event => setPassphrase(event.target.value)}
            className="ondeck-input"
            placeholder="Optional. Not persisted."
          />
        </label>
        <div className="ondeck-button-row">
          <button
            className="ondeck-button"
            onClick={() => unlockEncryption(agent.id, passphrase)}
            disabled={!agent.encryption_enabled || !agent.encryption_salt}
          >
            <KeyRound size={14} />
            Unlock Stored Data
          </button>
          <button className="ondeck-button ondeck-button--danger" onClick={() => clearEncryptedData(agent.id)}>
            Clear Encrypted Data
          </button>
        </div>
        <p className="ondeck-muted">
          Raw encryption keys are never persisted. Without the session key or matching passphrase, encrypted data stays unreadable.
        </p>
      </div>
    </aside>
  );
}
