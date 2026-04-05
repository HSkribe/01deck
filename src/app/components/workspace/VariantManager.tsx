import React from 'react';
import { useApp } from '../../context/AppContext';
import { Eye, EyeOff } from 'lucide-react';
import type { SupportVariant } from '../../plugins/agentOptimizationTypes';

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function metricTone(value: number) {
  if (value >= 0.85) return '#34d399';
  if (value >= 0.75) return '#fbbf24';
  return '#f87171';
}

export function VariantManager({ variants, showNamesDefault = false }: { variants: SupportVariant[]; showNamesDefault?: boolean }) {
  const { currentTheme: t } = useApp();
  const [showNames, setShowNames] = React.useState(showNamesDefault);

  return (
    <section className="rounded-3xl p-5" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>Variant Roster</div>
          <div className="text-sm mt-1" style={{ color: t.text }}>
            Pedigree-first business view with benchmark readiness and parent eligibility.
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowNames(current => !current)}
            className="px-3 py-2 rounded-xl text-xs inline-flex items-center gap-1.5"
            style={{ background: t.surface2, color: t.text, border: `1px solid ${t.border}` }}
          >
            {showNames ? <EyeOff size={13} /> : <Eye size={13} />}
            {showNames ? 'Hide names' : 'Show names'}
          </button>
          {['Create variant', 'Import config', 'Duplicate', 'Delete'].map(label => (
            <button key={label} className="px-3 py-2 rounded-xl text-xs" style={{ background: t.surface2, color: t.text, border: `1px solid ${t.border}` }}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 mt-4">
        {variants.map(variant => {
          const pedigree = `Gen ${variant.generation_number} · ${variant.tags.join(' / ')}`;
          const benchmarkTone = metricTone(variant.scorecard.weighted_overall_fitness);
          const policyTone = metricTone(variant.scorecard.policy_correct_response);
          const escalationTone = metricTone(variant.scorecard.escalation_judgment);

          return (
            <div
              key={variant.agent_id}
              className="rounded-2xl p-4"
              style={{ background: t.surface2, border: `1px solid ${t.border}` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color: t.textMuted }}>
                    {variant.agent_id.replaceAll('_', ' ')}
                  </div>
                  {showNames ? (
                    <div className="text-base mt-1" style={{ color: t.text }}>{variant.name}</div>
                  ) : null}
                  <div className="text-sm mt-1" style={{ color: t.textMuted }}>{pedigree}</div>
                  <div className="text-xs mt-2" style={{ color: t.textMuted }}>
                    {variant.genome_summary.join(' · ')}
                  </div>
                </div>
                <div
                  className="px-3 py-1.5 rounded-full text-[11px] uppercase tracking-[0.16em]"
                  style={{
                    background: variant.scorecard.parent_eligible ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                    border: `1px solid ${variant.scorecard.parent_eligible ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.28)'}`,
                    color: variant.scorecard.parent_eligible ? '#86efac' : '#fca5a5',
                  }}
                >
                  {variant.scorecard.parent_eligible ? 'Parent eligible' : 'Needs work'}
                </div>
              </div>

              <div className="grid gap-3 mt-4 md:grid-cols-4">
                <div className="rounded-xl p-3" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
                  <div className="text-[11px] uppercase tracking-[0.16em]" style={{ color: t.textMuted }}>Benchmark</div>
                  <div className="text-lg mt-1" style={{ color: benchmarkTone }}>{formatPercent(variant.scorecard.weighted_overall_fitness)}</div>
                </div>
                <div className="rounded-xl p-3" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
                  <div className="text-[11px] uppercase tracking-[0.16em]" style={{ color: t.textMuted }}>Policy</div>
                  <div className="text-lg mt-1" style={{ color: policyTone }}>{formatPercent(variant.scorecard.policy_correct_response)}</div>
                </div>
                <div className="rounded-xl p-3" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
                  <div className="text-[11px] uppercase tracking-[0.16em]" style={{ color: t.textMuted }}>Escalation</div>
                  <div className="text-lg mt-1" style={{ color: escalationTone }}>{formatPercent(variant.scorecard.escalation_judgment)}</div>
                </div>
                <div className="rounded-xl p-3" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
                  <div className="text-[11px] uppercase tracking-[0.16em]" style={{ color: t.textMuted }}>Feedback Repair</div>
                  <div className="text-lg mt-1" style={{ color: t.text }}>{formatPercent(variant.scorecard.correction_after_feedback)}</div>
                </div>
              </div>

              {!variant.scorecard.parent_eligible && variant.scorecard.failed_threshold_reasons.length > 0 ? (
                <div className="text-xs mt-3" style={{ color: '#fca5a5' }}>
                  Threshold misses: {variant.scorecard.failed_threshold_reasons.join(', ')}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
