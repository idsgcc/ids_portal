"use client";

import { useState, useEffect, use, useRef } from "react";

type TemplateTask = { sequence_order: number; duration_days: number };
type Task = {
  id: string;
  name: string;
  phase: string;
  status: string;
  sort_order: number | null;
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

function effectiveSortOrder(t: Task) {
  return t.sort_order ?? t.template_task?.sequence_order ?? 999;
}

function sortTasks(tasks: Task[]) {
  return [...tasks].sort((a, b) => effectiveSortOrder(a) - effectiveSortOrder(b));
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

function GripIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
      <circle cx="5" cy="4" r="1.2" /><circle cx="11" cy="4" r="1.2" />
      <circle cx="5" cy="8" r="1.2" /><circle cx="11" cy="8" r="1.2" />
      <circle cx="5" cy="12" r="1.2" /><circle cx="11" cy="12" r="1.2" />
    </svg>
  );
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);
  const [reminderSent, setReminderSent] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [editingClientName, setEditingClientName] = useState(false);
  const [clientNameValue, setClientNameValue] = useState("");

  // Drag state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverPos, setDragOverPos] = useState<"above" | "below">("above");

  // Insert state
  const [insertState, setInsertState] = useState<{ afterId: string | null; phase: string } | null>(null);
  const [insertName, setInsertName] = useState("");
  const [inserting, setInserting] = useState(false);
  const insertInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (insertState) setTimeout(() => insertInputRef.current?.focus(), 50);
  }, [insertState]);

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

  async function saveName() {
    const trimmed = nameValue.trim();
    setEditingName(false);
    if (!trimmed || trimmed === project?.name) return;
    setProject((p) => p ? { ...p, name: trimmed } : p);
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
  }

  async function saveClientName() {
    const trimmed = clientNameValue.trim();
    setEditingClientName(false);
    if (!trimmed || trimmed === project?.client_name) return;
    setProject((p) => p ? { ...p, client_name: trimmed } : p);
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_name: trimmed }),
    });
  }

  async function deleteTask(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setEditingTask(null);
    await fetch(`/api/projects/${id}/tasks/${taskId}`, { method: "DELETE" });
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

  async function bulkUpdateSortOrders(ordered: Task[]) {
    const updates = ordered.map((t, i) => ({ id: t.id, sort_order: i * 10 }));
    await fetch(`/api/projects/${id}/tasks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
  }

  function handleDrop(targetTaskId: string) {
    if (!draggedId || draggedId === targetTaskId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    const dragged = tasks.find((t) => t.id === draggedId);
    const target = tasks.find((t) => t.id === targetTaskId);
    if (!dragged || !target || dragged.phase !== target.phase) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const globalSorted = sortTasks(tasks);
    const without = globalSorted.filter((t) => t.id !== draggedId);
    const targetIdx = without.findIndex((t) => t.id === targetTaskId);
    const insertIdx = dragOverPos === "above" ? targetIdx : targetIdx + 1;
    without.splice(insertIdx, 0, dragged);

    const reordered = without.map((t, i) => ({ ...t, sort_order: i * 10 }));
    setTasks(reordered);
    setDraggedId(null);
    setDragOverId(null);

    bulkUpdateSortOrders(without);
  }

  async function insertTask(phase: string, afterId: string | null, name: string) {
    if (!name.trim() || !project) return;
    setInserting(true);

    const planId = project.project_plans[0]?.id;
    const globalSorted = sortTasks(tasks);

    try {
      const res = await fetch(`/api/projects/${id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_plan_id: planId, name: name.trim(), phase, sort_order: 0 }),
      });
      const newTask = await res.json();

      if (!res.ok || !newTask.id) {
        console.error("Failed to create task:", newTask);
        return;
      }

      // Insert new task into ordered list at the right position
      let insertIdx: number;
      if (afterId === null) {
        const lastPhaseIdx = globalSorted.reduce((acc, t, i) => t.phase === phase ? i : acc, -1);
        insertIdx = lastPhaseIdx + 1;
      } else {
        const afterIdx = globalSorted.findIndex((t) => t.id === afterId);
        insertIdx = afterIdx === -1 ? globalSorted.length : afterIdx + 1;
      }

      const newList = [...globalSorted];
      newList.splice(insertIdx, 0, newTask as Task);
      const reordered = newList.map((t, i) => ({ ...t, sort_order: i * 10 }));

      setTasks(reordered);
      setInsertState(null);
      setInsertName("");
      bulkUpdateSortOrders(newList);
    } finally {
      setInserting(false);
    }
  }

  function sendReminder(taskId: string) {
    setReminderSent(taskId);
    setTimeout(() => setReminderSent(null), 3000);
  }

  if (loading) return <main className="min-h-screen p-8"><p className="text-gray-400 text-sm">Loading…</p></main>;
  if (!project) return <main className="min-h-screen p-8"><p className="text-red-500 text-sm">Project not found.</p></main>;

  const phases = groupByPhase(tasks);
  const done = tasks.filter((t) => t.status === "completed").length;
  const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  const COLS = "grid-cols-[1.25rem_1.5fr_2.5fr_0.5fr_1fr_1fr_auto]";

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <a href="/projects" className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          ← Back to projects
        </a>

        {/* Project header */}
        <div className="mt-6 mb-8 flex items-start justify-between gap-6 flex-wrap">
          <div>
            {editingName ? (
              <input
                autoFocus
                className="text-2xl font-bold bg-transparent border-b-2 border-blue-500 focus:outline-none w-full"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
              />
            ) : (
              <h1
                className="text-2xl font-bold cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                onClick={() => { setNameValue(project.name); setEditingName(true); }}
                title="Click to edit"
              >
                {project.name}
              </h1>
            )}
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 flex items-center gap-1 flex-wrap">
              {editingClientName ? (
                <input
                  autoFocus
                  className="bg-transparent border-b border-blue-500 focus:outline-none text-sm"
                  value={clientNameValue}
                  onChange={(e) => setClientNameValue(e.target.value)}
                  onBlur={saveClientName}
                  onKeyDown={(e) => { if (e.key === "Enter") saveClientName(); if (e.key === "Escape") setEditingClientName(false); }}
                />
              ) : (
                <span
                  className="cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                  onClick={() => { setClientNameValue(project.client_name); setEditingClientName(true); }}
                  title="Click to edit"
                >
                  {project.client_name}
                </span>
              )}
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
                  <div className={`grid ${COLS} bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-2 gap-2`}>
                    <div />
                    {["Status", "Task", "Dur", "Planned", "Actual", ""].map((h) => (
                      <span key={h} className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">{h}</span>
                    ))}
                  </div>

                  {/* Task rows */}
                  {phaseTasks.map((task, i) => (
                    <div key={task.id}>
                      {dragOverId === task.id && dragOverPos === "above" && (
                        <div className="h-0.5 bg-blue-500 mx-4" />
                      )}

                      <div
                        onDragOver={(e) => {
                          if (!draggedId) return;
                          const dragged = tasks.find((t) => t.id === draggedId);
                          if (dragged?.phase !== task.phase) return;
                          e.preventDefault();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setDragOverPos(e.clientY < rect.top + rect.height / 2 ? "above" : "below");
                          setDragOverId(task.id);
                        }}
                        onDrop={(e) => { e.preventDefault(); handleDrop(task.id); }}
                        className={`grid ${COLS} items-center px-4 py-3 gap-2 group/row transition-colors
                          ${i < phaseTasks.length - 1 ? "border-b border-gray-100 dark:border-gray-800" : ""}
                          ${updatingTask === task.id ? "opacity-60" : ""}
                          ${draggedId === task.id ? "opacity-30 bg-blue-50 dark:bg-blue-900/10" : "hover:bg-gray-50 dark:hover:bg-gray-900/50"}
                        `}
                      >
                        {/* Drag handle — only this element is draggable */}
                        <div
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = "move";
                            setDraggedId(task.id);
                            setEditingTask(null);
                            setInsertState(null);
                          }}
                          onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
                          className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-400 cursor-grab active:cursor-grabbing flex items-center justify-center"
                        >
                          <GripIcon />
                        </div>

                        {/* Status badge */}
                        <button
                          onClick={(e) => { e.stopPropagation(); updateTask(task.id, { status: nextTaskStatus(task.status) }); }}
                          className={`text-xs px-2.5 py-1 rounded-full font-medium text-left transition-opacity hover:opacity-75 w-fit ${taskStatusStyle(task.status)}`}
                        >
                          {taskStatusLabel(task.status)}
                        </button>

                        {/* Task name — click to expand */}
                        <span
                          className="text-sm font-medium cursor-pointer"
                          onClick={() => setEditingTask(editingTask === task.id ? null : task.id)}
                        >
                          {task.name}
                        </span>

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

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); setInsertState({ afterId: task.id, phase }); setInsertName(""); setEditingTask(null); }}
                            title="Insert task below"
                            className="opacity-0 group-hover/row:opacity-100 transition-opacity w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm font-bold"
                          >
                            +
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); sendReminder(task.id); }}
                            className={`text-xs px-2 py-1 rounded-lg shrink-0 transition-colors ${reminderSent === task.id ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                          >
                            {reminderSent === task.id ? "✓ Sent" : "Remind"}
                          </button>
                        </div>
                      </div>

                      {dragOverId === task.id && dragOverPos === "below" && (
                        <div className="h-0.5 bg-blue-500 mx-4" />
                      )}

                      {/* Expanded date/notes/delete panel */}
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
                          <div className="col-span-2 sm:col-span-3">
                            <p className="text-xs text-gray-400 mb-1">Notes</p>
                            <textarea
                              rows={2}
                              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 resize-none"
                              value={task.notes ?? ""}
                              onChange={(e) => updateTask(task.id, { notes: e.target.value || null })}
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="w-full py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-medium transition-colors"
                            >
                              Delete task
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Inline insert form */}
                      {insertState?.afterId === task.id && (
                        <div className="border-t border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-900/10 px-4 py-2.5 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                          <input
                            ref={insertInputRef}
                            className="flex-1 bg-white dark:bg-gray-800 border border-blue-400 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                            placeholder="Task name…"
                            value={insertName}
                            onChange={(e) => setInsertName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") insertTask(phase, task.id, insertName);
                              if (e.key === "Escape") { setInsertState(null); setInsertName(""); }
                            }}
                          />
                          <button
                            disabled={!insertName.trim() || inserting}
                            onClick={() => insertTask(phase, task.id, insertName)}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium transition-colors"
                          >
                            {inserting ? "…" : "Add"}
                          </button>
                          <button
                            onClick={() => { setInsertState(null); setInsertName(""); }}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm px-1"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add task at end of phase */}
                  {insertState?.afterId === null && insertState.phase === phase ? (
                    <div className="border-t border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-900/10 px-4 py-2.5 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                      <input
                        ref={insertInputRef}
                        className="flex-1 bg-white dark:bg-gray-800 border border-blue-400 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                        placeholder="Task name…"
                        value={insertName}
                        onChange={(e) => setInsertName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") insertTask(phase, null, insertName);
                          if (e.key === "Escape") { setInsertState(null); setInsertName(""); }
                        }}
                      />
                      <button
                        disabled={!insertName.trim() || inserting}
                        onClick={() => insertTask(phase, null, insertName)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium transition-colors"
                      >
                        {inserting ? "…" : "Add"}
                      </button>
                      <button
                        onClick={() => { setInsertState(null); setInsertName(""); }}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      className="w-full text-left px-4 py-2 text-xs text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors rounded-b-xl"
                      onClick={() => { setInsertState({ afterId: null, phase }); setInsertName(""); }}
                    >
                      + Add task
                    </button>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
