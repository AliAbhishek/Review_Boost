from __future__ import annotations

import os
import time
from datetime import datetime, timezone, timedelta
from typing import Optional

import requests

from models.lead import Lead
from utils.logger import get_logger

logger = get_logger("sender")

_BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"
_RATE_LIMIT_DELAY = 2.0
_FOLLOWUP1_DAYS = 3
_FOLLOWUP2_DAYS = 7


def send_outreach(
    leads: list[Lead],
    dry_run: bool = False,
) -> list[Lead]:
    """
    Send outreach emails and manage the day-0 / day-3 / day-7 follow-up sequence.

    Args:
        leads: List of Lead objects to process.
        dry_run: If True, logs emails instead of calling Brevo.

    Returns:
        Updated list of Lead objects with outreach fields set.

    Raises:
        RuntimeError: If required env vars are missing (non dry_run mode).
    """
    api_key = os.getenv("BREVO_API_KEY", "")
    sender_email = os.getenv("SENDER_EMAIL", "")
    sender_name = os.getenv("SENDER_NAME", "Mosim Khan")

    if not dry_run and not api_key:
        raise RuntimeError("BREVO_API_KEY not set in environment")
    if not sender_email:
        raise RuntimeError("SENDER_EMAIL not set in environment")

    today = datetime.now(timezone.utc).date()
    sent_count = 0

    for lead in leads:
        if not lead.email:
            continue
        if not lead.can_receive_outreach():
            continue

        action = _determine_action(lead, today)
        if action is None:
            continue

        if sent_count > 0:
            time.sleep(_RATE_LIMIT_DELAY)

        if action == "initial":
            _send_initial(lead, sender_email, sender_name, api_key, dry_run)
        elif action == "followup1":
            _send_followup1(lead, sender_email, sender_name, api_key, dry_run)
        elif action == "followup2":
            _send_followup2(lead, sender_email, sender_name, api_key, dry_run)

        sent_count += 1

    logger.info(f"Outreach complete: {sent_count} emails processed")
    return leads


def _determine_action(lead: Lead, today) -> Optional[str]:
    if lead.outreach_status == "not_contacted":
        if lead.email_ready == "yes":
            return "initial"
        return None

    if lead.outreach_status == "contacted":
        if lead.followup1_sent:
            if not lead.followup2_sent and lead.followup2_due:
                due = _parse_date(lead.followup2_due)
                if due and today >= due:
                    return "followup2"
        elif lead.followup1_due:
            due = _parse_date(lead.followup1_due)
            if due and today >= due:
                return "followup1"

    return None


def _parse_date(date_str: str) -> Optional[object]:
    if not date_str:
        return None
    try:
        return datetime.fromisoformat(date_str).date()
    except Exception:
        return None


def _send_initial(
    lead: Lead,
    sender_email: str,
    sender_name: str,
    api_key: str,
    dry_run: bool,
) -> None:
    subject = lead.email_subject
    body = lead.email_body
    now = datetime.now(timezone.utc)

    if dry_run:
        logger.info(f"[DRY RUN] Initial → {lead.email} | {subject}")
        logger.debug(f"Body:\n{body}")
    else:
        _call_brevo(lead.email, subject, body, sender_email, sender_name, api_key)
        logger.info(f"Initial email sent to {lead.name} <{lead.email}>")

    lead.sent_at = now.isoformat()
    lead.outreach_status = "contacted"
    lead.followup1_due = (now + timedelta(days=_FOLLOWUP1_DAYS)).isoformat()
    lead.followup2_due = (now + timedelta(days=_FOLLOWUP2_DAYS)).isoformat()


def _send_followup1(
    lead: Lead,
    sender_email: str,
    sender_name: str,
    api_key: str,
    dry_run: bool,
) -> None:
    subject = f"Re: {lead.email_subject}"
    body = (
        f"Hi,\n\n"
        f"Just following up on my earlier note about ReviewBoost and how we help "
        f"restaurants like {lead.name} grow their Google review count.\n\n"
        f"Would a 15-minute demo work for you this week?\n\n"
        f"Best,\n{os.getenv('SENDER_NAME', 'Mosim')}"
    )
    now = datetime.now(timezone.utc)

    if dry_run:
        logger.info(f"[DRY RUN] Follow-up 1 → {lead.email} | {subject}")
    else:
        _call_brevo(lead.email, subject, body, sender_email, sender_name, api_key)
        logger.info(f"Follow-up 1 sent to {lead.name} <{lead.email}>")

    lead.followup1_sent = now.isoformat()


def _send_followup2(
    lead: Lead,
    sender_email: str,
    sender_name: str,
    api_key: str,
    dry_run: bool,
) -> None:
    subject = f"Last one – {lead.email_subject}"
    body = (
        f"Hi,\n\n"
        f"This is my last note. If you ever want to explore how ReviewBoost can help "
        f"{lead.name} attract more diners through stronger Google reviews, I'd love to chat.\n\n"
        f"Wishing you a packed house!\n\n"
        f"Best,\n{os.getenv('SENDER_NAME', 'Mosim')}"
    )
    now = datetime.now(timezone.utc)

    if dry_run:
        logger.info(f"[DRY RUN] Follow-up 2 → {lead.email} | {subject}")
    else:
        _call_brevo(lead.email, subject, body, sender_email, sender_name, api_key)
        logger.info(f"Follow-up 2 sent to {lead.name} <{lead.email}>")

    lead.followup2_sent = now.isoformat()
    lead.outreach_status = "sequence_complete"


def _call_brevo(
    to_email: str,
    subject: str,
    body: str,
    sender_email: str,
    sender_name: str,
    api_key: str,
) -> None:
    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "textContent": body,
    }
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": api_key,
    }
    resp = requests.post(_BREVO_API_URL, json=payload, headers=headers, timeout=15)
    resp.raise_for_status()
