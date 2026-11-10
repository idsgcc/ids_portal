"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Employee = {
  id: string;
  full_name: string;
  dob: string | null;
  join_date: string | null;
  handle: string | null;
  status: string;
  location: string;
  sick_leave_days: number;
  passport_number: string | null;
  passport_expiry: string | null;
  passport_doc_url: string | null;
  emirates_id_number: string | null;
  emirates_id_expiry: string | null;
  emirates_id_doc_url: string | null;
  visa_file_no: string | null;
  visa_expiry: string | null;
  visa_doc_url: string | null;
  health_policy_no: string | null;
  health_member_no: string | null;
  health_doc_url: string | null;
};

type SalaryEntry = {
  id: string;
  effective_date: string;
  amount: number;
  currency: "AED" | "OMR";
};

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

const AVATAR_COLORS = [
  "bg-orange-500", "bg-blue-500", "bg-purple-500",
  "bg-teal-500", "bg-pink-500", "bg-indigo-500",
];
function avatarColor(name: string) {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function expiryClass(date: string | null): string {
  if (!date) return "text-gray-400";
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
  if (days <= 0) return "text-red-600 dark:text-red-400 font-semibold";
  if (days <= 30) return "text-red-600 dark:text-red-400 font-semibold";
  if (days <= 90) return "text-yellow-600 dark:text-yellow-400 font-semibold";
  return "text-green-600 dark:text-green-400";
}

function DocRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-xs font-medium">{value}</span>
    </div>
  );
}

