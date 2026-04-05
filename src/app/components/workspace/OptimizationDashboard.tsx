import React from 'react';
import { useApp } from '../../context/AppContext';
import type { OptimizationDashboardModel } from '../../plugins/agentOptimizationTypes';

export function OptimizationDashboard({ dashboard }: { dashboard: OptimizationDashboardModel }) {
  const { currentTheme: t } = useApp();
  const items = [
    ['Selected baseline', dashboard.selectedBaseline],
    ['Total variants', String(dashboard.totalVariants)],
    ['Latest benchmark', dashboard.latestBenchmarkRun],
    ['Best current score', `${Math.round(dashboard.bestCurrentScore * 100)}%`],
    ['Best policy correctness', `${Math.round(dashboard.bestPolicyCorrectness * 100)}%`],
    ['Best escalation judgment', `${Math.round(dashboard.bestEscalationJudgment * 100)}%`],
    ['Token cost delta', `${Math.round(dashboard.tokenCostDelta * 100)}%`],
  ];

  return (
    <section className="rounded-3xl p-5" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
      <div className="text-xs uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>Optimization Dashboard</div>
      <div className="grid gap-3 mt-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-2xl p-4" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
            <div className="text-[11px] uppercase tracking-[0.16em]" style={{ color: t.textMuted }}>{label}</div>
            <div className="text-lg mt-2" style={{ color: t.text }}>{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
