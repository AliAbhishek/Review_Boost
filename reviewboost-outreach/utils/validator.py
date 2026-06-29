from __future__ import annotations

import os
import re
from typing import Optional
from urllib.parse import urlparse


_EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")

_REQUIRED_VARS: list[str] = [
    "GOOGLE_API_KEY",
    "CLAUDE_API_KEY",
    "BREVO_API_KEY",
    "SENDER_EMAIL",
    "SENDER_NAME",
]


def validate_env(required: Optional[list[str]] = None) -> tuple[bool, list[str]]:
    """Return (ok, missing_vars). Checks os.environ for required keys."""
    keys = required if required is not None else _REQUIRED_VARS
    missing = [k for k in keys if not os.getenv(k)]
    return len(missing) == 0, missing


def validate_email(address: str) -> bool:
    """Return True if address looks like a real email."""
    if not address:
        return False
    return bool(_EMAIL_RE.match(address.strip()))


def validate_url(url: str) -> bool:
    """Return True if url has a valid scheme and netloc."""
    if not url:
        return False
    try:
        parsed = urlparse(url)
        return parsed.scheme in {"http", "https"} and bool(parsed.netloc)
    except Exception:
        return False
