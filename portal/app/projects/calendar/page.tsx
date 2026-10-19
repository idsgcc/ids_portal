"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type ProjectRef = { id: string; name: string } | null;

type CalEvent =
  | { id: string; sourceId: string; type: "task"; title: string; date: string; project: ProjectRef }
  | { id: string; sourceId: string; type: "invoice"; title: string; date: string; project: ProjectRef; partyType: string }
  | { id: string; sourceId: string; type: "custom"; title: string; date: string; subType: string; notes: string | null; project: ProjectRef };

type Project = { id: string; name: string };
type View = "day" | "week" | "month";

const EVENT_TYPES = [
  { value: "review",    label: "Client Review" },
  { value: "approval",  label: "Approval" },
  { value: "milestone", label: "Milestone" },
  { value: "other",     label: "Other" },
];

const EMPTY_FORM = { title: "", date: "", type: "other", notes: "", project_id: "" };

// ── Helpers ───────────────────────────────────────────────────────────────────

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function groupKey(dateStr: string, view: View): string {
  const d = new Date(dateStr + "T00:00:00");
  if (view === "day") return dateStr;
  if (view === "week") return startOfWeek(d).toISOString().slice(0, 10);
  return dateStr.slice(0, 7);
}

function groupLabel(key: string, view: View): string {
  if (view === "day") {
    return new Date(key + "T00:00:00").toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  }
  if (view === "week") {
    const start = new Date(key + "T00:00:00");
    const end = new Date(start); end.setDate(start.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
    return `${start.toLocaleDateString("en-GB", opts)} – ${end.toLocaleDateString("en-GB", opts)} ${end.getFullYear()}`;
  }
  const [year, month] = key.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function typeBadge(ev: CalEvent) {
  if (ev.type === "task") {
    return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">Task finish</span>;
  }
  if (ev.type === "invoice") {
    const label = ev.partyType === "client" ? "Client invoice due" : "Supplier invoice due";
    return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">{label}</span>;
  }
  const subLabel = EVENT_TYPES.find((t) => t.value === ev.subType)?.label ?? ev.subType;
  return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">{subLabel}</span>;
}

function leftAccent(ev: CalEvent) {
  if (ev.type === "task") return "border-l-blue-400";
  if (ev.type === "invoice") return "border-l-amber-400";
  return "border-l-purple-400";
}

function pillColour(ev: CalEvent): string {
  if (ev.type === "task") return "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300";
  if (ev.type === "invoice") return "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300";
  return "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300";
}

function groupEvents(events: CalEvent[], view: View): [string, CalEvent[]][] {
  const map = new Map<string, CalEvent[]>();
  for (const ev of events) {
    const key = groupKey(ev.date, view);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ev);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

// ── Month grid calendar ───────────────────────────────────────────────────────

function EventPill({ ev, onDelete }: { ev: CalEvent; onDelete: (ev: CalEvent) => void }) {
  return (
    <div
      className={`group flex items-center gap-1 px-1.5 py-px rounded text-[11px] font-medium leading-snug ${pillColour(ev)}`}
      title={`${ev.title}${ev.project ? ` · ${ev.project.name}` : ""}`}
    >
      <span className="truncate flex-1 min-w-0">{ev.title}</span>
      {ev.type === "custom" && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(ev); }}
          className="opacity-0 group-hover:opacity-100 shrink-0 transition-opacity hover:text-red-500 text-[10px] leading-none"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function MonthCalendar({
  events,
  today,
  onDelete,
}: {
  events: CalEvent[];
  today: Date;
  onDelete: (ev: CalEvent) => void;
}) {
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const year = month.getFullYear();
  const monthIdx = month.getMonth();

  // Monday-first: compute how many blank cells before day 1
  const firstDayOfMonth = new Date(year, monthIdx, 1);
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7; // Mon=0 … Sun=6

  // Start grid on the Monday on or before day 1
  const gridStart = new Date(year, monthIdx, 1 - startOffset);

  // Always show 6 complete weeks (42 cells)
  const days: Date[] = [];
  const cur = new Date(gridStart);
  for (let i = 0; i < 42; i++) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }

  const todayStr = localDateStr(today);
  const monthTitle = month.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const MAX_PILLS = 3;

  return (
    <div>
      {/* Month nav header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold">{monthTitle}</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMonth(new Date(year, monthIdx - 1, 1))}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            ◁
          </button>
          <button
            onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
          >
            Today
          </button>
          <button
            onClick={() => setMonth(new Date(year, monthIdx + 1, 1))}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            ▷
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7">
          {DOW.map((d, i) => (
            <div
              key={d}
              className={`text-xs font-semibold text-center py-2 border-b border-gray-200 dark:border-gray-800 ${
                i >= 5
                  ? "bg-gray-100 dark:bg-gray-800/80 text-gray-400 dark:text-gray-500"
                  : "bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400"
              } ${i > 0 ? "border-l border-gray-200 dark:border-gray-800" : ""}`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells — 6 rows of 7 */}
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const ds = localDateStr(day);
            const isCurrentMonth = day.getMonth() === monthIdx;
            const isToday = ds === todayStr;
            const dow = idx % 7; // 0=Mon … 6=Sun
            const isWeekend = dow >= 5;
            const dayEvents = events.filter((e) => e.date === ds);
            const visible = dayEvents.slice(0, MAX_PILLS);
            const overflow = dayEvents.length - MAX_PILLS;
            // Label first day with abbreviated month
            const isFirstOfMonth = day.getDate() === 1;
            const monthAbbr = day.toLocaleDateString("en-GB", { month: "short" });

            return (
              <div
                key={ds}
                className={`min-h-[110px] flex flex-col p-1.5 ${
                  idx > 6 ? "border-t border-gray-200 dark:border-gray-800" : ""
                } ${
                  idx % 7 !== 0 ? "border-l border-gray-200 dark:border-gray-800" : ""
                } ${
                  isWeekend
                    ? isCurrentMonth
                      ? "bg-gray-50/70 dark:bg-gray-900/40"
                      : "bg-gray-100/60 dark:bg-gray-900/60"
                    : isCurrentMonth
                    ? "bg-white dark:bg-gray-950"
                    : "bg-gray-50/50 dark:bg-gray-900/50"
                }`}
              >
                {/* Date number */}
                <div className="flex justify-end mb-1">
                  <span
                    className={`flex items-center gap-1 text-xs font-medium leading-none ${
                      isToday
                        ? "bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center"
                        : isCurrentMonth
                        ? "text-gray-700 dark:text-gray-200"
                        : "text-gray-300 dark:text-gray-600"
                    }`}
                  >
                    {isToday ? (
                      day.getDate()
                    ) : (
                      <>
                        {day.getDate()}
                        {isFirstOfMonth && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal">
                            {monthAbbr}
                          </span>
                        )}
                      </>
                    )}
                  </span>
                </div>

                {/* Event pills */}
                <div className="space-y-0.5 flex-1">
                  {visible.map((ev) => (
                    <EventPill key={ev.id} ev={ev} onDelete={onDelete} />
                  ))}
                  {overflow > 0 && (
                    <p className="text-[10px] text-gray-400 pl-0.5">+{overflow} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-3 px-1">
        {[
          { colour: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300", label: "Task deadline" },
          { colour: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300", label: "Invoice due" },
          { colour: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300", label: "Custom event" },
        ].map(({ colour, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`text-[11px] px-1.5 py-px rounded font-medium ${colour}`}>●</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("month");
  const [showPast, setShowPast] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [evRes, prRes] = await Promise.all([
      fetch("/api/calendar"),
      fetch("/api/projects"),
    ]);
    setEvents(await evRes.json());
    const projs = await prRes.json();
    setProjects(projs.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addEvent() {
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowForm(false);
    setForm(EMPTY_FORM);
    load();
  }

  async function deleteEvent(ev: CalEvent) {
    if (ev.type !== "custom") return;
    await fetch(`/api/calendar/${ev.sourceId}`, { method: "DELETE" });
    setEvents((prev) => prev.filter((e) => e.id !== ev.id));
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const past = events.filter((e) => new Date(e.date + "T00:00:00") < today);
  const upcoming = events.filter((e) => new Date(e.date + "T00:00:00") >= today);
  const groups = groupEvents(upcoming, view);

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/projects" className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          ← Back to projects
        </Link>

        <div className="flex items-center justify-between mt-6 mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Calendar</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Key dates across all projects</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-sm font-medium">
              {(["day", "week", "month"] as View[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 capitalize transition-colors ${
                    view === v
                      ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                      : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
            >
              + Add event
            </button>
          </div>
        </div>

        {/* Add event modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold mb-5">Add Event</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Title *</label>
                  <input
                    autoFocus
                    type="text"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Site acceptance test"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Date *</label>
                    <input
                      type="date"
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Type</label>
                    <select
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                    >
                      {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Project</label>
                  <select
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    value={form.project_id}
                    onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                  >
                    <option value="">— No project —</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Notes</label>
                  <textarea
                    rows={2}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Optional notes"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={addEvent}
                  disabled={saving || !form.title.trim() || !form.date}
                  className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
                >
                  {saving ? "Saving…" : "Add Event"}
                </button>
                <button
                  onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                  className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : view === "month" ? (
          /* ── Month grid view ── */
          <MonthCalendar events={events} today={today} onDelete={deleteEvent} />
        ) : (
          /* ── Day / Week list view ── */
          <div className="space-y-8">
            {past.length > 0 && (
              <section>
                <button
                  onClick={() => setShowPast((v) => !v)}
                  className="flex items-center gap-2 mb-3 group"
                >
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-red-400 dark:text-red-500">
                    Past ({past.length})
                  </h2>
                  <span className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors">
                    {showPast ? "hide" : "show"}
                  </span>
                </button>
                {showPast && (
                  <div className="rounded-xl border border-red-100 dark:border-red-900/30 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                    {past.map((ev) => (
                      <EventRow key={ev.id} ev={ev} onDelete={deleteEvent} past showDate />
                    ))}
                  </div>
                )}
              </section>
            )}

            {groups.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <p className="text-lg">No upcoming dates</p>
                <p className="text-sm mt-1">Add an event or set finish dates on project tasks</p>
              </div>
            ) : (
              groups.map(([key, evs]) => (
                <section key={key}>
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 whitespace-nowrap">
                      {groupLabel(key, view)}
                    </h2>
                    <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                  </div>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                    {evs.map((ev) => (
                      <EventRow key={ev.id} ev={ev} onDelete={deleteEvent} past={false} showDate={view !== "day"} />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}

// ── List-view event row (day / week views) ────────────────────────────────────

function EventRow({
  ev, onDelete, past, showDate,
}: {
  ev: CalEvent;
  onDelete: (ev: CalEvent) => void;
  past: boolean;
  showDate: boolean;
}) {
  const daysUntil = Math.ceil((new Date(ev.date + "T00:00:00").getTime() - Date.now()) / 86400000);
  const isToday = daysUntil === 0;
  const isSoon = daysUntil > 0 && daysUntil <= 5;

  return (
    <div className={`flex items-start gap-4 px-4 py-3 border-l-4 ${leftAccent(ev)} ${past ? "opacity-50" : ""}`}>
      {showDate && (
        <div className="w-24 shrink-0 text-right">
          <p className={`text-sm font-medium ${
            past ? "text-gray-400"
            : isToday ? "text-blue-600 dark:text-blue-400"
            : isSoon ? "text-amber-600 dark:text-amber-400"
            : "text-gray-700 dark:text-gray-200"
          }`}>
            {fmtDate(ev.date)}
          </p>
          {isToday && <p className="text-xs text-blue-500 font-medium">Today</p>}
          {isSoon && <p className="text-xs text-amber-500 font-medium">In {daysUntil}d</p>}
        </div>
      )}
      {!showDate && (isToday || isSoon) && (
        <span className={`text-xs font-medium shrink-0 ${isToday ? "text-blue-500" : "text-amber-500"}`}>
          {isToday ? "Today" : `In ${daysUntil}d`}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{ev.title}</span>
          {typeBadge(ev)}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {ev.project && (
            <Link href={`/projects/${ev.project.id}`} className="text-xs text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {ev.project.name}
            </Link>
          )}
          {ev.type === "custom" && ev.notes && (
            <span className="text-xs text-gray-400">{ev.notes}</span>
          )}
        </div>
      </div>
      {ev.type === "custom" && (
        <button
          onClick={() => onDelete(ev)}
          className="shrink-0 text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-500 transition-colors text-sm"
          title="Remove event"
        >
          ✕
        </button>
      )}
    </div>
  );
}
