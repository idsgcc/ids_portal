import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("scraper_log")
    .select("run_time, tenders_found, new_tenders, status, notes")
    .order("run_time", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  if (!data) return NextResponse.json(null);

  return NextResponse.json({
    "Run Time": data.run_time,
    "Tenders Found": data.tenders_found,
    "New Tenders": data.new_tenders,
    "Status": data.status,
    "Notes": data.notes,
  });
}
