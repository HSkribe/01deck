from __future__ import annotations

from app.core.schemas.models import LatentTraitProfile, PhenotypeProfile, TemperamentProfile
from app.core.utils.common import clamp, mean


def map_latent_traits(phenotype: PhenotypeProfile, temperament: TemperamentProfile) -> LatentTraitProfile:
    return LatentTraitProfile(
        discipline=clamp(mean([phenotype.instruction_following, phenotype.consistency, 1 - temperament.verbosity])),
        adaptability=clamp(mean([phenotype.correction, phenotype.robustness, 1 - temperament.stubbornness])),
        exploration=clamp(mean([phenotype.entropy, phenotype.context_sensitivity, temperament.novelty_seeking])),
        persistence=clamp(mean([phenotype.goal_pursuit, phenotype.correction, temperament.patience])),
        social_receptivity=clamp(mean([phenotype.cooperation, temperament.deference])),
        economy=clamp(mean([phenotype.efficiency, phenotype.consistency, 1 - temperament.verbosity])),
    )
