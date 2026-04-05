export interface SupportScorecard {
  intent_classification: number;
  policy_correct_response: number;
  format_compliance: number;
  escalation_judgment: number;
  correction_after_feedback: number;
  efficiency: number;
  weighted_overall_fitness: number;
  delta_vs_baseline: Record<string, number>;
  parent_eligible: boolean;
  failed_threshold_reasons: string[];
}

export interface SupportVariant {
  agent_id: string;
  name: string;
  status: string;
  generation_number: number;
  tags: string[];
  genome_summary: string[];
  scorecard: SupportScorecard;
}

export interface OptimizationDashboardModel {
  selectedBaseline: string;
  totalVariants: number;
  latestBenchmarkRun: string;
  bestCurrentScore: number;
  bestPolicyCorrectness: number;
  bestEscalationJudgment: number;
  tokenCostDelta: number;
}

export interface BenchmarkReportModel {
  benchmark_run_id: string;
  baseline_agent_id: string;
  best_agent_id: string;
  generations_completed: number;
  population_size: number;
  baseline_scorecard: SupportScorecard;
  best_scorecard: SupportScorecard;
  percent_improvements: Record<string, number>;
  success_criteria_results: Record<string, boolean>;
  score_trend: number[];
}

export interface LineageEvent {
  event_id: string;
  parent_a_id: string;
  parent_b_id: string;
  child_agent_id: string;
  created_at: string;
  mutationSummary: string;
  recombinationSummary: string;
}

export interface AgentOptimizationData {
  dashboard: OptimizationDashboardModel;
  baseline: SupportVariant;
  variants: SupportVariant[];
  lineage: LineageEvent[];
  benchmark: BenchmarkReportModel;
}
