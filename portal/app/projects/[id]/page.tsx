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
  assigned_to_profile_id: string | null;
  assigned_to_profile: { full_name: string } | null;
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
type Profile = { id: string; full_name: string };
type Contractor = { id: string; name: string };
type SupplierEntity = { id: string; name: string };
type PO = {
  id: string;
  po_number: string;
  party_type: "client" | "supplier";
  contractor_id: string | null;
  supplier_id: string | null;
  contractor: { id: string; name: string } | null;
  supplier: { id: string; name: string } | null;
  supplier_name: string | null;
  description: string | null;
  amount: number | null;
  currency: string;
  status: string;
  issued_date: string | null;
  notes: string | null;
  created_at: string;
};
type Invoice = {
  id: string;
  invoice_number: string;
  party_type: "client" | "supplier";
  contractor_id: string | null;
  supplier_id: string | null;
  contractor: { id: string; name: string } | null;
  supplier: { id: string; name: string } | null;
  supplier_name: string | null;
  purchase_order_id: string | null;
  amount: number | null;
  currency: string;
  status: string;
  invoice_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
  created_at: string;
};

const EMPTY_PO = { po_number: "", party_id: "", description: "", amount: "", currency: "AED", status: "draft", issued_date: "", notes: "" };
const EMPTY_INV = { invoice_number: "", party_id: "", purchase_order_id: "", amount: "", currency: "AED", status: "pending", invoice_date: "", due_date: "", notes: "" };

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

