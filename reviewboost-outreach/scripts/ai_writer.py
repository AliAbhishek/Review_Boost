from __future__ import annotations

import os
import time
from typing import Optional

import anthropic

from models.lead import Lead
from utils.logger import get_logger

logger = get_logger("ai_writer")

_MODEL = "claude-haiku-4-5-20251001"
_MAX_RETRIES = 3
_RETRY_DELAY = 2.0

_SUBJECT_VARIANTS = [
    "Quick question about {name}'s online reviews",
    "Help {name} get more customers from Google",
    "{name} – your reviews could be working harder",
    "Most restaurants in {city} miss this growth trick",
]


def generate_email(lead: Lead) -> tuple[str, str]:
    """
    Generate a personalized cold email for a restaurant lead using Claude.

    Args:
        lead: The Lead object with restaurant details.

    Returns:
        A (subject, body) tuple.

    Raises:
        RuntimeError: If CLAUDE_API_KEY is not set or all retries are exhausted.
    """
    api_key = os.getenv("CLAUDE_API_KEY", "")
    if not api_key:
        raise RuntimeError("CLAUDE_API_KEY not set in environment")

    subject = _pick_subject(lead)
    body = _call_claude(lead, api_key)
    return subject, body


def _pick_subject(lead: Lead) -> str:
    index = lead.review_count % len(_SUBJECT_VARIANTS)
    template = _SUBJECT_VARIANTS[index]
    return template.format(name=lead.name, city=lead.city)


def _call_claude(lead: Lead, api_key: str) -> str:
    client = anthropic.Anthropic(api_key=api_key)
    prompt = _build_prompt(lead)

    last_exc: Optional[Exception] = None
    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            message = client.messages.create(
                model=_MODEL,
                max_tokens=256,
                messages=[{"role": "user", "content": prompt}],
            )
            return message.content[0].text.strip()
        except Exception as exc:
            last_exc = exc
            logger.warning(f"Claude API error (attempt {attempt}/{_MAX_RETRIES}): {exc}")
            if attempt < _MAX_RETRIES:
                time.sleep(_RETRY_DELAY)

    raise RuntimeError(f"Claude API failed after {_MAX_RETRIES} attempts: {last_exc}")


def _build_prompt(lead: Lead) -> str:
    return (
        f"Write a short cold email (under 110 words) from a SaaS company called ReviewBoost "
        f"to the owner of '{lead.name}', a restaurant in {lead.city}, India. "
        f"The restaurant currently has {lead.review_count} Google reviews. "
        f"Naturally mention the restaurant name and its review count. "
        f"Use a friendly, local tone suited for {lead.city}. "
        f"End with one clear call-to-action to book a free 15-minute demo. "
        f"Output only the email body — no subject line, no placeholders."
    )
