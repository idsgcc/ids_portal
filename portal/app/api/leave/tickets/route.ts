import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employee_id");

  let query = supabaseAdmin.from("annual_tickets").select("*").order("created_at", { ascending: false });
  if (employeeId) query = query.eq("employee_id", employeeId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();

  // Check if a ticket already exists for this employee + period, update if so
  const { data: existing } = await supabaseAdmin
    .from("annual_tickets")
    .select("id")
    .eq("employee_id", body.employee_id)
    .eq("period_label", body.period_label)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from("annual_tickets")
      .update({ status: body.status })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 502 });
    return NextResponse.json(data);
  }

  const { data, error } = await supabaseAdmin
    .from("annual_tickets")
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data);
}
