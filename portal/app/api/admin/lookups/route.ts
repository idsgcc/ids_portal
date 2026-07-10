import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  const query = supabaseAdmin
    .from("lookup_values")
    .select("id, type, value, sort_order")
    .order("sort_order")
    .order("value");

  if (type) query.eq("type", type);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { type, value } = await req.json();
  if (!type || !value?.trim()) {
    return NextResponse.json({ error: "type and value are required" }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from("lookup_values")
    .select("sort_order")
    .eq("type", type)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const sort_order = (existing?.sort_order ?? 0) + 1;

  const { data, error } = await supabaseAdmin
    .from("lookup_values")
    .insert({ type, value: value.trim(), sort_order })
    .select("id, type, value, sort_order")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data);
}
