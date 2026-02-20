from __future__ import annotations

from urllib.parse import parse_qs, urlencode, urlparse, urlunparse


def append_utm(url: str, source: str, medium: str, campaign: str) -> str:
    if not url:
        return url

    parsed = urlparse(url)
    query = parse_qs(parsed.query)
    query["utm_source"] = [source]
    query["utm_medium"] = [medium]
    query["utm_campaign"] = [campaign]
    encoded = urlencode(query, doseq=True)
    return urlunparse(parsed._replace(query=encoded))
