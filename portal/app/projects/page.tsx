"use client";

import { useState, useEffect } from "react";

type Task = { id: string; name: string; status: string; phase: string; planned_finish: string | null; notes: string | null; sort_order: number | null; assigned_to_profile: { full_name: string } | null; template_task: { sequence_order: number } | null };
type Plan = { project_tasks: Task[] };
type Project = {
  id: string;
  name: string;
  client_name: string;
  status: string;
  priority: string;
  awarded_date: string | null;
  contractor: { name: string } | null;
  project_plans: Plan[];
};
type Template = { id: string; name: string };
type Contractor = { id: string; name: string };
type FormData = {
  name: string;
  client_name: string;
  contractor_id: string;
  awarded_date: string;
  template_id: string;
  priority: string;
};
const EMPTY: FormData = { name: "", client_name: "", contractor_id: "", awarded_date: "", template_id: "", priority: "medium" };

const PROJECT_STATUSES = [
  { value: "upcoming",  label: "Upcoming",  color: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300" },
  { value: "on_track",  label: "On Track",  color: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" },
  { value: "at_risk",   label: "At Risk",   color: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300" },
  { value: "blocked",   label: "Blocked",   color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" },
  { value: "completed", label: "Completed", color: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" },
];

const PRIORITY_STYLES: Record<string, string> = {
  high:   "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
  medium: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
  low:    "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
};

const DEADLINE_WARN_DAYS = 5;

function deadlineStatus(date: string | null): "overdue" | "soon" | null {
  if (!date) return null;
  const daysUntil = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
  if (daysUntil < 0) return "overdue";
  if (daysUntil <= DEADLINE_WARN_DAYS) return "soon";
  return null;
}

function fmtShortDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function statusStyle(s: string) {
  return PROJECT_STATUSES.find((x) => x.value === s)?.color ?? PROJECT_STATUSES[0].color;
}

type StepInfo = { name: string; phase: string; planned_finish: string | null; notes: string | null; status: string; assignee: string | null };

function sortedTasks(plans: Plan[]) {
  return [...plans.flatMap((p) => p.project_tasks ?? [])].sort(
    (a, b) =>
      (a.sort_order ?? a.template_task?.sequence_order ?? 999) -
      (b.sort_order ?? b.template_task?.sequence_order ?? 999)
  );
}

function getSteps(plans: Plan[]): { current: StepInfo | null; next: StepInfo | null } {
  const sorted = sortedTasks(plans);

  const inProgressIdx = sorted.findIndex((t) => t.status === "in_progress");
  if (inProgressIdx >= 0) {
    const curr = sorted[inProgressIdx];
    const nextTask = sorted.slice(inProgressIdx + 1).find((t) => t.status !== "completed") ?? null;
    return {
      current: { name: curr.name, phase: curr.phase, planned_finish: curr.planned_finish, notes: curr.notes, status: curr.status, assignee: curr.assigned_to_profile?.full_name ?? null },
      next: nextTask ? { name: nextTask.name, phase: nextTask.phase, planned_finish: nextTask.planned_finish, notes: nextTask.notes, status: nextTask.status, assignee: nextTask.assigned_to_profile?.full_name ?? null } : null,
    };
  }

  // No in_progress: next = first not_started, current = the task just before it
  const nextIdx = sorted.findIndex((t) => t.status === "not_started");
  if (nextIdx < 0) return { current: null, next: null };

  const nextTask = sorted[nextIdx];
  const prevTask = nextIdx > 0 ? sorted[nextIdx - 1] : null;
  return {
    current: prevTask ? { name: prevTask.name, phase: prevTask.phase, planned_finish: prevTask.planned_finish, notes: prevTask.notes, status: prevTask.status, assignee: prevTask.assigned_to_profile?.full_name ?? null } : null,
    next: { name: nextTask.name, phase: nextTask.phase, planned_finish: nextTask.planned_finish, notes: nextTask.notes, status: nextTask.status, assignee: nextTask.assigned_to_profile?.full_name ?? null },
  };
}

function taskStats(plans: Plan[]) {
  const tasks = plans.flatMap((p) => p.project_tasks ?? []);
  return { done: tasks.filter((t) => t.status === "completed").length, total: tasks.length };
}

function lifecycleGroup(status: string): string {
  if (status === "upcoming") return "Upcoming";
  if (status === "completed") return "Completed";
  return "Active";
}

const GROUP_ORDER = ["Active", "Upcoming", "Completed"];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [pRes, tRes, cRes, meRes] = await Promise.all([
      fetch("/api/projects"),
      fetch("/api/templates"),
      fetch("/api/contractors"),
      fetch("/api/me"),
    ]);
    setProjects(await pRes.json());
    setTemplates(await tRes.json());
    setContractors(await cRes.json());
    const me = await meRes.json();
    setUserRole(me.role ?? null);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: string) {
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function updatePriority(id: string, priority: string) {
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, priority } : p));
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority }),
    });
  }

  async function save() {
    if (!form.name.trim() || !form.client_name.trim() || !form.template_id) return;
    setSaving(true);
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowForm(false);
    load();
  }

  const isReadOnly = userRole === "engineer";

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items: projects.filter((p) => lifecycleGroup(p.status) === group),
  })).filter((g) => g.items.length > 0);

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <a href="/" className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          ← Back to portal
        </a>

        <div className="flex items-center justify-between mt-6 mb-8">
          <div>
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Post-award project tracking</p>
          </div>
          {!isReadOnly && (
            <button
              onClick={() => { setForm({ ...EMPTY, template_id: templates[0]?.id ?? "" }); setShowForm(true); }}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
            >
              New Project
            </button>
          )}
        </div>

        {/* New project modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold mb-5">New Project</h2>
              <div className="space-y-4">
                {[
                  { label: "Project Name *", key: "name", type: "text", placeholder: "Al Jazzier DWDM" },
                  { label: "Client Name *", key: "client_name", type: "text", placeholder: "Nama" },
                ].map(({ label, key, type, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</label>
                    <input
                      type={type}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      value={(form as Record<string, string>)[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      placeholder={placeholder}
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Contractor</label>
                  <select
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    value={form.contractor_id}
                    onChange={(e) => setForm({ ...form, contractor_id: e.target.value })}
                  >
                    <option value="">— None —</option>
                    {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Award Date</label>
                    <input
                      type="date"
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      value={form.awarded_date}
                      onChange={(e) => setForm({ ...form, awarded_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Priority</label>
                    <select
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Template *</label>
                  <select
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    value={form.template_id}
                    onChange={(e) => setForm({ ...form, template_id: e.target.value })}
                  >
                    <option value="">— Select template —</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={save}
                  disabled={saving || !form.name.trim() || !form.client_name.trim() || !form.template_id}
                  className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
                >
                  {saving ? "Creating…" : "Create Project"}
                </button>
                <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">No projects yet</p>
            <p className="text-sm mt-1">Click New Project to get started</p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(({ group, items }) => (
              <section key={group}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{group} Projects</h2>
                  <span className="text-xs text-gray-400 dark:text-gray-600">({items.length})</span>
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  {/* Table header */}
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1.8fr_1.8fr_1fr] bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-2">
                    {["Project", "Client", "Status", "Priority", "Current Step", "Next Step", "Progress"].map((h) => (
                      <span key={h} className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">{h}</span>
                    ))}
                  </div>

                  {/* Rows */}
                  {items.map((p, i) => {
                    const { done, total } = taskStats(p.project_plans ?? []);
                    const { current, next } = getSteps(p.project_plans ?? []);
                    const dl = current?.status === "in_progress" ? deadlineStatus(current.planned_finish) : null;
                    const rowTint = dl === "overdue" ? "bg-red-50/60 dark:bg-red-900/10" : dl === "soon" ? "bg-amber-50/60 dark:bg-amber-900/10" : "";
                    return (
                      <div
                        key={p.id}
                        className={`grid grid-cols-[2fr_1fr_1fr_1fr_1.8fr_1.8fr_1fr] items-center px-4 py-3 gap-2 transition-colors ${rowTint} hover:brightness-95 ${i < items.length - 1 ? "border-b border-gray-100 dark:border-gray-800" : ""}`}
                      >
                        <a href={`/projects/${p.id}`} className="font-medium text-sm hover:text-blue-600 dark:hover:text-blue-400 truncate">
                          {p.name}
                        </a>
                        <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{p.client_name}</span>
                        <div>
                          {isReadOnly ? (
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusStyle(p.status)}`}>
                              {PROJECT_STATUSES.find((s) => s.value === p.status)?.label ?? p.status}
                            </span>
                          ) : (
                            <select
                              className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer focus:outline-none ${statusStyle(p.status)}`}
                              value={p.status}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateStatus(p.id, e.target.value)}
                            >
                              {PROJECT_STATUSES.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                              ))}
                            </select>
                          )}
                        </div>
                        <div>
                          {isReadOnly ? (
                            <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${PRIORITY_STYLES[p.priority] ?? PRIORITY_STYLES.medium}`}>
                              {p.priority}
                            </span>
                          ) : (
                            <select
                              className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer focus:outline-none capitalize ${PRIORITY_STYLES[p.priority] ?? PRIORITY_STYLES.medium}`}
                              value={p.priority}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updatePriority(p.id, e.target.value)}
                            >
                              <option value="high">High</option>
                              <option value="medium">Medium</option>
                              <option value="low">Low</option>
                            </select>
                          )}
                        </div>
                        {/* Current Step */}
                        <div className="min-w-0">
                          {current ? (
                            <div>
                              <span className="text-xs text-gray-700 dark:text-gray-200 font-medium truncate block">{current.name}</span>
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                {current.assignee && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-medium">
                                    {current.assignee.split(" ")[0]}
                                  </span>
                                )}
                                {current.planned_finish && dl && (
                                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${dl === "overdue" ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400" : "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"}`}>
                                    {dl === "overdue" ? `Overdue · ${fmtShortDate(current.planned_finish)}` : `Due ${fmtShortDate(current.planned_finish)}`}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : <span className="text-xs text-gray-300 dark:text-gray-600">—</span>}
                        </div>
                        {/* Next Step */}
                        <div className="min-w-0">
                          {next ? (
                            <div>
                              <span className="text-xs text-gray-500 dark:text-gray-400 truncate block">{next.name}</span>
                              {next.assignee && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-medium mt-0.5 inline-block">
                                  {next.assignee.split(" ")[0]}
                                </span>
                              )}
                            </div>
                          ) : <span className="text-xs text-gray-300 dark:text-gray-600">—</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: total > 0 ? `${Math.round((done / total) * 100)}%` : "0%" }} />
                          </div>
                          <span className="text-xs text-gray-400 shrink-0">{done}/{total}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
