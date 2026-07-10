"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";

type Employee = {
  id: string;
  full_name: string;
  dob: string | null;
  join_date: string | null;
  handle: string | null;
  status: string;
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
  if (days < 0) return "text-red-600 dark:text-red-400 font-semibold";
  if (days <= 30) return "text-red-600 dark:text-red-400 font-semibold";
  if (days <= 90) return "text-yellow-600 dark:text-yellow-400 font-semibold";
  return "text-green-600 dark:text-green-400";
}

function DocRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium">{value}</span>
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
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
        {icon} {title}
      </p>
      {rows.map((r) => <DocRow key={r.label} {...r} />)}
      {expiry && (
        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
          <span className="text-sm text-gray-500 dark:text-gray-400">{expiryLabel}</span>
          <div className="flex items-center gap-3">
            <span className={`text-sm ${expiryClass(expiry)}`}>{fmtDate(expiry)}</span>
            {docUrl && (
              <a href={docUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1">
                🔗 View
              </a>
            )}
          </div>
        </div>
      )}
      {!expiry && docUrl && (
        <div className="pt-2">
          <a href={docUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1">
            🔗 View document
          </a>
        </div>
      )}
    </div>
  );
}

export default function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetch(`/api/employees/${id}`)
      .then((r) => r.json())
      .then((data) => { setEmployee(data); setLoading(false); });
  }, [id]);

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

  if (loading) return <main className="min-h-screen p-8"><p className="text-gray-400 text-sm">Loading…</p></main>;
  if (!employee) return <main className="min-h-screen p-8"><p className="text-red-500 text-sm">Employee not found.</p></main>;

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-lg mx-auto">
        <a href="/employees" className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          ← Back to employees
        </a>

        {/* Profile header */}
        <div className="mt-6 mb-6 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full ${avatarColor(employee.full_name)} flex items-center justify-center text-white font-bold text-lg shrink-0`}>
              {initials(employee.full_name)}
            </div>
            <div>
              <h1 className="text-xl font-bold">{employee.full_name}</h1>
              {employee.dob && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">DOB: {fmtDate(employee.dob)}</p>}
              {employee.join_date && (
                <p className="text-sm text-orange-500 font-medium mt-0.5">Joined: {fmtDate(employee.join_date)}</p>
              )}
              {employee.handle && (
                <span className="inline-block mt-2 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full px-3 py-0.5">
                  @{employee.handle}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Document sections */}
        <div className="space-y-3">
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

        {/* Actions */}
        <div className="flex gap-3 mt-8">
          <a
            href={`/employees/${id}/edit`}
            className="flex-1 py-2 text-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
          >
            Edit
          </a>
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
