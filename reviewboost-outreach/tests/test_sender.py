from __future__ import annotations

from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch

from models.lead import Lead
from scripts.sender import send_outreach


def _make_lead(
    outreach_status: str = "not_contacted",
    email_ready: str = "yes",
    email: str = "owner@spicegarden.com",
    followup1_sent: str = "",
    followup2_sent: str = "",
    followup1_due: str = "",
    followup2_due: str = "",
) -> Lead:
    return Lead(
        name="Spice Garden",
        address="Sector 17, Chandigarh",
        city="Chandigarh",
        rating=4.2,
        review_count=42,
        phone="+91 98765 43210",
        website="https://spicegarden.com",
        place_id="place_abc123",
        scraped_at="2024-01-01T00:00:00+00:00",
        email=email,
        email_status="found",
        email_subject="Quick question about Spice Garden's online reviews",
        email_body="Hi! ReviewBoost helps restaurants grow reviews. Book a demo!",
        email_ready=email_ready,
        outreach_status=outreach_status,
        followup1_sent=followup1_sent,
        followup2_sent=followup2_sent,
        followup1_due=followup1_due,
        followup2_due=followup2_due,
    )


_ENV = {
    "BREVO_API_KEY": "test_key",
    "SENDER_EMAIL": "test@example.com",
    "SENDER_NAME": "Test Sender",
}


@patch.dict("os.environ", _ENV)
@patch("scripts.sender.requests.post")
def test_sends_initial_email(mock_post: MagicMock) -> None:
    mock_post.return_value = MagicMock(raise_for_status=MagicMock())

    lead = _make_lead()
    result = send_outreach([lead], dry_run=False)

    mock_post.assert_called_once()
    assert result[0].outreach_status == "contacted"
    assert result[0].sent_at != ""
    assert result[0].followup1_due != ""


@patch.dict("os.environ", _ENV)
@patch("scripts.sender.requests.post")
def test_skips_already_sent(mock_post: MagicMock) -> None:
    future = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    lead = _make_lead(outreach_status="contacted", followup1_due=future)

    send_outreach([lead], dry_run=False)

    mock_post.assert_not_called()


@patch.dict("os.environ", _ENV)
@patch("scripts.sender.requests.post")
def test_skips_converted(mock_post: MagicMock) -> None:
    lead = _make_lead(outreach_status="converted")

    send_outreach([lead], dry_run=False)

    mock_post.assert_not_called()


@patch.dict("os.environ", _ENV)
@patch("scripts.sender.requests.post")
def test_followup1_scheduled(mock_post: MagicMock) -> None:
    mock_post.return_value = MagicMock(raise_for_status=MagicMock())

    past_due = (datetime.now(timezone.utc) - timedelta(days=4)).isoformat()
    lead = _make_lead(outreach_status="contacted", followup1_due=past_due)

    result = send_outreach([lead], dry_run=False)

    mock_post.assert_called_once()
    assert result[0].followup1_sent != ""


@patch.dict("os.environ", _ENV)
@patch("scripts.sender.requests.post")
def test_dry_run_no_api_call(mock_post: MagicMock) -> None:
    lead = _make_lead()

    result = send_outreach([lead], dry_run=True)

    mock_post.assert_not_called()
    assert result[0].outreach_status == "contacted"
    assert result[0].sent_at != ""
