from __future__ import annotations

import os
import time
from datetime import datetime, timezone
from typing import Optional

import requests

from models.lead import Lead
from utils.logger import get_logger

logger = get_logger("scraper")

_PLACES_BASE = "https://maps.googleapis.com/maps/api/place"
_MAX_REVIEWS = 500

_AREAS: dict[str, list[str]] = {
    "Chandigarh": [
        "restaurants in Sector 17 Chandigarh",
        "restaurants in Sector 26 Chandigarh",
        "restaurants in Sector 35 Chandigarh",
        "restaurants in Sector 7 Chandigarh",
        "restaurants near Elante Mall Chandigarh",
        "restaurants on Madhya Marg Chandigarh",
    ],
    "Mohali": [
        "restaurants in Phase 7 Mohali",
        "restaurants in Phase 8 Mohali",
        "restaurants in Phase 10 Mohali",
        "restaurants in Phase 11 Mohali",
        "restaurants in Aerocity Mohali",
        "restaurants in IT City Mohali",
        "restaurants on Kharar road Mohali",
    ],
}


def _text_search(query: str, api_key: str, page_token: Optional[str] = None) -> dict:
    params: dict[str, str] = {
        "query": query,
        "type": "restaurant",
        "key": api_key,
    }
    if page_token:
        params["pagetoken"] = page_token

    resp = requests.get(f"{_PLACES_BASE}/textsearch/json", params=params, timeout=15)
    resp.raise_for_status()
    return resp.json()


def _place_details(place_id: str, api_key: str) -> dict:
    params = {
        "place_id": place_id,
        "fields": "name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,place_id",
        "key": api_key,
    }
    resp = requests.get(f"{_PLACES_BASE}/details/json", params=params, timeout=15)
    resp.raise_for_status()
    return resp.json().get("result", {})


def scrape_leads(
    city: Optional[str] = None,
    max_per_area: int = 20,
) -> list[Lead]:
    """
    Scrape restaurant leads from Google Places API.

    Args:
        city: "Chandigarh", "Mohali", or None for both.
        max_per_area: Maximum results to collect per search query.

    Returns:
        Deduplicated list of Lead objects (review_count <= 500).

    Raises:
        RuntimeError: If GOOGLE_API_KEY is not set or API returns an error.
    """
    api_key = os.getenv("GOOGLE_API_KEY", "")
    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY not set in environment")

    cities = [city] if city else list(_AREAS.keys())
    seen_ids: set[str] = set()
    leads: list[Lead] = []

    for target_city in cities:
        areas = _AREAS.get(target_city, [])
        for area_query in areas:
            logger.info(f"Searching: {area_query}")
            try:
                collected = _collect_area(
                    area_query, target_city, api_key, max_per_area, seen_ids
                )
                leads.extend(collected)
                logger.info(f"  → {len(collected)} leads from '{area_query}'")
            except requests.HTTPError as exc:
                raise RuntimeError(f"Google Places API error: {exc}") from exc
            except Exception as exc:
                logger.warning(f"  Skipped '{area_query}': {exc}")

            time.sleep(0.5)

    logger.info(f"Total leads scraped: {len(leads)}")
    return leads


def _collect_area(
    query: str,
    city: str,
    api_key: str,
    max_results: int,
    seen_ids: set[str],
) -> list[Lead]:
    leads: list[Lead] = []
    page_token: Optional[str] = None

    while len(leads) < max_results:
        data = _text_search(query, api_key, page_token)

        status = data.get("status", "")
        if status == "REQUEST_DENIED":
            raise RuntimeError(f"API key rejected: {data.get('error_message', '')}")
        if status not in {"OK", "ZERO_RESULTS"}:
            logger.warning(f"Unexpected status '{status}' for '{query}'")
            break

        for item in data.get("results", []):
            if len(leads) >= max_results:
                break

            place_id: str = item.get("place_id", "")
            if not place_id or place_id in seen_ids:
                continue

            review_count: int = item.get("user_ratings_total", 0)
            if review_count > _MAX_REVIEWS:
                logger.debug(f"Skipping {item.get('name')} ({review_count} reviews)")
                continue

            details = _place_details(place_id, api_key)
            lead = Lead(
                name=details.get("name", item.get("name", "")),
                address=details.get("formatted_address", item.get("formatted_address", "")),
                city=city,
                rating=float(details.get("rating", item.get("rating", 0.0))),
                review_count=int(details.get("user_ratings_total", review_count)),
                phone=details.get("formatted_phone_number", ""),
                website=details.get("website", ""),
                place_id=place_id,
                scraped_at=datetime.now(timezone.utc).isoformat(),
            )
            seen_ids.add(place_id)
            leads.append(lead)

        page_token = data.get("next_page_token")
        if not page_token:
            break
        time.sleep(2)  # Google requires a short pause before using next_page_token

    return leads
