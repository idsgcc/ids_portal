import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const SELECT = `
  id, name, status, notes, close_date, created_at, client_id, contractor_id, project_id,
  client:clients(id, name),
  contractor:contractors(id, name),
  project:projects(id, name)
`;

function flatten(o: Record<string, unknown>) {
  const { client, contractor, project, ...rest } = o;
  return {
    ...rest,
    client_name: (client as { name: string } | null)?.name ?? null,
    contractor_name: (contractor as { name: string } | null)?.name ?? null,
    project_name: (project as { name: string } | null)?.name ?? null,
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin.from("opportunities").select(SELECT).eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(flatten(data as Record<string, unknown>));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const allowed = ["name", "client_id", "contractor_id", "status", "notes", "close_date"];
  const update: Record<string, unknown> = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  );

  if (update.status === "awarded") {
    const { data: existing } = await supabaseAdmin
      .from("opportunities")
      .select("project_id, name, client_id, contractor_id")
      .eq("id", id)
      .single();

    if (existing && !existing.project_id) {
      const clientId = (update.client_id as string | undefined) ?? existing.client_id;
      const contractorId = (update.contractor_id as string | undefined) ?? existing.contractor_id;
      const oppName = (update.name as string | undefined) ?? existing.name;

      let clientName = "";
      if (clientId) {
        const { data: cl } = await supabaseAdmin.from("clients").select("name").eq("id", clientId).single();
        if (cl) clientName = cl.name;
      }

      const { data: project } = await supabaseAdmin
        .from("projects")
        .insert({
          name: oppName,
          client_name: clientName,
          client_id: clientId || null,
          contractor_id: contractorId || null,
          status: "upcoming",
          priority: "medium",
        })
        .select("id")
        .single();

      if (project) update.project_id = project.id;
    }
  }

  const { data, error } = await supabaseAdmin
    .from("opportunities")
    .update(update)
    .eq("id", id)
    .select(SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(flatten(data as Record<string, unknown>));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await supabaseAdmin.from("opportunities").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json({ ok: true });
}
