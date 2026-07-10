"use client";

import { useState, useEffect } from "react";

type ScraperResult = {
  stdout?: string;
  stderr?: string;
  exit_code?: number;
  error?: string;
};

type LastRun = {
  "Run Time"?: string;
  "Tenders Found"?: number;
  "New Tenders"?: number;
  "Status"?: string;
  "Notes"?: string;
} | null;

function formatRunTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Dubai",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }) + " Dubai";
}

const CRON_UTC_TIMES = [{ h: 3, m: 30 }, { h: 10, m: 30 }];

function getNextRun(): Date {
  const now = new Date();
  const todayPrefix = now.toISOString().slice(0, 10);
  const candidates = CRON_UTC_TIMES.map(({ h, m }) =>
    new Date(`${todayPrefix}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00Z`)
  );
  const next = candidates.find((d) => d > now);
  if (next) return next;
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return new Date(`${tomorrow.toISOString().slice(0, 10)}T03:30:00Z`);
}

export default function TendersPage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ScraperResult | null>(null);
  const [lastRun, setLastRun] = useState<LastRun>(undefined as unknown as LastRun);

  useEffect(() => {
    fetch("/api/scraper-log")
      .then((r) => r.json())
      .then(setLastRun)
      .catch(() => setLastRun(null));
  }, []);

  async function runScraper() {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/run-scraper", { method: "POST" });
      const data = await res.json();
      setResult(data);
      setTimeout(() => {
        fetch("/api/scraper-log").then((r) => r.json()).then(setLastRun);
      }, 2000);
    } catch (err) {
      setResult({ error: String(err) });
    } finally {
      setRunning(false);
    }
  }

  const failed = result && (result.error || result.exit_code !== 0);

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <a href="/" className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          ← Back to portal
        </a>

        <h1 className="text-2xl font-bold mt-6 mb-1">Tender Monitoring</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">Live tenders from the Nama iSupplier portal</p>

        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
          Nama iSupplier
        </h2>

        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-base">Nama iSupplier Scraper</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                Fetches live tenders and saves any new ones to Supabase.
                Runs automatically at 7:30am and 2:30pm Dubai time.
              </p>

              <div className="mt-3 text-sm space-y-1">
                {lastRun === undefined && (
                  <span className="text-gray-400 dark:text-gray-600">Loading last run…</span>
                )}
                {lastRun === null && (
                  <span className="text-gray-400 dark:text-gray-600">No runs logged yet</span>
                )}
                {lastRun && lastRun["Run Time"] && (
                  <div className="text-gray-500 dark:text-gray-400">
                    Last run:{" "}
                    <span className="text-gray-800 dark:text-gray-200">{formatRunTime(lastRun["Run Time"])}</span>
                    {" · "}
                    <span className={lastRun["New Tenders"] ? "text-green-600 dark:text-green-400 font-medium" : "text-gray-500 dark:text-gray-400"}>
                      {lastRun["New Tenders"] ?? 0} new
                    </span>
                    {" · "}
                    <span className="text-gray-500 dark:text-gray-400">{lastRun["Tenders Found"] ?? 0} found</span>
                    {lastRun["Status"] === "Error" && (
                      <span className="ml-2 text-red-500 dark:text-red-400">· Error</span>
                    )}
                  </div>
                )}
                <div className="text-gray-400 dark:text-gray-500">
                  Next run:{" "}
                  <span className="text-gray-600 dark:text-gray-400">{formatRunTime(getNextRun().toISOString())}</span>
                </div>
              </div>
            </div>

            <button
              onClick={runScraper}
              disabled={running}
              className="shrink-0 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              {running ? "Running…" : "Run Now"}
            </button>
          </div>

          {result && (
            <div className="mt-5">
              <div
                className={`rounded-lg px-4 py-3 text-sm font-mono whitespace-pre-wrap break-words ${
                  failed
                    ? "bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                    : "bg-gray-100 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 text-green-700 dark:text-green-400"
                }`}
              >
                {result.error
                  ? `Error: ${result.error}`
                  : [result.stdout, result.stderr].filter(Boolean).join("\n")}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
