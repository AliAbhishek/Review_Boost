from __future__ import annotations

import csv
import glob
import os
from pathlib import Path
from typing import Optional

from models.lead import Lead


_FIELDNAMES: list[str] = list(Lead("", "", "", 0.0, 0, "", "", "", "").to_dict().keys())

_DATA_DIR = Path("data")


def read_leads(filepath: str) -> list[Lead]:
    """Read leads from a CSV file and return a list of Lead objects."""
    leads: list[Lead] = []
    path = Path(filepath)
    if not path.exists():
        return leads

    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            leads.append(Lead.from_dict(dict(row)))
    return leads


def write_leads(leads: list[Lead], filepath: str) -> None:
    """Write leads to a CSV file, creating parent dirs as needed."""
    path = Path(filepath)
    path.parent.mkdir(parents=True, exist_ok=True)

    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=_FIELDNAMES, extrasaction="ignore")
        writer.writeheader()
        for lead in leads:
            writer.writerow(lead.to_dict())


def get_latest_csv() -> Optional[str]:
    """Return path of the most recently modified CSV in data/, or None."""
    _DATA_DIR.mkdir(exist_ok=True)
    files = glob.glob(str(_DATA_DIR / "*.csv"))
    if not files:
        return None
    return max(files, key=os.path.getmtime)
