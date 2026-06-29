from __future__ import annotations

import pytest
from unittest.mock import MagicMock, patch

from scripts.scraper import scrape_leads


_MOCK_PLACE = {
    "place_id": "abc123",
    "name": "Test Restaurant",
    "formatted_address": "Sector 17, Chandigarh",
    "rating": 4.2,
    "user_ratings_total": 50,
}

_MOCK_DETAILS = {
    "name": "Test Restaurant",
    "formatted_address": "Sector 17, Chandigarh",
    "formatted_phone_number": "+91 98765 43210",
    "website": "https://testrestaurant.com",
    "rating": 4.2,
    "user_ratings_total": 50,
    "place_id": "abc123",
}


def _mock_response(data: dict) -> MagicMock:
    m = MagicMock()
    m.json.return_value = data
    m.raise_for_status.return_value = None
    return m


@patch.dict("os.environ", {"GOOGLE_API_KEY": "test_key"})
@patch("scripts.scraper.requests.get")
def test_search_returns_leads(mock_get: MagicMock) -> None:
    mock_get.side_effect = [
        _mock_response({"status": "OK", "results": [_MOCK_PLACE]}),
        _mock_response({"result": _MOCK_DETAILS}),
    ]

    leads = scrape_leads(city="Chandigarh", max_per_area=1)

    assert len(leads) >= 1
    assert leads[0].name == "Test Restaurant"
    assert leads[0].place_id == "abc123"
    assert leads[0].city == "Chandigarh"


@patch.dict("os.environ", {"GOOGLE_API_KEY": "test_key"})
@patch("scripts.scraper.requests.get")
def test_skips_high_review_count(mock_get: MagicMock) -> None:
    high_review_place = {**_MOCK_PLACE, "user_ratings_total": 999}
    mock_get.return_value = _mock_response({
        "status": "OK",
        "results": [high_review_place],
    })

    leads = scrape_leads(city="Chandigarh", max_per_area=5)

    assert all(ld.review_count <= 500 for ld in leads)


@patch.dict("os.environ", {"GOOGLE_API_KEY": "test_key"})
@patch("scripts.scraper.requests.get")
def test_deduplicates_place_id(mock_get: MagicMock) -> None:
    mock_get.side_effect = [
        _mock_response({"status": "OK", "results": [_MOCK_PLACE, _MOCK_PLACE]}),
        _mock_response({"result": _MOCK_DETAILS}),
    ]

    leads = scrape_leads(city="Chandigarh", max_per_area=5)

    place_ids = [ld.place_id for ld in leads]
    assert len(place_ids) == len(set(place_ids)), "Duplicate place_ids found"


@patch.dict("os.environ", {"GOOGLE_API_KEY": "test_key"})
@patch("scripts.scraper.requests.get")
def test_handles_api_error(mock_get: MagicMock) -> None:
    mock_get.return_value = _mock_response({
        "status": "REQUEST_DENIED",
        "error_message": "This API key is invalid.",
    })

    with pytest.raises(RuntimeError, match="API key rejected"):
        scrape_leads(city="Chandigarh", max_per_area=5)
