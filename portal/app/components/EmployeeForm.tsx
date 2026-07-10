"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FormData = {
  full_name: string;
  dob: string;
  join_date: string;
  handle: string;
  passport_number: string;
  passport_expiry: string;
  passport_doc_url: string;
  emirates_id_number: string;
  emirates_id_expiry: string;
  emirates_id_doc_url: string;
  visa_file_no: string;
  visa_expiry: string;
  visa_doc_url: string;
  health_policy_no: string;
  health_member_no: string;
  health_doc_url: string;
};

const EMPTY: FormData = {
  full_name: "", dob: "", join_date: "", handle: "",
  passport_number: "", passport_expiry: "", passport_doc_url: "",
  emirates_id_number: "", emirates_id_expiry: "", emirates_id_doc_url: "",
  visa_file_no: "", visa_expiry: "", visa_doc_url: "",
  health_policy_no: "", health_member_no: "", health_doc_url: "",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500";

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="pt-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
        {icon} {title}
      </p>
    </div>
  );
}

export default function EmployeeForm({
  initial,
  employeeId,
}: {
  initial?: Partial<FormData>;
  employeeId?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);

  function set(key: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function input(key: keyof FormData, type = "text", placeholder = "") {
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

  async function save() {
    if (!form.full_name.trim()) return;
    setSaving(true);

    const body = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v.trim() || null])
    );

    if (employeeId) {
      await fetch(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      router.push(`/employees/${employeeId}`);
    } else {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      router.push(`/employees/${data.id}`);
    }
    setSaving(false);
  }

  const backHref = employeeId ? `/employees/${employeeId}` : "/employees";

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-lg mx-auto">
        <a href={backHref} className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          ← {employeeId ? "Back to profile" : "Back to employees"}
        </a>

        <h1 className="text-2xl font-bold mt-6 mb-8">{employeeId ? "Edit Employee" : "Add Employee"}</h1>

        <div className="space-y-4">
          {/* Personal */}
          <SectionHeader icon="👤" title="Personal" />
          <Field label="Full Name *">{input("full_name", "text", "Paul Vincent Winick")}</Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of Birth">{input("dob", "date")}</Field>
            <Field label="Join Date">{input("join_date", "date")}</Field>
          </div>
          <Field label="Handle (without @)">{input("handle", "text", "paul")}</Field>

          {/* Passport */}
          <SectionHeader icon="📋" title="Passport" />
          <Field label="Passport Number">{input("passport_number", "text", "128089891")}</Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Expiry">{input("passport_expiry", "date")}</Field>
            <Field label="OneDrive Link">{input("passport_doc_url", "url", "https://...")}</Field>
          </div>

          {/* Emirates ID */}
          <SectionHeader icon="🪪" title="Emirates ID" />
          <Field label="ID Number">{input("emirates_id_number", "text", "784197695262838")}</Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Expiry">{input("emirates_id_expiry", "date")}</Field>
            <Field label="OneDrive Link">{input("emirates_id_doc_url", "url", "https://...")}</Field>
          </div>

          {/* Visa */}
          <SectionHeader icon="✈️" title="Visa" />
          <Field label="File No.">{input("visa_file_no", "text", "50118097617322")}</Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Expiry">{input("visa_expiry", "date")}</Field>
            <Field label="OneDrive Link">{input("visa_doc_url", "url", "https://...")}</Field>
          </div>

          {/* Health Insurance */}
          <SectionHeader icon="🏥" title="Health Insurance" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Policy No.">{input("health_policy_no", "text", "12/XP 36189/0")}</Field>
            <Field label="Member No.">{input("health_member_no", "text", "15/E/0")}</Field>
          </div>
          <Field label="OneDrive Link">{input("health_doc_url", "url", "https://...")}</Field>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={save}
            disabled={saving || !form.full_name.trim()}
            className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {saving ? "Saving…" : employeeId ? "Save Changes" : "Add Employee"}
          </button>
          <a href={backHref} className="flex-1 py-2 text-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium transition-colors">
            Cancel
          </a>
        </div>
      </div>
    </main>
  );
}
