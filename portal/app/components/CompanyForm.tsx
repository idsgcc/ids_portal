"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export type CompanyType = "contractor" | "supplier";

type ContractorFields = {
  name: string; country: string; contact_name: string; email: string; phone: string;
  specialization: string; status: string; website: string; trade_license: string; notes: string;
};
type SupplierFields = {
  name: string; country: string; contact_name: string; email: string; phone: string;
  category: string; status: string; lead_time_days: string; payment_terms: string;
  website: string; notes: string;
};
type FormData = ContractorFields & SupplierFields;

const EMPTY: FormData = {
  name: "", country: "", contact_name: "", email: "", phone: "",
  specialization: "", status: "", website: "", trade_license: "", notes: "",
  category: "", lead_time_days: "", payment_terms: "",
};
const CONTRACTOR_STATUSES = ["active", "inactive"];
const SUPPLIER_STATUSES = ["preferred", "approved", "inactive"];

const inputCls = "w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500";
const selectCls = inputCls;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );
}
function Section({ title }: { title: string }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 pt-2 mb-1">
      {title}
    </p>
  );
}

export default function CompanyForm({
  type,
  initial,
  companyId,
}: {
  type: CompanyType;
  initial?: Partial<FormData>;
  companyId?: string;
}) {
  const router = useRouter();
  const defaultStatus = type === "contractor" ? "active" : "approved";
  const [form, setForm] = useState<FormData>({ ...EMPTY, status: defaultStatus, ...initial });
  const [saving, setSaving] = useState(false);
  const [lookupOptions, setLookupOptions] = useState<string[]>([]);

  useEffect(() => {
    const lookupType = type === "contractor" ? "contractor_specialization" : "supplier_category";
    fetch(`/api/admin/lookups?type=${lookupType}`)
      .then((r) => r.json())
      .then((items: { value: string }[]) => setLookupOptions(items.map((i) => i.value)));
  }, [type]);

  function set(key: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function inp(key: keyof FormData, type = "text", placeholder = "") {
    return (
      <input
        type={type}
        className={inputCls}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
      />
    );
  }

  function sel(key: keyof FormData, options: string[]) {
    return (
      <select className={selectCls} value={form[key]} onChange={(e) => set(key, e.target.value)}>
        <option value="">— Select —</option>
        {options.map((o) => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
      </select>
    );
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);

    const raw: Record<string, string | number | null> = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, typeof v === "string" ? (v.trim() || null) : v])
    );
    if (type === "supplier" && raw.lead_time_days) {
      raw.lead_time_days = parseInt(raw.lead_time_days as string) || null;
    }

    const url = companyId
      ? `/api/${type}s/${companyId}`
      : `/api/${type}s`;
    const method = companyId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(raw),
    });

    if (companyId) {
      router.push(`/${type}s/${companyId}`);
    } else {
      const data = await res.json();
      router.push(`/${type}s/${data.id}`);
    }
    setSaving(false);
  }

  const backHref = companyId ? `/${type}s/${companyId}` : `/${type}s`;
  const isContractor = type === "contractor";

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-lg mx-auto">
        <a href={backHref} className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          ← {companyId ? `Back to ${isContractor ? "contractor" : "supplier"}` : `Back to ${isContractor ? "contractors" : "suppliers"}`}
        </a>

        <h1 className="text-2xl font-bold mt-6 mb-8">
          {companyId ? "Edit" : "Add"} {isContractor ? "Contractor" : "Supplier"}
        </h1>

        <div className="space-y-4">
          <Section title="Company" />
          <Field label="Company Name *">{inp("name", "text", isContractor ? "Acme Telecom LLC" : "TechSupply Co.")}</Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Country">{inp("country", "text", "UAE")}</Field>
            <Field label="Status">{sel("status", isContractor ? CONTRACTOR_STATUSES : SUPPLIER_STATUSES)}</Field>
          </div>
          {isContractor ? (
            <Field label="Specialization">{sel("specialization", lookupOptions)}</Field>
          ) : (
            <Field label="Category">{sel("category", lookupOptions)}</Field>
          )}
          <Field label="Website">{inp("website", "url", "https://")}</Field>
          {isContractor && (
            <Field label="Trade License No.">{inp("trade_license", "text", "CN-123456")}</Field>
          )}

          <Section title="Primary Contact" />
          <Field label="Contact Name">{inp("contact_name", "text", "John Smith")}</Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">{inp("email", "email", "john@company.com")}</Field>
            <Field label="Phone">{inp("phone", "tel", "+971 50 000 0000")}</Field>
          </div>

          {!isContractor && (
            <>
              <Section title="Commercial" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Lead Time (days)">{inp("lead_time_days", "number", "30")}</Field>
                <Field label="Payment Terms">{inp("payment_terms", "text", "NET 30")}</Field>
              </div>
            </>
          )}

          <Section title="Notes" />
          <Field label="Notes">
            <textarea
              className={`${inputCls} h-24 resize-none`}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Any additional information…"
            />
          </Field>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={save}
            disabled={saving || !form.name.trim()}
            className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {saving ? "Saving…" : companyId ? "Save Changes" : `Add ${isContractor ? "Contractor" : "Supplier"}`}
          </button>
          <a
            href={backHref}
            className="flex-1 py-2 text-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
          >
            Cancel
          </a>
        </div>
      </div>
    </main>
  );
}
