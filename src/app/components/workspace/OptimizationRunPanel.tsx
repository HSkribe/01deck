import React from 'react';
import { useApp } from '../../context/AppContext';
import type { BenchmarkReportModel } from '../../plugins/agentOptimizationTypes';

export function OptimizationRunPanel({ benchmark }: { benchmark: BenchmarkReportModel }) {
  const { currentTheme: t } = useApp();

  return (
    <section className="rounded-3xl p-5" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
      <div className="text-xs uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>Optimization Run</div>
      <div className="grid gap-3 mt-4 md:grid-cols-3">
        <div className="rounded-2xl p-3" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
          <div className="text-[11px] uppercase tracking-[0.16em]" style={{ color: t.textMuted }}>Inputs</div>
          <div className="text-sm mt-2" style={{ color: t.text }}>Population {benchmark.population_size} | Generations {benchmark.generations_completed} | Strategy balanced</div>
        </div>
        <div className="rounded-2xl p-3" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
          <div className="text-[11px] uppercase tracking-[0.16em]" style={{ color: t.textMuted }}>Current generation</div>
          <div className="text-lg mt-2" style={{ color: t.text }}>{benchmark.generations_completed}</div>
        </div>
        <div className="rounded-2xl p-3" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
          <div className="text-[11px] uppercase tracking-[0.16em]" style={{ color: t.textMuted }}>Best vs baseline</div>
          <div className="text-lg mt-2" style={{ color: t.text }}>{Math.round(benchmark.percent_improvements.weighted_overall_fitness)}%</div>
        </div>
      </div>
    </section>
  );
}
