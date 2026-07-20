import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("module_permissions")
    .select("id, role, module, can_access")
    .order("role")
    .order("module");

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const { role, module, can_access } = await req.json();
  const { error } = await supabaseAdmin
    .from("module_permissions")
    .update({ can_access })
    .eq("role", role)
    .eq("module", module);

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json({ ok: true });
}
