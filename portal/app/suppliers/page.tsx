"use client";

import { useState, useEffect } from "react";

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

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((d) => { setSuppliers(d); setLoading(false); });
  }, []);

  const preferred = suppliers.filter((s) => s.status === "preferred");
  const approved = suppliers.filter((s) => s.status === "approved");
  const inactive = suppliers.filter((s) => s.status === "inactive");

  function Group({ label, items }: { label: string; items: Supplier[] }) {
    if (!items.length) return null;
    return (
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
          {label} ({items.length})
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((s) => (
            <a
              key={s.id}
              href={`/suppliers/${s.id}`}
              className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl ${logoColor(s.name)} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                  {initials(s.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm truncate">{s.name}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${STATUS_STYLES[s.status] ?? STATUS_STYLES.inactive}`}>
                      {s.status}
                    </span>
                  </div>
                  {s.category && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">{s.category}</p>
                  )}
                  {s.country && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{s.country}</p>
                  )}
                  {s.lead_time_days != null && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">⏱ {s.lead_time_days}d lead time</p>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <a href="/" className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          ← Back to portal
        </a>

        <div className="flex items-center justify-between mt-6 mb-8">
          <div>
            <h1 className="text-2xl font-bold">Suppliers</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Hardware and equipment suppliers</p>
          </div>
          <a
            href="/suppliers/new"
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
          >
            Add Supplier
          </a>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No suppliers yet</p>
            <p className="text-sm mt-1">Click Add Supplier to get started</p>
          </div>
        ) : (
          <>
            <Group label="Preferred" items={preferred} />
            <Group label="Approved" items={approved} />
            <Group label="Inactive" items={inactive} />
          </>
        )}
      </div>
    </main>
  );
}
