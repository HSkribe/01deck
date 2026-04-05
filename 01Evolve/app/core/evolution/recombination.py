from __future__ import annotations

import random

from app.core.schemas.models import AgentRead, GenomeConfig, MatingEventCreate, MatingEventRead, MutationRecord, TemperamentConfig
from app.core.utils.common import clamp


def _blend(a: float, b: float, config, fitness_a: float, fitness_b: float) -> float:
    if config.scalar_mode == "parent_a":
        return a
    if config.scalar_mode == "parent_b":
        return b
    if config.scalar_mode == "average":
        return (a + b) / 2
    if not config.use_parent_fitness_weighting or fitness_a + fitness_b == 0:
        return (a + b) / 2
    weight_a = fitness_a / (fitness_a + fitness_b)
    return a * weight_a + b * (1 - weight_a)


def breed_agents(parent_a: AgentRead, parent_b: AgentRead, fitness_a: float, fitness_b: float, event: MatingEventCreate) -> tuple[AgentRead, MatingEventRead]:
    rng = random.Random(parent_a.runtime_config.random_seed + parent_b.runtime_config.random_seed)
    mutation_records: list[MutationRecord] = []
    child_traits: dict[str, float] = {}
    for field, value_a in parent_a.genome.traits.model_dump().items():
        value_b = getattr(parent_b.genome.traits, field)
        blended = _blend(value_a, value_b, event.recombination, fitness_a, fitness_b)
        mutated = clamp(blended + rng.gauss(0, parent_a.genome.mutation.trait_mutation_std))
        child_traits[field] = mutated
        if abs(mutated - blended) > 1e-9:
            mutation_records.append(MutationRecord(field=f"genome.traits.{field}", before=blended, after=mutated, delta=mutated - blended))
    child_temperament: dict[str, float] = {}
    for field, value_a in parent_a.temperament.traits.model_dump().items():
        value_b = getattr(parent_b.temperament.traits, field)
        blended = _blend(value_a, value_b, event.recombination, fitness_a, fitness_b)
        mutated = clamp(blended + rng.gauss(0, parent_a.genome.mutation.trait_mutation_std))
        child_temperament[field] = mutated
        if abs(mutated - blended) > 1e-9:
            mutation_records.append(MutationRecord(field=f"temperament.traits.{field}", before=blended, after=mutated, delta=mutated - blended))
    strategy_payload = {}
    for field, value_a in parent_a.genome.strategy_genes.model_dump().items():
        strategy_payload[field] = value_a if rng.random() < 0.5 else getattr(parent_b.genome.strategy_genes, field)
    child = AgentRead(
        name=f"{parent_a.name}-{parent_b.name}-child",
        description=f"Offspring of {parent_a.agent_id} and {parent_b.agent_id}",
        species_tag=parent_a.species_tag,
        base_model=parent_a.base_model,
        model_provider=parent_a.model_provider,
        system_prompt_template=parent_a.system_prompt_template,
        genome=GenomeConfig(
            genome_version=parent_a.genome.genome_version,
            traits=child_traits,
            strategy_genes=strategy_payload,
            mutation=parent_a.genome.mutation,
        ),
        temperament=TemperamentConfig(temperament_version=parent_a.temperament.temperament_version, traits=child_temperament),
        policy_config=parent_a.policy_config,
        memory_config=parent_a.memory_config,
        tool_config=parent_a.tool_config,
        runtime_config=parent_a.runtime_config,
        metadata={"origin": "bred", "parent_a_id": parent_a.agent_id, "parent_b_id": parent_b.agent_id},
    )
    mating = MatingEventRead(
        parent_a_id=parent_a.agent_id,
        parent_b_id=parent_b.agent_id,
        pairing_mode=event.pairing_mode,
        recombination=event.recombination,
        child_agent_id=child.agent_id,
        mutation_records=mutation_records,
        parent_snapshot={"parent_a": parent_a.model_dump(mode="json"), "parent_b": parent_b.model_dump(mode="json"), "fitness_a": fitness_a, "fitness_b": fitness_b},
    )
    return child, mating
