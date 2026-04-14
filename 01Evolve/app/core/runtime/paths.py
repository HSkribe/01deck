from __future__ import annotations

import os
from pathlib import Path


def _platform_base_dir() -> Path:
    custom_home = os.getenv("01AI_HOME", "").strip()
    if custom_home:
        return Path(custom_home).expanduser().resolve()

    if os.name == "nt":
        appdata = os.getenv("APPDATA", "").strip()
        if appdata:
            return Path(appdata).expanduser() / "01AI"

    home = Path.home()

    if os.name == "posix" and "darwin" in os.sys.platform:
        return home / "Library" / "Application Support" / "01AI"

    xdg_data_home = os.getenv("XDG_DATA_HOME", "").strip()
    if xdg_data_home:
        return Path(xdg_data_home).expanduser() / "01AI"

    return home / ".local" / "share" / "01AI"


def get_01deck_home() -> Path:
    return _platform_base_dir() / "01deck"


def get_runtime_paths() -> dict[str, Path]:
    root = get_01deck_home()
    return {
        "root": root,
        "auth": root / "auth",
        "cache": root / "cache",
        "config": root / "config",
        "db": root / "db",
        "exports": root / "exports",
        "logs": root / "logs",
        "reports": root / "reports",
        "state": root / "state",
    }


def ensure_runtime_tree() -> dict[str, Path]:
    paths = get_runtime_paths()
    for path in paths.values():
        path.mkdir(parents=True, exist_ok=True)
    return paths


def get_default_db_path() -> Path:
    paths = ensure_runtime_tree()
    return paths["db"] / "01evolve.sqlite3"
