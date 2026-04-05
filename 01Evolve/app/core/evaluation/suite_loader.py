from __future__ import annotations

from pathlib import Path

from app.core.schemas.models import EvaluationSuiteConfig
from app.core.utils.common import read_data_file


def load_suite(path: str | Path) -> EvaluationSuiteConfig:
    return EvaluationSuiteConfig.model_validate(read_data_file(Path(path)))
