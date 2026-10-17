import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  // When approving or rejecting, only update if still Pending (prevents double-processing)
  let query = supabaseAdmin.from("leave_requests").update(body).eq("id", id);
  if (body.status === "Approved" || body.status === "Rejected") {
    query = query.eq("status", "Pending");
  }

  const { data, error } = await query.select("*, employees(full_name, location)").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  if (!data) return NextResponse.json({ error: "Request already processed" }, { status: 409 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await supabaseAdmin.from("leave_requests").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json({ ok: true });
}
