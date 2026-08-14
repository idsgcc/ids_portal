#!/usr/bin/env python3
"""
Watchdog that checks whether a scraper ran on schedule.
Run ~40 minutes after each scheduled scraper time.
Usage: python3 scraper_watchdog.py --source nama
       python3 scraper_watchdog.py --source oetc
"""
import argparse
import os
import sys
import requests
from datetime import datetime, timezone, timedelta

SUPABASE_URL   = os.environ.get("SUPABASE_URL", "https://rwokkfbwksmdcjcbyyhw.supabase.co")
SUPABASE_KEY   = os.environ.get("SUPABASE_KEY", "")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
ALERT_EMAIL    = "paul.winick@ids-gcc.com"
PORTAL_URL     = "https://ids-portal-gold.vercel.app/tenders"

DISPLAY_NAME = {"nama": "Nama Scraper", "oetc": "OETC Scraper"}


def last_run(source):
    """Return the most recent scraper_log entry for this source, or None."""
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/scraper_log",
        headers=headers,
        params={
            "select": "run_time,status,notes",
            "source": f"eq.{source}",
            "order": "run_time.desc",
            "limit": "1",
        },
        timeout=15,
    )
    resp.raise_for_status()
    rows = resp.json()
    return rows[0] if rows else None


def send_alert(source, last):
    name = DISPLAY_NAME.get(source, source)
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    if last:
        last_str = last["run_time"]
        detail = f"Last successful run: {last_str}"
    else:
        detail = "No runs found in the database at all."

    body = (
        f"The {name} did not run at its scheduled time.\n\n"
        f"{detail}\n\n"
        f"Checked at: {now_str}\n"
        f"Portal: {PORTAL_URL}"
    )

    requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "from": "onboarding@resend.dev",
            "to": ALERT_EMAIL,
            "subject": f"MISSED RUN: {name}",
            "text": body,
        },
        timeout=15,
    )
    print(f"Alert sent for {name}.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, choices=["nama", "oetc"])
    parser.add_argument("--window", type=int, default=60,
                        help="Minutes to look back for a recent run (default 60)")
    args = parser.parse_args()

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(minutes=args.window)

    row = last_run(args.source)
    name = DISPLAY_NAME.get(args.source, args.source)

    if row:
        # parse ISO timestamp from Supabase (e.g. "2026-08-13 03:30:03+00")
        run_time_str = row["run_time"].replace(" ", "T")
        if not run_time_str.endswith("Z") and "+" not in run_time_str[-6:]:
            run_time_str += "Z"
        try:
            run_dt = datetime.fromisoformat(run_time_str.replace("Z", "+00:00"))
        except ValueError:
            run_dt = None

        if run_dt and run_dt >= cutoff:
            print(f"{name}: last run at {row['run_time']} — OK.")
            return
        else:
            print(f"{name}: last run at {row['run_time']} — MISSED (older than {args.window} min).")
    else:
        print(f"{name}: no runs found at all — MISSED.")

    send_alert(args.source, row)


if __name__ == "__main__":
    main()
