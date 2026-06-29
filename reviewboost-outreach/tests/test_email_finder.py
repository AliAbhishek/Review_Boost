from __future__ import annotations

import requests as req
import pytest
from unittest.mock import MagicMock, patch

from scripts.email_finder import find_email


def _html_response(html: str, status: int = 200) -> MagicMock:
    m = MagicMock()
    m.text = html
    m.status_code = status
    m.raise_for_status.return_value = None
    return m


@patch("scripts.email_finder.requests.get")
def test_finds_email_on_homepage(mock_get: MagicMock) -> None:
    mock_get.return_value = _html_response(
        "<html><body>Contact us: owner@myrestaurant.com</body></html>"
    )

    result = find_email("https://myrestaurant.com")

    assert result == "owner@myrestaurant.com"


@patch("scripts.email_finder.requests.get")
def test_finds_email_on_contact_page(mock_get: MagicMock) -> None:
    # Homepage has no email; /contact does
    mock_get.side_effect = [
        _html_response("<html><body>Welcome to Best Bites!</body></html>"),
        _html_response("<html><body>Reach us: chef@bestbites.in</body></html>"),
    ]

    result = find_email("https://bestbites.in")

    assert result == "chef@bestbites.in"


@patch("scripts.email_finder.requests.get")
def test_skips_noreply(mock_get: MagicMock) -> None:
    mock_get.return_value = _html_response(
        "<html><body>noreply@myrestaurant.com</body></html>"
    )

    result = find_email("https://myrestaurant.com")

    assert result is None


@patch("scripts.email_finder.requests.get")
def test_handles_timeout(mock_get: MagicMock) -> None:
    mock_get.side_effect = req.exceptions.Timeout()

    result = find_email("https://slowsite.com")

    assert result is None
