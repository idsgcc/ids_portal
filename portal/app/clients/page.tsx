"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Contact = { id: string; name: string | null; title: string | null; email: string | null; phone: string | null; sort_order: number };

type Client = {
  id: string;
  company_id: string | null;
  company_name: string;
  company_country: string | null;
  status: string;
  notes: string | null;
  client_contacts: Contact[];
};

const LOGO_COLORS = [
  "bg-violet-600", "bg-purple-600", "bg-fuchsia-600",
  "bg-indigo-600", "bg-pink-600", "bg-rose-600",
];
function logoColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return LOGO_COLORS[Math.abs(h) % LOGO_COLORS.length];
}
function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function matches(c: Client, q: string): boolean {
  const s = q.toLowerCase();
  return (
    c.company_name.toLowerCase().includes(s) ||
    (c.company_country?.toLowerCase().includes(s) ?? false) ||
    (c.status.toLowerCase().includes(s)) ||
    (c.notes?.toLowerCase().includes(s) ?? false) ||
    c.client_contacts.some(
      (ct) =>
        ct.name?.toLowerCase().includes(s) ||
        ct.title?.toLowerCase().includes(s) ||
        ct.email?.toLowerCase().includes(s) ||
        ct.phone?.toLowerCase().includes(s)
    )
  );
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((d) => { setClients(d); setLoading(false); });
  }, []);

  async function deleteClient(id: string) {
    setDeleting(true);
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    setClients((prev) => prev.filter((c) => c.id !== id));
    setConfirmDelete(null);
    setDeleting(false);
  }

  const filtered = query.trim() ? clients.filter((c) => matches(c, query.trim())) : clients;
  const active = filtered.filter((c) => c.status === "active");
  const inactive = filtered.filter((c) => c.status === "inactive");

  function Group({ label, items }: { label: string; items: Client[] }) {
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
            <div className="w-32 text-right shrink-0 hidden sm:block">Country</div>
            <div className="w-28 shrink-0" />
          </div>
          {items.map((c) => {
            const primaryContact = c.client_contacts[0];
            const extraContacts = c.client_contacts.length - 1;
            return (
              <div
                key={c.id}
                onClick={() => router.push(`/clients/${c.id}`)}
                className="group flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors cursor-pointer"
              >
                <div className={`w-9 h-9 rounded-lg ${logoColor(c.company_name)} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                  {initials(c.company_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-sm">{c.company_name}</span>
                  {primaryContact?.name && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                      {primaryContact.name}{extraContacts > 0 ? ` +${extraContacts}` : ""}
                      {primaryContact.email && <span className="ml-2">{primaryContact.email}</span>}
                    </p>
                  )}
                </div>
                <div className="w-32 text-right shrink-0 hidden sm:block">
                  {c.company_country && <span className="text-xs text-gray-400 dark:text-gray-500">{c.company_country}</span>}
                </div>
                <div className="w-28 shrink-0 flex justify-end items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {confirmDelete === c.id ? (
                    <>
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Delete?</span>
                      <button onClick={() => deleteClient(c.id)} disabled={deleting} className="px-2 py-1 text-xs rounded-md bg-red-600 hover:bg-red-500 text-white font-medium disabled:opacity-50">
                        {deleting ? "…" : "Yes"}
                      </button>
                      <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        No
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => router.push(`/clients/${c.id}/edit`)} className="px-2.5 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors opacity-0 group-hover:opacity-100">
                        Edit
                      </button>
                      <button onClick={() => setConfirmDelete(c.id)} className="px-2.5 py-1 text-xs rounded-md border border-red-200 dark:border-red-900/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100">
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
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
            <h1 className="text-2xl font-bold">Clients</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Companies we deliver projects for</p>
          </div>
          <a
            href="/clients/new"
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
          >
            Add Client
          </a>
        </div>

        <div className="relative mb-8">
          <input
            type="search"
            placeholder="Search by name, contact, country…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 pl-10 text-sm focus:outline-none focus:border-violet-500 dark:focus:border-violet-500"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : clients.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No clients yet</p>
            <p className="text-sm mt-1">Click Add Client to get started</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No results for &ldquo;{query}&rdquo;</p>
            <p className="text-sm mt-1">Try a different name or contact</p>
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
