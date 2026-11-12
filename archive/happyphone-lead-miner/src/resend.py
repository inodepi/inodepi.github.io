import os
import sys

import pandas as pd

from push import send_leads

TRACKER_FILE = "processed_domains.csv"
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")

if not DISCORD_WEBHOOK_URL:
    sys.exit("DISCORD_WEBHOOK_URL is not set")

if not os.path.exists(TRACKER_FILE):
    sys.exit(f"{TRACKER_FILE} not found")

df = pd.read_csv(TRACKER_FILE).fillna("")
leads = df[df["error_type"] != "Healthy"].to_dict("records")

if not leads:
    print("No leads in tracker to resend.")
    sys.exit(0)

resp = send_leads(DISCORD_WEBHOOK_URL, leads, label="tracked")
sys.exit(0 if resp is not None else 1)
