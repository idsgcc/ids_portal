import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const SELECT = `
  id, name, status, notes, created_at, client_id, contractor_id, project_id,
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

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("opportunities")
    .select(SELECT)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data?.map((o) => flatten(o as Record<string, unknown>)) ?? []);
}

export async function POST(req: Request) {
  const { name, client_id, contractor_id, status, notes } = await req.json();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("opportunities")
    .insert({
      name,
      client_id: client_id || null,
      contractor_id: contractor_id || null,
      status: status || "in_progress",
      notes: notes || null,
    })
    .select(SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(flatten(data as Record<string, unknown>));
}