const PO_STATUSES = [
  { value: "draft",    label: "Draft",    color: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400" },
  { value: "approved", label: "Approved", color: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" },
  { value: "closed",   label: "Closed",   color: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" },
];

const INV_STATUSES = [
  { value: "pending",  label: "Pending",  color: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300" },
  { value: "approved", label: "Approved", color: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" },
  { value: "paid",     label: "Paid",     color: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" },
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
function statusColor(statuses: { value: string; color: string }[], s: string) {
  return statuses.find((x) => x.value === s)?.color ?? statuses[0].color;
}
function nextStatus(statuses: { value: string }[], s: string) {
  const idx = statuses.findIndex((x) => x.value === s);
  return statuses[(idx + 1) % statuses.length].value;
}

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtAmount(amount: number | null, currency: string) {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
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

  // Profiles and user role
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Financials
  const [pos, setPos] = useState<PO[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [addingPO, setAddingPO] = useState<"client" | "supplier" | null>(null);
  const [addPOForm, setAddPOForm] = useState(EMPTY_PO);
  const [savingPO, setSavingPO] = useState(false);
  const [addingInvoice, setAddingInvoice] = useState<"client" | "supplier" | null>(null);
  const [addInvoiceForm, setAddInvoiceForm] = useState(EMPTY_INV);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [contractorsList, setContractorsList] = useState<Contractor[]>([]);
  const [suppliersList, setSuppliersList] = useState<SupplierEntity[]>([]);

  // Edit financials
  const [editingPO, setEditingPO] = useState<PO | null>(null);
  const [editPOForm, setEditPOForm] = useState({ ...EMPTY_PO });
  const [savingEditPO, setSavingEditPO] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editInvoiceForm, setEditInvoiceForm] = useState({ ...EMPTY_INV });
  const [savingEditInvoice, setSavingEditInvoice] = useState(false);

  useEffect(() => {
    if (insertState) setTimeout(() => insertInputRef.current?.focus(), 50);
  }, [insertState]);

  async function load() {
    const [projRes, profilesRes, meRes] = await Promise.all([
      fetch(`/api/projects/${id}`),
      fetch("/api/profiles"),
      fetch("/api/me"),
    ]);

    const data: Project = await projRes.json();
    setProject(data);
    setTasks(data.project_plans?.flatMap((p) => p.project_tasks ?? []) ?? []);
    setLoading(false);

    setProfiles(await profilesRes.json());

    const me = await meRes.json();
    const role = me.role ?? null;
    setUserRole(role);

    if (role === "admin") {
      const [posRes, invRes, contractorsRes, suppliersRes] = await Promise.all([
        fetch(`/api/projects/${id}/purchase-orders`),
        fetch(`/api/projects/${id}/invoices`),
        fetch("/api/contractors"),
        fetch("/api/suppliers"),
      ]);
      setPos(await posRes.json());
      setInvoices(await invRes.json());
      const allContractors = await contractorsRes.json();
      setContractorsList(allContractors.map((c: Contractor) => ({ id: c.id, name: c.name })));
      const allSuppliers = await suppliersRes.json();
      setSuppliersList(allSuppliers.map((s: SupplierEntity) => ({ id: s.id, name: s.name })));
    }
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

  async function assignTask(taskId: string, profileId: string | null) {
    const profile = profileId ? profiles.find((p) => p.id === profileId) ?? null : null;
    setTasks((prev) => prev.map((t) =>
      t.id === taskId
        ? { ...t, assigned_to_profile_id: profileId, assigned_to_profile: profile ? { full_name: profile.full_name } : null }
        : t
    ));
    await fetch(`/api/projects/${id}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigned_to_profile_id: profileId }),
    });
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

  // PO actions
  async function savePO() {
    if (!addPOForm.po_number.trim() || !addPOForm.party_id || !addingPO) return;
    setSavingPO(true);
    const body = {
      party_type: addingPO,
      ...(addingPO === "client" ? { contractor_id: addPOForm.party_id } : { supplier_id: addPOForm.party_id }),
      po_number: addPOForm.po_number,
      description: addPOForm.description || null,
      amount: addPOForm.amount !== "" ? Number(addPOForm.amount) : null,
      currency: addPOForm.currency,
      status: addPOForm.status,
      issued_date: addPOForm.issued_date || null,
      notes: addPOForm.notes || null,
    };
    const res = await fetch(`/api/projects/${id}/purchase-orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const po = await res.json();
    setPos((prev) => [po, ...prev]);
    setAddPOForm(EMPTY_PO);
    setAddingPO(null);
    setSavingPO(false);
  }

  async function deletePO(poId: string) {
    setPos((prev) => prev.filter((p) => p.id !== poId));
    await fetch(`/api/projects/${id}/purchase-orders/${poId}`, { method: "DELETE" });
  }

  async function updatePOStatus(poId: string, status: string) {
    setPos((prev) => prev.map((p) => p.id === poId ? { ...p, status } : p));
    await fetch(`/api/projects/${id}/purchase-orders/${poId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  // Invoice actions
  async function saveInvoice() {
    if (!addInvoiceForm.invoice_number.trim() || !addingInvoice) return;
    let partyId = addInvoiceForm.party_id;
    if (!partyId && addInvoiceForm.purchase_order_id) {
      const linkedPO = pos.find((p) => p.id === addInvoiceForm.purchase_order_id);
      partyId = (addingInvoice === "client" ? linkedPO?.contractor_id : linkedPO?.supplier_id) ?? "";
    }
    if (!partyId) return;
    setSavingInvoice(true);
    const body = {
      party_type: addingInvoice,
      ...(addingInvoice === "client" ? { contractor_id: partyId } : { supplier_id: partyId }),
      invoice_number: addInvoiceForm.invoice_number,
      purchase_order_id: addInvoiceForm.purchase_order_id || null,
      amount: addInvoiceForm.amount !== "" ? Number(addInvoiceForm.amount) : null,
      currency: addInvoiceForm.currency,
      status: addInvoiceForm.status,
      invoice_date: addInvoiceForm.invoice_date || null,
      due_date: addInvoiceForm.due_date || null,
      notes: addInvoiceForm.notes || null,
    };
    const res = await fetch(`/api/projects/${id}/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const inv = await res.json();
    setInvoices((prev) => [inv, ...prev]);
    setAddInvoiceForm(EMPTY_INV);
    setAddingInvoice(null);
    setSavingInvoice(false);
  }

  async function deleteInvoice(invId: string) {
    setInvoices((prev) => prev.filter((i) => i.id !== invId));
    await fetch(`/api/projects/${id}/invoices/${invId}`, { method: "DELETE" });
  }

  async function updateInvoiceStatus(invId: string, status: string) {
    setInvoices((prev) => prev.map((i) => i.id === invId ? { ...i, status } : i));
    await fetch(`/api/projects/${id}/invoices/${invId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  function openEditPO(po: PO) {
    setEditingPO(po);
    setEditPOForm({
      po_number: po.po_number,
      party_id: po.party_type === "client" ? (po.contractor_id ?? "") : (po.supplier_id ?? ""),
      description: po.description ?? "",
      amount: po.amount?.toString() ?? "",
      currency: po.currency,
      status: po.status,
      issued_date: po.issued_date ?? "",
      notes: po.notes ?? "",
    });
  }

  async function saveEditPO() {
    if (!editingPO || !editPOForm.po_number.trim() || !editPOForm.party_id) return;
    setSavingEditPO(true);
    const body: Record<string, unknown> = {
      po_number: editPOForm.po_number,
      description: editPOForm.description || null,
      amount: editPOForm.amount !== "" ? Number(editPOForm.amount) : null,
      currency: editPOForm.currency,
      status: editPOForm.status,
      issued_date: editPOForm.issued_date || null,
    };
    if (editingPO.party_type === "client") body.contractor_id = editPOForm.party_id;
    else body.supplier_id = editPOForm.party_id;
    await fetch(`/api/projects/${id}/purchase-orders/${editingPO.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const party = (editingPO.party_type === "client" ? contractorsList : suppliersList).find((c) => c.id === editPOForm.party_id);
    setPos((prev) => prev.map((p) => {
      if (p.id !== editingPO.id) return p;
      return {
        ...p,
        po_number: editPOForm.po_number,
        ...(editingPO.party_type === "client"
          ? { contractor_id: editPOForm.party_id, contractor: party ? { id: party.id, name: party.name } : p.contractor }
          : { supplier_id: editPOForm.party_id, supplier: party ? { id: party.id, name: party.name } : p.supplier }),
        description: editPOForm.description || null,
        amount: editPOForm.amount !== "" ? Number(editPOForm.amount) : null,
        currency: editPOForm.currency,
        status: editPOForm.status,
        issued_date: editPOForm.issued_date || null,
      };
    }));
    setEditingPO(null);
    setSavingEditPO(false);
  }

  function openEditInvoice(inv: Invoice) {
    setEditingInvoice(inv);
    setEditInvoiceForm({
      invoice_number: inv.invoice_number,
      party_id: inv.party_type === "client" ? (inv.contractor_id ?? "") : (inv.supplier_id ?? ""),
      purchase_order_id: inv.purchase_order_id ?? "",
      amount: inv.amount?.toString() ?? "",
      currency: inv.currency,
      status: inv.status,
      invoice_date: inv.invoice_date ?? "",
      due_date: inv.due_date ?? "",
      notes: inv.notes ?? "",
    });
  }

  async function saveEditInvoice() {
    if (!editingInvoice || !editInvoiceForm.invoice_number.trim()) return;
    let partyId = editInvoiceForm.party_id;
    if (!partyId && editInvoiceForm.purchase_order_id) {
      const linkedPO = pos.find((p) => p.id === editInvoiceForm.purchase_order_id);
      partyId = (editingInvoice.party_type === "client" ? linkedPO?.contractor_id : linkedPO?.supplier_id) ?? "";
    }
    if (!partyId) return;
    setSavingEditInvoice(true);
    const body: Record<string, unknown> = {
      invoice_number: editInvoiceForm.invoice_number,
      purchase_order_id: editInvoiceForm.purchase_order_id || null,
      amount: editInvoiceForm.amount !== "" ? Number(editInvoiceForm.amount) : null,
      currency: editInvoiceForm.currency,
      status: editInvoiceForm.status,
      invoice_date: editInvoiceForm.invoice_date || null,
      due_date: editInvoiceForm.due_date || null,
    };
    if (editingInvoice.party_type === "client") body.contractor_id = partyId;
    else body.supplier_id = partyId;
    await fetch(`/api/projects/${id}/invoices/${editingInvoice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const party = (editingInvoice.party_type === "client" ? contractorsList : suppliersList).find((c) => c.id === partyId);
    setInvoices((prev) => prev.map((inv) => {
      if (inv.id !== editingInvoice.id) return inv;
      return {
        ...inv,
        invoice_number: editInvoiceForm.invoice_number,
        ...(editingInvoice.party_type === "client"
          ? { contractor_id: partyId, contractor: party ? { id: party.id, name: party.name } : inv.contractor }
          : { supplier_id: partyId, supplier: party ? { id: party.id, name: party.name } : inv.supplier }),
        purchase_order_id: editInvoiceForm.purchase_order_id || null,
        amount: editInvoiceForm.amount !== "" ? Number(editInvoiceForm.amount) : null,
        currency: editInvoiceForm.currency,
        status: editInvoiceForm.status,
        invoice_date: editInvoiceForm.invoice_date || null,
        due_date: editInvoiceForm.due_date || null,
      };
    }));
    setEditingInvoice(null);
    setSavingEditInvoice(false);
  }

  if (loading) return <main className="min-h-screen p-8"><p className="text-gray-400 text-sm">Loading…</p></main>;
  if (!project) return <main className="min-h-screen p-8"><p className="text-red-500 text-sm">Project not found.</p></main>;

  const isReadOnly = userRole === "engineer";
  const phases = groupByPhase(tasks);
  const done = tasks.filter((t) => t.status === "completed").length;
  const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  const COLS = "grid-cols-[1.25rem_1.5fr_2.5fr_0.5fr_1fr_1fr_1fr_auto]";

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
                className={`text-2xl font-bold ${!isReadOnly ? "cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors" : ""}`}
                onClick={() => { if (isReadOnly) return; setNameValue(project.name); setEditingName(true); }}
                title={isReadOnly ? undefined : "Click to edit"}
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
                  className={!isReadOnly ? "cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 transition-colors" : ""}
                  onClick={() => { if (isReadOnly) return; setClientNameValue(project.client_name); setEditingClientName(true); }}
                  title={isReadOnly ? undefined : "Click to edit"}
                >
                  {project.client_name}
                </span>
              )}
              {project.contractor && ` · ${project.contractor.name}`}
              {project.awarded_date && ` · Awarded ${fmtDate(project.awarded_date)}`}
            </p>
            <div className="flex items-center gap-2 mt-3">
              {isReadOnly ? (
                <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${projectStatusStyle(project.status)}`}>
                  {PROJECT_STATUSES.find((s) => s.value === project.status)?.label ?? project.status}
                </span>
              ) : (
                <select
                  className={`text-xs px-3 py-1.5 rounded-full font-medium border-0 cursor-pointer focus:outline-none ${projectStatusStyle(project.status)}`}
                  value={project.status}
                  onChange={(e) => updateProjectStatus(e.target.value)}
                >
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              )}
              {isReadOnly ? (
                <span className="text-xs text-gray-400 capitalize">{project.priority} priority</span>
              ) : (
                <select
                  className="text-xs text-gray-400 capitalize bg-transparent border-0 cursor-pointer focus:outline-none hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  value={project.priority}
                  onChange={(e) => updateProjectPriority(e.target.value)}
                >
                  <option value="high">High priority</option>
                  <option value="medium">Medium priority</option>
                  <option value="low">Low priority</option>
                </select>
              )}
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
                    {["Status", "Task", "Dur", "Planned", "Actual", "Assigned", ""].map((h) => (
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
                        {/* Drag handle */}
                        <div
                          draggable={!isReadOnly}
                          onDragStart={isReadOnly ? undefined : (e) => {
                            e.dataTransfer.effectAllowed = "move";
                            setDraggedId(task.id);
                            setEditingTask(null);
                            setInsertState(null);
                          }}
                          onDragEnd={isReadOnly ? undefined : () => { setDraggedId(null); setDragOverId(null); }}
                          className={`flex items-center justify-center min-w-0 ${isReadOnly ? "invisible" : "text-gray-300 hover:text-gray-500 dark:hover:text-gray-400 cursor-grab active:cursor-grabbing"}`}
                        >
                          <GripIcon />
                        </div>

                        {/* Status badge */}
                        {isReadOnly ? (
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium w-fit ${taskStatusStyle(task.status)}`}>
                            {taskStatusLabel(task.status)}
                          </span>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); updateTask(task.id, { status: nextTaskStatus(task.status) }); }}
                            className={`text-xs px-2.5 py-1 rounded-full font-medium text-left transition-opacity hover:opacity-75 w-fit ${taskStatusStyle(task.status)}`}
                          >
                            {taskStatusLabel(task.status)}
                          </button>
                        )}

                        {/* Task name */}
                        <span
                          className={`text-sm font-medium min-w-0 truncate ${!isReadOnly ? "cursor-pointer" : ""}`}
                          onClick={() => { if (isReadOnly) return; setEditingTask(editingTask === task.id ? null : task.id); }}
                          title={task.name}
                        >
                          {task.name}
                        </span>

                        {/* Duration */}
                        <span className="text-xs text-gray-400 min-w-0">
                          {task.template_task?.duration_days != null ? `${task.template_task.duration_days}d` : "—"}
                        </span>

                        {/* Planned dates */}
                        <span className="text-xs text-gray-500 min-w-0 truncate">
                          {task.planned_start && task.planned_finish
                            ? `${fmtDate(task.planned_start)} → ${fmtDate(task.planned_finish)}`
                            : task.planned_finish ? `→ ${fmtDate(task.planned_finish)}`
                            : task.planned_start ? fmtDate(task.planned_start)
                            : <span className="text-gray-300 dark:text-gray-600">Not set</span>}
                        </span>

                        {/* Actual dates */}
                        <span className="text-xs text-gray-500 min-w-0 truncate">
                          {task.actual_start && task.actual_finish
                            ? `${fmtDate(task.actual_start)} → ${fmtDate(task.actual_finish)}`
                            : task.actual_start ? fmtDate(task.actual_start)
                            : <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </span>

                        {/* Assignee */}
                        <div className="min-w-0">
                          {task.assigned_to_profile?.full_name ? (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 font-medium truncate block w-fit max-w-full ${!isReadOnly ? "cursor-pointer" : ""}`}
                              onClick={() => { if (isReadOnly) return; setEditingTask(editingTask === task.id ? null : task.id); }}
                              title={task.assigned_to_profile.full_name}
                            >
                              {task.assigned_to_profile.full_name.split(" ")[0]}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {!isReadOnly && (
                            <>
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
                            </>
                          )}
                        </div>
                      </div>

                      {dragOverId === task.id && dragOverPos === "below" && (
                        <div className="h-0.5 bg-blue-500 mx-4" />
                      )}

                      {/* Expanded panel */}
                      {editingTask === task.id && (
                        <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 px-4 py-4 space-y-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="col-span-2 sm:col-span-3">
                              <p className="text-xs text-gray-400 mb-1">Notes</p>
                              <textarea
                                rows={2}
                                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 resize-none"
                                value={task.notes ?? ""}
                                onChange={(e) => updateTask(task.id, { notes: e.target.value || null })}
                              />
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Assigned To</p>
                              <select
                                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                                value={task.assigned_to_profile_id ?? ""}
                                onChange={(e) => assignTask(task.id, e.target.value || null)}
                              >
                                <option value="">— Unassigned —</option>
                                {profiles.map((p) => (
                                  <option key={p.id} value={p.id}>{p.full_name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div>
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="py-1.5 px-3 rounded-lg border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-medium transition-colors"
                            >
                              Delete task
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Inline insert form */}
                      {!isReadOnly && insertState?.afterId === task.id && (
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
                  {!isReadOnly && insertState?.afterId === null && insertState.phase === phase ? (
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
                  ) : !isReadOnly ? (
                    <button
                      className="w-full text-left px-4 py-2 text-xs text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors rounded-b-xl"
                      onClick={() => { setInsertState({ afterId: null, phase }); setInsertName(""); }}
                    >
                      + Add task
                    </button>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>

        {/* Financials — admin only */}
        {userRole === "admin" && (
          <section className="mt-12">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-8">Financials</h2>

            {/* CLIENT */}
            <div className="mb-10">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-5 pb-2 border-b border-gray-200 dark:border-gray-800">Client</h3>

              {/* Client POs */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Purchase Orders</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">received from client</span>
                  </div>
                  <button onClick={() => { setAddPOForm(EMPTY_PO); setAddingPO("client"); }} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors">+ Receive PO</button>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="grid grid-cols-[1fr_1.2fr_1.5fr_1fr_1fr_1fr_auto] bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-2 gap-3">
                    {["PO #", "Client", "Description", "Amount", "Status", "Issued", ""].map((h) => <span key={h} className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">{h}</span>)}
                  </div>
                  {pos.filter((p) => p.party_type === "client").length === 0 ? (
                    <p className="text-xs text-gray-400 px-4 py-4">No client purchase orders yet.</p>
                  ) : pos.filter((p) => p.party_type === "client").map((po, i, arr) => (
                    <div key={po.id} className={`grid grid-cols-[1fr_1.2fr_1.5fr_1fr_1fr_1fr_auto] items-center px-4 py-3 gap-3 ${i < arr.length - 1 ? "border-b border-gray-100 dark:border-gray-800" : ""}`}>
                      <span className="text-sm font-medium min-w-0 truncate">{po.po_number}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400 min-w-0 truncate">{po.contractor?.name ?? po.supplier_name ?? "—"}</span>
                      <span className="text-xs text-gray-500 min-w-0 truncate">{po.description ?? "—"}</span>
                      <span className="text-sm min-w-0">{fmtAmount(po.amount, po.currency)}</span>
                      <button onClick={() => updatePOStatus(po.id, nextStatus(PO_STATUSES, po.status))} className={`text-xs px-2.5 py-1 rounded-full font-medium w-fit hover:opacity-75 transition-opacity ${statusColor(PO_STATUSES, po.status)}`}>{PO_STATUSES.find((s) => s.value === po.status)?.label ?? po.status}</button>
                      <span className="text-xs text-gray-500">{po.issued_date ? fmtDate(po.issued_date) : "—"}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditPO(po)} className="text-xs text-gray-400 hover:text-blue-500 transition-colors px-1" title="Edit">✏</button>
                        <button onClick={() => deletePO(po.id)} className="text-xs text-gray-400 hover:text-red-500 transition-colors px-1" title="Delete">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Client Invoices */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Invoices</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">issued to client</span>
                  </div>
                  <button onClick={() => { setAddInvoiceForm(EMPTY_INV); setAddingInvoice("client"); }} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors">+ Issue Invoice</button>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="grid grid-cols-[1fr_1.2fr_1fr_1fr_1fr_1fr_1fr_auto] bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-2 gap-3">
                    {["Invoice #", "Client", "Linked PO", "Amount", "Status", "Inv. Date", "Due Date", ""].map((h) => <span key={h} className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">{h}</span>)}
                  </div>
                  {invoices.filter((inv) => inv.party_type === "client").length === 0 ? (
                    <p className="text-xs text-gray-400 px-4 py-4">No client invoices yet.</p>
                  ) : invoices.filter((inv) => inv.party_type === "client").map((inv, i, arr) => {
                    const linkedPO = inv.purchase_order_id ? pos.find((p) => p.id === inv.purchase_order_id) : null;
                    return (
                      <div key={inv.id} className={`grid grid-cols-[1fr_1.2fr_1fr_1fr_1fr_1fr_1fr_auto] items-center px-4 py-3 gap-3 ${i < arr.length - 1 ? "border-b border-gray-100 dark:border-gray-800" : ""}`}>
                        <span className="text-sm font-medium min-w-0 truncate">{inv.invoice_number}</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400 min-w-0 truncate">{inv.contractor?.name ?? inv.supplier_name ?? "—"}</span>
                        <span className="text-xs text-gray-500 min-w-0 truncate">{linkedPO ? linkedPO.po_number : "—"}</span>
                        <span className="text-sm min-w-0">{fmtAmount(inv.amount, inv.currency)}</span>
                        <button onClick={() => updateInvoiceStatus(inv.id, nextStatus(INV_STATUSES, inv.status))} className={`text-xs px-2.5 py-1 rounded-full font-medium w-fit hover:opacity-75 transition-opacity ${statusColor(INV_STATUSES, inv.status)}`}>{INV_STATUSES.find((s) => s.value === inv.status)?.label ?? inv.status}</button>
                        <span className="text-xs text-gray-500">{inv.invoice_date ? fmtDate(inv.invoice_date) : "—"}</span>
                        <span className="text-xs text-gray-500">{inv.due_date ? fmtDate(inv.due_date) : "—"}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditInvoice(inv)} className="text-xs text-gray-400 hover:text-blue-500 transition-colors px-1" title="Edit">✏</button>
                          <button onClick={() => deleteInvoice(inv.id)} className="text-xs text-gray-400 hover:text-red-500 transition-colors px-1" title="Delete">✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* SUPPLIER */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-5 pb-2 border-b border-gray-200 dark:border-gray-800">Supplier</h3>

              {/* Supplier POs */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Purchase Orders</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">issued to supplier</span>
                  </div>
                  <button onClick={() => { setAddPOForm(EMPTY_PO); setAddingPO("supplier"); }} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors">+ Issue PO</button>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="grid grid-cols-[1fr_1.2fr_1.5fr_1fr_1fr_1fr_auto] bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-2 gap-3">
                    {["PO #", "Supplier", "Description", "Amount", "Status", "Issued", ""].map((h) => <span key={h} className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">{h}</span>)}
                  </div>
                  {pos.filter((p) => p.party_type === "supplier").length === 0 ? (
                    <p className="text-xs text-gray-400 px-4 py-4">No supplier purchase orders yet.</p>
                  ) : pos.filter((p) => p.party_type === "supplier").map((po, i, arr) => (
                    <div key={po.id} className={`grid grid-cols-[1fr_1.2fr_1.5fr_1fr_1fr_1fr_auto] items-center px-4 py-3 gap-3 ${i < arr.length - 1 ? "border-b border-gray-100 dark:border-gray-800" : ""}`}>
                      <span className="text-sm font-medium min-w-0 truncate">{po.po_number}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400 min-w-0 truncate">{po.supplier?.name ?? po.supplier_name ?? "—"}</span>
                      <span className="text-xs text-gray-500 min-w-0 truncate">{po.description ?? "—"}</span>
                      <span className="text-sm min-w-0">{fmtAmount(po.amount, po.currency)}</span>
                      <button onClick={() => updatePOStatus(po.id, nextStatus(PO_STATUSES, po.status))} className={`text-xs px-2.5 py-1 rounded-full font-medium w-fit hover:opacity-75 transition-opacity ${statusColor(PO_STATUSES, po.status)}`}>{PO_STATUSES.find((s) => s.value === po.status)?.label ?? po.status}</button>
                      <span className="text-xs text-gray-500">{po.issued_date ? fmtDate(po.issued_date) : "—"}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditPO(po)} className="text-xs text-gray-400 hover:text-blue-500 transition-colors px-1" title="Edit">✏</button>
                        <button onClick={() => deletePO(po.id)} className="text-xs text-gray-400 hover:text-red-500 transition-colors px-1" title="Delete">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Supplier Invoices */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Invoices</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">received from supplier</span>
                  </div>
                  <button onClick={() => { setAddInvoiceForm(EMPTY_INV); setAddingInvoice("supplier"); }} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors">+ Receive Invoice</button>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="grid grid-cols-[1fr_1.2fr_1fr_1fr_1fr_1fr_1fr_auto] bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-2 gap-3">
                    {["Invoice #", "Supplier", "Linked PO", "Amount", "Status", "Inv. Date", "Due Date", ""].map((h) => <span key={h} className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">{h}</span>)}
                  </div>
                  {invoices.filter((inv) => inv.party_type === "supplier").length === 0 ? (
                    <p className="text-xs text-gray-400 px-4 py-4">No supplier invoices yet.</p>
                  ) : invoices.filter((inv) => inv.party_type === "supplier").map((inv, i, arr) => {
                    const linkedPO = inv.purchase_order_id ? pos.find((p) => p.id === inv.purchase_order_id) : null;
                    return (
                      <div key={inv.id} className={`grid grid-cols-[1fr_1.2fr_1fr_1fr_1fr_1fr_1fr_auto] items-center px-4 py-3 gap-3 ${i < arr.length - 1 ? "border-b border-gray-100 dark:border-gray-800" : ""}`}>
                        <span className="text-sm font-medium min-w-0 truncate">{inv.invoice_number}</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400 min-w-0 truncate">{inv.supplier?.name ?? inv.supplier_name ?? "—"}</span>
                        <span className="text-xs text-gray-500 min-w-0 truncate">{linkedPO ? linkedPO.po_number : "—"}</span>
                        <span className="text-sm min-w-0">{fmtAmount(inv.amount, inv.currency)}</span>
                        <button onClick={() => updateInvoiceStatus(inv.id, nextStatus(INV_STATUSES, inv.status))} className={`text-xs px-2.5 py-1 rounded-full font-medium w-fit hover:opacity-75 transition-opacity ${statusColor(INV_STATUSES, inv.status)}`}>{INV_STATUSES.find((s) => s.value === inv.status)?.label ?? inv.status}</button>
                        <span className="text-xs text-gray-500">{inv.invoice_date ? fmtDate(inv.invoice_date) : "—"}</span>
                        <span className="text-xs text-gray-500">{inv.due_date ? fmtDate(inv.due_date) : "—"}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditInvoice(inv)} className="text-xs text-gray-400 hover:text-blue-500 transition-colors px-1" title="Edit">✏</button>
                          <button onClick={() => deleteInvoice(inv.id)} className="text-xs text-gray-400 hover:text-red-500 transition-colors px-1" title="Delete">✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Add PO Modal */}
      {addingPO && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold mb-1">{addingPO === "client" ? "Receive Client PO" : "Issue Supplier PO"}</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">{addingPO === "client" ? "Purchase order received from client" : "Purchase order issued to supplier"}</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">PO Number *</label>
                  <input
                    type="text"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="PO-2026-001"
                    value={addPOForm.po_number}
                    onChange={(e) => setAddPOForm({ ...addPOForm, po_number: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{addingPO === "client" ? "Client *" : "Supplier *"}</label>
                  <select
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    value={addPOForm.party_id}
                    onChange={(e) => setAddPOForm({ ...addPOForm, party_id: e.target.value })}
                  >
                    <option value="">— Select —</option>
                    {(addingPO === "client" ? contractorsList : suppliersList).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Description</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Equipment supply…"
                  value={addPOForm.description}
                  onChange={(e) => setAddPOForm({ ...addPOForm, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Amount</label>
                  <input
                    type="number"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="0"
                    value={addPOForm.amount}
                    onChange={(e) => setAddPOForm({ ...addPOForm, amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Currency</label>
                  <select
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    value={addPOForm.currency}
                    onChange={(e) => setAddPOForm({ ...addPOForm, currency: e.target.value })}
                  >
                    <option value="AED">AED</option>
                    <option value="USD">USD</option>
                    <option value="OMR">OMR</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Status</label>
                  <select
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    value={addPOForm.status}
                    onChange={(e) => setAddPOForm({ ...addPOForm, status: e.target.value })}
                  >
                    {PO_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Issued Date</label>
                <input
                  type="date"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  value={addPOForm.issued_date}
                  onChange={(e) => setAddPOForm({ ...addPOForm, issued_date: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={savePO}
                disabled={savingPO || !addPOForm.po_number.trim() || !addPOForm.party_id}
                className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {savingPO ? "Saving…" : "Save PO"}
              </button>
              <button onClick={() => setAddingPO(null)} className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Invoice Modal */}
      {addingInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold mb-1">{addingInvoice === "client" ? "Issue Client Invoice" : "Receive Supplier Invoice"}</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">{addingInvoice === "client" ? "Invoice issued to client" : "Invoice received from supplier"}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Invoice Number *</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="INV-2026-001"
                  value={addInvoiceForm.invoice_number}
                  onChange={(e) => setAddInvoiceForm({ ...addInvoiceForm, invoice_number: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Linked PO</label>
                <select
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  value={addInvoiceForm.purchase_order_id}
                  onChange={(e) => setAddInvoiceForm({ ...addInvoiceForm, purchase_order_id: e.target.value, party_id: "" })}
                >
                  <option value="">— None —</option>
                  {pos.filter((po) => po.party_type === addingInvoice).map((po) => {
                    const partyName = po.contractor?.name ?? po.supplier?.name ?? po.supplier_name ?? "";
                    return <option key={po.id} value={po.id}>{po.po_number}{partyName ? ` · ${partyName}` : ""}</option>;
                  })}
                </select>
              </div>
              {addInvoiceForm.purchase_order_id ? (
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{addingInvoice === "client" ? "Client" : "Supplier"}</label>
                  <div className="w-full bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    {(() => {
                      const po = pos.find((p) => p.id === addInvoiceForm.purchase_order_id);
                      return po?.contractor?.name ?? po?.supplier?.name ?? po?.supplier_name ?? "—";
                    })()} <span className="text-xs">(from linked PO)</span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{addingInvoice === "client" ? "Client *" : "Supplier *"}</label>
                  <select
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    value={addInvoiceForm.party_id}
                    onChange={(e) => setAddInvoiceForm({ ...addInvoiceForm, party_id: e.target.value })}
                  >
                    <option value="">— Select —</option>
                    {(addingInvoice === "client" ? contractorsList : suppliersList).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Amount</label>
                  <input
                    type="number"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="0"
                    value={addInvoiceForm.amount}
                    onChange={(e) => setAddInvoiceForm({ ...addInvoiceForm, amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Currency</label>
                  <select
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    value={addInvoiceForm.currency}
                    onChange={(e) => setAddInvoiceForm({ ...addInvoiceForm, currency: e.target.value })}
                  >
                    <option value="AED">AED</option>
                    <option value="USD">USD</option>
                    <option value="OMR">OMR</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Status</label>
                  <select
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    value={addInvoiceForm.status}
                    onChange={(e) => setAddInvoiceForm({ ...addInvoiceForm, status: e.target.value })}
                  >
                    {INV_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Invoice Date</label>
                  <input
                    type="date"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    value={addInvoiceForm.invoice_date}
                    onChange={(e) => setAddInvoiceForm({ ...addInvoiceForm, invoice_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Due Date</label>
                  <input
                    type="date"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    value={addInvoiceForm.due_date}
                    onChange={(e) => setAddInvoiceForm({ ...addInvoiceForm, due_date: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={saveInvoice}
                disabled={savingInvoice || !addInvoiceForm.invoice_number.trim() || (!addInvoiceForm.party_id && !addInvoiceForm.purchase_order_id)}
                className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {savingInvoice ? "Saving…" : "Save Invoice"}
              </button>
              <button onClick={() => setAddingInvoice(null)} className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit PO Modal */}
      {editingPO && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold mb-1">Edit Purchase Order</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">{editingPO.party_type === "client" ? "Received from client" : "Issued to supplier"}</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">PO Number *</label>
                  <input type="text" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" value={editPOForm.po_number} onChange={(e) => setEditPOForm({ ...editPOForm, po_number: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{editingPO.party_type === "client" ? "Client *" : "Supplier *"}</label>
                  <select className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" value={editPOForm.party_id} onChange={(e) => setEditPOForm({ ...editPOForm, party_id: e.target.value })}>
                    <option value="">— Select —</option>
                    {(editingPO.party_type === "client" ? contractorsList : suppliersList).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Description</label>
                <input type="text" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" value={editPOForm.description} onChange={(e) => setEditPOForm({ ...editPOForm, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Amount</label>
                  <input type="number" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" value={editPOForm.amount} onChange={(e) => setEditPOForm({ ...editPOForm, amount: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Currency</label>
                  <select className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" value={editPOForm.currency} onChange={(e) => setEditPOForm({ ...editPOForm, currency: e.target.value })}>
                    <option value="AED">AED</option>
                    <option value="USD">USD</option>
                    <option value="OMR">OMR</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Status</label>
                  <select className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" value={editPOForm.status} onChange={(e) => setEditPOForm({ ...editPOForm, status: e.target.value })}>
                    {PO_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Issued Date</label>
                <input type="date" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" value={editPOForm.issued_date} onChange={(e) => setEditPOForm({ ...editPOForm, issued_date: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={saveEditPO} disabled={savingEditPO || !editPOForm.po_number.trim() || !editPOForm.party_id} className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors">
                {savingEditPO ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => setEditingPO(null)} className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Invoice Modal */}
      {editingInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold mb-1">Edit Invoice</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">{editingInvoice.party_type === "client" ? "Issued to client" : "Received from supplier"}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Invoice Number *</label>
                <input type="text" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" value={editInvoiceForm.invoice_number} onChange={(e) => setEditInvoiceForm({ ...editInvoiceForm, invoice_number: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Linked PO</label>
                <select className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" value={editInvoiceForm.purchase_order_id} onChange={(e) => setEditInvoiceForm({ ...editInvoiceForm, purchase_order_id: e.target.value, party_id: "" })}>
                  <option value="">— None —</option>
                  {pos.filter((po) => po.party_type === editingInvoice.party_type).map((po) => {
                    const partyName = po.contractor?.name ?? po.supplier?.name ?? po.supplier_name ?? "";
                    return <option key={po.id} value={po.id}>{po.po_number}{partyName ? ` · ${partyName}` : ""}</option>;
                  })}
                </select>
              </div>
              {editInvoiceForm.purchase_order_id ? (
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{editingInvoice.party_type === "client" ? "Client" : "Supplier"}</label>
                  <div className="w-full bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    {(() => {
                      const po = pos.find((p) => p.id === editInvoiceForm.purchase_order_id);
                      return po?.contractor?.name ?? po?.supplier?.name ?? po?.supplier_name ?? "—";
                    })()} <span className="text-xs">(from linked PO)</span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{editingInvoice.party_type === "client" ? "Client *" : "Supplier *"}</label>
                  <select className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" value={editInvoiceForm.party_id} onChange={(e) => setEditInvoiceForm({ ...editInvoiceForm, party_id: e.target.value })}>
                    <option value="">— Select —</option>
                    {(editingInvoice.party_type === "client" ? contractorsList : suppliersList).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Amount</label>
                  <input type="number" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" value={editInvoiceForm.amount} onChange={(e) => setEditInvoiceForm({ ...editInvoiceForm, amount: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Currency</label>
                  <select className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" value={editInvoiceForm.currency} onChange={(e) => setEditInvoiceForm({ ...editInvoiceForm, currency: e.target.value })}>
                    <option value="AED">AED</option>
                    <option value="USD">USD</option>
                    <option value="OMR">OMR</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Status</label>
                  <select className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" value={editInvoiceForm.status} onChange={(e) => setEditInvoiceForm({ ...editInvoiceForm, status: e.target.value })}>
                    {INV_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Invoice Date</label>
                  <input type="date" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" value={editInvoiceForm.invoice_date} onChange={(e) => setEditInvoiceForm({ ...editInvoiceForm, invoice_date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Due Date</label>
                  <input type="date" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" value={editInvoiceForm.due_date} onChange={(e) => setEditInvoiceForm({ ...editInvoiceForm, due_date: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={saveEditInvoice} disabled={savingEditInvoice || !editInvoiceForm.invoice_number.trim() || (!editInvoiceForm.party_id && !editInvoiceForm.purchase_order_id)} className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors">
                {savingEditInvoice ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => setEditingInvoice(null)} className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
