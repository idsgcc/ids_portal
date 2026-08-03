"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface Invoice {
  id: string;
  invoice_number: string;
  party_type: "client" | "supplier";
  amount: number;
  currency: string;
  status: string;
  invoice_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  created_at: string;
  project: { id: string; name: string } | null;
}

function fmtAmt(amount: number | null) {
  if (amount == null) return "—";
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function periodKey(dateStr: string | null): string | null {
  return dateStr ? dateStr.slice(0, 7) : null;
}

function periodLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function CurrencyTotals({ invoices, red }: { invoices: Invoice[]; red?: boolean }) {
  const totals = invoices.reduce((acc, inv) => {
    acc[inv.currency] = (acc[inv.currency] || 0) + (inv.amount ?? 0);
    return acc;
  }, {} as Record<string, number>);

  const entries = Object.entries(totals).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return <p className="text-sm text-gray-400">None</p>;

  return (
    <div className="flex flex-wrap gap-6">
      {entries.map(([currency, total]) => (
        <div key={currency}>
          <span className={`text-xs uppercase tracking-wide ${red ? "text-red-400" : "text-gray-400"}`}>{currency}</span>
          <p className={`text-2xl font-bold mt-0.5 ${red ? "text-red-500 dark:text-red-400" : ""}`}>{fmtAmt(total)}</p>
        </div>
      ))}
    </div>
  );
}

function PeriodSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
    >
      <option value="all">All time</option>
      {options.map(key => <option key={key} value={key}>{periodLabel(key)}</option>)}
    </select>
  );
}

function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Search invoice or project…"
      className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 placeholder-gray-400 w-52"
    />
  );
}

function TypeBadge({ type }: { type: "client" | "supplier" }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${type === "client" ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"}`}>
      {type === "client" ? "Client" : "Supplier"}
    </span>
  );
}

function filterInvoices(items: Invoice[], period: string, dateField: keyof Invoice, search: string) {
  return items.filter(i => {
    if (period !== "all" && periodKey(i[dateField] as string | null) !== period) return false;
    if (search) {
      const q = search.toLowerCase();
      return i.invoice_number.toLowerCase().includes(q) || (i.project?.name ?? "").toLowerCase().includes(q);
    }
    return true;
  });
}

