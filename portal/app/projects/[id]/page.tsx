"use client";

import { useState, useEffect, use } from "react";

type TemplateTask = { sequence_order: number; duration_days: number };
type Task = {
  id: string;
  name: string;
  phase: string;
  status: string;
  planned_start: string | null;
  planned_finish: string | null;
  actual_start: string | null;
  actual_finish: string | null;
  notes: string | null;
  template_task: TemplateTask | null;
};
type Plan = { id: string; project_tasks: Task[] };
type Project = {
  id: string;
  name: string;
  client_name: string;
  status: string;
  priority: string;
  awarded_date: string | null;
  contractor: { id: string; name: string } | null;
  project_plans: Plan[];
};

const TASK_STATUSES = [
  { value: "not_started", label: "Not Started", color: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" },
  { value: "completed",   label: "Completed",   color: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" },
  { value: "blocked",     label: "Blocked",     color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" },
];

const PROJECT_STATUSES = [
  { value: "upcoming",  label: "Upcoming",  color: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300" },
  { value: "on_track",  label: "On Track",  color: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" },
  { value: "at_risk",   label: "At Risk",   color: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300" },
  { value: "blocked",   label: "Blocked",   color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" },
  { value: "completed", label: "Completed", color: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" },
];

const PHASE_ORDER = [
  "Kickoff",
  "Documentation and Design",
  "Manufacturing, FAT, Shipment and Installation",
  "Testing and Commissioning",
];

function taskStatusStyle(s: string) {
  return TASK_STATUSES.find((x) => x.value === s)?.color ?? TASK_STATUSES[0].color;
}
function taskStatusLabel(s: string) {
  return TASK_STATUSES.find((x) => x.value === s)?.label ?? s;
}
function nextTaskStatus(s: string) {
  const idx = TASK_STATUSES.findIndex((x) => x.value === s);
  return TASK_STATUSES[(idx + 1) % TASK_STATUSES.length].value;
}
function projectStatusStyle(s: string) {
  return PROJECT_STATUSES.find((x) => x.value === s)?.color ?? PROJECT_STATUSES[0].color;
}

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function sortTasks(tasks: Task[]) {
  return [...tasks].sort((a, b) => (a.template_task?.sequence_order ?? 999) - (b.template_task?.sequence_order ?? 999));
}

function groupByPhase(tasks: Task[]): [string, Task[]][] {
  const map = new Map<string, Task[]>();
  for (const t of sortTasks(tasks)) {
    if (!map.has(t.phase)) map.set(t.phase, []);
    map.get(t.phase)!.push(t);
  }
  const result: [string, Task[]][] = [];
  for (const phase of PHASE_ORDER) {
    if (map.has(phase)) result.push([phase, map.get(phase)!]);
  }
  for (const [phase, pts] of map) {
    if (!PHASE_ORDER.includes(phase)) result.push([phase, pts]);
  }
  return result;
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);
  const [reminderSent, setReminderSent] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/projects/${id}`);
    const data: Project = await res.json();
    setProject(data);
    setTasks(data.project_plans?.flatMap((p) => p.project_tasks ?? []) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function updateProjectStatus(status: string) {
    setProject((p) => p ? { ...p, status } : p);
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function updateProjectPriority(priority: string) {
    setProject((p) => p ? { ...p, priority } : p);
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority }),
    });
  }

  async function updateTask(taskId: string, patch: Partial<Task>) {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, ...patch } : t));
    setUpdatingTask(taskId);
    await fetch(`/api/projects/${id}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setUpdatingTask(null);
  }

  function sendReminder(taskId: string, taskName: string) {
    setReminderSent(taskId);
    setTimeout(() => setReminderSent(null), 3000);
    // TODO: wire to email/notification API
  }

  if (loading) return <main className="min-h-screen p-8"><p className="text-gray-400 text-sm">Loading…</p></main>;
  if (!project) return <main className="min-h-screen p-8"><p className="text-red-500 text-sm">Project not found.</p></main>;

  const phases = groupByPhase(tasks);
  const done = tasks.filter((t) => t.status === "completed").length;
  const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <a href="/projects" className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          ← Back to projects
        </a>

        {/* Project header */}
        <div className="mt-6 mb-8 flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {project.client_name}
              {project.contractor && ` · ${project.contractor.name}`}
              {project.awarded_date && ` · Awarded ${fmtDate(project.awarded_date)}`}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <select
                className={`text-xs px-3 py-1.5 rounded-full font-medium border-0 cursor-pointer focus:outline-none ${projectStatusStyle(project.status)}`}
                value={project.status}
                onChange={(e) => updateProjectStatus(e.target.value)}
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <select
                className="text-xs text-gray-400 capitalize bg-transparent border-0 cursor-pointer focus:outline-none hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                value={project.priority}
                onChange={(e) => updateProjectPriority(e.target.value)}
              >
                <option value="high">High priority</option>
                <option value="medium">Medium priority</option>
                <option value="low">Low priority</option>
              </select>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{pct}%</p>
            <p className="text-xs text-gray-400 mb-2">{done}/{tasks.length} tasks complete</p>
            <div className="w-40 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        {/* Phase boards */}
        <div className="space-y-8">
          {phases.map(([phase, phaseTasks]) => {
            const phaseComplete = phaseTasks.filter((t) => t.status === "completed").length;
            return (
              <section key={phase}>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{phase}</h2>
                  <span className="text-xs text-gray-300 dark:text-gray-600">{phaseComplete}/{phaseTasks.length}</span>
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  {/* Column headers */}
                  <div className="grid grid-cols-[1.5fr_2.5fr_0.5fr_1fr_1fr_auto] bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-2 gap-2">
                    {["Status", "Task", "Dur", "Planned", "Actual", ""].map((h) => (
                      <span key={h} className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">{h}</span>
                    ))}
                  </div>

                  {/* Task rows */}
                  {phaseTasks.map((task, i) => (
                    <div key={task.id}>
                      <div
                        className={`grid grid-cols-[1.5fr_2.5fr_0.5fr_1fr_1fr_auto] items-center px-4 py-3 gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors ${i < phaseTasks.length - 1 ? "border-b border-gray-100 dark:border-gray-800" : ""} ${updatingTask === task.id ? "opacity-60" : ""}`}
                        onClick={() => setEditingTask(editingTask === task.id ? null : task.id)}
                      >
                        {/* Status badge */}
                        <button
                          onClick={(e) => { e.stopPropagation(); updateTask(task.id, { status: nextTaskStatus(task.status) }); }}
                          className={`text-xs px-2.5 py-1 rounded-full font-medium text-left transition-opacity hover:opacity-75 w-fit ${taskStatusStyle(task.status)}`}
                        >
                          {taskStatusLabel(task.status)}
                        </button>

                        {/* Task name */}
                        <span className="text-sm font-medium">{task.name}</span>

                        {/* Duration */}
                        <span className="text-xs text-gray-400">
                          {task.template_task?.duration_days != null ? `${task.template_task.duration_days}d` : "—"}
                        </span>

                        {/* Planned dates */}
                        <span className="text-xs text-gray-500">
                          {task.planned_start && task.planned_finish
                            ? `${fmtDate(task.planned_start)} → ${fmtDate(task.planned_finish)}`
                            : task.planned_start ? fmtDate(task.planned_start)
                            : <span className="text-gray-300 dark:text-gray-600">Not set</span>}
                        </span>

                        {/* Actual dates */}
                        <span className="text-xs text-gray-500">
                          {task.actual_start && task.actual_finish
                            ? `${fmtDate(task.actual_start)} → ${fmtDate(task.actual_finish)}`
                            : task.actual_start ? fmtDate(task.actual_start)
                            : <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </span>

                        {/* Reminder */}
                        <button
                          onClick={(e) => { e.stopPropagation(); sendReminder(task.id, task.name); }}
                          className={`text-xs px-2 py-1 rounded-lg shrink-0 transition-colors ${reminderSent === task.id ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                        >
                          {reminderSent === task.id ? "✓ Sent" : "Remind"}
                        </button>
                      </div>

                      {/* Expanded date/notes editor */}
                      {editingTask === task.id && (
                        <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 px-4 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {[
                            { label: "Planned Start", key: "planned_start" },
                            { label: "Planned Finish", key: "planned_finish" },
                            { label: "Actual Start", key: "actual_start" },
                            { label: "Actual Finish", key: "actual_finish" },
                          ].map(({ label, key }) => (
                            <div key={key}>
                              <p className="text-xs text-gray-400 mb-1">{label}</p>
                              <input
                                type="date"
                                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                                value={(task as Record<string, string | null>)[key] ?? ""}
                                onChange={(e) => updateTask(task.id, { [key]: e.target.value || null } as Partial<Task>)}
                              />
                            </div>
                          ))}
                          <div className="col-span-2 sm:col-span-4">
                            <p className="text-xs text-gray-400 mb-1">Notes</p>
                            <textarea
                              rows={2}
                              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 resize-none"
                              value={task.notes ?? ""}
                              onChange={(e) => updateTask(task.id, { notes: e.target.value || null })}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
