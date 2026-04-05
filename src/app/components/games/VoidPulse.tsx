import React, { useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

export function VoidPulse() {
  const { currentTheme: t, chatAgent } = useApp();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Once the iframe loads, we can optionally pass it data about the current agent
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // In the future, we can listen for high scores or events from the Void Pulse game here
      if (event.data?.type === 'VOID_PULSE_SCORE') {
        console.log(`New High Score: ${event.data.score}`);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden relative"
      style={{
        border: `1px solid ${t.border}`,
        boxShadow: `0 8px 32px ${t.glow}`,
        minHeight: '600px', // Ensure it has enough space
      }}
    >
      <iframe
        ref={iframeRef}
        src="/games/void-pulse.html"
        className="w-full h-full border-0 absolute inset-0"
        title="Void Pulse"
        style={{
          background: '#000',
        }}
      />
      {chatAgent && (
        <div 
          className="absolute top-4 left-4 px-3 py-1.5 rounded-lg text-xs z-10 pointer-events-none"
          style={{ 
            background: 'rgba(0,0,0,0.6)', 
            border: `1px solid ${t.accent}`,
            color: t.accent,
            backdropFilter: 'blur(4px)'
          }}
        >
          {chatAgent.name} is watching
        </div>
      )}
    </div>
  );
}