export default function DashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [paidOpen, setPaidOpen] = useState(false);
  const [dueOpen, setDueOpen] = useState(false);
  const [paidPeriod, setPaidPeriod] = useState("all");
  const [paidSearch, setPaidSearch] = useState("");
  const [duePeriod, setDuePeriod] = useState("all");
  const [dueSearch, setDueSearch] = useState("");

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(r => r.ok ? r.json() : r.json().then((e: { error: string }) => Promise.reject(e.error)))
      .then(setInvoices)
      .catch((e: string) => setError(e ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const paidInvoices = useMemo(() => invoices.filter(i => i.status === "paid"), [invoices]);
  const unpaidInvoices = useMemo(() => invoices.filter(i => i.status !== "paid"), [invoices]);

  const paidPeriodOptions = useMemo(() => {
    const keys = new Set<string>();
    paidInvoices.forEach(i => { const k = periodKey(i.paid_date); if (k) keys.add(k); });
    return Array.from(keys).sort().reverse();
  }, [paidInvoices]);

  const duePeriodOptions = useMemo(() => {
    const keys = new Set<string>();
    unpaidInvoices.forEach(i => { const k = periodKey(i.due_date); if (k) keys.add(k); });
    return Array.from(keys).sort().reverse();
  }, [unpaidInvoices]);

  const filteredPaid = useMemo(
    () => filterInvoices(paidInvoices, paidPeriod, "paid_date", paidSearch),
    [paidInvoices, paidPeriod, paidSearch]
  );

  const filteredUnpaid = useMemo(
    () => filterInvoices(unpaidInvoices, duePeriod, "due_date", dueSearch),
    [unpaidInvoices, duePeriod, dueSearch]
  );

  const overdueUnpaid = useMemo(
    () => filteredUnpaid.filter(i => i.due_date && i.due_date < today),
    [filteredUnpaid, today]
  );

  if (loading) return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <p className="text-gray-400">Loading…</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <p className="text-red-500">{error}</p>
    </div>
  );

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto space-y-10">
        <div>
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">← Home</Link>
          <h1 className="text-2xl font-bold mt-2">Dashboard</h1>
        </div>

        {/* INVOICES PAID */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <button
            onClick={() => setPaidOpen(o => !o)}
            className="w-full flex items-center justify-between mb-5 group"
          >
            <h2 className="text-lg font-semibold">Invoices Paid</h2>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-gray-400 transition-transform ${paidOpen ? "" : "-rotate-90"}`}><path d="m6 9 6 6 6-6"/></svg>
          </button>

          <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
            <CurrencyTotals invoices={filteredPaid} />
            {paidOpen && (
              <div className="flex gap-2">
                <SearchInput value={paidSearch} onChange={setPaidSearch} />
                <PeriodSelect value={paidPeriod} onChange={setPaidPeriod} options={paidPeriodOptions} />
              </div>
            )}
          </div>

          {paidOpen && <>
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="text-left px-4 py-3">Invoice #</th>
                  <th className="text-left px-4 py-3">Project</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-right px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Currency</th>
                  <th className="text-left px-4 py-3">Paid Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredPaid.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400">No paid invoices</td></tr>
                ) : filteredPaid.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link href={`/invoices/${inv.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{inv.invoice_number}</Link>
                    </td>
                    <td className="px-4 py-3">
                      {inv.project ? <Link href={`/projects/${inv.project.id}`} className="hover:underline">{inv.project.name}</Link> : "—"}
                    </td>
                    <td className="px-4 py-3"><TypeBadge type={inv.party_type} /></td>
                    <td className="px-4 py-3 text-right font-mono">{fmtAmt(inv.amount)}</td>
                    <td className="px-4 py-3 text-gray-500">{inv.currency}</td>
                    <td className="px-4 py-3 text-gray-500">{fmtDate(inv.paid_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>}
        </section>

        {/* INVOICES DUE */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <button
            onClick={() => setDueOpen(o => !o)}
            className="w-full flex items-center justify-between mb-5 group"
          >
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">Invoices Due</h2>
              {overdueUnpaid.length > 0 && (
                <span className="text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
                  {overdueUnpaid.length} overdue
                </span>
              )}
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-gray-400 transition-transform ${dueOpen ? "" : "-rotate-90"}`}><path d="m6 9 6 6 6-6"/></svg>
          </button>

          <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
            <div className="flex gap-10 flex-wrap">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total Unpaid</p>
                <CurrencyTotals invoices={filteredUnpaid} />
              </div>
              {overdueUnpaid.length > 0 && (
                <div>
                  <p className="text-xs text-red-400 uppercase tracking-wide mb-1">Overdue</p>
                  <CurrencyTotals invoices={overdueUnpaid} red />
                </div>
              )}
            </div>
            {dueOpen && (
              <div className="flex gap-2">
                <SearchInput value={dueSearch} onChange={setDueSearch} />
                <PeriodSelect value={duePeriod} onChange={setDuePeriod} options={duePeriodOptions} />
              </div>
            )}
          </div>

          {dueOpen && <>

          <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="text-left px-4 py-3">Invoice #</th>
                  <th className="text-left px-4 py-3">Project</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-right px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Currency</th>
                  <th className="text-left px-4 py-3">Due Date</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredUnpaid.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">No unpaid invoices</td></tr>
                ) : filteredUnpaid.map(inv => {
                  const overdue = !!inv.due_date && inv.due_date < today;
                  return (
                    <tr key={inv.id} className={`hover:bg-gray-50 dark:hover:bg-gray-900/50 ${overdue ? "bg-red-50/60 dark:bg-red-900/10" : ""}`}>
                      <td className="px-4 py-3 font-mono text-xs">
                        <Link href={`/invoices/${inv.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{inv.invoice_number}</Link>
                      </td>
                      <td className="px-4 py-3">
                        {inv.project ? <Link href={`/projects/${inv.project.id}`} className="hover:underline">{inv.project.name}</Link> : "—"}
                      </td>
                      <td className="px-4 py-3"><TypeBadge type={inv.party_type} /></td>
                      <td className={`px-4 py-3 text-right font-mono ${overdue ? "text-red-600 dark:text-red-400 font-semibold" : ""}`}>
                        {fmtAmt(inv.amount)}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{inv.currency}</td>
                      <td className={`px-4 py-3 ${overdue ? "text-red-600 dark:text-red-400 font-medium" : "text-gray-500"}`}>
                        {overdue && <span className="mr-1">⚠</span>}
                        {fmtDate(inv.due_date)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 capitalize">
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>}
        </section>
      </div>
    </main>
  );
}
