import type { AgentOptimizationData, BenchmarkReportModel, SupportVariant } from './agentOptimizationTypes';
import { backendApi } from '../services/backendApi';

const mockScorecard = (overrides: Partial<SupportVariant['scorecard']> = {}) => ({
  intent_classification: 0.82,
  policy_correct_response: 0.84,
  format_compliance: 0.92,
  escalation_judgment: 0.87,
  correction_after_feedback: 0.74,
  efficiency: 0.79,
  weighted_overall_fitness: 0.84,
  delta_vs_baseline: {
    weighted_overall_fitness: 0.12,
    escalation_judgment: 0.18,
  },
  parent_eligible: true,
  failed_threshold_reasons: [],
  ...overrides,
});

const mockData: AgentOptimizationData = {
  dashboard: {
    selectedBaseline: 'Support Baseline',
    totalVariants: 24,
    latestBenchmarkRun: 'bench_support_20260331',
    bestCurrentScore: 0.84,
    bestPolicyCorrectness: 0.89,
    bestEscalationJudgment: 0.92,
    tokenCostDelta: -0.03,
  },
  baseline: {
    agent_id: 'baseline_support',
    name: 'Support Baseline',
    status: 'baseline',
    generation_number: 0,
    tags: ['baseline'],
    genome_summary: ['Conservative policy posture', 'Strict JSON', 'Low verbosity'],
    scorecard: mockScorecard({
      policy_correct_response: 0.74,
      escalation_judgment: 0.76,
      correction_after_feedback: 0.61,
      weighted_overall_fitness: 0.72,
      delta_vs_baseline: {},
    }),
  },
  variants: Array.from({ length: 8 }, (_, index) => ({
    agent_id: `variant_${index + 1}`,
    name: `Support Variant ${String(index + 1).padStart(2, '0')}`,
    status: index < 2 ? 'generated' : 'evaluated',
    generation_number: index < 4 ? 1 : 2,
    tags: index % 2 === 0 ? ['policy', 'efficient'] : ['escalation', 'corrective'],
    genome_summary: [
      index % 2 === 0 ? 'High policy reliability' : 'High escalation sensitivity',
      'Compact customer response budget',
      'Tier-1 SaaS routing',
    ],
    scorecard: mockScorecard({
      weighted_overall_fitness: 0.75 + index * 0.012,
      policy_correct_response: 0.76 + index * 0.015,
      escalation_judgment: 0.78 + index * 0.016,
      correction_after_feedback: 0.64 + index * 0.013,
      efficiency: 0.77 - index * 0.005,
      parent_eligible: index !== 0,
      failed_threshold_reasons: index === 0 ? ['escalation_judgment<0.80'] : [],
    }),
  })),
  lineage: [
    {
      event_id: 'mate_01',
      parent_a_id: 'variant_02',
      parent_b_id: 'variant_05',
      child_agent_id: 'variant_09',
      created_at: '2026-03-31T05:00:00Z',
      mutationSummary: 'Reduced stubbornness and tightened response budget.',
      recombinationSummary: 'Combined policy anchor genes with escalation sentinel caution.',
    },
    {
      event_id: 'mate_02',
      parent_a_id: 'variant_04',
      parent_b_id: 'variant_08',
      child_agent_id: 'variant_10',
      created_at: '2026-03-31T05:20:00Z',
      mutationSummary: 'Lifted correction sensitivity and lowered verbosity.',
      recombinationSummary: 'Merged feedback adaptation with stable formatting behavior.',
    },
  ],
  benchmark: {
    benchmark_run_id: 'bench_support_20260331',
    baseline_agent_id: 'baseline_support',
    best_agent_id: 'variant_10',
    generations_completed: 3,
    population_size: 20,
    baseline_scorecard: mockScorecard({
      policy_correct_response: 0.74,
      escalation_judgment: 0.76,
      correction_after_feedback: 0.61,
      weighted_overall_fitness: 0.72,
      delta_vs_baseline: {},
    }),
    best_scorecard: mockScorecard({
      policy_correct_response: 0.89,
      escalation_judgment: 0.92,
      correction_after_feedback: 0.78,
      efficiency: 0.76,
      weighted_overall_fitness: 0.84,
    }),
    percent_improvements: {
      weighted_overall_fitness: 16.7,
      escalation_judgment: 21.1,
      correction_after_feedback: 27.9,
      token_cost: -3.0,
    },
    success_criteria_results: {
      weighted_overall_fitness: true,
      escalation_judgment: true,
      correction_after_feedback: true,
      token_cost: true,
    },
    score_trend: [0.74, 0.79, 0.82, 0.84],
  },
};

async function getJson<T>(url: string, fallback: T): Promise<T> {
  try {
    return await backendApi.getJson<T>(url);
  } catch {
    return fallback;
  }
}

export const agentOptimizationApi = {
  async getInitialData(): Promise<AgentOptimizationData> {
    const report = await this.getBenchmarkReport(mockData.benchmark.benchmark_run_id);
    return { ...mockData, benchmark: report };
  },

  async getBenchmarkReport(runId: string): Promise<BenchmarkReportModel> {
    return getJson(`/support-benchmark/${runId}/report`, mockData.benchmark);
  },
};
