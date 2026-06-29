from __future__ import annotations

import re
from typing import Optional
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

from utils.logger import get_logger

logger = get_logger("email_finder")

_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")

_JUNK_PREFIXES = (
    "noreply", "no-reply", "donotreply",
    "support", "info", "hello", "contact",
    "admin", "postmaster", "webmaster",
    "mailer", "bounce", "notification",
)

_JUNK_DOMAINS = (
    "wixpress.com", "wordpress.com", "squarespace.com",
    "godaddy.com", "sentry.io", "example.com",
    "yourdomain.com", "domain.com",
)

_CONTACT_PATHS = ["/contact", "/contact-us", "/about", "/about-us", "/reach-us"]

_TIMEOUT = 8
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}


def _is_junk_email(email: str) -> bool:
    email = email.lower()
    local, _, domain = email.partition("@")
    if domain in _JUNK_DOMAINS:
        return True
    if any(local.startswith(p) for p in _JUNK_PREFIXES):
        return True
    return False


def _extract_emails_from_html(html: str) -> list[str]:
    return [e for e in _EMAIL_RE.findall(html) if not _is_junk_email(e)]


def _fetch_html(url: str) -> Optional[str]:
    try:
        resp = requests.get(url, timeout=_TIMEOUT, headers=_HEADERS, allow_redirects=True)
        resp.raise_for_status()
        return resp.text
    except Exception as exc:
        logger.debug(f"Fetch failed for {url}: {exc}")
        return None


def _normalise_base(website: str) -> str:
    parsed = urlparse(website)
    return f"{parsed.scheme}://{parsed.netloc}"


def find_email(website: str) -> Optional[str]:
    """
    Visit a restaurant website and extract the first owner-looking email.

    Checks homepage first, then common contact/about paths.
    Returns None if nothing usable is found.
    """
    if not website:
        return None

    base = _normalise_base(website)

    # Homepage
    html = _fetch_html(website)
    if html:
        emails = _extract_emails_from_html(html)
        if emails:
            logger.debug(f"Email found on homepage: {emails[0]}")
            return emails[0]

    # Sub-pages
    for path in _CONTACT_PATHS:
        url = urljoin(base, path)
        html = _fetch_html(url)
        if not html:
            continue
        emails = _extract_emails_from_html(html)
        if emails:
            logger.debug(f"Email found at {url}: {emails[0]}")
            return emails[0]

    logger.debug(f"No email found for {website}")
    return None
