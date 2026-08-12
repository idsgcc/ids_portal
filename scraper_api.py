#!/usr/bin/env python3
import subprocess
import threading
import os
from flask import Flask, request, jsonify

app = Flask(__name__)

SECRET_TOKEN = os.environ.get("SCRAPER_TOKEN", "")
NAMA_SCRIPT  = "/home/opc/nama_monitor.py"
OETC_SCRIPT  = "/home/opc/oetc_monitor.py"


def _run_in_background(script_path):
    try:
        subprocess.run(["python3", script_path], timeout=300)
    except Exception:
        pass


def trigger_script(script_path):
    auth = request.headers.get("Authorization", "")
    if not SECRET_TOKEN or auth != f"Bearer {SECRET_TOKEN}":
        return jsonify({"error": "Unauthorized"}), 401
    t = threading.Thread(target=_run_in_background, args=(script_path,), daemon=True)
    t.start()
    return jsonify({"status": "started"}), 202


@app.route("/run-scraper", methods=["POST"])
def run_scraper():
    return trigger_script(NAMA_SCRIPT)


@app.route("/run-scraper-oetc", methods=["POST"])
def run_scraper_oetc():
    return trigger_script(OETC_SCRIPT)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
