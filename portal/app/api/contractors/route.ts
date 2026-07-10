import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("contractors")
    .select("id, name, email, phone")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { name, email, phone } = await req.json();
  const { data, error } = await supabaseAdmin
    .from("contractors")
    .insert({ name, email: email || null, phone: phone || null })
    .select("id, name, email, phone")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data);
}
