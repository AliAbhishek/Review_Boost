from __future__ import annotations

import pytest
from unittest.mock import MagicMock, patch

from models.lead import Lead
from scripts.ai_writer import generate_email


_SAMPLE_BODY = (
    "Hi there,\n\n"
    "I noticed Spice Garden has 42 reviews on Google — a great start! "
    "ReviewBoost helps restaurants in Chandigarh grow their review count fast, "
    "turning more browsers into diners. "
    "Our clients typically see a 2× increase within 60 days. "
    "Book a free 15-minute demo to see how it works for Spice Garden.\n\n"
    "Best,\nMosim"
)


def _make_lead(
    name: str = "Spice Garden",
    review_count: int = 42,
    city: str = "Chandigarh",
) -> Lead:
    return Lead(
        name=name,
        address="Sector 17, Chandigarh",
        city=city,
        rating=4.2,
        review_count=review_count,
        phone="+91 98765 43210",
        website="https://spicegarden.com",
        place_id="place_abc123",
        scraped_at="2024-01-01T00:00:00+00:00",
        email="owner@spicegarden.com",
        email_status="found",
    )


@patch.dict("os.environ", {"CLAUDE_API_KEY": "test_key"})
@patch("scripts.ai_writer.anthropic.Anthropic")
def test_generates_email(mock_cls: MagicMock) -> None:
    mock_cls.return_value.messages.create.return_value = MagicMock(
        content=[MagicMock(text=_SAMPLE_BODY)]
    )

    subject, body = generate_email(_make_lead())

    assert isinstance(subject, str) and len(subject) > 0
    assert isinstance(body, str) and len(body) > 0


@patch.dict("os.environ", {"CLAUDE_API_KEY": "test_key"})
@patch("scripts.ai_writer.anthropic.Anthropic")
def test_body_under_150_words(mock_cls: MagicMock) -> None:
    mock_cls.return_value.messages.create.return_value = MagicMock(
        content=[MagicMock(text=_SAMPLE_BODY)]
    )

    _, body = generate_email(_make_lead())

    assert len(body.split()) <= 150


@patch.dict("os.environ", {"CLAUDE_API_KEY": "test_key"})
@patch("scripts.ai_writer.anthropic.Anthropic")
def test_mentions_restaurant_name(mock_cls: MagicMock) -> None:
    mock_cls.return_value.messages.create.return_value = MagicMock(
        content=[MagicMock(text=_SAMPLE_BODY)]
    )

    _, body = generate_email(_make_lead(name="Spice Garden"))

    assert "Spice Garden" in body


@patch.dict("os.environ", {"CLAUDE_API_KEY": "test_key"})
@patch("scripts.ai_writer.anthropic.Anthropic")
@patch("scripts.ai_writer.time.sleep", return_value=None)
def test_retries_on_failure(mock_sleep: MagicMock, mock_cls: MagicMock) -> None:
    error = Exception("Transient API error")
    success = MagicMock(content=[MagicMock(text=_SAMPLE_BODY)])

    mock_cls.return_value.messages.create.side_effect = [error, error, success]

    subject, body = generate_email(_make_lead())

    assert mock_cls.return_value.messages.create.call_count == 3
    assert body == _SAMPLE_BODY
