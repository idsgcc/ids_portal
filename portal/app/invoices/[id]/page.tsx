"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface Invoice {
  id: string;
  invoice_number: string;
  party_type: "client" | "supplier";
  amount: number | null;
  currency: string;
  status: string;
  invoice_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
  milestone: string | null;
  supplier_name: string | null;
  project: { id: string; name: string } | null;
  contractor: { id: string; name: string; email: string | null; phone: string | null } | null;
  supplier: { id: string; name: string; email: string | null } | null;
  purchase_order: { id: string; po_number: string; description: string | null; amount: number | null; currency: string } | null;
}

interface EditForm {
  invoice_number: string;
  status: string;
  amount: string;
  currency: string;
  invoice_date: string;
  due_date: string;
  paid_date: string;
  notes: string;
  milestone: string;
}

const CURRENCIES = ["AED", "USD", "EUR", "GBP", "OMR"];

const CLIENT_STATUSES = ["pending", "submitted", "paid"];
const SUPPLIER_STATUSES = ["pending", "received", "paid"];

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300",
  submitted: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  received:  "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300",
  paid:      "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
};

function fmtAmt(amount: number | null, currency: string) {
  if (amount == null) return "—";
  return `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <div className="text-sm text-gray-900 dark:text-gray-100">{children}</div>
    </div>
  );
}

function Input({ value, onChange, type = "text", placeholder }: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
    />
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
    >
      {options.map(o => <option key={o} value={o} className="capitalize">{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
    </select>
  );
}

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/invoices/${id}`)
      .then(r => r.ok ? r.json() : r.json().then((e: { error: string }) => Promise.reject(e.error)))
      .then(setInvoice)
      .catch((e: string) => setError(e ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  function startEdit() {
    if (!invoice) return;
    setForm({
      invoice_number: invoice.invoice_number ?? "",
      status: invoice.status ?? "",
      amount: invoice.amount != null ? String(invoice.amount) : "",
      currency: invoice.currency ?? "AED",
      invoice_date: invoice.invoice_date?.slice(0, 10) ?? "",
      due_date: invoice.due_date?.slice(0, 10) ?? "",
      paid_date: invoice.paid_date?.slice(0, 10) ?? "",
      notes: invoice.notes ?? "",
      milestone: invoice.milestone ?? "",
    });
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setForm(null);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      router.push("/dashboard");
    } catch (e) {
      alert(`Delete failed: ${e}`);
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function saveEdit() {
    if (!form || !invoice) return;
    setSaving(true);
    try {
      const body: Record<string, string | number | null> = {
        invoice_number: form.invoice_number,
        status: form.status,
        currency: form.currency,
        amount: form.amount !== "" ? parseFloat(form.amount) : null,
        invoice_date: form.invoice_date || null,
        due_date: form.due_date || null,
        paid_date: form.paid_date || null,
        notes: form.notes || null,
        milestone: form.milestone || null,
      };
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const updated = await fetch(`/api/invoices/${id}`).then(r => r.json());
      setInvoice(updated);
      setEditing(false);
      setForm(null);
    } catch (e) {
      alert(`Save failed: ${e}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <p className="text-gray-400">Loading…</p>
    </div>
  );

  if (error || !invoice) return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <p className="text-red-500">{error ?? "Invoice not found"}</p>
    </div>
  );

  const today = new Date().toISOString().slice(0, 10);
  const overdue = invoice.status !== "paid" && !!invoice.due_date && invoice.due_date < today;
  const partyName = invoice.party_type === "client"
    ? invoice.contractor?.name
    : (invoice.supplier?.name ?? invoice.supplier_name);
  const statuses = invoice.party_type === "client" ? CLIENT_STATUSES : SUPPLIER_STATUSES;

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          ← Dashboard
        </Link>

        <div className="mt-4 mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{invoice.invoice_number}</h1>
            {invoice.project && (
              <Link href={`/projects/${invoice.project.id}`} className="text-sm text-gray-500 hover:underline mt-1 inline-block">
                {invoice.project.name}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 shrink-0">
            <span className={`text-xs px-3 py-1 rounded-full font-semibold capitalize ${STATUS_STYLES[invoice.status] ?? STATUS_STYLES.pending}`}>
              {invoice.status}
            </span>
            {!editing && (
              <button
                onClick={startEdit}
                className="text-xs px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Edit
              </button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Main details card */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-5">
            {editing && form ? (
              <>
                <div className="grid grid-cols-2 gap-5">
                  <Field label="Invoice Number">
                    <Input value={form.invoice_number} onChange={v => setForm(f => f && ({ ...f, invoice_number: v }))} />
                  </Field>
                  <Field label="Status">
                    <Select value={form.status} onChange={v => setForm(f => f && ({ ...f, status: v }))} options={statuses} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <Field label="Amount">
                    <Input type="number" value={form.amount} onChange={v => setForm(f => f && ({ ...f, amount: v }))} placeholder="0.00" />
                  </Field>
                  <Field label="Currency">
                    <Select value={form.currency} onChange={v => setForm(f => f && ({ ...f, currency: v }))} options={CURRENCIES} />
                  </Field>
                </div>
                <div className="grid grid-cols-3 gap-5">
                  <Field label="Invoice Date">
                    <Input type="date" value={form.invoice_date} onChange={v => setForm(f => f && ({ ...f, invoice_date: v }))} />
                  </Field>
                  <Field label="Due Date">
                    <Input type="date" value={form.due_date} onChange={v => setForm(f => f && ({ ...f, due_date: v }))} />
                  </Field>
                  <Field label="Paid Date">
                    <Input type="date" value={form.paid_date} onChange={v => setForm(f => f && ({ ...f, paid_date: v }))} />
                  </Field>
                </div>
                <Field label="Milestone">
                  <Input value={form.milestone} onChange={v => setForm(f => f && ({ ...f, milestone: v }))} placeholder="e.g. FAT Completion" />
                </Field>
                <Field label="Notes">
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(f => f && ({ ...f, notes: e.target.value }))}
                    rows={3}
                    className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none"
                  />
                </Field>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      className="text-sm px-4 py-1.5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-80 disabled:opacity-50"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={saving}
                      className="text-sm px-4 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="text-sm px-4 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Delete Invoice
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-5">
                  <Field label="Type">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${invoice.party_type === "client" ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"}`}>
                      {invoice.party_type === "client" ? "Client" : "Supplier"}
                    </span>
                  </Field>
                  <Field label={invoice.party_type === "client" ? "Client" : "Supplier"}>
                    {partyName ?? "—"}
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <Field label="Amount">
                    <span className="text-base font-semibold">{fmtAmt(invoice.amount, invoice.currency)}</span>
                  </Field>
                  <Field label="Invoice Date">{fmtDate(invoice.invoice_date)}</Field>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <Field label="Due Date">
                    <span className={overdue ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                      {overdue && <span className="mr-1">⚠</span>}
                      {fmtDate(invoice.due_date)}
                    </span>
                  </Field>
                  <Field label="Paid Date">{fmtDate(invoice.paid_date)}</Field>
                </div>
                {invoice.milestone && (
                  <Field label="Milestone">
                    <p className="text-gray-700 dark:text-gray-300">{invoice.milestone}</p>
                  </Field>
                )}
                {invoice.notes && (
                  <Field label="Notes">
                    <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{invoice.notes}</p>
                  </Field>
                )}
              </>
            )}
          </div>

          {/* Linked PO */}
          {invoice.purchase_order && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Linked Purchase Order</h2>
              <div className="grid grid-cols-2 gap-5">
                <Field label="PO Number">{invoice.purchase_order.po_number}</Field>
                <Field label="PO Amount">{fmtAmt(invoice.purchase_order.amount, invoice.purchase_order.currency)}</Field>
              </div>
              {invoice.purchase_order.description && (
                <Field label="Description">{invoice.purchase_order.description}</Field>
              )}
            </div>
          )}
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 dark:text-red-400"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Delete invoice?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{invoice?.invoice_number}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              This will permanently delete this invoice. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 text-sm px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Yes, delete invoice"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="flex-1 text-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
