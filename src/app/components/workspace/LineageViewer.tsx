import React from 'react';
import { useApp } from '../../context/AppContext';
import type { LineageEvent } from '../../plugins/agentOptimizationTypes';

export function LineageViewer({ lineage }: { lineage: LineageEvent[] }) {
  const { currentTheme: t } = useApp();

  return (
    <section className="rounded-3xl p-5" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
      <div className="text-xs uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>Lineage Viewer</div>
      <div className="space-y-3 mt-4">
        {lineage.map(event => (
          <div key={event.event_id} className="rounded-2xl p-4" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
            <div className="text-sm" style={{ color: t.text }}>{event.parent_a_id} + {event.parent_b_id} {'->'} {event.child_agent_id}</div>
            <div className="text-xs mt-2" style={{ color: t.textMuted }}>{event.recombinationSummary}</div>
            <div className="text-xs mt-1" style={{ color: t.textMuted }}>{event.mutationSummary}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
