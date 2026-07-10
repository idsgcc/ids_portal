import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const SELECT = "id, name, country, contact_name, email, phone, category, status, lead_time_days, payment_terms, website, notes, created_at";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("suppliers")
    .select(SELECT)
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { data, error } = await supabaseAdmin
    .from("suppliers")
    .insert(body)
    .select(SELECT)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data);
}
