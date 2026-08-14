"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Company = {
  id: string;
  name: string;
  phone: string | null;
  website: string | null;
  billing_street: string | null;
  billing_city: string | null;
  billing_country: string | null;
  billing_zip: string | null;
  is_contractor: boolean;
  is_supplier: boolean;
  is_client: boolean;
};

type FormState = {
  name: string;
  phone: string;
  website: string;
  billing_street: string;
  billing_city: string;
  billing_country: string;
  billing_zip: string;
};

const EMPTY_FORM: FormState = {
  name: "", phone: "", website: "",
  billing_street: "", billing_city: "", billing_country: "", billing_zip: "",
};

type RoleKey = "client" | "contractor" | "supplier";

const ROLE_STYLES: Record<RoleKey, { active: string; inactive: string }> = {
  client:     { active: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300", inactive: "border border-violet-300 dark:border-violet-700 text-violet-400 dark:text-violet-600" },
  contractor: { active: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",         inactive: "border border-blue-300 dark:border-blue-700 text-blue-400 dark:text-blue-600" },
  supplier:   { active: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300", inactive: "border border-emerald-300 dark:border-emerald-700 text-emerald-400 dark:text-emerald-600" },
};
const ROLE_LABELS: Record<RoleKey, string> = { client: "Client", contractor: "Contractor", supplier: "Supplier" };

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

function matches(c: Company, q: string): boolean {
  const s = q.toLowerCase();
  return (
    c.name.toLowerCase().includes(s) ||
    (c.phone?.toLowerCase().includes(s) ?? false) ||
    (c.website?.toLowerCase().includes(s) ?? false) ||
    (c.billing_street?.toLowerCase().includes(s) ?? false) ||
    (c.billing_city?.toLowerCase().includes(s) ?? false) ||
    (c.billing_country?.toLowerCase().includes(s) ?? false) ||
    (c.billing_zip?.toLowerCase().includes(s) ?? false)
  );
}

function CompanyModal({
  company,
  countries,
  onClose,
  onSaved,
}: {
  company: Company | null;
  countries: string[];
  onClose: () => void;
  onSaved: (c: Company) => void;
}) {
  const isNew = company === null;
  const [form, setForm] = useState<FormState>(
    isNew ? EMPTY_FORM : {
      name: company.name,
      phone: company.phone ?? "",
      website: company.website ?? "",
      billing_street: company.billing_street ?? "",
      billing_city: company.billing_city ?? "",
      billing_country: company.billing_country ?? "",
      billing_zip: company.billing_zip ?? "",
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
    if (!form.name.trim()) { setError("Company name is required"); return; }
    setSaving(true);
    setError(null);
    const url = isNew ? "/api/companies" : `/api/companies/${company!.id}`;
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

  const fields: { key: keyof FormState; label: string; type?: string }[] = [
    { key: "name", label: "Company Name" },
    { key: "phone", label: "Phone", type: "tel" },
    { key: "website", label: "Website", type: "url" },
    { key: "billing_street", label: "Billing Street" },
    { key: "billing_city", label: "Billing City" },
    { key: "billing_zip", label: "Billing Zip / Postal Code" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-base">{isNew ? "Add Company" : "Edit Company"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="px-6 py-4 space-y-3 overflow-y-auto">
          {fields.map(({ key, label, type }, i) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
              <input
                ref={i === 0 ? firstRef : undefined}
                type={type ?? "text"}
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Billing Country</label>
            <select
              value={form.billing_country}
              onChange={(e) => set("billing_country", e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
            >
              <option value="">— Select country —</option>
              {countries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Cancel
          </button>
          <button onClick={save} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50">
            {saving ? "Saving…" : isNew ? "Add Company" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<Company | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmRole, setConfirmRole] = useState<{ companyId: string; role: RoleKey } | null>(null);
  const [togglingRole, setTogglingRole] = useState(false);
  const [roleFilter, setRoleFilter] = useState<Set<RoleKey>>(new Set());

  useEffect(() => {
    Promise.all([
      fetch("/api/companies").then((r) => r.json()),
      fetch("/api/admin/lookups?type=billing_country").then((r) => r.json()),
    ]).then(([cos, lkps]) => {
      setCompanies(cos);
      setCountries(lkps.map((l: { value: string }) => l.value));
      setLoading(false);
    });
  }, []);

  function toggleRoleFilter(role: RoleKey) {
    setRoleFilter((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role); else next.add(role);
      return next;
    });
  }

  const filtered = companies.filter((c) => {
    const matchesQuery = !query.trim() || matches(c, query.trim());
    const matchesRole =
      roleFilter.size === 0 ||
      (roleFilter.has("client") && c.is_client) ||
      (roleFilter.has("contractor") && c.is_contractor) ||
      (roleFilter.has("supplier") && c.is_supplier);
    return matchesQuery && matchesRole;
  });

  function openAdd() { setModal(null); setModalOpen(true); }
  function openEdit(c: Company) { setModal(c); setModalOpen(true); }
  function closeModal() { setModalOpen(false); }

  function onSaved(saved: Company) {
    setCompanies((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      if (idx === -1) return [...prev, saved].sort((a, b) => a.name.localeCompare(b.name));
      const next = [...prev];
      next[idx] = saved;
      return next;
    });
    setModalOpen(false);
  }

  async function toggleRole(companyId: string, role: RoleKey, action: "add" | "remove") {
    setTogglingRole(true);
    setConfirmRole(null);
    const res = await fetch(`/api/companies/${companyId}/roles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, action }),
    });
    if (res.ok) {
      setCompanies((prev) =>
        prev.map((c) =>
          c.id !== companyId ? c : {
            ...c,
            is_client: role === "client" ? action === "add" : c.is_client,
            is_contractor: role === "contractor" ? action === "add" : c.is_contractor,
            is_supplier: role === "supplier" ? action === "add" : c.is_supplier,
          }
        )
      );
    }
    setTogglingRole(false);
  }

  async function deleteCompany(id: string) {
    setDeleting(true);
    await fetch(`/api/companies/${id}`, { method: "DELETE" });
    setCompanies((prev) => prev.filter((c) => c.id !== id));
    setConfirmDelete(null);
    setDeleting(false);
  }

  return (
    <main className="min-h-screen p-8">
      {modalOpen && (
        <CompanyModal
          company={modal}
          countries={countries}
          onClose={closeModal}
          onSaved={onSaved}
        />
      )}

      <div className="max-w-7xl mx-auto">
        <Link href="/" className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          ← Back to portal
        </Link>

        <div className="flex items-center justify-between mt-6 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Companies</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {loading
                ? "Loading…"
                : (query.trim() || roleFilter.size > 0)
                  ? `${filtered.length.toLocaleString()} of ${companies.length.toLocaleString()} companies`
                  : `${companies.length.toLocaleString()} companies`}
            </p>
          </div>
          <button
            onClick={openAdd}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            Add Company
          </button>
        </div>

        <div className="relative mb-6">
          <input
            type="search"
            placeholder="Search by name, city, country, phone, website…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 pl-10 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        </div>

        <div className="flex gap-2 mb-4">
          {(["client", "contractor", "supplier"] as const).map((role) => (
            <button
              key={role}
              onClick={() => toggleRoleFilter(role)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                roleFilter.has(role)
                  ? ROLE_STYLES[role].active
                  : "border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              {ROLE_LABELS[role]}
            </button>
          ))}
          {roleFilter.size > 0 && (
            <button
              onClick={() => setRoleFilter(new Set())}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 px-2 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">{query ? `No results for "${query}"` : "No companies yet"}</p>
            <p className="text-sm mt-1">{query ? "Try a different search" : "Click Add Company to get started"}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="grid grid-cols-[2rem_1.5fr_1fr_1fr_1fr_1fr_8rem] gap-4 px-5 py-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
              <div />
              <div>Company</div>
              <div>Website</div>
              <div>City</div>
              <div>Country</div>
              <div>Phone</div>
              <div />
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((c) => {
                const isConfirming = confirmDelete === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => router.push(`/companies/${c.id}`)}
                    className="grid grid-cols-[2rem_1.5fr_1fr_1fr_1fr_1fr_8rem] gap-4 items-center px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors group cursor-pointer"
                  >
                    <div className={`w-8 h-8 rounded-lg ${avatarColor(c.name)} flex items-center justify-center text-white font-bold text-[10px] shrink-0`}>
                      {initials(c.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <div className="flex gap-1 mt-0.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                        {confirmRole?.companyId === c.id ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] text-red-600 dark:text-red-400">
                              Remove {ROLE_LABELS[confirmRole.role]}? Deletes all associated data.
                            </span>
                            <button
                              onClick={() => toggleRole(c.id, confirmRole.role, "remove")}
                              disabled={togglingRole}
                              className="text-[9px] px-1.5 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded font-medium disabled:opacity-50"
                            >
                              {togglingRole ? "…" : "Remove"}
                            </button>
                            <button
                              onClick={() => setConfirmRole(null)}
                              className="text-[9px] px-1.5 py-0.5 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          (["client", "contractor", "supplier"] as const).map((role) => {
                            const isActive = role === "client" ? c.is_client : role === "contractor" ? c.is_contractor : c.is_supplier;
                            return isActive ? (
                              <button
                                key={role}
                                onClick={() => setConfirmRole({ companyId: c.id, role })}
                                className={`text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide hover:opacity-75 transition-opacity ${ROLE_STYLES[role].active}`}
                              >
                                {ROLE_LABELS[role]}
                              </button>
                            ) : (
                              <button
                                key={role}
                                onClick={() => toggleRole(c.id, role, "add")}
                                disabled={togglingRole}
                                className={`text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide opacity-0 group-hover:opacity-40 hover:!opacity-80 transition-opacity ${ROLE_STYLES[role].inactive}`}
                              >
                                +{ROLE_LABELS[role].slice(0, 3)}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                    <div className="min-w-0" onClick={(e) => e.stopPropagation()}>
                      {c.website
                        ? <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate block">{c.website.replace(/^https?:\/\//, "")}</a>
                        : <span className="text-xs text-gray-300 dark:text-gray-600">—</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {c.billing_city || <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {c.billing_country || <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </p>
                    </div>
                    <div className="min-w-0">
                      {c.phone
                        ? <span className="text-xs text-blue-600 dark:text-blue-400 truncate block">{c.phone}</span>
                        : <span className="text-xs text-gray-300 dark:text-gray-600">—</span>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {isConfirming ? (
                        <>
                          <span className="text-xs text-gray-500 dark:text-gray-400 mr-1 whitespace-nowrap">Delete?</span>
                          <button
                            onClick={() => deleteCompany(c.id)}
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
            {(query.trim() || roleFilter.size > 0) && (
              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
                {filtered.length} of {companies.length.toLocaleString()} companies
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
