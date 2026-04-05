"""01Protocol testing helpers for inspectable evolution metadata."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from hashlib import sha256
from typing import Any

from .agent import resign_agent


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def content_hash(payload: dict[str, Any]) -> str:
    return sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()


def attach_evolution_metadata(
    agent: dict[str, Any],
    private_key_hex: str,
    genome_ref: dict[str, Any],
    policy: dict[str, Any],
    temperament: dict[str, Any],
    runtime: dict[str, Any],
    lineage: list[dict[str, Any]] | None = None,
    audit_root: str | None = None,
) -> dict[str, Any]:
    updates = {
        "x-genome-ref": genome_ref,
        "x-policy": policy,
        "x-temperament": temperament,
        "x-runtime": runtime,
        "x-lineage": lineage or [],
        "x-audit-root": audit_root,
        "x-evolve-updated-at": _now(),
    }
    return resign_agent(agent, private_key_hex, updates)


def create_audit_bundle(identity: dict[str, Any], audit_events: list[dict[str, Any]]) -> dict[str, Any]:
    root = content_hash({"auditEvents": audit_events})
    bundle = {"identity": identity, "auditEvents": audit_events, "auditRoot": root}
    return {"bundle": bundle, "audit_root": root}
