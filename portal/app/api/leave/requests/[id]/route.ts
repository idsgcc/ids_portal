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

  // Fetch the request before deleting so we can clean up its leave record if approved
  const { data: req } = await supabaseAdmin
    .from("leave_requests")
    .select("status, employee_id, date_out, date_in")
    .eq("id", id)
    .single();

  const { error } = await supabaseAdmin.from("leave_requests").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  // Remove the matching leave record that was created on approval
  if (req?.status === "Approved") {
    await supabaseAdmin
      .from("leave_records")
      .delete()
      .eq("employee_id", req.employee_id)
      .eq("start_date", req.date_out)
      .eq("end_date", req.date_in);
  }

  return NextResponse.json({ ok: true });
}
