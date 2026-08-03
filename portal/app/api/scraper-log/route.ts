import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

async function getLatestRun(source: string) {
  const { data, error } = await supabaseAdmin
    .from("scraper_log")
    .select("run_time, tenders_found, new_tenders, status, notes")
    .eq("source", source)
    .order("run_time", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  if (!data) return null;

  return {
    "Run Time": data.run_time,
    "Tenders Found": data.tenders_found,
    "New Tenders": data.new_tenders,
    "Status": data.status,
    "Notes": data.notes,
  };
}

export async function GET() {
  try {
    const [nama, oetc] = await Promise.all([getLatestRun("nama"), getLatestRun("oetc")]);
    return NextResponse.json({ nama, oetc });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
