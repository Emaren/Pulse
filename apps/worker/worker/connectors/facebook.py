from __future__ import annotations

import base64
import json
from typing import Any

import httpx
from cryptography.fernet import Fernet, InvalidToken

from ..settings import settings


def _snip(s: str, n: int = 500) -> str:
    s = (s or "").replace("\n", " ").strip()
    return s if len(s) <= n else s[:n] + "…"


def _fernet() -> Fernet | None:
    key = (settings.token_encryption_key or "").strip()
    if not key:
        return None
    try:
        return Fernet(key.encode("utf-8"))
    except (ValueError, TypeError):
        return None


def _decrypt_token(ciphertext: str) -> str:
    if not ciphertext:
        return ""

    f = _fernet()
    if f is None:
        return base64.urlsafe_b64decode(ciphertext.encode("utf-8")).decode("utf-8")

    try:
        return f.decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        return ""


def post_to_facebook(encrypted_token: str, payload: dict[str, Any]) -> str:
    """
    Publish a Page post as the Page.
    Endpoint: POST /{page-id}/feed
    Requires: a Page access token + payload.page_id
    """
    text = str(payload.get("text") or "").strip()
    if not text:
        raise ValueError("Missing payload.text")

    page_id = str(payload.get("page_id") or "").strip()
    if not page_id:
        raise ValueError("Missing payload.page_id (Facebook Page ID)")

    if settings.facebook_dry_run:
        return "facebook-dry-run"

    access_token = _decrypt_token(encrypted_token)
    if not access_token:
        raise RuntimeError("Could not decrypt Facebook access token (check TOKEN_ENCRYPTION_KEY)")

    base = settings.facebook_api_base.rstrip("/")
    url = f"{base}/{page_id}/feed"

    data: dict[str, str] = {"message": text, "access_token": access_token}

    link_url = str(payload.get("link_url") or "").strip()
    if link_url:
        data["link"] = link_url

    timeout = httpx.Timeout(settings.http_timeout_seconds)
    with httpx.Client(timeout=timeout) as client:
        r = client.post(url, data=data)

    if r.status_code >= 400:
        raise RuntimeError(f"FB POST /{page_id}/feed failed {r.status_code}: {_snip(r.text)}")

    body = r.json() if r.content else {}
    post_id = body.get("id")
    if not post_id:
        raise RuntimeError(f"FB response missing id: {_snip(json.dumps(body))}")

    return str(post_id)