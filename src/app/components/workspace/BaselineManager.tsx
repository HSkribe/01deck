import React from 'react';
import { useApp } from '../../context/AppContext';
import type { SupportVariant } from '../../plugins/agentOptimizationTypes';

export function BaselineManager({ baseline }: { baseline: SupportVariant }) {
  const { currentTheme: t } = useApp();

  return (
    <section className="rounded-3xl p-5" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>Baseline Manager</div>
          <div className="text-lg mt-1" style={{ color: t.text }}>{baseline.name}</div>
        </div>
        <button className="px-3 py-2 rounded-xl text-xs" style={{ background: `${t.accent}16`, color: t.text, border: `1px solid ${t.accent}` }}>
          Replace baseline
        </button>
      </div>
      <div className="grid gap-3 mt-4 md:grid-cols-3">
        {baseline.genome_summary.map(item => (
          <div key={item} className="rounded-2xl p-3 text-sm" style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.text }}>
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
