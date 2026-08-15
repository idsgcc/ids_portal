"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  projects: {
    counts: Record<string, number>;
    total: number;
  };
  finance: {
    outstanding: Record<string, number>;
    outstanding_count: number;
    overdue: Record<string, number>;
    overdue_count: number;
  };
  opportunities: {
    counts: Record<string, number>;
    awarded_this_month: number;
    win_rate: number | null;
  };
}

const PROJECT_STATUS_CONFIG: { key: string; label: string; color: string }[] = [
  { key: "upcoming",  label: "Upcoming",  color: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300" },
  { key: "on_track",  label: "On Track",  color: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" },
  { key: "at_risk",   label: "At Risk",   color: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300" },
  { key: "completed", label: "Completed", color: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" },
];

const OPP_STATUS_CONFIG: { key: string; label: string; color: string }[] = [
  { key: "in_progress", label: "In Progress", color: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" },
  { key: "awarded",     label: "Awarded",     color: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" },
  { key: "lost",        label: "Lost",        color: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300" },
  { key: "cancelled",   label: "Cancelled",   color: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400" },
];

function fmtAmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: "red" | "green" }) {
  const valClass = accent === "red"
    ? "text-red-500 dark:text-red-400"
    : accent === "green"
    ? "text-green-600 dark:text-green-400"
    : "text-gray-900 dark:text-white";
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">{label}</p>
      <p className={`text-3xl font-bold ${valClass}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function Section({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{title}</h2>
        {href && <Link href={href} className="text-xs text-indigo-500 hover:text-indigo-400 transition-colors">View all →</Link>}
      </div>
      {children}
    </section>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then(r => r.ok ? r.json() : r.json().then((e: { error: string }) => Promise.reject(e.error)))
      .then(setStats)
      .catch((e: string) => setError(e ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <p className="text-gray-400">Loading…</p>
    </div>
  );

  if (error || !stats) return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <p className="text-red-500">{error ?? "No data"}</p>
    </div>
  );

  const { projects, finance, opportunities } = stats;

  const topOutstanding = Object.entries(finance.outstanding)
    .sort(([a], [b]) => a.localeCompare(b));
  const topOverdue = Object.entries(finance.overdue)
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto space-y-10">
        <div>
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">← Home</Link>
          <h1 className="text-2xl font-bold mt-2">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Operations overview</p>
        </div>

        {/* Top-line stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="On Track Projects"
            value={projects.counts.on_track ?? 0}
            sub={`${projects.total} total`}
          />
          <StatCard
            label="Open Opportunities"
            value={opportunities.counts.in_progress ?? 0}
            sub={opportunities.awarded_this_month > 0 ? `${opportunities.awarded_this_month} awarded this month` : undefined}
          />
          <StatCard
            label="Invoices Outstanding"
            value={finance.outstanding_count}
            sub={topOutstanding.length > 0 ? topOutstanding.map(([c, v]) => `${c} ${fmtAmt(v)}`).join(" · ") : undefined}
          />
          <StatCard
            label="Overdue Invoices"
            value={finance.overdue_count}
            accent={finance.overdue_count > 0 ? "red" : undefined}
            sub={topOverdue.length > 0 ? topOverdue.map(([c, v]) => `${c} ${fmtAmt(v)}`).join(" · ") : "None outstanding"}
          />
        </div>

        {/* Projects */}
        <Section title="Projects" href="/projects">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {PROJECT_STATUS_CONFIG.map(({ key, label, color }) => (
                <div key={key} className="text-center">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{projects.counts[key] ?? 0}</p>
                  <span className={`inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${color}`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Opportunities */}
        <Section title="Opportunities" href="/opportunities">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {OPP_STATUS_CONFIG.map(({ key, label, color }) => (
                <div key={key} className="text-center">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{opportunities.counts[key] ?? 0}</p>
                  <span className={`inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${color}`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
            {opportunities.win_rate !== null && (
              <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800 flex items-center gap-6">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Win Rate</p>
                  <p className={`text-2xl font-bold mt-0.5 ${opportunities.win_rate >= 50 ? "text-green-600 dark:text-green-400" : "text-orange-500 dark:text-orange-400"}`}>
                    {opportunities.win_rate}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Awarded This Month</p>
                  <p className="text-2xl font-bold mt-0.5">{opportunities.awarded_this_month}</p>
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Finance */}
        <Section title="Finance" href="/invoices">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            {topOutstanding.length === 0 && topOverdue.length === 0 ? (
              <p className="text-sm text-gray-400">No outstanding invoices.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Outstanding ({finance.outstanding_count})</p>
                  {topOutstanding.length === 0 ? (
                    <p className="text-sm text-gray-400">None</p>
                  ) : topOutstanding.map(([currency, total]) => (
                    <div key={currency} className="flex items-baseline gap-2 mb-2">
                      <span className="text-xs text-gray-400 w-12">{currency}</span>
                      <span className="text-xl font-bold">{fmtAmt(total)}</span>
                    </div>
                  ))}
                </div>
                {topOverdue.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-red-400 mb-3">Overdue ({finance.overdue_count})</p>
                    {topOverdue.map(([currency, total]) => (
                      <div key={currency} className="flex items-baseline gap-2 mb-2">
                        <span className="text-xs text-red-400 w-12">{currency}</span>
                        <span className="text-xl font-bold text-red-500 dark:text-red-400">{fmtAmt(total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Section>
      </div>
    </main>
  );
}
