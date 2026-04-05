from __future__ import annotations

from app.core.persistence.repository import Repository


class LineageService:
    def __init__(self, repository: Repository):
        self.repository = repository

    def show(self, agent_id: str) -> dict:
        return self.repository.get_lineage(agent_id)
