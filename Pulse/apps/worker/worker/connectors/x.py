from __future__ import annotations

import base64
from typing import Any

import httpx
from cryptography.fernet import Fernet, InvalidToken

from ..settings import settings


def _snip(s: str, n: int = 500) -> str:
    s = (s or "").replace("\n", " ").strip()
    return s if len(s) <= n else s[:n] + "…"


def _decrypt_token(ciphertext: str) -> str:
    if not ciphertext:
        return ""

    key = (settings.token_encryption_key or "").strip()
    if not key:
        # API fallback when TOKEN_ENCRYPTION_KEY is empty
        return base64.urlsafe_b64decode(ciphertext.encode("utf-8")).decode("utf-8")

    try:
        f = Fernet(key.encode("utf-8"))
    except (ValueError, TypeError):
        return ""

    try:
        return f.decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        return ""


def post_to_x(encrypted_token: str, payload: dict[str, Any]) -> str:
    text = str(payload.get("text") or "").strip()
    if not text:
        raise ValueError("Missing payload.text")

    if settings.x_dry_run:
        return "x-dry-run"

    access_token = _decrypt_token(encrypted_token)
    if not access_token:
        raise RuntimeError("Could not decrypt X access token (check TOKEN_ENCRYPTION_KEY)")

    url = settings.x_api_base.rstrip("/") + "/2/tweets"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    timeout = httpx.Timeout(settings.http_timeout_seconds)
    with httpx.Client(timeout=timeout) as client:
        r = client.post(url, headers=headers, json={"text": text})

    if r.status_code >= 400:
        raise RuntimeError(f"X POST /2/tweets failed {r.status_code}: {_snip(r.text)}")

    data = r.json() if r.content else {}
    post_id = (data.get("data") or {}).get("id") or data.get("id")
    if not post_id:
        raise RuntimeError(f"X response missing id: {_snip(str(data))}")

    return str(post_id)