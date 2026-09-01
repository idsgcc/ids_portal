import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("currency_rates")
    .select("id, currency, rate_to_aed, source, updated_at")
    .order("currency");

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const { currency, rate_to_aed } = await req.json();
  if (!currency || rate_to_aed == null) {
    return NextResponse.json({ error: "currency and rate_to_aed are required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("currency_rates")
    .update({ rate_to_aed, source: "manual", updated_at: new Date().toISOString() })
    .eq("currency", currency)
    .select("id, currency, rate_to_aed, source, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data);
}
