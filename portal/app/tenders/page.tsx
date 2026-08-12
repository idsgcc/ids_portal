"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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

function LastRunInfo({ lastRun }: { lastRun: LastRun | undefined }) {
  if (lastRun === undefined) return <span className="text-gray-400 dark:text-gray-600">Loading last run…</span>;
  if (lastRun === null) return <span className="text-gray-400 dark:text-gray-600">No runs logged yet</span>;
  return (
    <>
      {lastRun["Run Time"] && (
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
    </>
  );
}

function ScraperCard({
  title,
  description,
  lastRun,
  onRun,
  running,
  result,
}: {
  title: string;
  description: string;
  lastRun: LastRun | undefined;
  onRun: () => void;
  running: boolean;
  result: ScraperResult | null;
}) {
  const failed = result && (result.error || result.exit_code !== 0);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-base">{title}</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{description}</p>
          <div className="mt-3 text-sm space-y-1">
            <LastRunInfo lastRun={lastRun} />
            <div className="text-gray-400 dark:text-gray-500">
              Next run:{" "}
              <span className="text-gray-600 dark:text-gray-400">{formatRunTime(getNextRun().toISOString())}</span>
            </div>
          </div>
        </div>
        <button
          onClick={onRun}
          disabled={running}
          className="shrink-0 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          {running ? "Running…" : "Run Now"}
        </button>
      </div>

      {result && (
        <div className="mt-5">
          <div className={`rounded-lg px-4 py-3 text-sm font-mono whitespace-pre-wrap break-words ${
            failed
              ? "bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
              : "bg-gray-100 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 text-green-700 dark:text-green-400"
          }`}>
            {result.error
              ? `Error: ${result.error}`
              : [result.stdout, result.stderr].filter(Boolean).join("\n")}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TendersPage() {
  const [namaRunning, setNamaRunning] = useState(false);
  const [oetcRunning, setOetcRunning] = useState(false);
  const [namaResult, setNamaResult] = useState<ScraperResult | null>(null);
  const [oetcResult, setOetcResult] = useState<ScraperResult | null>(null);
  const [namaLastRun, setNamaLastRun] = useState<LastRun | undefined>(undefined);
  const [oetcLastRun, setOetcLastRun] = useState<LastRun | undefined>(undefined);

  useEffect(() => {
    fetch("/api/scraper-log")
      .then((r) => r.json())
      .then((data) => {
        setNamaLastRun(data.nama ?? null);
        setOetcLastRun(data.oetc ?? null);
      })
      .catch(() => {
        setNamaLastRun(null);
        setOetcLastRun(null);
      });
  }, []);

  async function runScraper(
    endpoint: string,
    logKey: "nama" | "oetc",
    setRunning: (v: boolean) => void,
    setResult: (v: ScraperResult) => void,
    setLastRun: (v: LastRun) => void,
  ) {
    setRunning(true);
    setResult(null as unknown as ScraperResult);

    let priorRunTime: string | null = null;
    try {
      const logBefore = await fetch("/api/scraper-log").then((r) => r.json());
      priorRunTime = logBefore[logKey]?.["Run Time"] ?? null;
    } catch { /* ignore */ }

    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();

      if (res.status === 202 && data.status === "started") {
        const deadline = Date.now() + 3 * 60 * 1000;
        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 3000));
          try {
            const log = await fetch("/api/scraper-log").then((r) => r.json());
            const latest = log[logKey] as LastRun;
            if (latest && latest["Run Time"] !== priorRunTime) {
              setLastRun(latest);
              if (latest["Status"] === "Error") {
                setResult({ error: latest["Notes"] || "Scraper run failed" });
              } else {
                setResult({
                  stdout: `Done — ${latest["New Tenders"] ?? 0} new tender(s) out of ${latest["Tenders Found"] ?? 0} found.`,
                });
              }
              return;
            }
          } catch { /* keep polling */ }
        }
        setResult({ stdout: "Scraper started — check back in a moment for results." });
      } else {
        setResult(data);
      }
    } catch (err) {
      setResult({ error: String(err) });
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          ← Back to portal
        </Link>

        <h1 className="text-2xl font-bold mt-6 mb-1">Tender Monitoring</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">Live tenders from the Nama and OETC iSupplier portals</p>

        <div className="space-y-8">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
              Nama iSupplier
            </h2>
            <ScraperCard
              title="Nama Scraper"
              description="Fetches live Nama tenders and saves any new ones to Supabase. Runs automatically at 7:30am and 2:30pm Dubai time."
              lastRun={namaLastRun}
              running={namaRunning}
              result={namaResult}
              onRun={() => runScraper("/api/run-scraper", "nama", setNamaRunning, setNamaResult, setNamaLastRun)}
            />
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
              OETC iSupplier
            </h2>
            <ScraperCard
              title="OETC Scraper"
              description="Fetches live OETC tenders and saves any new ones to Supabase. Runs automatically at 7:30am and 2:30pm Dubai time."
              lastRun={oetcLastRun}
              running={oetcRunning}
              result={oetcResult}
              onRun={() => runScraper("/api/run-scraper-oetc", "oetc", setOetcRunning, setOetcResult, setOetcLastRun)}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
