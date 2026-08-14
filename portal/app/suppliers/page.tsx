"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Supplier = {
  id: string;
  company_id: string | null;
  company_name: string;
  company_country: string | null;
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

function matches(s: Supplier, q: string): boolean {
  const t = q.toLowerCase();
  return (
    s.company_name.toLowerCase().includes(t) ||
    (s.category?.toLowerCase().includes(t) ?? false) ||
    (s.company_country?.toLowerCase().includes(t) ?? false) ||
    (s.status.toLowerCase().includes(t)) ||
    (s.contact_name?.toLowerCase().includes(t) ?? false) ||
    (s.email?.toLowerCase().includes(t) ?? false) ||
    (s.phone?.toLowerCase().includes(t) ?? false) ||
    (s.payment_terms?.toLowerCase().includes(t) ?? false) ||
    (s.notes?.toLowerCase().includes(t) ?? false)
  );
}

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((d) => { setSuppliers(d); setLoading(false); });
  }, []);

  async function deleteSupplier(id: string) {
    setDeleting(true);
    await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    setConfirmDelete(null);
    setDeleting(false);
  }

  const filtered = query.trim() ? suppliers.filter((s) => matches(s, query.trim())) : suppliers;
  const preferred = filtered.filter((s) => s.status === "preferred");
  const approved = filtered.filter((s) => s.status === "approved");
  const inactive = filtered.filter((s) => s.status === "inactive");

  function Group({ label, items }: { label: string; items: Supplier[] }) {
    if (!items.length) return null;
    return (
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
          {label} ({items.length})
        </p>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl divide-y divide-gray-100 dark:divide-gray-800">
          <div className="flex items-center gap-4 px-5 py-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            <div className="w-9 shrink-0" />
            <div className="flex-1">Company Name</div>
            <div className="w-32 shrink-0 hidden sm:block">Category</div>
            <div className="w-20 shrink-0 hidden sm:block">Status</div>
            <div className="w-32 text-right shrink-0 hidden sm:block">Country</div>
            <div className="w-28 shrink-0" />
          </div>
          {items.map((s) => (
            <div
              key={s.id}
              onClick={() => router.push(`/suppliers/${s.id}`)}
              className="group flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors cursor-pointer"
            >
              <div className={`w-9 h-9 rounded-lg ${logoColor(s.company_name)} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                {initials(s.company_name)}
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-sm">{s.company_name}</span>
                {s.contact_name && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{s.contact_name}</p>
                )}
              </div>
              <div className="w-32 shrink-0 hidden sm:block">
                {s.category && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 truncate block">{s.category}</span>
                )}
              </div>
              <div className="w-20 shrink-0 hidden sm:block">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${STATUS_STYLES[s.status] ?? STATUS_STYLES.inactive}`}>
                  {s.status}
                </span>
              </div>
              <div className="w-32 text-right shrink-0 hidden sm:block">
                {s.company_country && <span className="text-xs text-gray-400 dark:text-gray-500">{s.company_country}</span>}
              </div>
              <div className="w-28 shrink-0 flex justify-end items-center gap-1" onClick={(e) => e.stopPropagation()}>
                {confirmDelete === s.id ? (
                  <>
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Delete?</span>
                    <button onClick={() => deleteSupplier(s.id)} disabled={deleting} className="px-2 py-1 text-xs rounded-md bg-red-600 hover:bg-red-500 text-white font-medium disabled:opacity-50">
                      {deleting ? "…" : "Yes"}
                    </button>
                    <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      No
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => router.push(`/suppliers/${s.id}/edit`)} className="px-2.5 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors opacity-0 group-hover:opacity-100">
                      Edit
                    </button>
                    <button onClick={() => setConfirmDelete(s.id)} className="px-2.5 py-1 text-xs rounded-md border border-red-200 dark:border-red-900/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100">
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          ← Back to portal
        </Link>

        <div className="flex items-center justify-between mt-6 mb-6">
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

        <div className="relative mb-8">
          <input
            type="search"
            placeholder="Search by name, category, country, contact…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 pl-10 text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No suppliers yet</p>
            <p className="text-sm mt-1">Click Add Supplier to get started</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No results for &ldquo;{query}&rdquo;</p>
            <p className="text-sm mt-1">Try a different name, category, or field</p>
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
