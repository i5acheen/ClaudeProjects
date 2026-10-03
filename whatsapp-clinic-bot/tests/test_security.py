import hashlib
import hmac

from app.security import verify_signature


def sign(body: bytes, secret: str) -> str:
    return "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


def test_valid_signature():
    body = b'{"a":1}'
    assert verify_signature(body, sign(body, "s3cret"), "s3cret")


def test_invalid_signature():
    body = b'{"a":1}'
    assert not verify_signature(body, sign(body, "wrong"), "s3cret")
    assert not verify_signature(body + b" ", sign(body, "s3cret"), "s3cret")


def test_missing_or_malformed_header():
    assert not verify_signature(b"x", None, "s3cret")
    assert not verify_signature(b"x", "abc", "s3cret")
    assert not verify_signature(b"x", sign(b"x", ""), "")
