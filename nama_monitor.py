#!/usr/bin/env python3
"""
Nama iSupplier tender scraper.
Runs on the Oracle Cloud VM (which can reach the Nama portal).
Saves new tenders to Supabase. Email notification is handled by the cloud routine.
"""
import os
import requests
import sys
from datetime import datetime, timezone, date
from bs4 import BeautifulSoup
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

SUPABASE_URL  = os.environ.get("SUPABASE_URL", "https://rwokkfbwksmdcjcbyyhw.supabase.co")
SUPABASE_KEY  = os.environ.get("SUPABASE_KEY", "")
TENDER_URL    = "https://isupplier.nama.om:4443/OA_HTML/OA.jsp?OAFunc=TENNEDC"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}


def parse_date(s):
    import time
    try:
        t = time.strptime(s.strip(), "%d-%b-%Y")
        return f"{t.tm_year:04d}-{t.tm_mon:02d}-{t.tm_mday:02d}"
    except Exception:
        return None


def fetch_tenders():
    resp = requests.get(TENDER_URL, timeout=30, verify=False)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")
    tenders = []
    for row in soup.find_all("tr"):
        cells = [td.get_text(strip=True) for td in row.find_all("td")]
        if len(cells) >= 6 and cells[0].startswith("NEDC/"):
            try:
                fee_str = cells[5].replace(",", "").strip()
                tenders.append({
                    "number":   cells[0],
                    "title":    cells[1],
                    "method":   cells[2],
                    "buy_date": parse_date(cells[3]),
                    "deadline": parse_date(cells[4]),
                    "fee":      float(fee_str) if fee_str else None,
                })
            except Exception as e:
                print(f"Skipping row {cells}: {e}", file=sys.stderr)
    return tenders


def fetch_known_numbers():
    url = f"{SUPABASE_URL}/rest/v1/tenders"
    known = set()
    offset = 0
    page = 1000
    while True:
        resp = requests.get(
            url,
            headers={**HEADERS, "Range": f"{offset}-{offset + page - 1}"},
            params={"select": "number"},
            timeout=15,
        )
        resp.raise_for_status()
        batch = resp.json()
        for rec in batch:
            known.add(rec["number"])
        if len(batch) < page:
            break
        offset += page
    return known


def save_tenders(tenders):
    url = f"{SUPABASE_URL}/rest/v1/tenders"
    today = date.today().isoformat()
    records = []
    for t in tenders:
        rec = {"number": t["number"], "title": t["title"], "seen_date": today}
        if t["method"]:      rec["method"]   = t["method"]
        if t["buy_date"]:    rec["buy_date"] = t["buy_date"]
        if t["deadline"]:    rec["deadline"] = t["deadline"]
        if t["fee"] is not None: rec["fee"] = t["fee"]
        records.append(rec)
    for i in range(0, len(records), 100):
        resp = requests.post(
            url,
            headers={**HEADERS, "Prefer": "resolution=ignore-duplicates,return=minimal"},
            json=records[i:i+100],
            timeout=15,
        )
        resp.raise_for_status()


def write_log(run_time, tenders_found, new_tenders, status, notes=""):
    url = f"{SUPABASE_URL}/rest/v1/scraper_log"
    record = {
        "run_time":      run_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "tenders_found": tenders_found,
        "new_tenders":   new_tenders,
        "status":        status,
    }
    if notes:
        record["notes"] = notes
    try:
        resp = requests.post(url, headers=HEADERS, json=record, timeout=15)
        resp.raise_for_status()
    except Exception as e:
        print(f"Log write failed: {e}", file=sys.stderr)


def main():
    run_time = datetime.now(timezone.utc)
    print("Fetching tenders from Nama portal...")
    try:
        tenders = fetch_tenders()
    except Exception as e:
        msg = f"Portal fetch failed: {e}"
        print(msg, file=sys.stderr)
        write_log(run_time, 0, 0, "Error", msg)
        sys.exit(0)

    if not tenders:
        print("No tenders found on page — exiting.")
        write_log(run_time, 0, 0, "Success", "No tenders on page")
        sys.exit(0)

    print(f"Found {len(tenders)} tender(s) on portal.")

    known = fetch_known_numbers()
    print(f"{len(known)} tender(s) already in Supabase.")

    new = [t for t in tenders if t["number"] not in known]
    print(f"{len(new)} new tender(s).")

    if new:
        save_tenders(new)
        print(f"Saved {len(new)} new tender(s) to Supabase.")

    write_log(run_time, len(tenders), len(new), "Success")


if __name__ == "__main__":
    main()
