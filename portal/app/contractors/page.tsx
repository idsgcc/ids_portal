"use client";

import { useState, useEffect } from "react";

type Contact = { id: string; name: string | null; sort_order: number };

type Contractor = {
  id: string;
  name: string;
  country: string | null;
  principal: string[] | null;
  specialization: string | null;
  status: string;
  contractor_contacts: Contact[];
};

const LOGO_COLORS = [
  "bg-blue-600", "bg-indigo-600", "bg-violet-600",
  "bg-sky-600", "bg-teal-600", "bg-cyan-600",
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
  active: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
  inactive: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
};

export default function ContractorsPage() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/contractors")
      .then((r) => r.json())
      .then((d) => { setContractors(d); setLoading(false); });
  }, []);

  const active = contractors.filter((c) => c.status === "active");
  const inactive = contractors.filter((c) => c.status === "inactive");

  function Group({ label, items }: { label: string; items: Contractor[] }) {
    if (!items.length) return null;
    return (
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
          {label} ({items.length})
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((c) => (
            <a
              key={c.id}
              href={`/contractors/${c.id}`}
              className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl ${logoColor(c.name)} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                  {initials(c.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm truncate">{c.name}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${STATUS_STYLES[c.status] ?? STATUS_STYLES.inactive}`}>
                      {c.status}
                    </span>
                    {c.principal?.map((p) => (
                      <span key={p} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                        {p}
                      </span>
                    ))}
                  </div>
                  {c.specialization && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 truncate">{c.specialization}</p>
                  )}
                  {c.country && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{c.country}</p>
                  )}
                  {c.contractor_contacts[0]?.name && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 truncate">👤 {c.contractor_contacts[0].name}{c.contractor_contacts.length > 1 ? ` +${c.contractor_contacts.length - 1}` : ""}</p>
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
            <h1 className="text-2xl font-bold">Contractors</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Telecom companies we subcontract for</p>
          </div>
          <a
            href="/contractors/new"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            Add Contractor
          </a>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : contractors.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No contractors yet</p>
            <p className="text-sm mt-1">Click Add Contractor to get started</p>
          </div>
        ) : (
          <>
            <Group label="Active" items={active} />
            <Group label="Inactive" items={inactive} />
          </>
        )}
      </div>
    </main>
  );
}
