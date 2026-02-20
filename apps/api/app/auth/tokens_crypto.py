from __future__ import annotations

import base64

from cryptography.fernet import Fernet, InvalidToken

from ..settings import settings


def _fernet() -> Fernet | None:
    if not settings.token_encryption_key:
        return None

    try:
        return Fernet(settings.token_encryption_key.encode("utf-8"))
    except (ValueError, TypeError):
        return None


def encrypt_token(raw: str) -> str:
    if not raw:
        return ""

    f = _fernet()
    if f is None:
        return base64.urlsafe_b64encode(raw.encode("utf-8")).decode("utf-8")
    return f.encrypt(raw.encode("utf-8")).decode("utf-8")


def decrypt_token(ciphertext: str) -> str:
    if not ciphertext:
        return ""

    f = _fernet()
    if f is None:
        return base64.urlsafe_b64decode(ciphertext.encode("utf-8")).decode("utf-8")

    try:
        return f.decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        return ""
