"use client";

import { useState, useEffect } from "react";

// ─── Lookup values ────────────────────────────────────────────────────────────

type LookupValue = { id: string; type: string; value: string; sort_order: number };

const LOOKUP_SECTIONS = [
  {
    type: "contractor_principal",
    label: "Client Entities (Principals)",
    description: "OETC, NEDC, or any future entity that contractors are aligned to.",
    placeholder: "e.g. OETC",
  },
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

function LookupSection({ type, label, description, placeholder }: { type: string; label: string; description: string; placeholder: string }) {
  const [items, setItems] = useState<LookupValue[]>([]);
  const [newValue, setNewValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/lookups?type=${type}`).then((r) => r.json()).then(setItems);
  }, [type]);

  async function add() {
    if (!newValue.trim()) return;
    setAdding(true);
    const res = await fetch("/api/admin/lookups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, value: newValue }) });
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
        {items.length === 0 && <p className="text-sm text-gray-400 py-2">No values yet.</p>}
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg group">
            <span className="text-sm">{item.value}</span>
            <button onClick={() => remove(item.id)} disabled={removing === item.id} className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-40 transition-colors opacity-0 group-hover:opacity-100">
              {removing === item.id ? "…" : "Remove"}
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder={placeholder} onKeyDown={(e) => e.key === "Enter" && add()} />
        <button onClick={add} disabled={adding || !newValue.trim()} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors">
          {adding ? "Adding…" : "Add"}
        </button>
      </div>
    </div>
  );
}

// ─── Users ────────────────────────────────────────────────────────────────────

type User = { id: string; email: string; full_name: string; role: string; created_at: string };

function UsersSection() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", full_name: "", password: "", role: "engineer" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    setUsers(await res.json());
    setLoading(false);
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setFormError(data.error ?? "Failed to create user"); setSaving(false); return; }
    setUsers((prev) => [...prev, data]);
    setForm({ email: "", full_name: "", password: "", role: "engineer" });
    setShowForm(false);
    setSaving(false);
  }

  async function deleteUser(userId: string) {
    setDeletingUser(userId);
    await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setDeletingUser(null);
    setConfirmDelete(null);
  }

  async function changeRole(userId: string, role: string) {
    setChangingRole(userId);
    await fetch(`/api/admin/users/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u));
    setChangingRole(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">Manage who can access the portal and their role.</p>
        <button onClick={() => setShowForm((v) => !v)} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">
          {showForm ? "Cancel" : "Add User"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createUser} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold">New User</h2>
          {formError && <p className="text-sm text-red-500">{formError}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Full Name</label>
              <input required className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="Jane Smith" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email</label>
              <input required type="email" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="jane@ids-gcc.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Temporary Password</label>
              <input required type="password" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Min. 6 characters" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Role</label>
              <select className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                <option value="engineer">Engineer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium transition-colors">{saving ? "Creating…" : "Create User"}</button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-gray-400">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {users.map((u) => (
                <tr key={u.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 font-medium">{u.full_name}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      disabled={changingRole === u.id}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      className="bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-blue-500 disabled:opacity-50"
                    >
                      <option value="engineer">Engineer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {confirmDelete === u.id ? (
                      <span className="flex items-center justify-end gap-2">
                        <span className="text-xs text-gray-500">Remove user?</span>
                        <button
                          onClick={() => deleteUser(u.id)}
                          disabled={deletingUser === u.id}
                          className="text-xs px-2 py-1 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-medium transition-colors"
                        >
                          {deletingUser === u.id ? "…" : "Yes, delete"}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(u.id)}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Module Permissions ───────────────────────────────────────────────────────

type Permission = { id: string; role: string; module: string; can_access: boolean };

const MODULES = ["projects", "tenders", "employees", "contractors", "suppliers", "admin"];
const ROLES = ["admin", "engineer"];

function ModulePermissionsSection() {
  const [perms, setPerms] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/module-permissions").then((r) => r.json()).then((data) => { setPerms(data); setLoading(false); });
  }, []);

  function getPerm(role: string, module: string) {
    return perms.find((p) => p.role === role && p.module === module);
  }

  async function toggle(role: string, module: string) {
    const perm = getPerm(role, module);
    if (!perm) return;
    const key = `${role}:${module}`;
    setToggling(key);
    const newVal = !perm.can_access;
    setPerms((prev) => prev.map((p) => p.role === role && p.module === module ? { ...p, can_access: newVal } : p));
    await fetch("/api/admin/module-permissions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, module, can_access: newVal }) });
    setToggling(null);
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <p className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
        Control which modules are visible to each role. Changes take effect on next page load.
      </p>
      {loading ? (
        <p className="p-6 text-sm text-gray-400">Loading…</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Module</th>
              {ROLES.map((r) => (
                <th key={r} className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider capitalize">{r}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {MODULES.map((mod) => (
              <tr key={mod} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="px-6 py-3 font-medium capitalize">{mod}</td>
                {ROLES.map((role) => {
                  const perm = getPerm(role, mod);
                  const key = `${role}:${mod}`;
                  return (
                    <td key={role} className="px-6 py-3 text-center">
                      <button
                        onClick={() => toggle(role, mod)}
                        disabled={toggling === key}
                        className={`w-10 h-6 rounded-full transition-colors disabled:opacity-50 ${perm?.can_access ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"}`}
                      >
                        <span className={`block w-4 h-4 rounded-full bg-white shadow mx-auto transition-transform ${perm?.can_access ? "translate-x-2" : "-translate-x-2"}`} />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = ["Lookups", "Users", "Module Permissions"] as const;
type Tab = typeof TABS[number];

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("Lookups");

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <a href="/" className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          ← Back to portal
        </a>

        <div className="mt-6 mb-6">
          <h1 className="text-2xl font-bold">Admin</h1>
        </div>

        <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-800">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Lookups" && (
          <div className="space-y-6">
            {LOOKUP_SECTIONS.map((s) => <LookupSection key={s.type} {...s} />)}
          </div>
        )}

        {tab === "Users" && <UsersSection />}

        {tab === "Module Permissions" && <ModulePermissionsSection />}
      </div>
    </main>
  );
}
