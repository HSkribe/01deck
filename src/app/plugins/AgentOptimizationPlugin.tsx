import React from 'react';
import { FlaskConical, GitBranchPlus, ListChecks, SlidersHorizontal } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BenchmarkReportView } from '../components/workspace/BenchmarkReportView';
import { BaselineManager } from '../components/workspace/BaselineManager';
import { EvaluationRunnerPanel } from '../components/workspace/EvaluationRunnerPanel';
import { LineageViewer } from '../components/workspace/LineageViewer';
import { OptimizationDashboard } from '../components/workspace/OptimizationDashboard';
import { OptimizationRunPanel } from '../components/workspace/OptimizationRunPanel';
import { ScorecardView } from '../components/workspace/ScorecardView';
import { VariantManager } from '../components/workspace/VariantManager';
import { agentOptimizationApi } from './agentOptimizationApi';
import type { AgentOptimizationData } from './agentOptimizationTypes';

type FoundrySection = 'benchmarking' | 'recombination' | 'verification' | 'options';

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function OptionsPanel({ data }: { data: AgentOptimizationData }) {
  const { currentTheme: t } = useApp();
  const baseline = data.baseline.scorecard;

  const controls = [
    ['Intent classification weight', '15%', 'Locked to support tier-1 suite'],
    ['Policy correctness weight', '30%', 'Primary objective'],
    ['Format compliance weight', '15%', 'Response contract integrity'],
    ['Escalation judgment weight', '20%', 'Critical business safety'],
    ['Correction after feedback weight', '15%', 'Recovery quality'],
    ['Efficiency weight', '5%', 'Token and brevity guardrail'],
  ];

  return (
    <section className="rounded-3xl p-5" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>Options</div>
          <div className="text-sm mt-1" style={{ color: t.text }}>
            Control evaluation weights, eligibility gates, and recombination posture before running the next cycle.
          </div>
        </div>
        <button className="px-3 py-2 rounded-xl text-xs" style={{ background: t.surface2, color: t.text, border: `1px solid ${t.border}` }}>
          Save profile
        </button>
      </div>

      <div className="grid gap-4 mt-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl p-4" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
          <div className="text-xs uppercase tracking-[0.16em]" style={{ color: t.textMuted }}>Scoring controls</div>
          <div className="grid gap-3 mt-3">
            {controls.map(([label, value, note]) => (
              <div key={label} className="rounded-xl p-3" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm" style={{ color: t.text }}>{label}</div>
                  <div className="text-sm" style={{ color: t.accent }}>{value}</div>
                </div>
                <div className="text-xs mt-1" style={{ color: t.textMuted }}>{note}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-2xl p-4" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
            <div className="text-xs uppercase tracking-[0.16em]" style={{ color: t.textMuted }}>Eligibility gates</div>
            <div className="grid gap-2 mt-3 text-sm">
              <div style={{ color: t.text }}>Intent classification: {formatPercent(0.75)}</div>
              <div style={{ color: t.text }}>Policy correctness: {formatPercent(0.70)}</div>
              <div style={{ color: t.text }}>Format compliance: {formatPercent(0.85)}</div>
              <div style={{ color: t.text }}>Escalation judgment: {formatPercent(0.80)}</div>
              <div style={{ color: t.text }}>Correction after feedback: {formatPercent(0.50)}</div>
            </div>
          </div>

          <div className="rounded-2xl p-4" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
            <div className="text-xs uppercase tracking-[0.16em]" style={{ color: t.textMuted }}>Current baseline posture</div>
            <div className="grid gap-2 mt-3 text-sm">
              <div style={{ color: t.text }}>Fitness: {formatPercent(baseline.weighted_overall_fitness)}</div>
              <div style={{ color: t.text }}>Policy: {formatPercent(baseline.policy_correct_response)}</div>
              <div style={{ color: t.text }}>Escalation: {formatPercent(baseline.escalation_judgment)}</div>
              <div style={{ color: t.text }}>Feedback repair: {formatPercent(baseline.correction_after_feedback)}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AgentOptimizationPlugin() {
  const { currentTheme: t } = useApp();
  const [data, setData] = React.useState<AgentOptimizationData | null>(null);
  const [activeSection, setActiveSection] = React.useState<FoundrySection>('benchmarking');

  React.useEffect(() => {
    void agentOptimizationApi.getInitialData().then(setData);
  }, []);

  if (!data) {
    return (
      <div className="px-6 py-8" style={{ color: t.textMuted }}>
        Loading support optimization surfaces...
      </div>
    );
  }

  const sections: Array<{ id: FoundrySection; label: string; description: string; icon: typeof FlaskConical }> = [
    { id: 'benchmarking', label: 'Benchmarking', description: 'Testing, baselines, and evaluation runs', icon: FlaskConical },
    { id: 'recombination', label: 'Recombination', description: 'Pedigree, parent selection, and generation control', icon: GitBranchPlus },
    { id: 'verification', label: 'Results / Verification', description: 'Scorecards, lineage, and audit-ready reporting', icon: ListChecks },
    { id: 'options', label: 'Options', description: 'Weights, thresholds, and experiment controls', icon: SlidersHorizontal },
  ];

  return (
    <div className="px-6 pb-8">
      <div
        className="rounded-[28px] p-6 mb-6"
        style={{
          background: `linear-gradient(135deg, rgba(20,27,36,0.96), ${t.surface1})`,
          border: `1px solid ${t.border}`,
          boxShadow: `0 20px 48px ${t.glow}`,
        }}
      >
        <div className="text-[11px] uppercase tracking-[0.24em]" style={{ color: '#8fa2bb' }}>01FOUNDRY</div>
        <h1 className="text-3xl mt-3" style={{ color: t.text }}>Customer-support agent optimization</h1>
        <p className="text-sm mt-3 max-w-3xl" style={{ color: t.textMuted, lineHeight: 1.7 }}>
          Public-facing Foundry workflow for tier-1 SaaS support optimization. This shell is now organized into four operational areas so teams can test, recombine, verify, and tune without wading through the old deck surfaces.
        </p>

        <div className="grid gap-3 mt-5 md:grid-cols-2 xl:grid-cols-4">
          {sections.map(section => {
            const Icon = section.icon;
            const active = activeSection === section.id;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className="rounded-2xl p-4 text-left transition-all"
                style={{
                  background: active ? `${t.accent}16` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${active ? t.accent : t.border}`,
                  boxShadow: active ? `0 12px 28px ${t.glow}` : 'none',
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: active ? `${t.accent}18` : t.surface2 }}>
                    <Icon size={16} style={{ color: active ? t.accent : t.textMuted }} />
                  </div>
                  <div className="text-sm" style={{ color: t.text }}>{section.label}</div>
                </div>
                <div className="text-xs mt-3" style={{ color: t.textMuted, lineHeight: 1.6 }}>{section.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">
        {activeSection === 'benchmarking' ? (
          <>
            <OptimizationDashboard dashboard={data.dashboard} />
            <BaselineManager baseline={data.baseline} />
            <EvaluationRunnerPanel />
            <ScorecardView scorecard={data.variants[data.variants.length - 1].scorecard} />
          </>
        ) : null}

        {activeSection === 'recombination' ? (
          <>
            <VariantManager variants={data.variants} />
            <OptimizationRunPanel benchmark={data.benchmark} />
          </>
        ) : null}

        {activeSection === 'verification' ? (
          <>
            <ScorecardView scorecard={data.variants[data.variants.length - 1].scorecard} />
            <LineageViewer lineage={data.lineage} />
            <BenchmarkReportView report={data.benchmark} />
          </>
        ) : null}

        {activeSection === 'options' ? <OptionsPanel data={data} /> : null}
      </div>
    </div>
  );
}
