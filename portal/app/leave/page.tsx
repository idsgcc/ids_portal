"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────────────

type Employee = {
  id: string;
  full_name: string;
  status: string;
  location: string;
  sick_leave_days: number;
};

type LeaveRecord = {
  id: string;
  employee_id: string;
  type: string;
  start_date: string;
  end_date: string;
  days: number;
  notes: string | null;
};

type Entitlement = {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  days: number;
  notes: string | null;
};

type Ticket = {
  id: string;
  employee_id: string;
  period_label: string;
  status: string;
};

type Holiday = {
  id: string;
  country: string;
  date: string;
  name: string;
  confirmed: boolean;
};

const LEAVE_TYPES = ["Annual", "Sick", "WFH", "Unpaid"] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtShortDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function fmtPeriod(from: string, to: string): string {
  return `${fmtDate(from)} – ${fmtDate(to)}`;
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

function workingDays(startStr: string, endStr: string, location: string, holidays: Holiday[]): string[] {
  const confirmed = new Set(
    holidays.filter((h) => h.confirmed && h.country === location).map((h) => h.date.slice(0, 10))
  );
  const dates: string[] = [];
  const cur = parseLocalDate(startStr);
  const end = parseLocalDate(endStr);
  while (cur <= end) {
    const dow = cur.getDay();
    const ds = localDateStr(cur);
    const isWeekend = location === "oman" ? dow === 5 || dow === 6 : dow === 0 || dow === 6;
    if (!isWeekend && !confirmed.has(ds)) dates.push(ds);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function getEntitlements(empId: string, entitlements: Entitlement[]): Entitlement[] {
  return entitlements
    .filter((e) => e.employee_id === empId)
    .sort((a, b) => b.period_start.localeCompare(a.period_start));
}

function getActiveEntitlement(empId: string, entitlements: Entitlement[], offset = 0): Entitlement | null {
  const ents = getEntitlements(empId, entitlements);
  if (offset === 0) {
    const today = new Date().toISOString().slice(0, 10);
    return ents.find((e) => e.period_start <= today && today <= e.period_end) ?? ents[0] ?? null;
  }
  // offset: -1 = previous, 1 = next (relative to current active, index 0 = newest)
  const idx = -offset;
  return ents[idx] ?? null;
}

function getYearEntitlement(empId: string, year: number, entitlements: Entitlement[]): Entitlement | null {
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  return getEntitlements(empId, entitlements).find((e) => e.period_start <= to && e.period_end >= from) ?? null;
}

function leaveUsed(empId: string, type: string, from: string, to: string, records: LeaveRecord[]): number {
  return records
    .filter((r) => r.employee_id === empId && r.type === type && r.end_date >= from && r.start_date <= to)
    .reduce((s, r) => s + Number(r.days), 0);
}

function calendarYearBounds(): { from: string; to: string } {
  const y = new Date().getFullYear();
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

function balanceClass(remaining: number): string {
  if (remaining < 3) return "text-red-600 dark:text-red-400 font-semibold";
  if (remaining < 7) return "text-yellow-600 dark:text-yellow-400 font-semibold";
  return "text-green-600 dark:text-green-400";
}

const inputCls = "w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500";
const btnPrimary = "px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors";
const btnSecondary = "px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium rounded-lg transition-colors";

// ── Main component ────────────────────────────────────────────────────────────

export default function EmployeeLeavePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<LeaveRecord[]>([]);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  // Holiday bar state
  const [holYear, setHolYear] = useState(new Date().getFullYear());

  // Employee modal state
  const [modalEmp, setModalEmp] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "annual" | "sick" | "wfh" | "unpaid" | "ticket">("all");
  const [periodOffset, setPeriodOffset] = useState(0);

  // Entry form state
  const [entryForm, setEntryForm] = useState({ type: "Annual", start_date: "", end_date: "", multiplier: "1", notes: "" });
  const [entryEditId, setEntryEditId] = useState<string | null>(null);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);

  // Holiday form state
  const [holForm, setHolForm] = useState({ country: "uae", date: "", name: "", confirmed: true });
  const [holEditId, setHolEditId] = useState<string | null>(null);
  const [showHolForm, setShowHolForm] = useState(false);
  const [savingHol, setSavingHol] = useState(false);

  // Entitlement form state
  const [entForm, setEntForm] = useState({ period_start: "", period_end: "", days: "22", notes: "" });
  const [entEditId, setEntEditId] = useState<string | null>(null);
  const [showEntForm, setShowEntForm] = useState(false);
  const [savingEnt, setSavingEnt] = useState(false);

  // Load all data
  const load = useCallback(async () => {
    const [emps, recs, ents, tkts, hols] = await Promise.all([
      fetch("/api/employees").then((r) => r.json()),
      fetch("/api/leave/records").then((r) => r.json()),
      fetch("/api/leave/entitlements").then((r) => r.json()),
      fetch("/api/leave/tickets").then((r) => r.json()),
      fetch("/api/leave/holidays").then((r) => r.json()),
    ]);
    setEmployees(Array.isArray(emps) ? emps.filter((e: Employee) => e.status === "active") : []);
    setRecords(Array.isArray(recs) ? recs : []);
    setEntitlements(Array.isArray(ents) ? ents : []);
    setTickets(Array.isArray(tkts) ? tkts : []);
    setHolidays(Array.isArray(hols) ? hols : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Reset modal sub-state when employee changes; default Annual tab to today's year
  useEffect(() => {
    if (!modalEmp) return;
    setActiveTab("all");
    setShowEntryForm(false);
    setShowEntForm(false);
    setEntryEditId(null);
    setEntEditId(null);

    const todayYear = new Date().getFullYear();
    const from = `${todayYear}-01-01`;
    const to = `${todayYear}-12-31`;
    const empEnts = entitlements
      .filter((e) => e.employee_id === modalEmp.id)
      .sort((a, b) => b.period_start.localeCompare(a.period_start));
    const idx = empEnts.findIndex((e) => e.period_start <= to && e.period_end >= from);
    setPeriodOffset(idx >= 0 ? -idx : 0);
  }, [modalEmp?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Entry form helpers ───────────────────────────────────────────────────

  function openAddEntry(type: string) {
    setEntryForm({ type, start_date: "", end_date: "", multiplier: "1", notes: "" });
    setEntryEditId(null);
    setShowEntryForm(true);
  }

  function openEditEntry(r: LeaveRecord) {
    setEntryForm({ type: r.type, start_date: r.start_date, end_date: r.end_date, multiplier: "1", notes: r.notes ?? "" });
    setEntryEditId(r.id);
    setShowEntryForm(true);
  }

  async function saveEntry() {
    if (!modalEmp || !entryForm.start_date || !entryForm.end_date) return;
    setSavingEntry(true);
    const wdays = workingDays(entryForm.start_date, entryForm.end_date, modalEmp.location, holidays);
    const days = wdays.length * Number(entryForm.multiplier);
    const body = {
      employee_id: modalEmp.id,
      type: entryForm.type,
      start_date: entryForm.start_date,
      end_date: entryForm.end_date,
      days,
      notes: entryForm.notes || null,
    };
    if (entryEditId) {
      await fetch(`/api/leave/records/${entryEditId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/leave/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    setShowEntryForm(false);
    setSavingEntry(false);
    await load();
  }

  async function deleteEntry(id: string) {
    await fetch(`/api/leave/records/${id}`, { method: "DELETE" });
    await load();
  }

  // ── Holiday form helpers ─────────────────────────────────────────────────

  function openAddHoliday() {
    setHolForm({ country: "uae", date: "", name: "", confirmed: true });
    setHolEditId(null);
    setShowHolForm(true);
  }

  function openEditHoliday(h: Holiday) {
    setHolForm({ country: h.country, date: h.date, name: h.name, confirmed: h.confirmed });
    setHolEditId(h.id);
    setShowHolForm(true);
  }

  async function saveHoliday() {
    if (!holForm.date || !holForm.name) return;
    setSavingHol(true);
    if (holEditId) {
      await fetch(`/api/leave/holidays/${holEditId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(holForm),
      });
    } else {
      await fetch("/api/leave/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(holForm),
      });
    }
    setShowHolForm(false);
    setSavingHol(false);
    await load();
  }

  async function deleteHoliday(id: string) {
    await fetch(`/api/leave/holidays/${id}`, { method: "DELETE" });
    await load();
  }

  // ── Entitlement form helpers ─────────────────────────────────────────────

  function openAddEntitlement() {
    setEntForm({ period_start: "", period_end: "", days: "22", notes: "" });
    setEntEditId(null);
    setShowEntForm(true);
  }

  function openEditEntitlement(e: Entitlement) {
    setEntForm({ period_start: e.period_start, period_end: e.period_end, days: String(e.days), notes: e.notes ?? "" });
    setEntEditId(e.id);
    setShowEntForm(true);
  }

  async function saveEntitlement() {
    if (!modalEmp || !entForm.period_start || !entForm.period_end) return;
    setSavingEnt(true);
    const body = {
      employee_id: modalEmp.id,
      period_start: entForm.period_start,
      period_end: entForm.period_end,
      days: Number(entForm.days),
      notes: entForm.notes || null,
    };
    if (entEditId) {
      await fetch(`/api/leave/entitlements/${entEditId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/leave/entitlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    setShowEntForm(false);
    setSavingEnt(false);
    await load();
  }

  async function deleteEntitlement(id: string) {
    await fetch(`/api/leave/entitlements/${id}`, { method: "DELETE" });
    await load();
  }

  // ── Ticket helpers ───────────────────────────────────────────────────────

  async function setTicketStatus(empId: string, periodLabel: string, status: string) {
    await fetch("/api/leave/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employee_id: empId, period_label: periodLabel, status }),
    });
    await load();
  }

  // ── Working day preview for entry form ──────────────────────────────────

  function entryPreview(): string | null {
    if (!modalEmp || !entryForm.start_date || !entryForm.end_date) return null;
    if (entryForm.end_date < entryForm.start_date) return "End date must be after start date";
    const wdays = workingDays(entryForm.start_date, entryForm.end_date, modalEmp.location, holidays);
    const total = wdays.length * Number(entryForm.multiplier);
    const weekendSkipped = Array.from({ length: (new Date(entryForm.end_date).getTime() - new Date(entryForm.start_date).getTime()) / 86400000 + 1 })
      .map((_, i) => { const d = new Date(entryForm.start_date); d.setDate(d.getDate() + i); return d.getDay(); })
      .filter((dow) => modalEmp.location === "oman" ? dow === 5 || dow === 6 : dow === 0 || dow === 6).length;
    const holCount = Array.from({ length: (new Date(entryForm.end_date).getTime() - new Date(entryForm.start_date).getTime()) / 86400000 + 1 })
      .filter((_, i) => {
        const d = new Date(entryForm.start_date);
        d.setDate(d.getDate() + i);
        const ds = d.toISOString().slice(0, 10);
        return holidays.some((h) => h.confirmed && h.country === modalEmp.location && h.date === ds);
      }).length;
    return `${total} day${total !== 1 ? "s" : ""} (${wdays.length} working day${wdays.length !== 1 ? "s" : ""}${weekendSkipped ? `, ${weekendSkipped} weekend day${weekendSkipped !== 1 ? "s" : ""} skipped` : ""}${holCount ? `, ${holCount} holiday${holCount !== 1 ? "s" : ""} excluded` : ""})`;
  }

  // ── Renders ──────────────────────────────────────────────────────────────

  const yearHolidays = holidays
    .filter((h) => new Date(h.date).getFullYear() === holYear)
    .sort((a, b) => a.date.localeCompare(b.date));
  const yearUAE = yearHolidays.filter((h) => h.country === "uae");
  const yearOman = yearHolidays.filter((h) => h.country === "oman");

  if (loading) return <main className="min-h-screen p-8"><p className="text-gray-400 text-sm">Loading…</p></main>;

  return (
    <main className="min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Employee Leave</h1>
        <div className="flex items-center gap-2">
          <button onClick={openAddHoliday} className={btnSecondary}>+ Add Holiday</button>
          <Link href="/leave/requests" className={btnSecondary}>Leave Requests →</Link>
        </div>
      </div>

      {/* ── Bank Holidays Bar ── */}
      <div className="mb-6 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 mb-2.5">
          <button onClick={() => setHolYear((y) => y - 1)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-sm">◁</button>
          <span className="font-semibold text-sm">{holYear}</span>
          <button onClick={() => setHolYear((y) => y + 1)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-sm">▷</button>
        </div>
        <div className="space-y-1.5">
          {([["uae", "🇦🇪 UAE", yearUAE], ["oman", "🇴🇲 Oman", yearOman]] as [string, string, typeof yearUAE][]).map(([country, label, hols]) => (
            <div key={country} className="flex items-start gap-3">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0 w-16 pt-0.5">{label}</span>
              {hols.length === 0 ? (
                <span className="text-xs text-gray-400 italic pt-0.5">None for {holYear}</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {hols.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => openEditHoliday(h)}
                      className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                        h.confirmed
                          ? "border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                          : "border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {fmtShortDate(h.date)} · {h.name}{!h.confirmed && " ⏳"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Employee Leave Table ── */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Annual Period</th>
              <th className="px-4 py-3 text-right">Used</th>
              <th className="px-4 py-3 text-right">Remaining</th>
              <th className="px-4 py-3 text-right">Sick</th>
              <th className="px-4 py-3 text-right">WFH</th>
              <th className="px-4 py-3 text-right">Unpaid</th>
              <th className="px-4 py-3 text-center">Ticket</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {employees.map((emp) => {
              const ent = getYearEntitlement(emp.id, holYear, entitlements);
              const cyFrom = `${holYear}-01-01`;
              const cyTo = `${holYear}-12-31`;
              const annualUsed = ent ? leaveUsed(emp.id, "Annual", ent.period_start, ent.period_end, records) : 0;
              const annualRemaining = ent ? ent.days - annualUsed : null;
              const sickUsed = leaveUsed(emp.id, "Sick", cyFrom, cyTo, records);
              const wfhUsed = leaveUsed(emp.id, "WFH", cyFrom, cyTo, records);
              const unpaidUsed = ent ? leaveUsed(emp.id, "Unpaid", ent.period_start, ent.period_end, records) : 0;
              const periodLabel = ent ? fmtPeriod(ent.period_start, ent.period_end) : null;
              const ticket = periodLabel ? tickets.find((t) => t.employee_id === emp.id && t.period_label === periodLabel) : null;
              return (
                <tr
                  key={emp.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-900/50 cursor-pointer transition-colors"
                  onDoubleClick={() => setModalEmp(emp)}
                  onClick={() => setModalEmp(emp)}
                >
                  <td className="px-4 py-3 font-medium">
                    <span>{emp.full_name}</span>
                    <span className="ml-2 text-[10px] text-gray-400">{emp.location === "oman" ? "🇴🇲" : "🇦🇪"}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{ent ? fmtPeriod(ent.period_start, ent.period_end) : <span className="italic text-gray-400">No entitlement</span>}</td>
                  <td className="px-4 py-3 text-right">{ent ? annualUsed.toFixed(1) : "—"}</td>
                  <td className={`px-4 py-3 text-right ${annualRemaining !== null ? balanceClass(annualRemaining) : "text-gray-400"}`}>
                    {annualRemaining !== null ? `${annualRemaining.toFixed(1)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">{sickUsed > 0 ? sickUsed.toFixed(1) : "—"}</td>
                  <td className="px-4 py-3 text-right">{wfhUsed > 0 ? wfhUsed.toFixed(1) : "—"}</td>
                  <td className="px-4 py-3 text-right">{unpaidUsed > 0 ? unpaidUsed.toFixed(1) : "—"}</td>
                  <td className="px-4 py-3 text-center">
                    {ticket?.status === "Paid"
                      ? <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">Paid</span>
                      : <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">Unpaid</span>}
                  </td>
                </tr>
              );
            })}
            {employees.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">No active employees found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Holiday Form Modal ── */}
      {showHolForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-5">{holEditId ? "Edit Holiday" : "Add Holiday"}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Country</label>
                <select className={inputCls} value={holForm.country} onChange={(e) => setHolForm((f) => ({ ...f, country: e.target.value }))}>
                  <option value="uae">UAE</option>
                  <option value="oman">Oman</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Date</label>
                <input type="date" className={inputCls} value={holForm.date} onChange={(e) => setHolForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Name</label>
                <input type="text" className={inputCls} value={holForm.name} onChange={(e) => setHolForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Eid Al Fitr" />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={holForm.confirmed} onChange={(e) => setHolForm((f) => ({ ...f, confirmed: e.target.checked }))} />
                Confirmed (included in working day calculations)
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={saveHoliday} disabled={savingHol || !holForm.date || !holForm.name} className={btnPrimary}>
                {savingHol ? "Saving…" : "Save"}
              </button>
              <button onClick={() => setShowHolForm(false)} className={btnSecondary}>Cancel</button>
              {holEditId && (
                <button onClick={async () => { await deleteHoliday(holEditId); setShowHolForm(false); }} className="ml-auto px-4 py-2 text-red-500 hover:text-red-600 text-sm">Delete</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Employee Detail Modal ── */}
      {modalEmp && (
        <EmployeeModal
          emp={modalEmp}
          year={holYear}
          records={records}
          entitlements={entitlements}
          tickets={tickets}
          holidays={holidays}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          periodOffset={periodOffset}
          setPeriodOffset={setPeriodOffset}
          showEntryForm={showEntryForm}
          setShowEntryForm={setShowEntryForm}
          entryForm={entryForm}
          setEntryForm={setEntryForm}
          entryEditId={entryEditId}
          openAddEntry={openAddEntry}
          openEditEntry={openEditEntry}
          saveEntry={saveEntry}
          savingEntry={savingEntry}
          deleteEntry={deleteEntry}
          entryPreview={entryPreview}
          showEntForm={showEntForm}
          setShowEntForm={setShowEntForm}
          entForm={entForm}
          setEntForm={setEntForm}
          entEditId={entEditId}
          openAddEntitlement={openAddEntitlement}
          openEditEntitlement={openEditEntitlement}
          saveEntitlement={saveEntitlement}
          savingEnt={savingEnt}
          deleteEntitlement={deleteEntitlement}
          setTicketStatus={setTicketStatus}
          onClose={() => setModalEmp(null)}
        />
      )}
    </main>
  );
}

// ── Employee Detail Modal ─────────────────────────────────────────────────────

type ModalProps = {
  emp: Employee;
  year: number;
  records: LeaveRecord[];
  entitlements: Entitlement[];
  tickets: Ticket[];
  holidays: Holiday[];
  activeTab: string;
  setActiveTab: (t: "all" | "annual" | "sick" | "wfh" | "unpaid" | "ticket") => void;
  periodOffset: number;
  setPeriodOffset: (n: number) => void;
  showEntryForm: boolean;
  setShowEntryForm: (v: boolean) => void;
  entryForm: { type: string; start_date: string; end_date: string; multiplier: string; notes: string };
  setEntryForm: (f: (prev: ModalProps["entryForm"]) => ModalProps["entryForm"]) => void;
  entryEditId: string | null;
  openAddEntry: (type: string) => void;
  openEditEntry: (r: LeaveRecord) => void;
  saveEntry: () => void;
  savingEntry: boolean;
  deleteEntry: (id: string) => void;
  entryPreview: () => string | null;
  showEntForm: boolean;
  setShowEntForm: (v: boolean) => void;
  entForm: { period_start: string; period_end: string; days: string; notes: string };
  setEntForm: (f: (prev: ModalProps["entForm"]) => ModalProps["entForm"]) => void;
  entEditId: string | null;
  openAddEntitlement: () => void;
  openEditEntitlement: (e: Entitlement) => void;
  saveEntitlement: () => void;
  savingEnt: boolean;
  deleteEntitlement: (id: string) => void;
  setTicketStatus: (empId: string, label: string, status: string) => void;
  onClose: () => void;
};

function EmployeeModal(p: ModalProps) {
  const { emp, year, records, entitlements, tickets, holidays } = p;

  const empEnts = getEntitlements(emp.id, entitlements);
  const currentEnt = empEnts[0] ?? null;

  // Period navigation: offset 0 = newest (index 0), offset -1 = index 1, etc.
  const displayIdx = -p.periodOffset;
  const displayEnt = empEnts[displayIdx] ?? currentEnt;

  const cyFrom = `${year}-01-01`;
  const cyTo = `${year}-12-31`;

  const empRecords = records.filter((r) => r.employee_id === emp.id);
  const periodRecords = displayEnt
    ? empRecords.filter((r) => r.type === "Annual" && r.end_date >= displayEnt.period_start && r.start_date <= displayEnt.period_end)
    : [];

  const annualUsed = displayEnt ? leaveUsed(emp.id, "Annual", displayEnt.period_start, displayEnt.period_end, records) : 0;
  const sickUsed = leaveUsed(emp.id, "Sick", cyFrom, cyTo, records);
  const wfhRecords = empRecords.filter((r) => r.type === "WFH" && r.start_date >= cyFrom && r.end_date <= cyTo);
  const unpaidRecords = displayEnt
    ? empRecords.filter((r) => r.type === "Unpaid" && r.end_date >= displayEnt.period_start && r.start_date <= displayEnt.period_end)
    : [];
  const sickRecords = empRecords.filter((r) => r.type === "Sick" && r.start_date >= cyFrom && r.end_date <= cyTo);

  const periodLabel = displayEnt ? fmtPeriod(displayEnt.period_start, displayEnt.period_end) : null;
  const currentPeriodLabel = currentEnt ? fmtPeriod(currentEnt.period_start, currentEnt.period_end) : null;
  const currentTicket = currentPeriodLabel ? tickets.find((t) => t.employee_id === emp.id && t.period_label === currentPeriodLabel) : null;

  const holsInPeriod = displayEnt
    ? holidays.filter((h) => h.country === emp.location && h.date >= displayEnt.period_start && h.date <= displayEnt.period_end)
    : [];
  const confirmedHolsInPeriod = holsInPeriod.filter((h) => h.confirmed).length;
  const unconfirmedHolsInPeriod = holsInPeriod.filter((h) => !h.confirmed).length;

  const TABS: { key: "all" | "annual" | "sick" | "wfh" | "unpaid" | "ticket"; label: string }[] = [
    { key: "all", label: "All Leave" },
    { key: "annual", label: "Annual" },
    { key: "sick", label: "Sick" },
    { key: "wfh", label: "WFH" },
    { key: "unpaid", label: "Unpaid" },
    { key: "ticket", label: "Ticket" },
  ];

  function RecordRow({ r }: { r: LeaveRecord }) {
    return (
      <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0 text-sm">
        <div>
          <span className="font-medium">{fmtDate(r.start_date)}</span>
          {r.start_date !== r.end_date && <span className="text-gray-400"> – {fmtDate(r.end_date)}</span>}
          {r.notes && <p className="text-xs text-gray-400 mt-0.5">{r.notes}</p>}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-semibold">{Number(r.days).toFixed(1)}d</span>
          <button onClick={() => p.openEditEntry(r)} className="text-xs text-blue-500 hover:text-blue-600">Edit</button>
        </div>
      </div>
    );
  }

  function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 text-center">
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Modal header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">{emp.full_name}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{emp.location === "oman" ? "🇴🇲 Oman · Sun–Thu" : "🇦🇪 UAE · Mon–Fri"}</p>
            </div>
            <button onClick={p.onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none p-1">✕</button>
          </div>

          {/* Period navigation (shown on annual/unpaid/ticket tabs) */}
          {["annual", "unpaid", "ticket"].includes(p.activeTab) && empEnts.length > 0 && (
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={() => p.setPeriodOffset(p.periodOffset - 1)}
                disabled={displayIdx + 1 >= empEnts.length}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-30"
              >◁</button>
              <span className="text-sm font-medium">{periodLabel ?? "No period"}</span>
              <button
                onClick={() => p.setPeriodOffset(p.periodOffset + 1)}
                disabled={displayIdx <= 0}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-30"
              >▷</button>
              {displayEnt && (
                <button onClick={() => p.openEditEntitlement(displayEnt)} className="text-xs text-blue-500 hover:text-blue-600 ml-1">✎ Entitlement</button>
              )}
              <button onClick={p.openAddEntitlement} className="text-xs text-blue-500 hover:text-blue-600">+ Period</button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 px-6 flex-shrink-0 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => p.setActiveTab(t.key)}
              className={`px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                p.activeTab === t.key
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* ── All Leave tab ── */}
          {p.activeTab === "all" && (
            <div>
              {LEAVE_TYPES.map((type) => {
                const typeRecs = empRecords.filter((r) => r.type === type);
                if (typeRecs.length === 0) return null;
                return (
                  <div key={type} className="mb-5">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">{type}</p>
                    {typeRecs.map((r) => <RecordRow key={r.id} r={r} />)}
                  </div>
                );
              })}
              {empRecords.length === 0 && <p className="text-sm text-gray-400">No leave records yet.</p>}
            </div>
          )}

          {/* ── Annual tab ── */}
          {p.activeTab === "annual" && (
            <div>
              {!displayEnt ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-400 mb-4">No entitlement period set.</p>
                  <button onClick={p.openAddEntitlement} className={btnPrimary}>+ Add Entitlement Period</button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <KpiCard label="Entitlement" value={`${displayEnt.days}d`} />
                    <KpiCard label="Used" value={`${annualUsed.toFixed(1)}d`} />
                    <KpiCard label="Remaining" value={`${(displayEnt.days - annualUsed).toFixed(1)}d`} />
                  </div>
                  {confirmedHolsInPeriod + unconfirmedHolsInPeriod > 0 && (
                    <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                      {emp.location === "oman" ? "🇴🇲" : "🇦🇪"} {confirmedHolsInPeriod} confirmed bank holiday{confirmedHolsInPeriod !== 1 ? "s" : ""}
                      {unconfirmedHolsInPeriod > 0 && ` (+ ${unconfirmedHolsInPeriod} unconfirmed)`} fall within this period — excluded from working day counts.
                    </div>
                  )}
                  {periodRecords.map((r) => <RecordRow key={r.id} r={r} />)}
                  {periodRecords.length === 0 && <p className="text-sm text-gray-400 mb-4">No annual leave entries this period.</p>}
                  <button onClick={() => p.openAddEntry("Annual")} className="mt-3 text-sm text-blue-500 hover:text-blue-600">+ Add Entry</button>
                </>
              )}
            </div>
          )}

          {/* ── Sick tab ── */}
          {p.activeTab === "sick" && (
            <div>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <KpiCard label="Annual Entitlement" value={`${emp.sick_leave_days}d`} sub="Calendar year" />
                <KpiCard label={`Used in ${year}`} value={`${sickUsed.toFixed(1)}d`} />
              </div>
              {sickRecords.map((r) => <RecordRow key={r.id} r={r} />)}
              {sickRecords.length === 0 && <p className="text-sm text-gray-400 mb-4">No sick leave this year.</p>}
              <button onClick={() => p.openAddEntry("Sick")} className="mt-3 text-sm text-blue-500 hover:text-blue-600">+ Add Entry</button>
            </div>
          )}

          {/* ── WFH tab ── */}
          {p.activeTab === "wfh" && (
            <div>
              {wfhRecords.map((r) => <RecordRow key={r.id} r={r} />)}
              {wfhRecords.length === 0 && <p className="text-sm text-gray-400 mb-4">No WFH entries this year.</p>}
              <button onClick={() => p.openAddEntry("WFH")} className="mt-3 text-sm text-blue-500 hover:text-blue-600">+ Add Entry</button>
            </div>
          )}

          {/* ── Unpaid tab ── */}
          {p.activeTab === "unpaid" && (
            <div>
              {unpaidRecords.map((r) => <RecordRow key={r.id} r={r} />)}
              {unpaidRecords.length === 0 && <p className="text-sm text-gray-400 mb-4">No unpaid leave this period.</p>}
              <button onClick={() => p.openAddEntry("Unpaid")} className="mt-3 text-sm text-blue-500 hover:text-blue-600">+ Add Entry</button>
            </div>
          )}

          {/* ── Ticket tab ── */}
          {p.activeTab === "ticket" && (
            <div>
              {!currentEnt ? (
                <p className="text-sm text-gray-400">No entitlement period set — add one on the Annual tab.</p>
              ) : (
                <>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5 mb-4">
                    <p className="text-xs text-gray-400 mb-2">Current period: {currentPeriodLabel}</p>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-semibold ${currentTicket?.status === "Paid" ? "text-green-600 dark:text-green-400" : "text-gray-500"}`}>
                        {currentTicket?.status ?? "Unpaid"}
                      </span>
                      {currentTicket?.status !== "Paid" ? (
                        <button
                          onClick={() => p.setTicketStatus(emp.id, currentPeriodLabel!, "Paid")}
                          className="text-xs px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full hover:bg-green-200 dark:hover:bg-green-900/50"
                        >
                          Mark Paid
                        </button>
                      ) : (
                        <button
                          onClick={() => p.setTicketStatus(emp.id, currentPeriodLabel!, "Unpaid")}
                          className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                          Mark Unpaid
                        </button>
                      )}
                    </div>
                  </div>
                  {tickets.filter((t) => t.employee_id === emp.id && t.period_label !== currentPeriodLabel).map((t) => (
                    <div key={t.id} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 text-sm">
                      <span className="text-gray-500">{t.period_label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === "Paid" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>{t.status}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* ── Entry form (inline, shown over any tab) ── */}
          {p.showEntryForm && (
            <div className="mt-4 bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-semibold mb-3">{p.entryEditId ? "Edit" : "Add"} {p.entryForm.type} Entry</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Type</label>
                  <select className={inputCls} value={p.entryForm.type} onChange={(e) => p.setEntryForm((f) => ({ ...f, type: e.target.value }))}>
                    {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
                    <input type="date" className={inputCls} value={p.entryForm.start_date} onChange={(e) => p.setEntryForm((f) => ({ ...f, start_date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">End Date</label>
                    <input type="date" className={inputCls} value={p.entryForm.end_date} onChange={(e) => p.setEntryForm((f) => ({ ...f, end_date: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Day Multiplier</label>
                  <select className={inputCls} value={p.entryForm.multiplier} onChange={(e) => p.setEntryForm((f) => ({ ...f, multiplier: e.target.value }))}>
                    <option value="1">Full day (×1)</option>
                    <option value="0.5">Half day (×0.5)</option>
                  </select>
                </div>
                {p.entryPreview() && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">{p.entryPreview()}</p>
                )}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Notes (optional)</label>
                  <input type="text" className={inputCls} value={p.entryForm.notes} onChange={(e) => p.setEntryForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={p.saveEntry} disabled={p.savingEntry || !p.entryForm.start_date || !p.entryForm.end_date} className={btnPrimary}>
                  {p.savingEntry ? "Saving…" : "Save"}
                </button>
                <button onClick={() => p.setShowEntryForm(false)} className={btnSecondary}>Cancel</button>
                {p.entryEditId && (
                  <button onClick={async () => { await p.deleteEntry(p.entryEditId!); p.setShowEntryForm(false); }} className="ml-auto text-sm text-red-500 hover:text-red-600">Delete</button>
                )}
              </div>
            </div>
          )}

          {/* ── Entitlement form (inline) ── */}
          {p.showEntForm && (
            <div className="mt-4 bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-semibold mb-3">{p.entEditId ? "Edit" : "Add"} Entitlement Period</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Period Start</label>
                    <input type="date" className={inputCls} value={p.entForm.period_start} onChange={(e) => p.setEntForm((f) => ({ ...f, period_start: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Period End</label>
                    <input type="date" className={inputCls} value={p.entForm.period_end} onChange={(e) => p.setEntForm((f) => ({ ...f, period_end: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Annual Leave Days</label>
                  <input type="number" step="0.5" className={inputCls} value={p.entForm.days} onChange={(e) => p.setEntForm((f) => ({ ...f, days: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Notes (optional)</label>
                  <input type="text" className={inputCls} value={p.entForm.notes} onChange={(e) => p.setEntForm((f) => ({ ...f, notes: e.target.value }))} placeholder="e.g. Increased from 22 to 25 days" />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={p.saveEntitlement} disabled={p.savingEnt || !p.entForm.period_start || !p.entForm.period_end} className={btnPrimary}>
                  {p.savingEnt ? "Saving…" : "Save"}
                </button>
                <button onClick={() => p.setShowEntForm(false)} className={btnSecondary}>Cancel</button>
                {p.entEditId && (
                  <button onClick={async () => { await p.deleteEntitlement(p.entEditId!); p.setShowEntForm(false); }} className="ml-auto text-sm text-red-500 hover:text-red-600">Delete</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
