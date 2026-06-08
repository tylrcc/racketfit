"""Load the bundled racket database."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import List

from .models import Racket

_DATA_PATH = Path(__file__).parent / "data" / "rackets.json"


@lru_cache(maxsize=1)
def load_rackets(path: str | None = None) -> List[Racket]:
    """Return every racket in the database.

    Pass ``path`` to load a custom JSON file with the same schema; otherwise
    the bundled database ships with the package.
    """
    data_path = Path(path) if path else _DATA_PATH
    raw = json.loads(data_path.read_text(encoding="utf-8"))
    return [Racket.from_dict(r) for r in raw["rackets"]]


def database_meta(path: str | None = None) -> dict:
    """Return the ``_meta`` block (schema notes, disclaimers)."""
    data_path = Path(path) if path else _DATA_PATH
    raw = json.loads(data_path.read_text(encoding="utf-8"))
    return raw.get("_meta", {})
