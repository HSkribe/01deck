import React from 'react';
import { useApp } from '../../context/AppContext';

export function EvaluationRunnerPanel() {
  const { currentTheme: t } = useApp();

  return (
    <section className="rounded-3xl p-5" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
      <div className="text-xs uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>Evaluation Runner</div>
      <div className="grid gap-3 mt-4 md:grid-cols-3">
        {[
          ['Suite', 'support_tier1_v1'],
          ['Adapter', 'Mock adapter'],
          ['Mode', 'Baseline comparison'],
          ['Progress', 'Ready'],
          ['Latest results', '24 candidates evaluated'],
          ['Action', 'Run evaluation'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl p-3" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
            <div className="text-[11px] uppercase tracking-[0.16em]" style={{ color: t.textMuted }}>{label}</div>
            <div className="text-sm mt-2" style={{ color: t.text }}>{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
