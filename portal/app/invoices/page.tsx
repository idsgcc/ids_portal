"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project { id: string; name: string }

interface InvoiceItem {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  party_type: string;
  invoice_date: string | null;
  paid_date: string | null;
  project: Project | null;
}

interface PoItem {
  id: string;
  po_number: string;
  amount: number;
  currency: string;
  status: string;
  party_type: string;
  issued_date: string | null;
  project: Project | null;
}

interface FinanceSummary {
  po_received_aed: number;
  po_received_items: PoItem[];
  invoices_issued_aed: number;
  invoices_issued_items: InvoiceItem[];
  po_issued_aed: number;
  po_issued_items: PoItem[];
  invoices_received_aed: number;
  invoices_received_items: InvoiceItem[];
  rates_populated: boolean;
}

type BoxKey = "po_received" | "invoices_issued" | "po_issued" | "invoices_received";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtAed(n: number) {
  return "AED " + Math.round(n).toLocaleString("en-US");
}

function fmtAmt(n: number | null, currency: string) {
  if (n == null) return "—";
  return currency + " " + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const colour =
    status === "paid" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" :
    status === "submitted" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" :
    status === "approved" ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400" :
    status === "closed" ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400" :
    "bg-gray-100 dark:bg-gray-800 text-gray-500";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${colour}`}>{status}</span>
  );
}

// ─── Summary box ──────────────────────────────────────────────────────────────

const BOX_STYLES: Record<BoxKey, { accent: string; text: string; ring: string }> = {
  po_received:       { accent: "border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/10", text: "text-emerald-700 dark:text-emerald-400", ring: "ring-2 ring-emerald-400 dark:ring-emerald-600" },
  invoices_issued:   { accent: "border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-900/10",            text: "text-blue-700 dark:text-blue-400",           ring: "ring-2 ring-blue-400 dark:ring-blue-600" },
  po_issued:         { accent: "border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-900/10",        text: "text-amber-700 dark:text-amber-400",         ring: "ring-2 ring-amber-400 dark:ring-amber-600" },
  invoices_received: { accent: "border-violet-200 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-900/10",   text: "text-violet-700 dark:text-violet-400",       ring: "ring-2 ring-violet-400 dark:ring-violet-600" },
};

function SummaryBox({
  boxKey, label, sublabel, value, selected, onClick,
}: {
  boxKey: BoxKey;
  label: string;
  sublabel: string;
  value: number | null;
  selected: boolean;
  onClick: () => void;
}) {
  const { accent, text, ring } = BOX_STYLES[boxKey];
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-5 flex flex-col gap-2 transition-all cursor-pointer ${accent} ${selected ? ring : "hover:brightness-95"}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${text}`}>
        {value === null
          ? <span className="text-gray-300 dark:text-gray-600 text-lg">Loading…</span>
          : fmtAed(value)}
      </p>
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 dark:text-gray-500">{sublabel}</p>
        <span className="text-xs text-gray-400 dark:text-gray-500">{selected ? "▲ Hide" : "▼ Details"}</span>
      </div>
    </button>
  );
}

// ─── Detail tables ────────────────────────────────────────────────────────────

