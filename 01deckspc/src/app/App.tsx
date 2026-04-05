import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AppProvider, useApp } from './context/AppContext';
import { TopBar } from './components/TopBar';
import { LeftRail } from './components/LeftRail';
import { AgentList } from './components/AgentList';
import { AgentCardModal } from './components/AgentCardModal';
import { ChatWindow } from './components/ChatWindow';
import { ThemePickerPanel } from './components/ThemePickerPanel';
import { ArcadePanel } from './components/ArcadePanel';
import { OnboardingFlow } from './components/OnboardingFlow';
import { AgentCreatorModal } from './components/AgentCreatorModal';
import { AgentImportFlow } from './components/AgentImportFlow';
import { MaestroPanel } from './components/MaestroPanel';

function AppContent() {
  const { currentTheme: t, isOnline, maestroEnabled } = useApp();
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
      {/* Maestro Extension Active Indicator - Accent Border */}
      {maestroEnabled && (
        <div
          className="fixed inset-0 pointer-events-none z-[60]"
          style={{
            border: `2px solid ${maestroAccent}`,
            boxShadow: `inset 0 0 30px ${maestroAccent}20`,
          }}
        />
      )}

      {/* Offline banner */}
      {!isOnline && (
        <div
          className="fixed top-14 left-0 right-0 z-30 flex items-center justify-center py-1.5 text-xs"
          style={{
            background: 'rgba(239,68,68,0.15)',
            borderBottom: '1px solid rgba(239,68,68,0.3)',
            color: '#fca5a5',
          }}
        >
          <span className="mr-2">⚠</span>
          Offline Mode · Showing cached agents ·{' '}
          <span style={{ color: '#ef4444' }}>Local-only actions will queue for sync when reconnected</span>
        </div>
      )}

      {/* Top navigation bar */}
      <TopBar />

      {/* Left category rail */}
      <LeftRail />

      {/* Main content area */}
      <main
        className="pt-14 min-h-screen transition-all"
        style={{
          paddingLeft: 64,
          marginTop: !isOnline ? 36 : 0,
        }}
      >
        <AgentList />
      </main>

      {/* Overlays */}
      <AgentCardModal />
      <ChatWindow />
      <ThemePickerPanel />
      <ArcadePanel />

      {/* Maestro VST Panel */}
      <MaestroPanel />

      {/* Agent Creator Modal (in-app, triggered from TopBar) */}
      <AgentCreatorModal />

      {/* Agent Import Flow (full-screen, shown on import) */}
      <AgentImportFlow />

      {/* Onboarding flow (full-screen, shown on first launch) */}
      <OnboardingFlow />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <DndProvider backend={HTML5Backend}>
        <AppContent />
      </DndProvider>
    </AppProvider>
  );
}