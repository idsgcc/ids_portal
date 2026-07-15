import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const TASK_SELECT = "id, name, phase, status, sort_order, planned_start, planned_finish, actual_start, actual_finish, notes, template_task:template_tasks(sequence_order, duration_days)";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await params;
  const { project_plan_id, name, phase, sort_order } = await req.json();

  const { data, error } = await supabaseAdmin
    .from("project_tasks")
    .insert({ project_plan_id, name, phase, sort_order, status: "not_started" })
    .select(TASK_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const { updates }: { updates: { id: string; sort_order: number }[] } = await req.json();

  await Promise.all(
    updates.map(({ id, sort_order }) =>
      supabaseAdmin.from("project_tasks").update({ sort_order }).eq("id", id)
    )
  );

  return NextResponse.json({ ok: true });
}
