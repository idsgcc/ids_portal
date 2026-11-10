import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  const { sid } = await params;
  const { error } = await supabaseAdmin.from("salary_history").delete().eq("id", sid);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json({ ok: true });
}
