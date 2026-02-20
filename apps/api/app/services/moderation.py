from __future__ import annotations


MAX_LENGTH = {
    "x": 280,
    "facebook": 63206,
}

BANNED_TERMS = {
    "guaranteed profit",
    "get rich quick",
}


class ModerationError(ValueError):
    pass


def ensure_post_allowed(platform: str, text: str) -> None:
    max_chars = MAX_LENGTH.get(platform, 280)
    normalized = text.lower()

    for term in BANNED_TERMS:
        if term in normalized:
            raise ModerationError(f"Text contains banned term: {term}")

    if len(text) > max_chars:
        raise ModerationError(f"Post too long for {platform}: {len(text)} > {max_chars}")
