"use client";

import { useEffect, useState, useCallback } from "react";

interface DiagnosticsData {
  db_size_bytes: number | null;
  free_tier_bytes: number;
  table_counts: Record<string, number>;
  scraper: {
    api_status: "ok" | "error" | "timeout";
    api_http_status: number | null;
    api_latency_ms: number | null;
    api_body: Record<string, unknown>;
    recent_runs: {
      id: number;
      run_time: number | null;
      tenders_found: number | null;
      new_tenders: number | null;
      status: string | null;
      notes: string | null;
      source: string | null;
      created_at: string;
    }[];
  };
  fetched_at: string;
}

function fmt(n: number) {
  if (n >= 1024 * 1024 * 1024) return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(0)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DiagnosticsPage() {
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/diagnostics");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dbBytes = data?.db_size_bytes ?? 0;
  const freeBytes = data?.free_tier_bytes ?? 500 * 1024 * 1024;
  const usedPct = dbBytes > 0 ? (dbBytes / freeBytes) * 100 : 0;
  const remainingBytes = freeBytes - dbBytes;

  const sortedTables = Object.entries(data?.table_counts ?? {}).sort(
    ([, a], [, b]) => b - a
  );

  const apiStatus = data?.scraper.api_status;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Diagnostics</h1>
        <div className="flex items-center gap-3">
          {data && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Updated {fmtDateTime(data.fetched_at)}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          Failed to load diagnostics: {error}
        </div>
      )}

      {/* Supabase Storage */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
          Supabase Usage
        </h2>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          {loading && !data ? (
            <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {fmt(dbBytes)} of {fmt(freeBytes)} free tier
                </span>
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                  {usedPct.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(usedPct, 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                {fmt(remainingBytes)} remaining
              </p>
            </>
          )}
        </div>
      </section>

      {/* Row Counts */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
          Row Counts
        </h2>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          {loading && !data ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="h-6 w-24 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse"
                />
              ))}
            </div>
          ) : sortedTables.length === 0 ? (
            <p className="text-sm text-gray-400">No table data available.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {sortedTables.map(([table, count]) => (
                <span
                  key={table}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                  <span className="font-medium">{table}</span>
                  <span className="text-gray-400 dark:text-gray-500">{count.toLocaleString()}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Scraper Monitor */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
          Scraper Monitor
        </h2>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl divide-y divide-gray-100 dark:divide-gray-800">
          {/* API Health */}
          <div className="flex items-center gap-3 px-5 py-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">Scraper API</span>
            {loading && !data ? (
              <div className="h-5 w-20 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
            ) : (
              <>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    apiStatus === "ok"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : apiStatus === "timeout"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      apiStatus === "ok"
                        ? "bg-emerald-500"
                        : apiStatus === "timeout"
                        ? "bg-amber-500"
                        : "bg-red-500"
                    }`}
                  />
                  {apiStatus === "ok" ? "Online" : apiStatus === "timeout" ? "Timeout" : "Offline"}
                </span>
                {data?.scraper.api_latency_ms != null && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {data.scraper.api_latency_ms}ms
                  </span>
                )}
              </>
            )}
          </div>

          {/* Recent Runs Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                  <th className="px-5 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Found</th>
                  <th className="px-4 py-3 font-medium text-right">New</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {loading && !data
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : (data?.scraper.recent_runs ?? []).map((run) => (
                      <tr
                        key={run.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                      >
                        <td className="px-5 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap text-xs">
                          {fmtDateTime(run.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              run.status === "success"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : run.status === "error"
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            }`}
                          >
                            {run.status ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 tabular-nums">
                          {run.tenders_found ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {run.new_tenders != null && run.new_tenders > 0 ? (
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              +{run.new_tenders}
                            </span>
                          ) : (
                            <span className="text-gray-400">
                              {run.new_tenders ?? "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {run.source ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                          {run.notes ?? ""}
                        </td>
                      </tr>
                    ))}
                {!loading && (data?.scraper.recent_runs ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-6 text-center text-sm text-gray-400">
                      No scraper runs recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
