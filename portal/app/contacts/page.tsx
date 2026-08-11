"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Contact = {
  id: string;
  name: string | null;
  company_name: string | null;
  title: string | null;
  phone: string | null;
  email: string | null;
};

const AVATAR_COLORS = [
  "bg-blue-600", "bg-indigo-600", "bg-violet-600",
  "bg-sky-600", "bg-teal-600", "bg-cyan-600",
  "bg-emerald-600", "bg-amber-600", "bg-rose-600",
];

function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function matches(c: Contact, q: string): boolean {
  const s = q.toLowerCase();
  return (
    (c.name?.toLowerCase().includes(s) ?? false) ||
    (c.company_name?.toLowerCase().includes(s) ?? false) ||
    (c.title?.toLowerCase().includes(s) ?? false) ||
    (c.phone?.toLowerCase().includes(s) ?? false) ||
    (c.email?.toLowerCase().includes(s) ?? false)
  );
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/contacts")
      .then((r) => r.json())
      .then((d) => { setContacts(d); setLoading(false); });
  }, []);

  const filtered = query.trim() ? contacts.filter((c) => matches(c, query.trim())) : contacts;

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <Link href="/" className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          ← Back to portal
        </Link>

        <div className="flex items-center justify-between mt-6 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Contacts</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {loading ? "Loading…" : `${contacts.length.toLocaleString()} contacts`}
            </p>
          </div>
        </div>

        <div className="relative mb-6">
          <input
            type="search"
            placeholder="Search by name, company, title, phone, or email…"
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
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No results for &ldquo;{query}&rdquo;</p>
            <p className="text-sm mt-1">Try a different name, company, or field</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="grid grid-cols-[2rem_1fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
              <div />
              <div>Name</div>
              <div>Company</div>
              <div>Title</div>
              <div>Phone</div>
              <div>Email</div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((c) => {
                const label = c.name || c.company_name || "?";
                return (
                  <div
                    key={c.id}
                    className="grid grid-cols-[2rem_1fr_1fr_1fr_1fr_1fr] gap-4 items-center px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-lg ${avatarColor(label)} flex items-center justify-center text-white font-bold text-[10px] shrink-0`}>
                      {initials(label)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.name || <span className="text-gray-400">—</span>}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{c.company_name || <span className="text-gray-300 dark:text-gray-600">—</span>}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-500 truncate">{c.title || <span className="text-gray-300 dark:text-gray-600">—</span>}</p>
                    </div>
                    <div className="min-w-0">
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate block">{c.phone}</a>
                      ) : <span className="text-xs text-gray-300 dark:text-gray-600">—</span>}
                    </div>
                    <div className="min-w-0">
                      {c.email ? (
                        <a href={`mailto:${c.email}`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate block">{c.email}</a>
                      ) : <span className="text-xs text-gray-300 dark:text-gray-600">—</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            {query.trim() && (
              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
                {filtered.length} of {contacts.length.toLocaleString()} contacts
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
