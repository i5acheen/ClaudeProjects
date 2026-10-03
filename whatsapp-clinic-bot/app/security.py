"""Meta webhook signature validation (X-Hub-Signature-256)."""

from __future__ import annotations

import hashlib
import hmac


def verify_signature(raw_body: bytes, header_value: str | None, app_secret: str) -> bool:
    """Return True if header_value == 'sha256=' + HMAC_SHA256(app_secret, raw_body)."""
    if not header_value or not app_secret or not header_value.startswith("sha256="):
        return False
    expected = hmac.new(app_secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header_value.removeprefix("sha256="))
