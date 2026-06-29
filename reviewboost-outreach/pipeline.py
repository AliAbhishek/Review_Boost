from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from models.lead import Lead
from scripts.scraper import scrape_leads
from scripts.email_finder import find_email
from scripts.ai_writer import generate_email
from scripts.sender import send_outreach
from utils.csv_handler import read_leads, write_leads, get_latest_csv
from utils.logger import get_logger
from utils.validator import validate_email

logger = get_logger("pipeline")

_DATA_DIR = Path("data")


def run_full_pipeline(
    city: Optional[str] = None,
    max_per_area: int = 20,
    dry_run: bool = False,
    csv_path: Optional[str] = None,
) -> list[Lead]:
    """
    Run the complete pipeline: scrape → email finder → AI writer → sender.

    Args:
        city: "Chandigarh", "Mohali", or None for both.
        max_per_area: Max results per Google Places search query.
        dry_run: If True, no emails are sent.
        csv_path: Override output CSV path.

    Returns:
        Final list of processed Lead objects.
    """
    _DATA_DIR.mkdir(exist_ok=True)
    output_path = csv_path or _default_csv_path()

    logger.info("=== Step 1: Scraping Google Places ===")
    leads = scrape_leads(city=city, max_per_area=max_per_area)
    logger.info(f"Scraped {len(leads)} leads")

    logger.info("=== Step 2: Finding emails ===")
    leads = _run_email_finder(leads)

    logger.info("=== Step 3: Generating AI emails ===")
    leads = _run_ai_writer(leads)

    logger.info("=== Step 4: Sending outreach ===")
    leads = send_outreach(leads, dry_run=dry_run)

    write_leads(leads, output_path)
    logger.info(f"Results saved → {output_path}")
    return leads


def run_email_step(csv_path: Optional[str] = None) -> list[Lead]:
    """Run only the email finder step on the latest (or specified) CSV."""
    path = csv_path or get_latest_csv()
    if not path:
        raise RuntimeError("No CSV found. Run the scrape step first.")
    leads = read_leads(path)
    leads = _run_email_finder(leads)
    write_leads(leads, path)
    return leads


def run_ai_step(csv_path: Optional[str] = None) -> list[Lead]:
    """Run only the AI writer step on the latest (or specified) CSV."""
    path = csv_path or get_latest_csv()
    if not path:
        raise RuntimeError("No CSV found. Run the scrape step first.")
    leads = read_leads(path)
    leads = _run_ai_writer(leads)
    write_leads(leads, path)
    return leads


def run_send_step(
    csv_path: Optional[str] = None,
    dry_run: bool = False,
) -> list[Lead]:
    """Run only the sender step on the latest (or specified) CSV."""
    path = csv_path or get_latest_csv()
    if not path:
        raise RuntimeError("No CSV found. Run the scrape step first.")
    leads = read_leads(path)
    leads = send_outreach(leads, dry_run=dry_run)
    write_leads(leads, path)
    return leads


def _run_email_finder(leads: list[Lead]) -> list[Lead]:
    for lead in leads:
        if lead.email_status == "found":
            continue
        if not lead.website:
            lead.email_status = "no_website"
            continue
        email = find_email(lead.website)
        if email and validate_email(email):
            lead.email = email
            lead.email_status = "found"
            logger.info(f"Email found for {lead.name}: {email}")
        else:
            lead.email_status = "not_found"
    return leads


def _run_ai_writer(leads: list[Lead]) -> list[Lead]:
    for lead in leads:
        if lead.email_status != "found":
            continue
        if lead.email_ready == "yes":
            continue
        try:
            subject, body = generate_email(lead)
            lead.email_subject = subject
            lead.email_body = body
            lead.email_ready = "yes"
            logger.info(f"Email generated for {lead.name}")
        except Exception as exc:
            logger.warning(f"AI writer failed for {lead.name}: {exc}")
            lead.email_ready = "failed"
    return leads


def _default_csv_path() -> str:
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    return str(_DATA_DIR / f"leads_{ts}.csv")
