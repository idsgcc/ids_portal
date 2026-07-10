"use client";

import { useState, useEffect } from "react";

type LookupValue = { id: string; type: string; value: string; sort_order: number };

const SECTIONS = [
  {
    type: "contractor_specialization",
    label: "Contractor Specializations",
    description: "Shown in the Specialization dropdown when adding/editing a contractor.",
    placeholder: "e.g. Underground Cabling",
  },
  {
    type: "supplier_category",
    label: "Supplier Categories",
    description: "Shown in the Category dropdown when adding/editing a supplier.",
    placeholder: "e.g. Splicing Equipment",
  },
];

function LookupSection({
  type, label, description, placeholder,
}: {
  type: string; label: string; description: string; placeholder: string;
}) {
  const [items, setItems] = useState<LookupValue[]>([]);
  const [newValue, setNewValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/lookups?type=${type}`)
      .then((r) => r.json())
      .then(setItems);
  }, [type]);

  async function add() {
    if (!newValue.trim()) return;
    setAdding(true);
    const res = await fetch("/api/admin/lookups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, value: newValue }),
    });
    const item = await res.json();
    setItems((prev) => [...prev, item]);
    setNewValue("");
    setAdding(false);
  }

  async function remove(id: string) {
    setRemoving(id);
    await fetch(`/api/admin/lookups/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
    setRemoving(null);
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
      <h2 className="text-base font-semibold mb-1">{label}</h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">{description}</p>

      <div className="space-y-1.5 mb-4">
        {items.length === 0 && (
          <p className="text-sm text-gray-400 py-2">No values yet.</p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg group"
          >
            <span className="text-sm">{item.value}</span>
            <button
              onClick={() => remove(item.id)}
              disabled={removing === item.id}
              className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-40 transition-colors opacity-0 group-hover:opacity-100"
            >
              {removing === item.id ? "…" : "Remove"}
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button
          onClick={add}
          disabled={adding || !newValue.trim()}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          {adding ? "Adding…" : "Add"}
        </button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <a href="/" className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          ← Back to portal
        </a>

        <div className="mt-6 mb-8">
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage dropdown options used across the portal</p>
        </div>

        <div className="space-y-6">
          {SECTIONS.map((s) => (
            <LookupSection key={s.type} {...s} />
          ))}
        </div>
      </div>
    </main>
  );
}
