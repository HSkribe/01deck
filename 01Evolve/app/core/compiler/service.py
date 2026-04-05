from __future__ import annotations

import json

from app.core.schemas.models import AgentRead, CompiledAgentSpec
from app.core.utils.common import clamp


class AgentCompiler:
    def compile(self, agent: AgentRead) -> CompiledAgentSpec:
        traits = agent.genome.traits
        temperament = agent.temperament.traits
        policy = agent.policy_config
        runtime = agent.runtime_config
        derived = {
            "format_enforcement": clamp((traits.discipline + policy.enforce_format_strictness) / 2),
            "adapt_after_feedback": clamp((traits.adaptability + policy.correction_sensitivity - temperament.stubbornness) / 2),
            "candidate_generation": max(policy.candidate_count, 1 + round(traits.exploration * 2)),
            "retry_depth": min(6, policy.retry_limit + round(traits.persistence * 2)),
            "peer_weight": clamp((traits.social_receptivity + temperament.deference + policy.peer_review_weight) / 3),
            "output_budget": clamp((1 - traits.economy + temperament.verbosity + policy.verbosity_budget) / 3),
            "caution_bias": clamp((temperament.caution + traits.verification_bias) / 2),
            "assertiveness_bias": clamp((temperament.assertiveness + (1 - policy.hedge_threshold)) / 2),
        }
        prompt = agent.system_prompt_template.format(
            agent_name=agent.name,
            species_tag=agent.species_tag,
            base_model=agent.base_model,
            model_provider=agent.model_provider,
        ).strip()
        trace = {
            "agent_id": agent.agent_id,
            "name": agent.name,
            "genome": agent.genome.model_dump(mode="json"),
            "temperament": agent.temperament.model_dump(mode="json"),
            "policy_config": agent.policy_config.model_dump(mode="json"),
            "runtime_config": agent.runtime_config.model_dump(mode="json"),
            "derived": derived,
        }
        rendered = f"{prompt}\n\n[[EVOLVE_SPEC]]\n{json.dumps(trace, sort_keys=True)}"
        return CompiledAgentSpec(
            agent_id=agent.agent_id,
            rendered_system_prompt=rendered,
            execution_flags={
                "self_check_enabled": policy.self_check_enabled or temperament.caution > 0.6,
                "parallel_trials": runtime.parallel_trials,
                "trace_capture_enabled": runtime.trace_capture_enabled,
            },
            scoring_hints={"economy_target": 1 - derived["output_budget"], "cooperation_bias": derived["peer_weight"]},
            derived_runtime_parameters={
                "temperature": runtime.temperature if not runtime.deterministic_mode else min(runtime.temperature, 0.2 + traits.exploration * 0.1),
                "max_tokens": int(runtime.max_tokens * (0.55 + derived["output_budget"] * 0.9)),
                "timeout_seconds": runtime.timeout_seconds,
            },
            compiler_trace=trace,
        )
