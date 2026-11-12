"""One-time Gmail OAuth helper.

Usage:
    GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... python scripts/gmail_auth.py

It opens a browser consent screen, then prints the refresh token to stdout.
Store it in GitHub Actions as GMAIL_REFRESH_TOKEN. The token is long-lived
when the OAuth consent screen is published to Production.

Requested scopes:
    gmail.send    - send outreach and confirmation email
    gmail.modify  - read the inbox and mark unsubscribe mail as processed
"""

import os
import sys

from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
]


def main() -> int:
    client_id = os.getenv("GMAIL_CLIENT_ID", "").strip()
    client_secret = os.getenv("GMAIL_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        print("Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET first.")
        return 1

    client_config = {
        "installed": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": ["http://localhost"],
        }
    }
    flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
    creds = flow.run_local_server(port=0, prompt="consent")

    print("\nRefresh token:\n")
    print(creds.refresh_token)
    return 0


if __name__ == "__main__":
    sys.exit(main())
