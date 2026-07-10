"use client";

import { useState, useEffect } from "react";

type Task = { id: string; status: string; phase: string };
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

function statusStyle(s: string) {
  return PROJECT_STATUSES.find((x) => x.value === s)?.color ?? PROJECT_STATUSES[0].color;
}
function statusLabel(s: string) {
  return PROJECT_STATUSES.find((x) => x.value === s)?.label ?? s;
}

function currentPhase(plans: Plan[]): string {
  const tasks = plans.flatMap((p) => p.project_tasks ?? []);
  const inProgress = tasks.find((t) => t.status === "in_progress");
  if (inProgress) return inProgress.phase;
  const first = tasks.find((t) => t.status === "not_started");
  if (first) return first.phase;
  return "—";
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

  async function load() {
    setLoading(true);
    const [pRes, tRes, cRes] = await Promise.all([
      fetch("/api/projects"),
      fetch("/api/templates"),
      fetch("/api/contractors"),
    ]);
    setProjects(await pRes.json());
    setTemplates(await tRes.json());
    setContractors(await cRes.json());
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
          <button
            onClick={() => { setForm({ ...EMPTY, template_id: templates[0]?.id ?? "" }); setShowForm(true); }}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            New Project
          </button>
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
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-2">
                    {["Project", "Client", "Status", "Priority", "Current Phase", "Progress"].map((h) => (
                      <span key={h} className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">{h}</span>
                    ))}
                  </div>

                  {/* Rows */}
                  {items.map((p, i) => {
                    const { done, total } = taskStats(p.project_plans ?? []);
                    const phase = currentPhase(p.project_plans ?? []);
                    return (
                      <div
                        key={p.id}
                        className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] items-center px-4 py-3 gap-2 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors ${i < items.length - 1 ? "border-b border-gray-100 dark:border-gray-800" : ""}`}
                      >
                        <a href={`/projects/${p.id}`} className="font-medium text-sm hover:text-blue-600 dark:hover:text-blue-400 truncate">
                          {p.name}
                        </a>
                        <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{p.client_name}</span>
                        <div>
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
                        </div>
                        <div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${PRIORITY_STYLES[p.priority] ?? PRIORITY_STYLES.medium}`}>
                            {p.priority}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{phase}</span>
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
