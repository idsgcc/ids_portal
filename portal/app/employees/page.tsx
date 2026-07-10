"use client";

import { useState, useEffect } from "react";

type Employee = {
  id: string;
  full_name: string;
  handle: string | null;
  join_date: string | null;
  status: string;
  passport_expiry: string | null;
  emirates_id_expiry: string | null;
  visa_expiry: string | null;
};

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function expiryStatus(date: string | null): "ok" | "soon" | "urgent" | null {
  if (!date) return null;
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
  if (days <= 30) return "urgent";
  if (days <= 90) return "soon";
  return "ok";
}

const EXPIRY_DOT: Record<string, string> = {
  ok:     "bg-green-400",
  soon:   "bg-yellow-400",
  urgent: "bg-red-500",
};

const AVATAR_COLORS = [
  "bg-orange-500", "bg-blue-500", "bg-purple-500",
  "bg-teal-500", "bg-pink-500", "bg-indigo-500",
];

function avatarColor(name: string) {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then((data) => { setEmployees(data); setLoading(false); });
  }, []);

  const active = employees.filter((e) => e.status === "active");
  const inactive = employees.filter((e) => e.status !== "active");

  function renderGrid(list: Employee[]) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((e) => {
          const statuses = [
            expiryStatus(e.passport_expiry),
            expiryStatus(e.emirates_id_expiry),
            expiryStatus(e.visa_expiry),
          ].filter(Boolean) as string[];
          const worstStatus = statuses.includes("urgent") ? "urgent"
            : statuses.includes("soon") ? "soon"
            : statuses.length ? "ok" : null;

          return (
            <a
              key={e.id}
              href={`/employees/${e.id}`}
              className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:border-gray-400 dark:hover:border-gray-600 transition-colors flex items-center gap-4"
            >
              <div className={`w-12 h-12 rounded-full ${avatarColor(e.full_name)} flex items-center justify-center text-white font-semibold text-sm shrink-0`}>
                {initials(e.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{e.full_name}</p>
                {e.handle && <p className="text-xs text-gray-400 mt-0.5">@{e.handle}</p>}
                {e.join_date && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Joined {new Date(e.join_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                )}
              </div>
              {worstStatus && (
                <div className="shrink-0 flex flex-col items-center gap-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${EXPIRY_DOT[worstStatus]}`} />
                  <span className="text-xs text-gray-400">docs</span>
                </div>
              )}
            </a>
          );
        })}
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <a href="/" className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          ← Back to portal
        </a>

        <div className="flex items-center justify-between mt-6 mb-8">
          <div>
            <h1 className="text-2xl font-bold">Employees</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage employee records and documents</p>
          </div>
          <a href="/employees/new" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">
            Add Employee
          </a>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : employees.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">No employees yet</p>
            <p className="text-sm mt-1">Click Add Employee to get started</p>
          </div>
        ) : (
          <div className="space-y-8">
            {active.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">Active ({active.length})</h2>
                {renderGrid(active)}
              </section>
            )}
            {inactive.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">Inactive ({inactive.length})</h2>
                {renderGrid(inactive)}
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
