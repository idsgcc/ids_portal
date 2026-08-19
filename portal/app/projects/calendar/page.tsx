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

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function groupKey(dateStr: string, view: View): string {
  const d = new Date(dateStr + "T00:00:00");
  if (view === "day") return dateStr;
  if (view === "week") return startOfWeek(d).toISOString().slice(0, 10);
  return dateStr.slice(0, 7); // YYYY-MM
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

function groupEvents(events: CalEvent[], view: View): [string, CalEvent[]][] {
  const map = new Map<string, CalEvent[]>();
  for (const ev of events) {
    const key = groupKey(ev.date, view);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ev);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("week");
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
      <div className="max-w-4xl mx-auto">
        <Link href="/projects" className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          ← Back to projects
        </Link>

        <div className="flex items-center justify-between mt-6 mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Calendar</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Key dates across all projects</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View toggle */}
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
        ) : (
          <div className="space-y-8">
            {/* Past events */}
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

            {/* Grouped upcoming events */}
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
      {/* Date — hidden in Day view since the section header already shows it */}
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
      {/* In Day view, still show Today/Soon indicator inline */}
      {!showDate && (isToday || isSoon) && (
        <span className={`text-xs font-medium shrink-0 ${isToday ? "text-blue-500" : "text-amber-500"}`}>
          {isToday ? "Today" : `In ${daysUntil}d`}
        </span>
      )}

      {/* Content */}
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

      {/* Delete (custom events only) */}
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
