"use client";

import { useState, useEffect, use } from "react";
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

type RoleKey = "client" | "contractor" | "supplier";

const ROLE_STYLES: Record<RoleKey, { active: string; inactive: string }> = {
  client:     { active: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300", inactive: "border border-violet-200 dark:border-violet-800 text-violet-400 dark:text-violet-600" },
  contractor: { active: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",         inactive: "border border-blue-200 dark:border-blue-800 text-blue-400 dark:text-blue-600" },
  supplier:   { active: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300", inactive: "border border-emerald-200 dark:border-emerald-800 text-emerald-400 dark:text-emerald-600" },
};
const ROLE_LABELS: Record<RoleKey, string> = { client: "Client", contractor: "Contractor", supplier: "Supplier" };
const ROLE_HREFS: Record<RoleKey, string> = { client: "/clients", contractor: "/contractors", supplier: "/suppliers" };
const REMOVAL_WARNINGS: Record<RoleKey, string> = {
  contractor: "This will permanently delete the contractor record and all associated contacts, specialization, trade license, and notes.",
  supplier:   "This will permanently delete the supplier record and all associated contact details, category, commercial terms, and notes.",
  client:     "This will permanently delete the client record and all associated contacts and notes.",
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

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [company, setCompany] = useState<Company | null>(null);
  const [countries, setCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>({ name: "", phone: "", website: "", billing_street: "", billing_city: "", billing_country: "", billing_zip: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmRole, setConfirmRole] = useState<RoleKey | null>(null);
  const [togglingRole, setTogglingRole] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/companies/${id}`).then((r) => r.json()),
      fetch("/api/admin/lookups?type=billing_country").then((r) => r.json()),
    ]).then(([co, lkps]) => {
      setCompany(co);
      setCountries(lkps.map((l: { value: string }) => l.value));
      setLoading(false);
    });
  }, [id]);

  function startEdit() {
    if (!company) return;
    setForm({
      name: company.name,
      phone: company.phone ?? "",
      website: company.website ?? "",
      billing_street: company.billing_street ?? "",
      billing_city: company.billing_city ?? "",
      billing_country: company.billing_country ?? "",
      billing_zip: company.billing_zip ?? "",
    });
    setSaveError(null);
    setEditing(true);
  }

  async function save() {
    if (!form.name.trim()) { setSaveError("Company name is required"); return; }
    setSaving(true);
    setSaveError(null);
    const res = await fetch(`/api/companies/${id}`, {
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
    setCompany(updated);
    setEditing(false);
    setSaving(false);
  }

  async function toggleRole(role: RoleKey, action: "add" | "remove") {
    setTogglingRole(true);
    setConfirmRole(null);
    const res = await fetch(`/api/companies/${id}/roles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, action }),
    });
    if (res.ok) {
      setCompany((c) =>
        c ? {
          ...c,
          is_client: role === "client" ? action === "add" : c.is_client,
          is_contractor: role === "contractor" ? action === "add" : c.is_contractor,
          is_supplier: role === "supplier" ? action === "add" : c.is_supplier,
        } : c
      );
    }
    setTogglingRole(false);
  }

  async function deleteCompany() {
    setDeleting(true);
    await fetch(`/api/companies/${id}`, { method: "DELETE" });
    router.push("/companies");
  }

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-lg mx-auto"><p className="text-gray-400 text-sm">Loading…</p></div>
      </main>
    );
  }

  if (!company || (company as { error?: string }).error) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-lg mx-auto">
          <Link href="/companies" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">← Back to Companies</Link>
          <p className="mt-6 text-gray-500">Company not found.</p>
        </div>
      </main>
    );
  }

  const fields: { key: keyof FormState; label: string; type?: string }[] = [
    { key: "name", label: "Company Name" },
    { key: "phone", label: "Phone", type: "tel" },
    { key: "website", label: "Website", type: "url" },
    { key: "billing_street", label: "Billing Street" },
    { key: "billing_city", label: "Billing City" },
    { key: "billing_zip", label: "Billing Zip / Postal Code" },
  ];

  const displayRows = [
    { label: "Phone", value: company.phone, href: company.phone ? `tel:${company.phone}` : undefined },
    { label: "Website", value: company.website, href: company.website ?? undefined },
    { label: "Street", value: company.billing_street },
    { label: "City", value: company.billing_city },
    { label: "Country", value: company.billing_country },
    { label: "Zip / Postal", value: company.billing_zip },
  ];

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-lg mx-auto">
        <Link href="/companies" className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          ← Back to Companies
        </Link>

        <div className="mt-6 flex items-center gap-4 mb-6">
          <div className={`w-14 h-14 rounded-xl ${avatarColor(company.name)} flex items-center justify-center text-white font-bold text-lg shrink-0`}>
            {initials(company.name)}
          </div>
          <div>
            <h1 className="text-xl font-bold">{company.name}</h1>
            {company.billing_city && company.billing_country && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{company.billing_city}, {company.billing_country}</p>
            )}
            <div className="flex gap-1.5 mt-2 flex-wrap items-center">
              {(["client", "contractor", "supplier"] as const).map((role) => {
                const isActive = company[`is_${role}` as keyof Company] as boolean;
                return isActive ? (
                  <div key={role} className="flex items-center gap-1">
                    <button
                      onClick={() => setConfirmRole(role)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide hover:opacity-75 transition-opacity ${ROLE_STYLES[role].active}`}
                    >
                      {ROLE_LABELS[role]} ×
                    </button>
                    <Link href={ROLE_HREFS[role]} className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors leading-none">→</Link>
                  </div>
                ) : (
                  <button
                    key={role}
                    onClick={() => toggleRole(role, "add")}
                    disabled={togglingRole}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide opacity-40 hover:opacity-70 transition-opacity ${ROLE_STYLES[role].inactive}`}
                  >
                    + {ROLE_LABELS[role]}
                  </button>
                );
              })}
            </div>
            {confirmRole && (
              <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Remove {ROLE_LABELS[confirmRole]} role?</p>
                <p className="text-xs text-red-600 dark:text-red-500 mb-2">{REMOVAL_WARNINGS[confirmRole]}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleRole(confirmRole, "remove")}
                    disabled={togglingRole}
                    className="px-3 py-1 text-xs rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium disabled:opacity-50"
                  >
                    {togglingRole ? "Removing…" : "Yes, Remove"}
                  </button>
                  <button
                    onClick={() => setConfirmRole(null)}
                    className="px-3 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {editing ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-3">
            {fields.map(({ key, label, type }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
                <input
                  type={type ?? "text"}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Billing Country</label>
              <select
                value={form.billing_country}
                onChange={(e) => setForm((f) => ({ ...f, billing_country: e.target.value }))}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">— Select country —</option>
                {countries.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
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
            {displayRows.map(({ label, value, href }) => (
              <div key={label} className="flex justify-between items-center px-5 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0 w-28">{label}</span>
                {value ? (
                  href ? (
                    <a
                      href={href}
                      target={href.startsWith("http") ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline text-right truncate"
                    >
                      {value}
                    </a>
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
              Edit Company
            </button>

            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Are you sure?</span>
                <button
                  onClick={deleteCompany}
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
                Delete Company
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
