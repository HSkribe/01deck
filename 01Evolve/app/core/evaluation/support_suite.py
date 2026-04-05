from __future__ import annotations

from pathlib import Path

from app.core.schemas.models import SupportCaseConfig, SupportEvaluationSuiteConfig, SupportPolicyRule
from app.core.utils.common import read_data_file


def load_support_suite(path: str | Path) -> SupportEvaluationSuiteConfig:
    return SupportEvaluationSuiteConfig.model_validate(read_data_file(Path(path)))


def load_support_policy(path: str | Path) -> list[SupportPolicyRule]:
    payload = read_data_file(Path(path))
    rules = payload["rules"] if isinstance(payload, dict) else payload
    return [SupportPolicyRule.model_validate(rule) for rule in rules]


def load_support_dataset(path: str | Path) -> list[SupportCaseConfig]:
    payload = read_data_file(Path(path))
    cases = payload["cases"] if isinstance(payload, dict) else payload
    return [SupportCaseConfig.model_validate(case) for case in cases]
