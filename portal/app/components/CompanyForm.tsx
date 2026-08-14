"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export type CompanyType = "contractor" | "supplier" | "client";

type CompanyOption = { id: string; name: string; is_contractor: boolean; is_supplier: boolean; is_client: boolean };
type ContactRow = { name: string; title: string; email: string; phone: string };

type FormData = {
  company_id: string;
  contact_name: string; email: string; phone: string;
  specialization: string; status: string; website: string; trade_license: string; notes: string;
  category: string; lead_time_days: string; payment_terms: string;
};

type InitialData = Partial<FormData> & {
  contractor_contacts?: ContactRow[];
  client_contacts?: ContactRow[];
  principal?: string[];
  company_name?: string;
};

const EMPTY: FormData = {
  company_id: "", contact_name: "", email: "", phone: "",
  specialization: "", status: "", website: "", trade_license: "", notes: "",
  category: "", lead_time_days: "", payment_terms: "",
};

const EMPTY_CONTACT: ContactRow = { name: "", title: "", email: "", phone: "" };
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

function CompanyPicker({
  selectedId,
  selectedName,
  options,
  onSelect,
}: {
  selectedId: string;
  selectedName: string;
  options: CompanyOption[];
  onSelect: (id: string, name: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  if (selectedId) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200">
          {selectedName}
        </div>
        <button
          type="button"
          onClick={() => { onSelect("", ""); setSearch(""); }}
          className="px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
        >
          Change
        </button>
      </div>
    );
  }

  const filtered = search.trim()
    ? options.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())).slice(0, 10)
    : options.slice(0, 10);
  const totalMatches = options.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())).length;

  return (
    <div className="relative">
      <input
        type="text"
        className={inputCls}
        value={search}
        onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="Search existing companies…"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-20 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg mt-1 shadow-lg max-h-52 overflow-y-auto">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={() => { onSelect(c.id, c.name); setSearch(""); setOpen(false); }}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {c.name}
            </button>
          ))}
          {totalMatches > 10 && (
            <p className="px-3 py-2 text-xs text-gray-400 border-t border-gray-100 dark:border-gray-800">
              Type to narrow results…
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function CompanyForm({
  type,
  initial,
  companyId,
}: {
  type: CompanyType;
  initial?: InitialData;
  companyId?: string;
}) {
  const router = useRouter();
  const isContractor = type === "contractor";
  const isSupplier = type === "supplier";
  const isClient = type === "client";

  const defaultStatus = isSupplier ? "approved" : "active";

  const [form, setForm] = useState<FormData>(() => {
    const base: FormData = { ...EMPTY, status: defaultStatus };
    if (!initial) return base;
    const keys = Object.keys(EMPTY) as (keyof FormData)[];
    for (const k of keys) {
      const v = initial[k];
      if (v !== undefined && typeof v === "string") (base as Record<string, string>)[k] = v;
    }
    return base;
  });

  const [companyPickerName, setCompanyPickerName] = useState(initial?.company_name ?? "");
  const [companyOptions, setCompanyOptions] = useState<CompanyOption[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>(() => {
    if (isContractor) return initial?.contractor_contacts?.length ? initial.contractor_contacts : [{ ...EMPTY_CONTACT }];
    if (isClient) return initial?.client_contacts?.length ? initial.client_contacts : [{ ...EMPTY_CONTACT }];
    return [];
  });
  const [principals, setPrincipals] = useState<string[]>(isContractor ? (initial?.principal ?? []) : []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lookupOptions, setLookupOptions] = useState<string[]>([]);
  const [principalOptions, setPrincipalOptions] = useState<string[]>([]);

  useEffect(() => {
    if (isContractor) {
      fetch("/api/admin/lookups?type=contractor_specialization")
        .then((r) => r.json())
        .then((items: { value: string }[]) => setLookupOptions(items.map((i) => i.value)));
      fetch("/api/admin/lookups?type=contractor_principal")
        .then((r) => r.json())
        .then((items: { value: string }[]) => setPrincipalOptions(items.map((i) => i.value)));
    } else if (isSupplier) {
      fetch("/api/admin/lookups?type=supplier_category")
        .then((r) => r.json())
        .then((items: { value: string }[]) => setLookupOptions(items.map((i) => i.value)));
    }
    fetch("/api/companies")
      .then((r) => r.json())
      .then((items: CompanyOption[]) => {
        const available = items.filter((c) =>
          isContractor ? !c.is_contractor :
          isSupplier ? !c.is_supplier :
          !c.is_client
        );
        setCompanyOptions(available);
      });
  }, [type]);

  function set(key: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function inp(key: keyof FormData, inputType = "text", placeholder = "") {
    return (
      <input
        type={inputType}
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

  function setContact(i: number, key: keyof ContactRow, value: string) {
    setContacts((cs) => cs.map((c, idx) => idx === i ? { ...c, [key]: value } : c));
  }

  async function save() {
    if (!form.company_id) { setError("Please select a company"); return; }
    setError("");
    setSaving(true);

    const raw: Record<string, unknown> = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, typeof v === "string" ? (v.trim() || null) : v])
    );

    if (isContractor) {
      delete raw.contact_name; delete raw.email; delete raw.phone;
      delete raw.category; delete raw.lead_time_days; delete raw.payment_terms;
      raw.principal = principals.length ? principals : null;
      raw.contacts = contacts.map((c) => ({
        name: c.name.trim() || null, title: c.title.trim() || null,
        email: c.email.trim() || null, phone: c.phone.trim() || null,
      }));
    } else if (isClient) {
      delete raw.contact_name; delete raw.email; delete raw.phone;
      delete raw.category; delete raw.lead_time_days; delete raw.payment_terms;
      delete raw.specialization; delete raw.trade_license; delete raw.website;
      raw.contacts = contacts.map((c) => ({
        name: c.name.trim() || null, title: c.title.trim() || null,
        email: c.email.trim() || null, phone: c.phone.trim() || null,
      }));
    } else {
      delete raw.specialization; delete raw.trade_license;
      if (raw.lead_time_days) raw.lead_time_days = parseInt(raw.lead_time_days as string) || null;
    }

    const url = companyId ? `/api/${type}s/${companyId}` : `/api/${type}s`;
    const method = companyId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(raw),
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Something went wrong");
      setSaving(false);
      return;
    }

    if (companyId) {
      router.refresh();
      router.push(`/${type}s/${companyId}`);
    } else {
      const data = await res.json();
      router.push(`/${type}s/${data.id}`);
    }
    setSaving(false);
  }

  const backHref = companyId ? `/${type}s/${companyId}` : `/${type}s`;
  const typeLabel = isContractor ? "Contractor" : isClient ? "Client" : "Supplier";

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-lg mx-auto">
        <Link href={backHref} className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          ← {companyId ? `Back to ${type}` : `Back to ${type}s`}
        </Link>

        <h1 className="text-2xl font-bold mt-6 mb-8">
          {companyId ? "Edit" : "Add"} {typeLabel}
        </h1>

        <div className="space-y-4">
          <Section title="Company" />
          <Field label="Company">
            {companyId ? (
              <div className="w-full bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 cursor-not-allowed">
                {companyPickerName || "—"}
              </div>
            ) : (
              <CompanyPicker
                selectedId={form.company_id}
                selectedName={companyPickerName}
                options={companyOptions}
                onSelect={(id, name) => {
                  setForm((f) => ({ ...f, company_id: id }));
                  setCompanyPickerName(name);
                }}
              />
            )}
          </Field>
          <Field label="Status">
            {sel("status", isSupplier ? SUPPLIER_STATUSES : CONTRACTOR_STATUSES)}
          </Field>

          {isContractor && (
            <>
              {principalOptions.length > 0 && (
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">Principal</label>
                  <div className="flex flex-wrap gap-3">
                    {principalOptions.map((opt) => (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded accent-blue-600"
                          checked={principals.includes(opt)}
                          onChange={(e) =>
                            setPrincipals((prev) =>
                              e.target.checked ? [...prev, opt] : prev.filter((v) => v !== opt)
                            )
                          }
                        />
                        <span className="text-sm font-medium">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <Field label="Specialization">{sel("specialization", lookupOptions)}</Field>
              <Field label="Website">{inp("website", "url", "https://")}</Field>
              <Field label="Trade License No.">{inp("trade_license", "text", "CN-123456")}</Field>
            </>
          )}

          {isSupplier && (
            <>
              <Field label="Category">{sel("category", lookupOptions)}</Field>
              <Field label="Website">{inp("website", "url", "https://")}</Field>
            </>
          )}

          {(isContractor || isClient) && (
            <>
              <Section title="Contacts" />
              {contacts.map((contact, i) => (
                <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {i === 0 ? "Primary Contact" : `Contact ${i + 1}`}
                    </span>
                    {i > 0 && (
                      <button type="button" onClick={() => setContacts((cs) => cs.filter((_, idx) => idx !== i))} className="text-xs text-red-400 hover:text-red-500 transition-colors">
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Name">
                      <input type="text" className={inputCls} value={contact.name} onChange={(e) => setContact(i, "name", e.target.value)} placeholder="John Smith" />
                    </Field>
                    <Field label="Title / Role">
                      <input type="text" className={inputCls} value={contact.title} onChange={(e) => setContact(i, "title", e.target.value)} placeholder="Project Manager" />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Email">
                      <input type="email" className={inputCls} value={contact.email} onChange={(e) => setContact(i, "email", e.target.value)} placeholder="john@company.com" />
                    </Field>
                    <Field label="Phone">
                      <input type="tel" className={inputCls} value={contact.phone} onChange={(e) => setContact(i, "phone", e.target.value)} placeholder="+971 50 000 0000" />
                    </Field>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setContacts((cs) => [...cs, { ...EMPTY_CONTACT }])}
                className="w-full py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
              >
                + Add Contact
              </button>
            </>
          )}

          {isSupplier && (
            <>
              <Section title="Primary Contact" />
              <Field label="Contact Name">{inp("contact_name", "text", "John Smith")}</Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Email">{inp("email", "email", "john@company.com")}</Field>
                <Field label="Phone">{inp("phone", "tel", "+971 50 000 0000")}</Field>
              </div>
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

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 mt-8">
          <button
            onClick={save}
            disabled={saving || !form.company_id}
            className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {saving ? "Saving…" : companyId ? "Save Changes" : `Add ${typeLabel}`}
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
