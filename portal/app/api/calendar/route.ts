import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const [tasksRes, invoicesRes, eventsRes] = await Promise.all([
    supabaseAdmin
      .from("project_tasks")
      .select(`
        id, name, planned_finish,
        project_plan:project_plans!project_plan_id(
          project:projects!project_id(id, name)
        )
      `)
      .not("planned_finish", "is", null),
    supabaseAdmin
      .from("invoices")
      .select("id, invoice_number, party_type, amount, currency, due_date, project:projects!project_id(id, name)")
      .not("due_date", "is", null)
      .neq("status", "paid"),
    supabaseAdmin
      .from("calendar_events")
      .select("id, title, date, type, notes, project:projects!project_id(id, name)")
      .order("date", { ascending: true }),
  ]);

  type ProjectRef = { id: string; name: string } | null;

  const tasks = (tasksRes.data ?? []).map((t) => ({
    id: `task-${t.id}`,
    sourceId: t.id,
    type: "task" as const,
    title: t.name,
    date: t.planned_finish as string,
    project: (t.project_plan as { project: ProjectRef } | null)?.project ?? null,
  }));

  const invoices = (invoicesRes.data ?? []).map((inv) => ({
    id: `inv-${inv.id}`,
    sourceId: inv.id,
    type: "invoice" as const,
    title: `${inv.invoice_number}${inv.amount != null ? ` · ${new Intl.NumberFormat("en-US", { style: "currency", currency: inv.currency, maximumFractionDigits: 0 }).format(inv.amount)}` : ""}`,
    date: inv.due_date as string,
    project: (inv.project as ProjectRef) ?? null,
    partyType: inv.party_type as string,
  }));

  const custom = (eventsRes.data ?? []).map((ev) => ({
    id: `ev-${ev.id}`,
    sourceId: ev.id,
    type: "custom" as const,
    title: ev.title,
    date: ev.date as string,
    subType: ev.type as string,
    notes: ev.notes as string | null,
    project: (ev.project as ProjectRef) ?? null,
  }));

  const all = [...tasks, ...invoices, ...custom].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return NextResponse.json(all);
}

export async function POST(req: Request) {
  const { title, date, type, notes, project_id } = await req.json();
  if (!title?.trim() || !date) {
    return NextResponse.json({ error: "title and date required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("calendar_events")
    .insert({ title: title.trim(), date, type: type || "other", notes: notes || null, project_id: project_id || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data);
}
