"""
SMTP email delivery for investigation reports.

Configuration is entirely environment-driven so no secrets live in code:

  SMTP_HOST       e.g. smtp.gmail.com          (required)
  SMTP_PORT       default 587
  SMTP_USER       login username (often = from address)
  SMTP_PASSWORD   login password / app-password
  SMTP_FROM       From address (defaults to SMTP_USER)
  SMTP_USE_TLS    "true" (STARTTLS on 587, default) | "false" (SSL on 465)

If SMTP isn't configured the caller gets a clear, actionable error instead of a
silent failure.
"""

import os
import smtplib
import socket
import ssl
import time
from email.message import EmailMessage
from pathlib import Path


def _load_dotenv_once():
    """Populate os.environ from a `.env` file next to the report service, if
    present. Stdlib-only (no python-dotenv dependency) — existing environment
    variables always win, so a real deployment's env still overrides the file.
    Safe to call repeatedly; only ever sets keys that aren't already set."""
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


_load_dotenv_once()


def _bool(value, default=True):
    if value is None:
        return default
    return str(value).strip().lower() in ("1", "true", "yes", "on")


def is_configured() -> bool:
    return bool(os.getenv("SMTP_HOST") and (os.getenv("SMTP_FROM") or os.getenv("SMTP_USER")))


# Transient connection/TLS errors worth one retry (e.g. a VPN or antivirus
# SSL-inspection proxy occasionally truncates the STARTTLS handshake, surfacing
# as `ssl.SSLError: [ASN1: NOT_ENOUGH_DATA]`). Auth/recipient errors are NOT
# retried — retrying those would just fail again with the same cause.
_TRANSIENT_ERRORS = (ssl.SSLError, socket.timeout, socket.gaierror,
                    ConnectionError, smtplib.SMTPConnectError,
                    smtplib.SMTPServerDisconnected)


def send_report_email(recipients, subject, body, attachment_bytes,
                      attachment_name, attachment_mime, max_attempts: int = 3):
    host = os.getenv("SMTP_HOST")
    from_addr = os.getenv("SMTP_FROM") or os.getenv("SMTP_USER")
    if not host or not from_addr:
        raise RuntimeError(
            "Email is not configured on the server. Set SMTP_HOST and SMTP_FROM "
            "(plus SMTP_USER / SMTP_PASSWORD) in the report service environment."
        )

    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")
    use_tls = _bool(os.getenv("SMTP_USE_TLS"), default=True)

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = ", ".join(recipients)
    msg.set_content(body)

    maintype, _, subtype = attachment_mime.partition("/")
    msg.add_attachment(
        attachment_bytes,
        maintype=maintype or "application",
        subtype=subtype or "octet-stream",
        filename=attachment_name,
    )

    def _attempt():
        context = ssl.create_default_context()
        if use_tls:
            with smtplib.SMTP(host, port, timeout=30) as server:
                server.starttls(context=context)
                if user and password:
                    server.login(user, password)
                server.send_message(msg)
        else:
            with smtplib.SMTP_SSL(host, port, context=context, timeout=30) as server:
                if user and password:
                    server.login(user, password)
                server.send_message(msg)

    last_err = None
    for attempt in range(1, max_attempts + 1):
        try:
            _attempt()
            return
        except _TRANSIENT_ERRORS as exc:
            last_err = exc
            if attempt < max_attempts:
                time.sleep(1.5 * attempt)  # brief backoff before retrying
                continue
            raise RuntimeError(
                f"SMTP connection failed after {max_attempts} attempts "
                f"(transient network/TLS issue): {exc}"
            ) from exc
    raise last_err  # unreachable, but keeps type-checkers happy
