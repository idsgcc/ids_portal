import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

async function getRunHistory(source: string) {
  const { data, error } = await supabaseAdmin
    .from("scraper_log")
    .select("run_time, tenders_found, new_tenders, status, notes")
    .eq("source", source)
    .order("run_time", { ascending: false })
    .limit(10);

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  if (!data || data.length === 0) return { latest: null, history: [] };

  const [latest, ...rest] = data;
  return {
    latest: {
      "Run Time": latest.run_time,
      "Tenders Found": latest.tenders_found,
      "New Tenders": latest.new_tenders,
      "Status": latest.status,
      "Notes": latest.notes,
    },
    history: data.map((row) => ({
      "Run Time": row.run_time,
      "Tenders Found": row.tenders_found,
      "New Tenders": row.new_tenders,
      "Status": row.status,
      "Notes": row.notes,
    })),
  };
}

export async function GET() {
  try {
    const [nama, oetc] = await Promise.all([getRunHistory("nama"), getRunHistory("oetc")]);
    return NextResponse.json({ nama, oetc });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