function DocSection({
  icon, title, rows, expiry, docUrl, expiryLabel = "Expiry",
}: {
  icon: string;
  title: string;
  rows: { label: string; value: string | null }[];
  expiry: string | null;
  docUrl: string | null;
  expiryLabel?: string;
}) {
  const hasContent = rows.some((r) => r.value) || expiry || docUrl;
  if (!hasContent) return null;

  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
        {icon} {title}
      </p>
      {rows.map((r) => <DocRow key={r.label} {...r} />)}
      {expiry && (
        <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
          <span className="text-xs text-gray-500 dark:text-gray-400">{expiryLabel}</span>
          <div className="flex items-center gap-3">
            <span className={`text-xs ${expiryClass(expiry)}`}>{fmtDate(expiry)}</span>
            {docUrl && (
              <a href={docUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:text-blue-600">
                🔗 View
              </a>
            )}
          </div>
        </div>
      )}
      {!expiry && docUrl && (
        <div className="pt-1.5">
          <a href={docUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:text-blue-600">
            🔗 View document
          </a>
        </div>
      )}
    </div>
  );
}

const inputCls = "w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500";

export default function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [tab, setTab] = useState<"general" | "salary">("general");

  const [salaryEntries, setSalaryEntries] = useState<SalaryEntry[]>([]);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCurrency, setNewCurrency] = useState<"AED" | "OMR">("AED");
  const [addingSalary, setAddingSalary] = useState(false);

  useEffect(() => {
    fetch(`/api/employees/${id}`)
      .then((r) => r.json())
      .then((data) => { setEmployee(data); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (tab === "salary" && salaryEntries.length === 0) {
      setSalaryLoading(true);
      fetch(`/api/employees/${id}/salary`)
        .then((r) => r.json())
        .then((data) => { setSalaryEntries(Array.isArray(data) ? data : []); setSalaryLoading(false); });
    }
  }, [tab, id, salaryEntries.length]);

  async function setStatus(status: string) {
    await fetch(`/api/employees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setEmployee((e) => e ? { ...e, status } : e);
    setConfirming(false);
  }

  async function deleteEmployee() {
    await fetch(`/api/employees/${id}`, { method: "DELETE" });
    router.push("/employees");
  }

  async function addSalaryEntry() {
    if (!newDate || !newAmount) return;
    setAddingSalary(true);
    const res = await fetch(`/api/employees/${id}/salary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ effective_date: newDate, amount: Number(newAmount), currency: newCurrency }),
    });
    const entry = await res.json();
    setSalaryEntries((prev) =>
      [entry, ...prev].sort((a, b) => b.effective_date.localeCompare(a.effective_date))
    );
    setNewDate("");
    setNewAmount("");
    setNewCurrency("AED");
    setAddingSalary(false);
  }

  async function deleteSalaryEntry(sid: string) {
    await fetch(`/api/employees/${id}/salary/${sid}`, { method: "DELETE" });
    setSalaryEntries((prev) => prev.filter((e) => e.id !== sid));
  }

  if (loading) return <main className="min-h-screen p-6"><p className="text-gray-400 text-sm">Loading…</p></main>;
  if (!employee) return <main className="min-h-screen p-6"><p className="text-red-500 text-sm">Employee not found.</p></main>;

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-lg mx-auto">
        <Link href="/employees" className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          ← Back to employees
        </Link>

        {/* Profile header */}
        <div className="mt-4 mb-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full ${avatarColor(employee.full_name)} flex items-center justify-center text-white font-bold text-base shrink-0`}>
              {initials(employee.full_name)}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold">{employee.full_name}</h1>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                {employee.dob && <p className="text-xs text-gray-500 dark:text-gray-400">DOB: {fmtDate(employee.dob)}</p>}
                {employee.join_date && <p className="text-xs text-orange-500 font-medium">Date Joined: {fmtDate(employee.join_date)}</p>}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {employee.handle && (
                  <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full px-2.5 py-0.5">
                    @{employee.handle}
                  </span>
                )}
                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full px-2.5 py-0.5">
                  {employee.location === "oman" ? "🇴🇲 Oman" : "🇦🇪 UAE"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-3 border-b border-gray-200 dark:border-gray-800">
          {(["general", "salary"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {t === "general" ? "General" : "Salary History"}
            </button>
          ))}
        </div>

        {/* General tab */}
        {tab === "general" && (
          <div className="space-y-2">
            <DocSection
              icon="📋" title="Passport"
              rows={[{ label: "Number", value: employee.passport_number }]}
              expiry={employee.passport_expiry}
              docUrl={employee.passport_doc_url}
            />
            <DocSection
              icon="🪪" title="Emirates ID"
              rows={[{ label: "Number", value: employee.emirates_id_number }]}
              expiry={employee.emirates_id_expiry}
              docUrl={employee.emirates_id_doc_url}
            />
            <DocSection
              icon="✈️" title="Visa"
              rows={[{ label: "File No.", value: employee.visa_file_no }]}
              expiry={employee.visa_expiry}
              docUrl={employee.visa_doc_url}
            />
            <DocSection
              icon="🏥" title="Health Insurance"
              rows={[
                { label: "Policy No.", value: employee.health_policy_no },
                { label: "Member No.", value: employee.health_member_no },
              ]}
              expiry={null}
              docUrl={employee.health_doc_url}
            />
          </div>
        )}

        {/* Salary History tab */}
        {tab === "salary" && (
          <div className="space-y-3">
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Add Entry</p>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Effective Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Amount</label>
                  <input
                    type="number"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="0"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Currency</label>
                  <select
                    value={newCurrency}
                    onChange={(e) => setNewCurrency(e.target.value as "AED" | "OMR")}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="AED">AED</option>
                    <option value="OMR">OMR</option>
                  </select>
                </div>
                <button
                  onClick={addSalaryEntry}
                  disabled={addingSalary || !newDate || !newAmount}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            {salaryLoading ? (
              <p className="text-xs text-gray-400 text-center py-4">Loading…</p>
            ) : salaryEntries.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No salary history yet.</p>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      <th className="text-left text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-3 py-2">Date</th>
                      <th className="text-right text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-3 py-2">Amount</th>
                      <th className="w-6 px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaryEntries.map((entry) => (
                      <tr key={entry.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                        <td className="px-3 py-2 text-sm">{fmtDate(entry.effective_date)}</td>
                        <td className="px-3 py-2 text-sm text-right font-medium tabular-nums">
                          {Number(entry.amount).toLocaleString()} <span className="text-gray-400">{entry.currency}</span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => deleteSalaryEntry(entry.id)}
                            className="text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors text-xs leading-none"
                            title="Delete"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <Link
            href={`/employees/${id}/edit`}
            className="flex-1 py-2 text-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
          >
            Edit
          </Link>
          {employee.status === "active" ? (
            <button
              onClick={() => setStatus("on_leave")}
              className="flex-1 py-2 rounded-lg border border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-sm font-medium transition-colors"
            >
              Mark On Leave
            </button>
          ) : (
            <button
              onClick={() => setStatus("active")}
              className="flex-1 py-2 rounded-lg border border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 text-sm font-medium transition-colors"
            >
              Mark Active
            </button>
          )}
          {confirming ? (
            <div className="flex gap-2 flex-1">
              <button onClick={deleteEmployee} className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors">Confirm</button>
              <button onClick={() => setConfirming(false)} className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-medium transition-colors">Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="flex-1 py-2 rounded-lg border border-red-300 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
