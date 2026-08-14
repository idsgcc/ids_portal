"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Opportunity = {
  id: string;
  name: string;
  status: string;
  notes: string | null;
  close_date: string | null;
  created_at: string;
  client_id: string | null;
  contractor_id: string | null;
  project_id: string | null;
  client_name: string | null;
  contractor_name: string | null;
  project_name: string | null;
};

type DropdownItem = { id: string; name: string };
type SortKey = "name" | "client_name" | "contractor_name" | "close_date" | "status";

const STATUS_LABELS: Record<string, string> = {
  in_progress: "In Progress",
  awarded: "Awarded",
  lost: "Lost",
  cancelled: "Cancelled",
};

const STATUS_STYLES: Record<string, string> = {
  in_progress: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  awarded: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
  lost: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
  cancelled: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
};

const STATUS_ORDER = ["in_progress", "awarded", "lost", "cancelled"];

const EMPTY = { name: "", client_id: "", contractor_id: "", status: "in_progress", notes: "", close_date: "" };
type FormData = typeof EMPTY;

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [clients, setClients] = useState<DropdownItem[]>([]);
  const [contractors, setContractors] = useState<DropdownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [awardWarn, setAwardWarn] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterClient, setFilterClient] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/opportunities").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/contractors").then((r) => r.json()),
    ]).then(([opps, cls, ctrs]) => {
      setOpportunities(opps);
      setClients(cls.map((c: { id: string; company_name: string }) => ({ id: c.id, name: c.company_name })));
      setContractors(ctrs.map((c: { id: string; company_name: string }) => ({ id: c.id, name: c.company_name })));
      setLoading(false);
    });
  }, []);

  function openAdd() {
    setForm(EMPTY);
    setEditing(null);
    setAwardWarn(false);
    setModal("add");
  }

  function openEdit(opp: Opportunity) {
    setForm({
      name: opp.name,
      client_id: opp.client_id ?? "",
      contractor_id: opp.contractor_id ?? "",
      status: opp.status,
      notes: opp.notes ?? "",
      close_date: opp.close_date ?? "",
    });
    setEditing(opp);
    setAwardWarn(false);
    setModal("edit");
  }

  function closeModal() {
    setModal(null);
    setEditing(null);
    setForm(EMPTY);
    setAwardWarn(false);
  }

  async function save() {
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      client_id: form.client_id || null,
      contractor_id: form.contractor_id || null,
      status: form.status,
      notes: form.notes.trim() || null,
      close_date: form.close_date || null,
    };

    if (modal === "add") {
      const res = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setOpportunities((prev) => [data, ...prev]);
    } else if (modal === "edit" && editing) {
      const res = await fetch(`/api/opportunities/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setOpportunities((prev) => prev.map((o) => (o.id === editing.id ? data : o)));
    }

    setSaving(false);
    closeModal();
  }

  async function deleteOpp(id: string) {
    setDeleting(true);
    await fetch(`/api/opportunities/${id}`, { method: "DELETE" });
    setOpportunities((prev) => prev.filter((o) => o.id !== id));
    setConfirmDelete(null);
    setDeleting(false);
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function sortItems(items: Opportunity[]) {
    return [...items].sort((a, b) => {
      const av: string | null =
        sortKey === "name" ? a.name :
        sortKey === "client_name" ? a.client_name :
        sortKey === "contractor_name" ? a.contractor_name :
        sortKey === "close_date" ? a.close_date :
        a.status;
      const bv: string | null =
        sortKey === "name" ? b.name :
        sortKey === "client_name" ? b.client_name :
        sortKey === "contractor_name" ? b.contractor_name :
        sortKey === "close_date" ? b.close_date :
        b.status;
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      const cmp = av.localeCompare(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }

  const filtered = opportunities.filter((o) => {
    if (query.trim()) {
      const q = query.toLowerCase();
      const textMatch =
        o.name.toLowerCase().includes(q) ||
        (o.client_name?.toLowerCase().includes(q) ?? false) ||
        (o.contractor_name?.toLowerCase().includes(q) ?? false) ||
        (o.notes?.toLowerCase().includes(q) ?? false);
      if (!textMatch) return false;
    }
    if (filterClient && o.client_id !== filterClient) return false;
    if (filterStatus && o.status !== filterStatus) return false;
    return true;
  });

  const grouped = STATUS_ORDER.map((s) => ({
    status: s,
    label: STATUS_LABELS[s],
    items: filtered.filter((o) => o.status === s),
  })).filter((g) => g.items.length > 0);

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/"
          className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          ← Back to portal
        </Link>

        <div className="flex items-center justify-between mt-6 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Opportunities</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track bids and incoming work</p>
          </div>
          <button
            onClick={openAdd}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            Add Opportunity
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <input
              type="search"
              placeholder="Search by name, client, contractor, notes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 pl-10 text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
          </div>
          <select
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 text-gray-600 dark:text-gray-300"
          >
            <option value="">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 text-gray-600 dark:text-gray-300"
          >
            <option value="">All Statuses</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : opportunities.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No opportunities yet</p>
            <p className="text-sm mt-1">Click Add Opportunity to get started</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No results for &ldquo;{query}&rdquo;</p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.status} className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
                {group.label} ({group.items.length})
              </p>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl divide-y divide-gray-100 dark:divide-gray-800">
                <div className="flex items-center gap-4 px-5 py-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  {(["name", "client_name", "contractor_name", "close_date", "status"] as SortKey[]).map((k) => {
                    const label = k === "name" ? "Opportunity" : k === "client_name" ? "Client" : k === "contractor_name" ? "Contractor" : k === "close_date" ? "Close Date" : "Status";
                    const cls = k === "name" ? "flex-1" : k === "close_date" ? "w-24 shrink-0 hidden md:block" : k === "status" ? "w-24 shrink-0 hidden sm:block" : "w-36 shrink-0 hidden sm:block";
                    const active = sortKey === k;
                    return (
                      <button
                        key={k}
                        onClick={() => handleSort(k)}
                        className={`${cls} flex items-center gap-0.5 text-left hover:text-gray-600 dark:hover:text-gray-300 transition-colors ${active ? "text-indigo-500 dark:text-indigo-400" : ""}`}
                      >
                        {label}
                        <span className="ml-0.5">{active ? (sortDir === "asc" ? "↑" : "↓") : ""}</span>
                      </button>
                    );
                  })}
                  <div className="w-28 shrink-0" />
                </div>
                {sortItems(group.items).map((opp) => (
                  <div
                    key={opp.id}
                    className="group flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors cursor-pointer"
                    onClick={() => openEdit(opp)}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-sm">{opp.name}</span>
                      {opp.notes && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{opp.notes}</p>
                      )}
                      {opp.project_id && (
                        <Link
                          href={`/projects/${opp.project_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-green-600 dark:text-green-400 hover:underline mt-0.5 block"
                        >
                          → Project: {opp.project_name}
                        </Link>
                      )}
                    </div>
                    <div className="w-36 shrink-0 hidden sm:block">
                      <span className="text-xs text-gray-600 dark:text-gray-400 truncate block">
                        {opp.client_name ?? "—"}
                      </span>
                    </div>
                    <div className="w-36 shrink-0 hidden sm:block">
                      <span className="text-xs text-gray-600 dark:text-gray-400 truncate block">
                        {opp.contractor_name ?? "—"}
                      </span>
                    </div>
                    <div className="w-24 shrink-0 hidden md:block">
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {opp.close_date
                          ? new Date(opp.close_date + "T00:00:00").toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </span>
                    </div>
                    <div className="w-24 shrink-0 hidden sm:block">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${STATUS_STYLES[opp.status] ?? STATUS_STYLES.cancelled}`}
                      >
                        {STATUS_LABELS[opp.status] ?? opp.status}
                      </span>
                    </div>
                    <div
                      className="w-28 shrink-0 flex justify-end items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {confirmDelete === opp.id ? (
                        <>
                          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Delete?</span>
                          <button
                            onClick={() => deleteOpp(opp.id)}
                            disabled={deleting}
                            className="px-2 py-1 text-xs rounded-md bg-red-600 hover:bg-red-500 text-white font-medium disabled:opacity-50"
                          >
                            {deleting ? "…" : "Yes"}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-2 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            No
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => openEdit(opp)}
                            className="px-2.5 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setConfirmDelete(opp.id)}
                            className="px-2.5 py-1 text-xs rounded-md border border-red-200 dark:border-red-900/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-5">
              {modal === "add" ? "New Opportunity" : "Edit Opportunity"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Opportunity Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. OETC Fibre Backbone Phase 3"
                  autoFocus
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Client</label>
                <select
                  value={form.client_id}
                  onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500"
                >
                  <option value="">— Select client —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Contractor</label>
                <select
                  value={form.contractor_id}
                  onChange={(e) => setForm({ ...form, contractor_id: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500"
                >
                  <option value="">— Select contractor —</option>
                  {contractors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => {
                    const s = e.target.value;
                    setForm({ ...form, status: s });
                    setAwardWarn(s === "awarded" && (modal === "add" || (editing != null && !editing.project_id)));
                  }}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500"
                >
                  <option value="in_progress">In Progress</option>
                  <option value="awarded">Awarded</option>
                  <option value="lost">Lost</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                {awardWarn && (
                  <p className="mt-1.5 text-xs text-green-600 dark:text-green-400">
                    A Project will be automatically created from this opportunity with status &ldquo;Upcoming&rdquo;.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Close Date</label>
                <input
                  type="date"
                  value={form.close_date}
                  onChange={(e) => setForm({ ...form, close_date: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  placeholder="Any additional details…"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 resize-none"
                />
              </div>
            </div>

            {modal === "edit" && editing?.project_id && (
              <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-2">
                <span className="text-xs text-green-700 dark:text-green-300">Project created:</span>
                <Link
                  href={`/projects/${editing.project_id}`}
                  className="text-xs font-medium text-green-700 dark:text-green-300 hover:underline"
                >
                  {editing.project_name} →
                </Link>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={!form.name.trim() || saving}
                className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : modal === "add" ? "Add Opportunity" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
