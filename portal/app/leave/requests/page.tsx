"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────────────

type Me = { id: string; full_name: string; role: string };

type Employee = { id: string; full_name: string; location: string; profile_id: string | null; status: string };

type Holiday = { id: string; country: string; date: string; name: string; confirmed: boolean };

type LeaveRequest = {
  id: string;
  employee_id: string;
  leave_type: string;
  date_out: string;
  date_in: string;
  days: number;
  submission_date: string;
  status: string;
  detail: string | null;
  coverage: string | null;
  approved_by: string | null;
  approval_date: string | null;
  rejected_by: string | null;
  rejection_date: string | null;
  rejection_notes: string | null;
  employees: { full_name: string; location: string } | null;
};

const LEAVE_TYPES = ["Annual", "Sick", "WFH", "Unpaid"] as const;
const STATUS_FILTERS = ["Pending", "Approved", "Rejected", "All"] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

function leaveDays(startStr: string, endStr: string, location: string, holidays: Holiday[]): string[] {
  const confirmed = new Set(
    holidays.filter((h) => h.confirmed && h.country === location).map((h) => h.date.slice(0, 10))
  );
  const dates: string[] = [];
  const cur = parseLocalDate(startStr);
  const end = parseLocalDate(endStr);
  while (cur <= end) {
    const ds = localDateStr(cur);
    if (!confirmed.has(ds)) dates.push(ds);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function statusBadge(status: string) {
  const cls =
    status === "Approved" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" :
    status === "Rejected" ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" :
    "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300";
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{status}</span>;
}

const inputCls = "w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500";
const btnPrimary = "px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors";
const btnSecondary = "px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium rounded-lg transition-colors";

const EMP_COLOURS = [
  "#60a5fa","#34d399","#a78bfa","#fbbf24","#fb7185",
  "#22d3ee","#fb923c","#f472b6","#2dd4bf","#818cf8",
  "#4ade80","#f97316",
];

// ── Year Calendar ─────────────────────────────────────────────────────────────

function YearCalendar({ year, requests, employees }: {
  year: number;
  requests: LeaveRequest[];
  employees: Employee[];
}) {
  const empColour = new Map<string, string>(
    employees.map((emp, i) => [emp.id, EMP_COLOURS[i % EMP_COLOURS.length]])
  );

  const approved = requests.filter((r) => r.status === "Approved");

  // Build date → [employeeId, ...] for every day in the year
  const dayMap = new Map<string, string[]>();
  for (const req of approved) {
    const cur = parseLocalDate(req.date_out);
    const end = parseLocalDate(req.date_in);
    while (cur <= end) {
      const ds = localDateStr(cur);
      if (ds >= `${year}-01-01` && ds <= `${year}-12-31`) {
        const list = dayMap.get(ds);
        if (list) {
          if (!list.includes(req.employee_id)) list.push(req.employee_id);
        } else {
          dayMap.set(ds, [req.employee_id]);
        }
      }
      cur.setDate(cur.getDate() + 1);
    }
  }

  const today = localDateStr(new Date());
  const DOW_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

  const legendEmps = employees.filter((emp) =>
    approved.some(
      (r) =>
        r.employee_id === emp.id &&
        Number(r.date_out.slice(0, 4)) <= year &&
        Number(r.date_in.slice(0, 4)) >= year
    )
  );

  return (
    <div>
      <div className="grid grid-cols-4 gap-x-5 gap-y-5">
        {Array.from({ length: 12 }, (_, month) => {
          const firstDay = new Date(year, month, 1);
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          // Mon-first offset: Sun=0 → offset 6, Mon=1 → offset 0, …
          const startOffset = (firstDay.getDay() + 6) % 7;
          const monthName = firstDay.toLocaleDateString("en-GB", { month: "long" });

          return (
            <div key={month}>
              <div className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">{monthName}</div>
              <div className="grid grid-cols-7">
                {DOW_LABELS.map((d, i) => (
                  <div
                    key={i}
                    className={`text-[9px] text-center font-medium pb-0.5 ${
                      i >= 5 ? "text-gray-300 dark:text-gray-600" : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {d}
                  </div>
                ))}

                {/* blank cells before first day */}
                {Array.from({ length: startOffset }, (_, i) => (
                  <div key={`b${i}`} />
                ))}

                {Array.from({ length: daysInMonth }, (_, d) => {
                  const day = d + 1;
                  const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const empIds = dayMap.get(ds) ?? [];
                  const isToday = ds === today;
                  const dow = (new Date(year, month, day).getDay() + 6) % 7;
                  const isWeekend = dow >= 5;

                  const names = empIds.map(
                    (id) => employees.find((e) => e.id === id)?.full_name ?? id
                  );
                  const tooltip = names.length > 0 ? names.join(", ") : undefined;

                  return (
                    <div key={day} className="flex flex-col items-center py-px" title={tooltip}>
                      {empIds.length === 1 ? (
                        /* single employee — solid colour circle */
                        <span
                          className="text-[9px] w-[18px] h-[18px] flex items-center justify-center rounded-full font-semibold leading-none"
                          style={{ backgroundColor: empColour.get(empIds[0]), color: "#fff" }}
                        >
                          {day}
                        </span>
                      ) : empIds.length > 1 ? (
                        /* multiple employees — day number + coloured dots */
                        <>
                          <span
                            className={`text-[9px] w-[18px] h-[18px] flex items-center justify-center rounded-full leading-none ${
                              isToday
                                ? "bg-blue-600 text-white font-bold"
                                : isWeekend
                                ? "text-gray-300 dark:text-gray-600"
                                : "text-gray-700 dark:text-gray-300 font-medium"
                            }`}
                          >
                            {day}
                          </span>
                          <div className="flex gap-px mt-px">
                            {empIds.slice(0, 3).map((id) => (
                              <div
                                key={id}
                                className="w-[4px] h-[4px] rounded-full"
                                style={{ backgroundColor: empColour.get(id) }}
                              />
                            ))}
                          </div>
                        </>
                      ) : (
                        /* no leave */
                        <span
                          className={`text-[9px] w-[18px] h-[18px] flex items-center justify-center rounded-full leading-none ${
                            isToday
                              ? "bg-blue-600 text-white font-bold"
                              : isWeekend
                              ? "text-gray-300 dark:text-gray-600"
                              : "text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {day}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {legendEmps.length === 0 ? (
        <p className="text-xs text-gray-400 text-center pt-4">No approved leave recorded for {year}.</p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
          {legendEmps.map((emp) => (
            <div key={emp.id} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: empColour.get(emp.id) }}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">{emp.full_name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ── Main component ────────────────────────────────────────────────────────────

export default function LeaveRequestsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState<"Pending" | "Approved" | "Rejected" | "All">("Pending");
  const [showForm, setShowForm] = useState(false);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [showCal, setShowCal] = useState(true);

  // Submit form
  const [form, setForm] = useState({
    employee_id: "",
    leave_type: "Annual",
    date_out: "",
    date_in: "",
    detail: "",
    coverage: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Reject form
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Edit form (admin only, for approved/rejected requests)
  const [editReq, setEditReq] = useState<LeaveRequest | null>(null);
  const [editForm, setEditForm] = useState({ employee_id: "", leave_type: "Annual", date_out: "", date_in: "", detail: "", coverage: "" });
  const [saving, setSaving] = useState(false);

  const isAdmin = me?.role === "admin" || me?.role === "superuser";

  const load = useCallback(async () => {
    const [meData, empsData, holsData] = await Promise.all([
      fetch("/api/me").then((r) => r.json()),
      fetch("/api/employees").then((r) => r.json()),
      fetch("/api/leave/holidays").then((r) => r.json()),
    ]);
    const meUser: Me = meData;
    setMe(meUser);
    const emps: Employee[] = Array.isArray(empsData) ? empsData.filter((e: Employee) => e.status !== "inactive") : [];
    setEmployees(emps);
    setHolidays(Array.isArray(holsData) ? holsData : []);

    // For non-admins, only fetch their own requests
    const isAdminUser = meUser.role === "admin" || meUser.role === "superuser";
    let reqUrl = "/api/leave/requests";
    if (!isAdminUser) {
      const myEmp = emps.find((e) => e.profile_id === meUser.id);
      if (myEmp) reqUrl = `/api/leave/requests?employee_id=${myEmp.id}`;
    }
    const reqs = await fetch(reqUrl).then((r) => r.json());
    setRequests(Array.isArray(reqs) ? reqs : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-set employee for non-admins when form opens
  useEffect(() => {
    if (showForm && me && !isAdmin) {
      const myEmp = employees.find((e) => e.profile_id === me.id);
      if (myEmp) setForm((f) => ({ ...f, employee_id: myEmp.id }));
    }
  }, [showForm, me, employees, isAdmin]);

  // Day preview
  function daysPreview(): string | null {
    if (!form.date_out || !form.date_in || !form.employee_id) return null;
    if (form.date_in < form.date_out) return "Return date must be after date out";
    const emp = employees.find((e) => e.id === form.employee_id);
    if (!emp) return null;
    const wdays = leaveDays(form.date_out, form.date_in, emp.location, holidays);
    return `${wdays.length} day${wdays.length !== 1 ? "s" : ""}`;
  }

  async function submitRequest() {
    if (!form.employee_id || !form.date_out || !form.date_in) return;
    const emp = employees.find((e) => e.id === form.employee_id);
    if (!emp) return;
    setSubmitting(true);
    const wdays = leaveDays(form.date_out, form.date_in, emp.location, holidays);
    await fetch("/api/leave/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee_id: form.employee_id,
        leave_type: form.leave_type,
        date_out: form.date_out,
        date_in: form.date_in,
        days: wdays.length,
        submission_date: new Date().toISOString().slice(0, 10),
        detail: form.detail || null,
        coverage: form.coverage || null,
      }),
    });
    setShowForm(false);
    setForm({ employee_id: "", leave_type: "Annual", date_out: "", date_in: "", detail: "", coverage: "" });
    setSubmitting(false);
    await load();
  }

  async function approveRequest(req: LeaveRequest) {
    if (approvingId) return;
    setApprovingId(req.id);
    // Create leave record
    await fetch("/api/leave/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee_id: req.employee_id,
        type: req.leave_type,
        start_date: req.date_out,
        end_date: req.date_in,
        days: req.days,
        notes: req.detail ?? null,
      }),
    });
    // Update request status
    await fetch(`/api/leave/requests/${req.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "Approved",
        approved_by: me?.full_name ?? "",
        approval_date: new Date().toISOString().slice(0, 10),
      }),
    });
    setApprovingId(null);
    await load();
  }

  async function rejectRequest() {
    if (!rejectId) return;
    setRejecting(true);
    await fetch(`/api/leave/requests/${rejectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "Rejected",
        rejected_by: me?.full_name ?? "",
        rejection_date: new Date().toISOString().slice(0, 10),
        rejection_notes: rejectNotes || null,
      }),
    });
    setRejectId(null);
    setRejectNotes("");
    setRejecting(false);
    await load();
  }

  async function deleteRequest(id: string) {
    await fetch(`/api/leave/requests/${id}`, { method: "DELETE" });
    await load();
  }

  function openEdit(req: LeaveRequest) {
    setEditReq(req);
    setEditForm({
      employee_id: req.employee_id,
      leave_type: req.leave_type,
      date_out: req.date_out,
      date_in: req.date_in,
      detail: req.detail ?? "",
      coverage: req.coverage ?? "",
    });
  }

  async function saveEdit() {
    if (!editReq || !editForm.employee_id || !editForm.date_out || !editForm.date_in) return;
    const emp = employees.find((e) => e.id === editForm.employee_id);
    if (!emp) return;
    setSaving(true);

    const wdays = leaveDays(editForm.date_out, editForm.date_in, emp.location, holidays);

    await fetch(`/api/leave/requests/${editReq.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee_id: editForm.employee_id,
        leave_type: editForm.leave_type,
        date_out: editForm.date_out,
        date_in: editForm.date_in,
        days: wdays.length,
        detail: editForm.detail || null,
        coverage: editForm.coverage || null,
      }),
    });

    // For approved requests, replace the leave record with updated values
    if (editReq.status === "Approved") {
      const params = new URLSearchParams({
        employee_id: editReq.employee_id,
        start_date: editReq.date_out,
        end_date: editReq.date_in,
      });
      await fetch(`/api/leave/records?${params}`, { method: "DELETE" });
      await fetch("/api/leave/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: editForm.employee_id,
          type: editForm.leave_type,
          start_date: editForm.date_out,
          end_date: editForm.date_in,
          days: wdays.length,
          notes: editForm.detail || null,
        }),
      });
    }

    setEditReq(null);
    setSaving(false);
    await load();
  }

  function editDaysPreview(): string | null {
    if (!editForm.date_out || !editForm.date_in || !editForm.employee_id) return null;
    if (editForm.date_in < editForm.date_out) return "Return date must be after date out";
    const emp = employees.find((e) => e.id === editForm.employee_id);
    if (!emp) return null;
    const wdays = leaveDays(editForm.date_out, editForm.date_in, emp.location, holidays);
    return `${wdays.length} day${wdays.length !== 1 ? "s" : ""}`;
  }

  const myEmp = me ? employees.find((e) => e.profile_id === me.id) : null;
  const pendingCount = requests.filter((r) => r.status === "Pending").length;

  const filtered = requests.filter((r) => filter === "All" || r.status === filter);

  if (loading) return <main className="min-h-screen p-8"><p className="text-gray-400 text-sm">Loading…</p></main>;

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link href="/leave" className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">← Employee Leave</Link>
            )}
            <h1 className="text-2xl font-bold">Leave Requests</h1>
            {pendingCount > 0 && (
              <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-semibold px-2 py-0.5 rounded-full">{pendingCount} pending</span>
            )}
          </div>
          <button onClick={() => setShowForm(true)} className={btnPrimary}>+ New Request</button>
        </div>

        {/* No account link warning for non-admins */}
        {!isAdmin && !myEmp && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-300">
            Your portal account is not linked to an employee record. Ask an admin to link your account in the employee settings so you can submit leave requests.
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 mb-6">
          {STATUS_FILTERS.map((s) => {
            const count = s === "All" ? requests.length : requests.filter((r) => r.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  filter === s
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {s} {count > 0 && <span className="ml-1 text-xs opacity-60">({count})</span>}
              </button>
            );
          })}
        </div>

        {/* Requests list */}
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No {filter.toLowerCase()} requests.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((req) => {
              const approvedOverlap = isAdmin && req.status === "Pending"
                ? requests.filter(
                    (r) =>
                      r.id !== req.id &&
                      r.employee_id !== req.employee_id &&
                      r.status === "Approved" &&
                      r.date_out <= req.date_in &&
                      r.date_in >= req.date_out
                  )
                : [];
              const pendingOverlap = isAdmin && req.status === "Pending"
                ? requests.filter(
                    (r) =>
                      r.id !== req.id &&
                      r.employee_id !== req.employee_id &&
                      r.status === "Pending" &&
                      r.date_out <= req.date_in &&
                      r.date_in >= req.date_out
                  )
                : [];

              return (
              <div key={req.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold">{req.employees?.full_name ?? "Unknown"}</span>
                      <span className="text-xs text-gray-400">{req.employees?.location === "oman" ? "🇴🇲" : "🇦🇪"}</span>
                      <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">{req.leave_type}</span>
                      {statusBadge(req.status)}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {fmtDate(req.date_out)} – {fmtDate(req.date_in)} · <strong>{req.days} day{req.days !== 1 ? "s" : ""}</strong>
                    </p>
                    {req.detail && <p className="text-xs text-gray-500 mt-1">{req.detail}</p>}
                    {req.coverage && <p className="text-xs text-gray-500">Coverage: {req.coverage}</p>}
                    <p className="text-xs text-gray-400 mt-1">Submitted {fmtDate(req.submission_date)}</p>
                    {req.status === "Approved" && req.approved_by && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">Approved by {req.approved_by} on {fmtDate(req.approval_date)}</p>
                    )}
                    {req.status === "Rejected" && req.rejected_by && (
                      <div className="mt-1">
                        <p className="text-xs text-red-500">Rejected by {req.rejected_by} on {fmtDate(req.rejection_date)}</p>
                        {req.rejection_notes && <p className="text-xs text-gray-500">Reason: {req.rejection_notes}</p>}
                      </div>
                    )}
                    {approvedOverlap.length > 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-start gap-1">
                        <span className="shrink-0">⚠</span>
                        <span>Already approved off: {approvedOverlap.map((r) => `${r.employees?.full_name} (${r.leave_type})`).join(", ")}</span>
                      </p>
                    )}
                    {pendingOverlap.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1 flex items-start gap-1">
                        <span className="shrink-0">⏳</span>
                        <span>Also pending same period: {pendingOverlap.map((r) => r.employees?.full_name).join(", ")}</span>
                      </p>
                    )}
                  </div>
                  {isAdmin && req.status === "Pending" && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => approveRequest(req)}
                        disabled={approvingId === req.id}
                        className="px-3 py-1.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {approvingId === req.id ? "Approving…" : "Approve"}
                      </button>
                      <button
                        onClick={() => { setRejectId(req.id); setRejectNotes(""); }}
                        className="px-3 py-1.5 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 font-medium"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  {isAdmin && req.status !== "Pending" && (
                    <div className="flex gap-3 flex-shrink-0">
                      <button onClick={() => openEdit(req)} className="text-xs text-gray-400 hover:text-blue-500">Edit</button>
                      <button onClick={() => deleteRequest(req.id)} className="text-xs text-gray-400 hover:text-red-500">Delete</button>
                    </div>
                  )}
                </div>

                {/* Inline reject form */}
                {rejectId === req.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Reason for rejection (optional)</label>
                    <input type="text" className={inputCls} value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)} placeholder="e.g. Insufficient notice" />
                    <div className="flex gap-2 mt-3">
                      <button onClick={rejectRequest} disabled={rejecting} className="px-4 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
                        {rejecting ? "Rejecting…" : "Confirm Reject"}
                      </button>
                      <button onClick={() => setRejectId(null)} className={btnSecondary}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}

        {/* ── Year Calendar (admin only, Pending tab only) ── */}
        {isAdmin && filter === "Pending" && (
          <div className="mt-6 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setCalYear((y) => y - 1)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-sm">◁</button>
              <span className="font-semibold text-sm flex-1">{calYear} Leave Calendar</span>
              <button onClick={() => setCalYear((y) => y + 1)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-sm">▷</button>
              <button
                onClick={() => setShowCal((v) => !v)}
                className="ml-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showCal ? "Hide" : "Show"}
              </button>
            </div>
            {showCal && <YearCalendar year={calYear} requests={requests} employees={employees} />}
          </div>
        )}

        {/* ── Edit Modal (admin, approved/rejected requests) ── */}
        {editReq && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-semibold mb-1">Edit Leave Request</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
                Status will remain <span className="font-medium">{editReq.status}</span>
                {editReq.status === "Approved" && " — leave record will be updated automatically"}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Employee</label>
                  <select className={inputCls} value={editForm.employee_id} onChange={(e) => setEditForm((f) => ({ ...f, employee_id: e.target.value }))}>
                    <option value="">Select employee…</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>{e.full_name} {e.location === "oman" ? "🇴🇲" : "🇦🇪"}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Leave Type</label>
                  <select className={inputCls} value={editForm.leave_type} onChange={(e) => setEditForm((f) => ({ ...f, leave_type: e.target.value }))}>
                    {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">First Day of Leave</label>
                    <input type="date" className={inputCls} value={editForm.date_out} onChange={(e) => setEditForm((f) => ({ ...f, date_out: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Last Day of Leave</label>
                    <input type="date" className={inputCls} value={editForm.date_in} onChange={(e) => setEditForm((f) => ({ ...f, date_in: e.target.value }))} />
                  </div>
                </div>
                {editDaysPreview() && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">{editDaysPreview()}</p>
                )}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Reason / Detail (optional)</label>
                  <input type="text" className={inputCls} value={editForm.detail} onChange={(e) => setEditForm((f) => ({ ...f, detail: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Coverage (optional)</label>
                  <input type="text" className={inputCls} value={editForm.coverage} onChange={(e) => setEditForm((f) => ({ ...f, coverage: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={saveEdit}
                  disabled={saving || !editForm.employee_id || !editForm.date_out || !editForm.date_in}
                  className={btnPrimary}
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button onClick={() => setEditReq(null)} className={btnSecondary}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Submit Form Modal ── */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-semibold mb-5">New Leave Request</h2>
              <div className="space-y-4">
                {isAdmin && (
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Employee</label>
                    <select className={inputCls} value={form.employee_id} onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}>
                      <option value="">Select employee…</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>{e.full_name} {e.location === "oman" ? "🇴🇲" : "🇦🇪"}</option>
                      ))}
                    </select>
                  </div>
                )}
                {!isAdmin && !myEmp && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                    Your account is not linked to an employee record. Contact an admin.
                  </div>
                )}
                {!isAdmin && myEmp && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">Submitting for: <strong>{myEmp.full_name}</strong></p>
                )}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Leave Type</label>
                  <select className={inputCls} value={form.leave_type} onChange={(e) => setForm((f) => ({ ...f, leave_type: e.target.value }))}>
                    {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">First Day of Leave</label>
                    <input type="date" className={inputCls} value={form.date_out} onChange={(e) => setForm((f) => ({ ...f, date_out: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Last Day of Leave</label>
                    <input type="date" className={inputCls} value={form.date_in} onChange={(e) => setForm((f) => ({ ...f, date_in: e.target.value }))} />
                  </div>
                </div>
                {daysPreview() && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">{daysPreview()}</p>
                )}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Reason / Detail (optional)</label>
                  <input type="text" className={inputCls} value={form.detail} onChange={(e) => setForm((f) => ({ ...f, detail: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Coverage (optional — who covers?)</label>
                  <input type="text" className={inputCls} value={form.coverage} onChange={(e) => setForm((f) => ({ ...f, coverage: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={submitRequest}
                  disabled={submitting || !form.employee_id || !form.date_out || !form.date_in}
                  className={btnPrimary}
                >
                  {submitting ? "Submitting…" : "Submit Request"}
                </button>
                <button onClick={() => setShowForm(false)} className={btnSecondary}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
