import React from 'react';
import { useApp } from '../../context/AppContext';
import type { SupportScorecard } from '../../plugins/agentOptimizationTypes';

export function ScorecardView({ scorecard }: { scorecard: SupportScorecard }) {
  const { currentTheme: t } = useApp();
  const metrics = [
    ['Intent classification', scorecard.intent_classification],
    ['Policy correct response', scorecard.policy_correct_response],
    ['Format compliance', scorecard.format_compliance],
    ['Escalation judgment', scorecard.escalation_judgment],
    ['Correction after feedback', scorecard.correction_after_feedback],
    ['Efficiency', scorecard.efficiency],
    ['Weighted overall fitness', scorecard.weighted_overall_fitness],
  ];

  return (
    <section className="rounded-3xl p-5" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>Scorecard</div>
        <div className="text-xs" style={{ color: scorecard.parent_eligible ? '#34d399' : '#f59e0b' }}>
          {scorecard.parent_eligible ? 'Eligible' : 'Not eligible'}
        </div>
      </div>
      <div className="grid gap-3 mt-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-2xl p-3" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
            <div className="text-[11px] uppercase tracking-[0.16em]" style={{ color: t.textMuted }}>{label}</div>
            <div className="text-lg mt-2" style={{ color: t.text }}>{Math.round((value as number) * 100)}%</div>
          </div>
        ))}
      </div>
    </section>
  );
}
