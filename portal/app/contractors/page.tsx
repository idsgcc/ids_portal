"use client";

import { useState, useEffect } from "react";

type Contact = { id: string; name: string | null; title: string | null; email: string | null; phone: string | null; sort_order: number };

type Contractor = {
  id: string;
  name: string;
  country: string | null;
  principal: string[] | null;
  specialization: string | null;
  status: string;
  website: string | null;
  trade_license: string | null;
  notes: string | null;
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

function matches(c: Contractor, q: string): boolean {
  const s = q.toLowerCase();
  return (
    c.name.toLowerCase().includes(s) ||
    (c.country?.toLowerCase().includes(s) ?? false) ||
    (c.specialization?.toLowerCase().includes(s) ?? false) ||
    (c.status.toLowerCase().includes(s)) ||
    (c.website?.toLowerCase().includes(s) ?? false) ||
    (c.trade_license?.toLowerCase().includes(s) ?? false) ||
    (c.notes?.toLowerCase().includes(s) ?? false) ||
    (c.principal?.some((p) => p.toLowerCase().includes(s)) ?? false) ||
    c.contractor_contacts.some(
      (ct) =>
        ct.name?.toLowerCase().includes(s) ||
        ct.title?.toLowerCase().includes(s) ||
        ct.email?.toLowerCase().includes(s) ||
        ct.phone?.toLowerCase().includes(s)
    )
  );
}

export default function ContractorsPage() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/contractors")
      .then((r) => r.json())
      .then((d) => { setContractors(d); setLoading(false); });
  }, []);

  const filtered = query.trim() ? contractors.filter((c) => matches(c, query.trim())) : contractors;
  const active = filtered.filter((c) => c.status === "active");
  const inactive = filtered.filter((c) => c.status === "inactive");

  function Group({ label, items }: { label: string; items: Contractor[] }) {
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
            <div className="w-24 text-right shrink-0 hidden sm:block">Principal</div>
            <div className="w-16 text-right shrink-0 hidden sm:block">Country</div>
          </div>
          {items.map((c) => {
            const primaryContact = c.contractor_contacts[0];
            const extraContacts = c.contractor_contacts.length - 1;
            return (
              <a
                key={c.id}
                href={`/contractors/${c.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors first:rounded-t-xl last:rounded-b-xl"
              >
                <div className={`w-9 h-9 rounded-lg ${logoColor(c.name)} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                  {initials(c.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-sm">{c.name}</span>
                  {c.specialization && (
                    <span className="ml-2 text-[10px] text-blue-600 dark:text-blue-400">{c.specialization}</span>
                  )}
                  {primaryContact?.name && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                      {primaryContact.name}{extraContacts > 0 ? ` +${extraContacts}` : ""}
                      {primaryContact.email && <span className="ml-2">{primaryContact.email}</span>}
                    </p>
                  )}
                </div>
                <div className="w-24 text-right shrink-0 hidden sm:flex justify-end gap-1 flex-wrap">
                  {c.principal?.map((p) => (
                    <span key={p} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                      {p}
                    </span>
                  ))}
                </div>
                <div className="w-16 text-right shrink-0 hidden sm:block">
                  {c.country && <span className="text-xs text-gray-400 dark:text-gray-500">{c.country}</span>}
                </div>
              </a>
            );
          })}
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

        <div className="flex items-center justify-between mt-6 mb-6">
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

        <div className="relative mb-8">
          <input
            type="search"
            placeholder="Search by name, contact, email, phone, principal…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 pl-10 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : contractors.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No contractors yet</p>
            <p className="text-sm mt-1">Click Add Contractor to get started</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No results for &ldquo;{query}&rdquo;</p>
            <p className="text-sm mt-1">Try a different name, contact, or field</p>
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
