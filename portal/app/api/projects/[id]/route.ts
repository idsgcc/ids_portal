import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("projects")
    .select(`
      *,
      contractor:contractors(id, name),
      project_plans(
        id, name, status, started_date, template_id,
        project_tasks(
          id, name, phase, status, sort_order, planned_start, planned_finish,
          actual_start, actual_finish, notes, assigned_to_profile_id,
          assigned_to_profile:profiles!assigned_to_profile_id(full_name),
          template_task:template_tasks(sequence_order, duration_days)
        )
      )
    `)
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const allowed = ["name", "client_name", "contractor_id", "awarded_date", "status", "priority"];
  const update = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

  const { data, error } = await supabaseAdmin
    .from("projects")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data);
}
