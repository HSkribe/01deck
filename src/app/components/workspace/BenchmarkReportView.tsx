import React from 'react';
import { useApp } from '../../context/AppContext';
import type { BenchmarkReportModel } from '../../plugins/agentOptimizationTypes';

export function BenchmarkReportView({ report }: { report: BenchmarkReportModel }) {
  const { currentTheme: t } = useApp();

  return (
    <section className="rounded-3xl p-5" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>Benchmark Report</div>
          <div className="text-lg mt-1" style={{ color: t.text }}>Baseline vs best final agent</div>
        </div>
        <div className="text-xs" style={{ color: t.textMuted }}>{report.benchmark_run_id}</div>
      </div>
      <div className="grid gap-3 mt-4 md:grid-cols-2 xl:grid-cols-4">
        {Object.entries(report.percent_improvements).map(([label, value]) => (
          <div key={label} className="rounded-2xl p-3" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
            <div className="text-[11px] uppercase tracking-[0.16em]" style={{ color: t.textMuted }}>{label}</div>
            <div className="text-lg mt-2" style={{ color: t.text }}>{Math.round(value)}%</div>
            <div className="text-xs mt-1" style={{ color: report.success_criteria_results[label] ? '#34d399' : '#f59e0b' }}>
              {report.success_criteria_results[label] ? 'Pass' : 'Fail'}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
