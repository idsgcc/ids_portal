"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";

type Supplier = {
  id: string;
  name: string;
  country: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  category: string | null;
  status: string;
  lead_time_days: number | null;
  payment_terms: string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
};

const LOGO_COLORS = [
  "bg-emerald-600", "bg-green-600", "bg-teal-600",
  "bg-lime-600", "bg-cyan-600", "bg-amber-600",
];
function logoColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return LOGO_COLORS[Math.abs(h) % LOGO_COLORS.length];
}
function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

const STATUS_STYLES: Record<string, string> = {
  preferred: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  approved: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
  inactive: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
};
const STATUS_CYCLE = ["preferred", "approved", "inactive"];

function Row({ label, value, href }: { label: string; value: string | null; href?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0 mr-4">{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:text-blue-600 truncate">{value}</a>
      ) : (
        <span className="text-sm font-medium text-right">{value}</span>
      )}
    </div>
  );
}

export default function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [s, setS] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetch(`/api/suppliers/${id}`)
      .then((r) => r.json())
      .then((d) => { setS(d); setLoading(false); });
  }, [id]);

  async function cycleStatus() {
    if (!s) return;
    const idx = STATUS_CYCLE.indexOf(s.status);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    await fetch(`/api/suppliers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setS({ ...s, status: next });
  }

  async function del() {
    await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    router.push("/suppliers");
  }

  if (loading) return <main className="min-h-screen p-8"><p className="text-gray-400 text-sm">Loading…</p></main>;
  if (!s) return <main className="min-h-screen p-8"><p className="text-red-500 text-sm">Supplier not found.</p></main>;

  const nextStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(s.status) + 1) % STATUS_CYCLE.length];

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-lg mx-auto">
        <a href="/suppliers" className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          ← Back to suppliers
        </a>

        {/* Header */}
        <div className="mt-6 mb-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-xl ${logoColor(s.name)} flex items-center justify-center text-white font-bold text-lg shrink-0`}>
              {initials(s.name)}
            </div>
            <div>
              <h1 className="text-xl font-bold">{s.name}</h1>
              {s.category && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">{s.category}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide ${STATUS_STYLES[s.status] ?? STATUS_STYLES.inactive}`}>
                  {s.status}
                </span>
                {s.country && <span className="text-xs text-gray-400">{s.country}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3 mb-6">
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Commercial</p>
            <Row label="Lead Time" value={s.lead_time_days != null ? `${s.lead_time_days} days` : null} />
            <Row label="Payment Terms" value={s.payment_terms} />
            <Row label="Website" value={s.website} href={s.website ?? undefined} />
          </div>

          {(s.contact_name || s.email || s.phone) && (
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Primary Contact</p>
              <Row label="Name" value={s.contact_name} />
              <Row label="Email" value={s.email} href={s.email ? `mailto:${s.email}` : undefined} />
              <Row label="Phone" value={s.phone} href={s.phone ? `tel:${s.phone}` : undefined} />
            </div>
          )}

          {s.notes && (
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Notes</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{s.notes}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <a
            href={`/suppliers/${id}/edit`}
            className="flex-1 py-2 text-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
          >
            Edit
          </a>
          <button
            onClick={cycleStatus}
            className="flex-1 py-2 rounded-lg border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm font-medium transition-colors"
          >
            → {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
          </button>
          {confirming ? (
            <div className="flex gap-2 flex-1">
              <button onClick={del} className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors">Confirm</button>
              <button onClick={() => setConfirming(false)} className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-medium transition-colors">Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="flex-1 py-2 rounded-lg border border-red-300 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
