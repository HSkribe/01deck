import { useMemo, useRef, useState } from 'react';
import { Download, Import, KeyRound, Plus, ShieldCheck } from 'lucide-react';
import { AGENT_TEMPLATES } from '../templates';
import { useDeckStore } from '../store/useDeckStore';

export function WorkbenchSidebar() {
  const apiBaseUrl = useDeckStore(state => state.apiBaseUrl);
  const apiKey = useDeckStore(state => state.apiKey);
  const setApiBaseUrl = useDeckStore(state => state.setApiBaseUrl);
  const setApiKey = useDeckStore(state => state.setApiKey);
  const owner = useDeckStore(state => state.owner);
  const ensureOwnerIdentity = useDeckStore(state => state.ensureOwnerIdentity);
  const workbenchError = useDeckStore(state => state.workbenchError);
  const createAgentFromTemplate = useDeckStore(state => state.createAgentFromTemplate);
  const exportAgent = useDeckStore(state => state.exportAgent);
  const importAgent = useDeckStore(state => state.importAgent);
  const selectedAgentId = useDeckStore(state => state.selectedAgentId);
  const agents = useDeckStore(state => state.agents);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importStatus, setImportStatus] = useState('');
  const [ownerNameDraft, setOwnerNameDraft] = useState('');

  const selectedAgent = selectedAgentId ? agents[selectedAgentId] : null;
  const templateCards = useMemo(() => AGENT_TEMPLATES, []);

  return (
    <aside className="ondeck-sidebar">
      <div className="ondeck-panel">
        <div className="ondeck-panel__header">OnDeck</div>
        <p className="ondeck-muted">
          Local-first agent canvas with 01Protocol-signed identity, owner-bound enrollment, trusted relays, optional
          encrypted memory, and streaming chat.
        </p>
      </div>

      <div className="ondeck-panel">
        <div className="ondeck-panel__header">
          <ShieldCheck size={16} />
          Owner Identity
        </div>
        {owner ? (
          <>
            <p className="ondeck-muted">
              Every agent you create is enrolled in 01Protocol and delegated from this identity — that delegation is
              what ties each agent back to you.
            </p>
            <div className="ondeck-code-block">{owner.identity.instanceId}</div>
            <div className="ondeck-code-block">{owner.identity.signerPublicKey}</div>
          </>
        ) : (
          <>
            <p className="ondeck-muted">
              01Deck requires an owner identity before any agent can be created. Creating your first agent will enroll
              one automatically — or set it up here first.
            </p>
            <label className="ondeck-label">
              Display name
              <input
                value={ownerNameDraft}
                onChange={event => setOwnerNameDraft(event.target.value)}
                className="ondeck-input"
                placeholder="Owner"
              />
            </label>
            <button className="ondeck-button" onClick={() => ensureOwnerIdentity(ownerNameDraft)}>
              <ShieldCheck size={14} />
              Enroll Owner Identity
            </button>
          </>
        )}
      </div>

      <div className="ondeck-panel">
        <div className="ondeck-panel__header">LLM Gateway</div>
        <label className="ondeck-label">
          Base URL
          <input value={apiBaseUrl} onChange={event => setApiBaseUrl(event.target.value)} className="ondeck-input" />
        </label>
        <label className="ondeck-label">
          API Key
          <input
            type="password"
            value={apiKey}
            onChange={event => setApiKey(event.target.value)}
            className="ondeck-input"
            placeholder="In-memory only"
          />
        </label>
        <p className="ondeck-muted">Leave the API key empty to use the local mock streaming path.</p>
      </div>

      <div className="ondeck-panel">
        <div className="ondeck-panel__header">Templates</div>
        <div className="ondeck-template-list">
          {templateCards.map(template => (
            <div
              key={template.id}
              className="ondeck-template-card"
              draggable
              onDragStart={event => event.dataTransfer.setData('application/x-ondeck-template', template.id)}
            >
              <div>
                <strong>{template.name}</strong>
                <p className="ondeck-muted">{template.system_prompt.slice(0, 88)}...</p>
              </div>
              <div className="ondeck-template-card__actions">
                <span className="ondeck-mini-tag">{template.model}</span>
                <button
                  className="ondeck-icon-button"
                  onClick={() => createAgentFromTemplate(template.id, { x: 120, y: 120 })}
                  title="Create on canvas"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        {workbenchError && <p className="ondeck-error">{workbenchError}</p>}
      </div>

      <div className="ondeck-panel">
        <div className="ondeck-panel__header">Portability</div>
        <div className="ondeck-button-row">
          <button
            className="ondeck-button"
            disabled={!selectedAgent}
            onClick={() => {
              if (!selectedAgentId) return;
              const json = exportAgent(selectedAgentId);
              if (!json) return;
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement('a');
              anchor.href = url;
              anchor.download = `${selectedAgent?.name.toLowerCase().replace(/\s+/g, '-') || 'agent'}.json`;
              anchor.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download size={14} />
            Export Selected
          </button>
          <button className="ondeck-button" onClick={() => fileInputRef.current?.click()}>
            <Import size={14} />
            Import Agent
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          hidden
          onChange={async event => {
            const file = event.target.files?.[0];
            if (!file) return;
            const text = await file.text();
            const result = await importAgent(text, { x: 220, y: 160 });
            setImportStatus(result.message);
            event.target.value = '';
          }}
        />
        {importStatus && <p className="ondeck-muted">{importStatus}</p>}
      </div>

      <div className="ondeck-panel">
        <div className="ondeck-panel__header">Selected</div>
        {selectedAgent ? (
          <>
            <div className="ondeck-selected-title">{selectedAgent.name}</div>
            <div className="ondeck-selected-meta">
              <span className={`ondeck-mini-tag ${selectedAgent.signature_verified ? 'ondeck-mini-tag--green' : 'ondeck-mini-tag--red'}`}>
                {selectedAgent.signature_verified ? 'signed & owner-bound' : 'invalid'}
              </span>
              <span className="ondeck-mini-tag">{selectedAgent.encryption_enabled ? 'encrypted' : 'plain'}</span>
              {selectedAgent.needs_private_key && (
                <span className="ondeck-mini-tag ondeck-mini-tag--red">
                  <KeyRound size={12} />
                  no private key
                </span>
              )}
            </div>
          </>
        ) : (
          <p className="ondeck-muted">Select an agent node to open chat and configuration.</p>
        )}
      </div>
    </aside>
  );
}
