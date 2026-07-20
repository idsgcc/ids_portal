import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select(`
      id, name, client_name, status, priority, awarded_date, created_at,
      contractor:contractors(name),
      project_plans(
        project_tasks(id, name, status, phase, planned_finish, notes, sort_order, assigned_to_profile_id, assigned_to_profile:profiles!assigned_to_profile_id(full_name), template_task:template_tasks(sequence_order))
      )
    `)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { name, client_name, contractor_id, awarded_date, template_id, priority } = await req.json();
  if (!name || !client_name || !template_id) {
    return NextResponse.json({ error: "name, client_name, template_id required" }, { status: 400 });
  }

  const { data: project, error: projError } = await supabaseAdmin
    .from("projects")
    .insert({ name, client_name, contractor_id: contractor_id || null, awarded_date: awarded_date || null, status: "upcoming", priority: priority || "medium" })
    .select()
    .single();

  if (projError) return NextResponse.json({ error: projError.message }, { status: 502 });

  const { data: plan, error: planError } = await supabaseAdmin
    .from("project_plans")
    .insert({ project_id: project.id, template_id, name: "Main Plan", started_date: awarded_date || null })
    .select()
    .single();

  if (planError) return NextResponse.json({ error: planError.message }, { status: 502 });

  const { data: templateTasks } = await supabaseAdmin
    .from("template_tasks")
    .select("id, name, phase, duration_days, sequence_order")
    .eq("template_id", template_id)
    .order("sequence_order");

  if (templateTasks && templateTasks.length > 0) {
    await supabaseAdmin.from("project_tasks").insert(
      templateTasks.map((tt) => ({
        project_plan_id: plan.id,
        template_task_id: tt.id,
        name: tt.name,
        phase: tt.phase,
        status: "not_started",
      }))
    );
  }

  return NextResponse.json(project);
}
