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