function InvoiceDetailTable({ items }: { items: InvoiceItem[] }) {
  const [search, setSearch] = useState("");
  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    return !q || i.invoice_number.toLowerCase().includes(q) || (i.project?.name ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Search invoice # or project…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 placeholder-gray-400 w-64"
      />
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase tracking-wide text-gray-400">
            <tr>
              <th className="text-left px-4 py-3">Invoice #</th>
              <th className="text-left px-4 py-3">Project</th>
              <th className="text-right px-4 py-3">Amount</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">No results</td></tr>
            ) : filtered.map(inv => (
              <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <td className="px-4 py-3 font-mono text-xs">
                  <Link href={`/invoices/${inv.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{inv.invoice_number}</Link>
                </td>
                <td className="px-4 py-3">
                  {inv.project ? <Link href={`/projects/${inv.project.id}`} className="hover:underline">{inv.project.name}</Link> : "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono">{fmtAmt(inv.amount, inv.currency)}</td>
                <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                <td className="px-4 py-3 text-gray-500">{fmtDate(inv.paid_date ?? inv.invoice_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">{filtered.length} of {items.length} invoices</p>
    </div>
  );
}

function PoDetailTable({ items }: { items: PoItem[] }) {
  const [search, setSearch] = useState("");
  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    return !q || i.po_number.toLowerCase().includes(q) || (i.project?.name ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Search PO # or project…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 placeholder-gray-400 w-64"
      />
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase tracking-wide text-gray-400">
            <tr>
              <th className="text-left px-4 py-3">PO #</th>
              <th className="text-left px-4 py-3">Project</th>
              <th className="text-right px-4 py-3">Amount</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Issued</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">No results</td></tr>
            ) : filtered.map(po => (
              <tr key={po.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <td className="px-4 py-3 font-mono text-xs">{po.po_number}</td>
                <td className="px-4 py-3">
                  {po.project ? <Link href={`/projects/${po.project.id}`} className="hover:underline text-blue-600 dark:text-blue-400">{po.project.name}</Link> : "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono">{fmtAmt(po.amount, po.currency)}</td>
                <td className="px-4 py-3"><StatusBadge status={po.status} /></td>
                <td className="px-4 py-3 text-gray-500">{fmtDate(po.issued_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">{filtered.length} of {items.length} purchase orders</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<BoxKey | null>(null);

  useEffect(() => {
    fetch("/api/finance/summary")
      .then(r => r.ok ? r.json() : r.json().then((e: { error: string }) => Promise.reject(e.error)))
      .then(setSummary)
      .catch((e: string) => setError(e ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  function toggle(key: BoxKey) {
    setSelected(prev => prev === key ? null : key);
  }

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
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">← Home</Link>
          <h1 className="text-2xl font-bold mt-2">Purchase Orders / Invoices</h1>
        </div>

        {/* Financial Overview description */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 px-5 py-4 text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p className="font-semibold text-gray-800 dark:text-gray-200">Financial Overview</p>
          <p>All amounts are converted to AED using live exchange rates (updated daily from the ECB). Click any box to see the individual records that make up the total.</p>
          <ul className="space-y-1 list-disc list-inside text-xs">
            <li><span className="font-medium text-emerald-700 dark:text-emerald-400">POs Received from Client</span> — Approved or closed POs issued to IDS by clients. Represents contracted revenue authorised by the client.</li>
            <li><span className="font-medium text-blue-700 dark:text-blue-400">Invoices Issued — Money In</span> — Client invoices we have submitted or collected. Represents money in or expected in.</li>
            <li><span className="font-medium text-amber-700 dark:text-amber-400">POs Issued to Supplier</span> — Approved or closed POs IDS has sent to suppliers. Represents committed spend to third parties.</li>
            <li><span className="font-medium text-violet-700 dark:text-violet-400">Invoices Received — Money Out</span> — Supplier invoices submitted or paid. Represents money out or owed to suppliers.</li>
          </ul>
          {summary && !summary.rates_populated && (
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium pt-1">
              ⚠ FX rates not yet set — go to Admin → Finance and click Refresh Rates for accurate AED totals.
            </p>
          )}
        </div>

        {/* 4 summary boxes */}
        <div className="grid grid-cols-2 gap-4">
          <SummaryBox boxKey="po_received"       label="Purchase Orders Received from the Client"  sublabel="Approved or closed POs clients have issued to IDS"           value={summary?.po_received_aed ?? null}       selected={selected === "po_received"}       onClick={() => toggle("po_received")} />
          <SummaryBox boxKey="invoices_issued"   label="Invoices Issued — Money In"                sublabel="Client invoices with status Submitted or Paid"               value={summary?.invoices_issued_aed ?? null}   selected={selected === "invoices_issued"}   onClick={() => toggle("invoices_issued")} />
          <SummaryBox boxKey="po_issued"         label="Purchase Orders Issued to the Supplier"    sublabel="Approved or closed POs IDS has issued to suppliers"          value={summary?.po_issued_aed ?? null}         selected={selected === "po_issued"}         onClick={() => toggle("po_issued")} />
          <SummaryBox boxKey="invoices_received" label="Invoices Received — Money Out"             sublabel="Supplier invoices with status Submitted or Paid"             value={summary?.invoices_received_aed ?? null} selected={selected === "invoices_received"} onClick={() => toggle("invoices_received")} />
        </div>

        {/* Detail panel — rendered below the grid when a box is selected */}
        {selected && summary && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
            <h2 className="font-semibold text-gray-800 dark:text-gray-200">
              {selected === "po_received"       && "Purchase Orders Received from the Client"}
              {selected === "invoices_issued"   && "Invoices Issued — Money In"}
              {selected === "po_issued"         && "Purchase Orders Issued to the Supplier"}
              {selected === "invoices_received" && "Invoices Received — Money Out"}
            </h2>
            {(selected === "po_received" || selected === "po_issued") && (
              <PoDetailTable items={selected === "po_received" ? summary.po_received_items : summary.po_issued_items} />
            )}
            {(selected === "invoices_issued" || selected === "invoices_received") && (
              <InvoiceDetailTable items={selected === "invoices_issued" ? summary.invoices_issued_items : summary.invoices_received_items} />
            )}
          </div>
        )}
      </div>
    </main>
  );
}
