import { useEffect } from 'react';
import { AgentCanvas } from './components/AgentCanvas';
import { AgentPanel } from './components/AgentPanel';
import { WorkbenchSidebar } from './components/WorkbenchSidebar';
import { useDeckStore } from './store/useDeckStore';

export function DeckWorkbench() {
  const refreshRuntimeState = useDeckStore(state => state.refreshRuntimeState);

  useEffect(() => {
    refreshRuntimeState().catch(() => undefined);
  }, [refreshRuntimeState]);

  return (
    <div className="ondeck-shell">
      <WorkbenchSidebar />
      <main className="ondeck-main">
        <header className="ondeck-header">
          <div>
            <h1>01Deck Agent Workbench</h1>
            <p>
              Drag agents onto the canvas, connect them, chat locally, and exchange signed relays with optional memory and encryption.
            </p>
          </div>
        </header>
        <AgentCanvas />
      </main>
      <AgentPanel />
    </div>
  );
}
