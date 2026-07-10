"use client";

import { useState, useEffect } from "react";

type Contractor = { id: string; name: string; email: string; phone: string };
type FormData = { name: string; email: string; phone: string };

const EMPTY: FormData = { name: "", email: "", phone: "" };

export default function ContractorsPage() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Contractor | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/contractors");
    setContractors(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
  }

  function openEdit(c: Contractor) {
    setEditing(c);
    setForm({ name: c.name, email: c.email, phone: c.phone });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY);
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editing) {
      await fetch(`/api/contractors/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/contractors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setSaving(false);
    closeForm();
    load();
  }

  async function remove(id: string) {
    setDeleting(id);
    await fetch(`/api/contractors/${id}`, { method: "DELETE" });
    setDeleting(null);
    load();
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <a href="/" className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          ← Back to portal
        </a>

        <div className="flex items-center justify-between mt-6 mb-8">
          <div>
            <h1 className="text-2xl font-bold">Contractors</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage contractor company details</p>
          </div>
          <button
            onClick={openAdd}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            Add Contractor
          </button>
        </div>

        {/* Form modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold mb-5">
                {editing ? "Edit Contractor" : "Add Contractor"}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Company Name *</label>
                  <input
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Acme LLC"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="contact@acme.com"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Phone</label>
                  <input
                    type="tel"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+971 50 000 0000"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={save}
                  disabled={saving || !form.name.trim()}
                  className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={closeForm}
                  className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : contractors.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">No contractors yet</p>
            <p className="text-sm mt-1">Click Add Contractor to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {contractors.map((c) => (
              <div
                key={c.id}
                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {[c.email, c.phone].filter(Boolean).join(" · ") || "No contact details"}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(c)}
                    className="px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-sm transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(c.id)}
                    disabled={deleting === c.id}
                    className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/50 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-300 disabled:opacity-50 text-sm transition-colors"
                  >
                    {deleting === c.id ? "…" : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
