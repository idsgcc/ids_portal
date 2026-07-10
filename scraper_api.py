#!/usr/bin/env python3
import subprocess
import os
from flask import Flask, request, jsonify

app = Flask(__name__)

SECRET_TOKEN = os.environ.get("SCRAPER_TOKEN", "")
SCRIPT_PATH = "/home/opc/nama_monitor.py"


@app.route("/run-scraper", methods=["POST"])
def run_scraper():
    auth = request.headers.get("Authorization", "")
    if not SECRET_TOKEN or auth != f"Bearer {SECRET_TOKEN}":
        return jsonify({"error": "Unauthorized"}), 401

    try:
        result = subprocess.run(
            ["python3", SCRIPT_PATH],
            capture_output=True, text=True, timeout=60
        )
        return jsonify({
            "stdout": result.stdout.strip(),
            "stderr": result.stderr.strip(),
            "exit_code": result.returncode,
        })
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Scraper timed out"}), 504


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
