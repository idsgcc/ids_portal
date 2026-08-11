"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Contact = {
  id: string;
  name: string | null;
  company_name: string | null;
  title: string | null;
  phone: string | null;
  email: string | null;
};

type FormState = { name: string; company_name: string; title: string; phone: string; email: string };

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

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>({ name: "", company_name: "", title: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/contacts/${id}`)
      .then((r) => r.json())
      .then((d) => { setContact(d); setLoading(false); });
  }, [id]);

  function startEdit() {
    if (!contact) return;
    setForm({
      name: contact.name ?? "",
      company_name: contact.company_name ?? "",
      title: contact.title ?? "",
      phone: contact.phone ?? "",
      email: contact.email ?? "",
    });
    setSaveError(null);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    const res = await fetch(`/api/contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setSaveError(d.error ?? "Something went wrong");
      setSaving(false);
      return;
    }
    const updated = await res.json();
    setContact(updated);
    setEditing(false);
    setSaving(false);
  }

  async function deleteContact() {
    setDeleting(true);
    await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    router.push("/contacts");
  }

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-lg mx-auto">
          <p className="text-gray-400 text-sm">Loading…</p>
        </div>
      </main>
    );
  }

  if (!contact) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-lg mx-auto">
          <Link href="/contacts" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">← Back to Contacts</Link>
          <p className="mt-6 text-gray-500">Contact not found.</p>
        </div>
      </main>
    );
  }

  const label = contact.name || contact.company_name || "?";

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-lg mx-auto">
        <Link href="/contacts" className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          ← Back to Contacts
        </Link>

        <div className="mt-6 flex items-center gap-4 mb-6">
          <div className={`w-14 h-14 rounded-xl ${avatarColor(label)} flex items-center justify-center text-white font-bold text-lg shrink-0`}>
            {initials(label)}
          </div>
          <div>
            <h1 className="text-xl font-bold">{contact.name || <span className="text-gray-400">No name</span>}</h1>
            {contact.company_name && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{contact.company_name}</p>}
          </div>
        </div>

        {editing ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-3">
            {(["name", "company_name", "title", "phone", "email"] as const).map((field) => (
              <div key={field}>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {field === "company_name" ? "Company" : field.charAt(0).toUpperCase() + field.slice(1)}
                </label>
                <input
                  type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
                  value={form[field]}
                  onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && save()}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            ))}
            {saveError && <p className="text-xs text-red-500">{saveError}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={save} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50">
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            {[
              { label: "Name", value: contact.name },
              { label: "Company", value: contact.company_name },
              { label: "Title", value: contact.title },
              { label: "Phone", value: contact.phone, href: contact.phone ? `tel:${contact.phone}` : undefined },
              { label: "Email", value: contact.email, href: contact.email ? `mailto:${contact.email}` : undefined },
            ].map(({ label, value, href }) => (
              <div key={label} className="flex justify-between items-center px-5 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0 w-24">{label}</span>
                {value ? (
                  href ? (
                    <a href={href} className="text-sm text-blue-600 dark:text-blue-400 hover:underline text-right truncate">{value}</a>
                  ) : (
                    <span className="text-sm font-medium text-right truncate">{value}</span>
                  )
                ) : (
                  <span className="text-sm text-gray-300 dark:text-gray-600">—</span>
                )}
              </div>
            ))}
          </div>
        )}

        {!editing && (
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={startEdit}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Edit Contact
            </button>

            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Are you sure?</span>
                <button
                  onClick={deleteContact}
                  disabled={deleting}
                  className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Yes, Delete"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-4 py-2 text-sm rounded-lg border border-red-200 dark:border-red-900/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Delete Contact
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
