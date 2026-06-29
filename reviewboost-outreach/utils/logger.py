from __future__ import annotations

import logging
import os
from datetime import datetime
from pathlib import Path

from rich.console import Console
from rich.logging import RichHandler

_console = Console()
_loggers: dict[str, logging.Logger] = {}


def get_logger(name: str = "reviewboost") -> logging.Logger:
    if name in _loggers:
        return _loggers[name]

    logs_dir = Path("logs")
    logs_dir.mkdir(exist_ok=True)

    log_file = logs_dir / f"outreach_{datetime.now().strftime('%Y-%m-%d')}.log"

    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)

    if not logger.handlers:
        # Rich console handler — colours, icons
        rich_handler = RichHandler(
            console=_console,
            rich_tracebacks=True,
            show_path=False,
            markup=True,
        )
        rich_handler.setLevel(logging.INFO)

        # Plain file handler — no markup
        file_handler = logging.FileHandler(log_file, encoding="utf-8")
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(
            logging.Formatter("%(asctime)s | %(levelname)-8s | %(name)s | %(message)s")
        )

        logger.addHandler(rich_handler)
        logger.addHandler(file_handler)

    _loggers[name] = logger
    return logger
