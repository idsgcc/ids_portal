"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

type Contact = {
  id: string;
  name: string | null;
  company_name: string | null;
  title: string | null;
  phone: string | null;
  email: string | null;
};

type FormState = { name: string; company_name: string; title: string; phone: string; email: string };

const EMPTY_FORM: FormState = { name: "", company_name: "", title: "", phone: "", email: "" };

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

function ContactModal({
  contact,
  onClose,
  onSaved,
}: {
  contact: Contact | null;
  onClose: () => void;
  onSaved: (c: Contact) => void;
}) {
  const isNew = contact === null;
  const [form, setForm] = useState<FormState>(
    isNew ? EMPTY_FORM : {
      name: contact.name ?? "",
      company_name: contact.company_name ?? "",
      title: contact.title ?? "",
      phone: contact.phone ?? "",
      email: contact.email ?? "",
    }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => { firstRef.current?.focus(); }, []);

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    const url = isNew ? "/api/contacts" : `/api/contacts/${contact!.id}`;
    const method = isNew ? "POST" : "PATCH";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Something went wrong");
      setSaving(false);
      return;
    }
    const saved = await res.json();
    onSaved(saved);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-base">{isNew ? "Add Contact" : "Edit Contact"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="px-6 py-4 space-y-3">
          {(["name", "company_name", "title", "phone", "email"] as const).map((field, i) => (
            <div key={field}>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 capitalize">
                {field === "company_name" ? "Company" : field.charAt(0).toUpperCase() + field.slice(1)}
              </label>
              <input
                ref={i === 0 ? firstRef : undefined}
                type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
                value={form[field]}
                onChange={(e) => set(field, e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
              />
            </div>
          ))}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Cancel
          </button>
          <button onClick={save} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50">
            {saving ? "Saving…" : isNew ? "Add Contact" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<Contact | null | "new">(undefined as unknown as Contact);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function load() {
    fetch("/api/contacts")
      .then((r) => r.json())
      .then((d) => { setContacts(d); setLoading(false); });
  }

  useEffect(() => { load(); }, []);

  const filtered = query.trim() ? contacts.filter((c) => matches(c, query.trim())) : contacts;

  function openAdd() { setModal(null); setModalOpen(true); }
  function openEdit(c: Contact) { setModal(c); setModalOpen(true); }
  function closeModal() { setModalOpen(false); }

  function onSaved(saved: Contact) {
    setContacts((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      if (idx === -1) return [...prev, saved].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
      const next = [...prev];
      next[idx] = saved;
      return next;
    });
    setModalOpen(false);
  }

  function exportToExcel() {
    const rows = filtered.map((c) => ({
      Name: c.name ?? "",
      Company: c.company_name ?? "",
      Title: c.title ?? "",
      Phone: c.phone ?? "",
      Email: c.email ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contacts");
    const filename = query.trim() ? `contacts_${query.trim().replace(/\s+/g, "_")}.xlsx` : "contacts.xlsx";
    XLSX.writeFile(wb, filename);
  }

  async function deleteContact(id: string) {
    setDeleting(true);
    await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setConfirmDelete(null);
    setDeleting(false);
  }

  return (
    <main className="min-h-screen p-8">
      {modalOpen && (
        <ContactModal
          contact={modal as Contact | null}
          onClose={closeModal}
          onSaved={onSaved}
        />
      )}

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
          <div className="flex items-center gap-2">
            <button
              onClick={exportToExcel}
              disabled={loading || filtered.length === 0}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
            >
              Export{query.trim() ? ` (${filtered.length})` : ""} ↓
            </button>
            <button
              onClick={openAdd}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
            >
              Add Contact
            </button>
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
            <p className="text-lg font-medium">{query ? `No results for "${query}"` : "No contacts yet"}</p>
            <p className="text-sm mt-1">{query ? "Try a different name, company, or field" : "Click Add Contact to get started"}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="grid grid-cols-[2rem_1fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
              <div />
              <div>Name</div>
              <div>Company</div>
              <div>Title</div>
              <div>Phone</div>
              <div>Email</div>
              <div />
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((c) => {
                const label = c.name || c.company_name || "?";
                const isConfirming = confirmDelete === c.id;
                return (
                  <div
                    key={c.id}
                    className="grid grid-cols-[2rem_1fr_1fr_1fr_1fr_1fr_auto] gap-4 items-center px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors group"
                  >
                    <a href={`/contacts/${c.id}`} className="contents">
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
                        {c.phone
                          ? <span className="text-xs text-blue-600 dark:text-blue-400 truncate block">{c.phone}</span>
                          : <span className="text-xs text-gray-300 dark:text-gray-600">—</span>}
                      </div>
                      <div className="min-w-0">
                        {c.email
                          ? <span className="text-xs text-blue-600 dark:text-blue-400 truncate block">{c.email}</span>
                          : <span className="text-xs text-gray-300 dark:text-gray-600">—</span>}
                      </div>
                    </a>
                    <div className="flex items-center gap-1 shrink-0">
                      {isConfirming ? (
                        <>
                          <span className="text-xs text-gray-500 dark:text-gray-400 mr-1 whitespace-nowrap">Delete?</span>
                          <button
                            onClick={() => deleteContact(c.id)}
                            disabled={deleting}
                            className="px-2.5 py-1 text-xs rounded-md bg-red-600 hover:bg-red-500 text-white font-medium transition-colors disabled:opacity-50"
                          >
                            {deleting ? "…" : "Yes"}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-2.5 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            No
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => openEdit(c)}
                            className="px-2.5 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setConfirmDelete(c.id)}
                            className="px-2.5 py-1 text-xs rounded-md border border-red-200 dark:border-red-900/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            Delete
                          </button>
                        </>
                      )}
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
