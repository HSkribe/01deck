import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AppProvider, useApp } from './context/AppContext';
import { TopBar } from './components/TopBar';
import { LeftRail } from './components/LeftRail';
import { AgentList } from './components/AgentList';
import { AgentCardModal } from './components/AgentCardModal';
import { ActiveAgentPanel } from './components/ActiveAgentPanel';
import { ThemePickerPanel } from './components/ThemePickerPanel';
import { ArcadePanel } from './components/ArcadePanel';
import { OnboardingFlow } from './components/OnboardingFlow';
import { AgentCreatorModal } from './components/AgentCreatorModal';
import { AgentImportFlow } from './components/AgentImportFlow';
import { MaestroPanel } from './components/MaestroPanel';
import { Hub } from './components/Hub';
import { CreateImportModal } from './components/CreateImportModal';
import { WorkspaceSection } from './components/workspace/WorkspaceSection';
import { HubApp } from './components/hub/HubApp';
import { EvolutionExperiencePlugin } from './plugins/01evolve/EvolutionExperiencePlugin';
import { IS_DECK_PRODUCT, SERIOUS_PRODUCT_MODE } from './utils/productMode';

function AppContent() {
  const { 
    currentTheme: t, 
    isOnline, 
    workspaceSection, 
    showHub, setShowHub, 
    hubInitialView, 
    maestroEnabled,
    showCreateImport,
    setShowCreateImport
  } = useApp();
  const maestroAccent = '#ff4da6';

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: t.bg,
        color: t.text,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {maestroEnabled && (
        <div
          className="fixed inset-0 pointer-events-none z-[60]"
          style={{
            border: `2px solid ${maestroAccent}`,
            boxShadow: `inset 0 0 30px ${maestroAccent}20`,
          }}
        />
      )}

      {!isOnline && (
        <div
          className="fixed top-14 left-0 right-0 z-30 flex items-center justify-center py-1.5 text-xs"
          style={{
            background: 'rgba(239,68,68,0.15)',
            borderBottom: '1px solid rgba(239,68,68,0.3)',
            color: '#fca5a5',
          }}
        >
          <span className="mr-2">!</span>
          Local preview mode | Showing local deck data |{' '}
          <span style={{ color: '#ef4444' }}>sync queue and remote transport are not enabled in this build</span>
        </div>
      )}

      <TopBar />
      {IS_DECK_PRODUCT && workspaceSection === 'deck' ? <LeftRail /> : null}

      <main
        className="pt-14 min-h-screen transition-all"
        style={{
          paddingLeft: IS_DECK_PRODUCT && workspaceSection === 'deck' ? 64 : 0,
          marginTop: !isOnline ? 36 : 0,
        }}
      >
        {SERIOUS_PRODUCT_MODE ? <WorkspaceSection /> : workspaceSection === 'deck' ? <AgentList /> : <WorkspaceSection />}
      </main>

      {IS_DECK_PRODUCT ? (
        <>
          <AgentCardModal />
          <ActiveAgentPanel />
          <ThemePickerPanel />
          {workspaceSection === 'deck' ? <ArcadePanel /> : null}
          <MaestroPanel />
          <Hub />
          <CreateImportModal isOpen={showCreateImport} onClose={() => setShowCreateImport(false)} />
          <AgentCreatorModal />
          <AgentImportFlow />
          <OnboardingFlow />
          <EvolutionExperiencePlugin />
          <HubApp isOpen={showHub} onClose={() => setShowHub(false)} initialView={hubInitialView ?? undefined} />
        </>
      ) : (
        <ThemePickerPanel />
      )}
    </div>
  );
}

export default function App() {
  return (
    <DndProvider backend={HTML5Backend}>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </DndProvider>
  );
}
