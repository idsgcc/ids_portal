import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employee_id");

  let query = supabaseAdmin.from("leave_records").select("*").order("start_date", { ascending: false });
  if (employeeId) query = query.eq("employee_id", employeeId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { data, error } = await supabaseAdmin
    .from("leave_records")
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data);
}

// Delete a record by matching employee + date range (used when editing an approved request)
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const employee_id = searchParams.get("employee_id");
  const start_date = searchParams.get("start_date");
  const end_date = searchParams.get("end_date");

  if (!employee_id || !start_date || !end_date) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("leave_records")
    .delete()
    .eq("employee_id", employee_id)
    .eq("start_date", start_date)
    .eq("end_date", end_date);

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json({ ok: true });
}
