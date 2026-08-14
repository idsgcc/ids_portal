import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

type Role = "contractor" | "supplier" | "client";

const TABLE_MAP: Record<Role, string> = {
  contractor: "contractors",
  supplier: "suppliers",
  client: "clients",
};

const DEFAULT_STATUS: Record<Role, string> = {
  contractor: "active",
  supplier: "approved",
  client: "active",
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role, action } = (await req.json()) as { role: Role; action: "add" | "remove" };

  const table = TABLE_MAP[role];
  if (!table) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  if (action === "add") {
    const { data: existing } = await supabaseAdmin.from(table).select("id").eq("company_id", id).maybeSingle();
    if (!existing) {
      const { data: company } = await supabaseAdmin.from("companies").select("name").eq("id", id).single();
      if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
      const { error } = await supabaseAdmin.from(table).insert({
        company_id: id,
        name: company.name,
        status: DEFAULT_STATUS[role],
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 502 });
    }
  } else if (action === "remove") {
    const { error } = await supabaseAdmin.from(table).delete().eq("company_id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
