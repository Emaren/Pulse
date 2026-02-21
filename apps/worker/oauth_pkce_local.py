import os
import secrets
import hashlib
import base64
import urllib.parse as up
from http.server import BaseHTTPRequestHandler, HTTPServer

import httpx


def _b64url_sha256(s: str) -> str:
    return base64.urlsafe_b64encode(hashlib.sha256(s.encode("utf-8")).digest()).decode("utf-8").rstrip("=")


def _basic_auth(client_id: str, client_secret: str) -> str:
    raw = f"{client_id}:{client_secret}".encode("utf-8")
    return base64.b64encode(raw).decode("utf-8")


client_id = os.environ["X_CLIENT_ID"].strip()
client_secret = os.environ.get("X_CLIENT_SECRET", "").strip()

# IMPORTANT: prefer 127.0.0.1 for local callback matching
redirect_uri = os.environ.get("X_REDIRECT_URI", "http://127.0.0.1:8787/callback").strip()

# Start minimal; you can bump to tweet.write + offline.access once the flow works
scope = os.environ.get("X_SCOPE", "tweet.read users.read").strip()

verifier = secrets.token_urlsafe(48)
challenge = _b64url_sha256(verifier)
state = secrets.token_urlsafe(16)

params = {
    "response_type": "code",
    "client_id": client_id,
    "redirect_uri": redirect_uri,
    "scope": scope,
    "state": state,
    "code_challenge": challenge,
    "code_challenge_method": "S256",
}

# Ensure spaces become %20 (not +)
auth_url = "https://x.com/i/oauth2/authorize?" + up.urlencode(params, quote_via=up.quote)

print("\nOPEN THIS URL:\n", auth_url, "\n")
print("Waiting for redirect on", redirect_uri, "...\n")

result = {"code": None, "state": None}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        q = up.parse_qs(up.urlparse(self.path).query)
        result["code"] = q.get("code", [None])[0]
        result["state"] = q.get("state", [None])[0]
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        self.wfile.write(b"<h1>OK</h1><p>Close this tab and return to Terminal.</p>")

    def log_message(self, *_):
        return


httpd = HTTPServer(("127.0.0.1", 8787), Handler)
httpd.handle_request()  # single callback then exit

if result["state"] != state or not result["code"]:
    raise SystemExit(f"Missing/invalid code/state. Got state={result['state']} code={result['code']}")

headers = {"Content-Type": "application/x-www-form-urlencoded"}
# If you have a secret, include Basic auth (helps for confidential clients)
if client_secret:
    headers["Authorization"] = "Basic " + _basic_auth(client_id, client_secret)

resp = httpx.post(
    "https://api.x.com/2/oauth2/token",
    headers=headers,
    data={
        "code": result["code"],
        "grant_type": "authorization_code",
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "code_verifier": verifier,
    },
)

print(resp.status_code)
print(resp.text)